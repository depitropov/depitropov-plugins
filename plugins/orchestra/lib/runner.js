'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readJson } = require('./resolved');
const { git, changedFiles, isClean, commitKeeping } = require('./git');
const { collect, select, buildStep, plan } = require('./gates');
const { readResult, reportOnce, noResult, newAnswer } = require('./workflow');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function runCommand(command, cwd, logFile) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  fs.writeFileSync(logFile, `$ ${command}\n${r.stdout || ''}${r.stderr || ''}${r.error ? String(r.error) : ''}`);
  return r.status === null ? 1 : r.status;
}

function loadState(ctx) {
  const file = path.join(ctx.abs, `${ctx.phase}.state.json`);
  let state = readJson(file);
  if (!state) {
    const gates = collect(ctx.resolved, ctx.config, ctx.phase);
    const readFile = rel => {
      const p = path.join(ctx.project, rel);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    };
    const verdicts = select(gates, changedFiles(ctx.project, ctx.run.base), readFile);
    const chosen = gates.filter((g, i) => verdicts[i].selected);
    state = { steps: plan(ctx.phase, chosen, buildStep(ctx.resolved, ctx.config)), skipped: verdicts.filter(v => !v.selected), rounds: {} };
    writeJson(file, state);
  }
  return { state, save: () => writeJson(file, state) };
}

function fixerDispatch(s, ctx, round) {
  return {
    action: 'dispatch',
    skill: 'orchestra:fixer',
    runDir: ctx.runDir,
    result: `${ctx.runDir}/${ctx.phase}.${s.name}.fix${round}.result.json`,
    inputs: {
      output: `${ctx.runDir}/${ctx.phase}.${s.name}.run${round - 1}.log`,
      guide: s.guide,
      gate: s.name,
      spec: ctx.run.spec,
      base: ctx.run.base,
    },
  };
}

function toolStep(s, ctx, state, save) {
  const resultFile = path.join(ctx.abs, `${ctx.phase}.${s.name}.result.json`);
  const done = readResult(resultFile);
  if (done && done.status === 'failed') {
    if (reportOnce(resultFile, done)) return { status: 'failed', reason: done.reason };
    retryTool(s, ctx, state, save);
  } else if (done) {
    return null;
  }
  const rounds = state.rounds[s.name] || 0;
  if (rounds > 0) {
    const fixFile = path.join(ctx.abs, `${ctx.phase}.${s.name}.fix${rounds}.result.json`);
    const fix = readResult(fixFile) || noResult(fixFile, `The fixer for ${s.name}`);
    if (!fix) return fixerDispatch(s, ctx, rounds);
    if (fix.status === 'failed') return endTool(s, ctx, resultFile, `The fixer could not fix ${s.name}: ${fix.reason || 'no reason given'}.`, rounds);
  }
  // The build is the slowest step. Running it again on the exact commit that last passed proves nothing new.
  const greenFile = path.join(ctx.abs, 'build.green.json');
  if (s.build && rounds === 0) {
    const green = readJson(greenFile);
    const head = git(ctx.project, 'rev-parse', 'HEAD');
    if (green && green.head === head && isClean(ctx.project)) {
      writeJson(resultFile, { status: 'ok', rounds, reason: `Skipped: ${head.slice(0, 7)} is the last green build.` });
      return null;
    }
  }
  const logRel = `${ctx.runDir}/${ctx.phase}.${s.name}.run${rounds}.log`;
  const code = runCommand(s.run, ctx.project, path.join(ctx.project, logRel));
  if (code === 0) {
    // A tool that formats the code leaves changes, whatever its fix. Keep those in files the task changed; revert the rest.
    if (!s.build) commitKeeping(ctx.project, `orchestra: ${s.name} (${ctx.phase})`, changedFiles(ctx.project, ctx.run.base));
    if (s.build && isClean(ctx.project)) writeJson(greenFile, { head: git(ctx.project, 'rev-parse', 'HEAD') });
    writeJson(resultFile, { status: 'ok', log: logRel, rounds });
    return null;
  }
  if (s.fix === 'fixer' && rounds < s.max_rounds) {
    state.rounds[s.name] = rounds + 1;
    save();
    // This dispatch is the first of the two the fixer round gets.
    fs.writeFileSync(path.join(ctx.abs, `${ctx.phase}.${s.name}.fix${rounds + 1}.result.json.sent`), '1');
    return fixerDispatch(s, ctx, rounds + 1);
  }
  return endTool(s, ctx, resultFile, `${s.name} still fails after ${rounds} fix round(s). See ${logRel}.`, rounds);
}

// A red build fails the run. Any other red tool gate goes to Report and the phase goes on (S47).
function endTool(s, ctx, resultFile, reason, rounds) {
  const status = s.build ? 'failed' : 'report';
  writeJson(resultFile, { status, rounds, reason, reported: true });
  return status === 'failed' ? { status: 'failed', reason } : null;
}

function retryTool(s, ctx, state, save) {
  const prefix = `${ctx.phase}.${s.name}.`;
  for (const f of fs.readdirSync(ctx.abs)) {
    if (f.startsWith(prefix) && (f.endsWith('.result.json') || f.endsWith('.sent'))) fs.rmSync(path.join(ctx.abs, f));
  }
  state.rounds[s.name] = 0;
  save();
}

function agentStep(s, ctx) {
  const resultRel = `${ctx.runDir}/${ctx.phase}.${s.name}.result.json`;
  const resultFile = path.join(ctx.project, resultRel);
  let res = readResult(resultFile);
  const send = () => {
    const inputs = { gate: s.name, phase: ctx.phase, spec: ctx.run.spec, base: ctx.run.base, notes: ctx.run.docs };
    // The slot's config values reach its agent gates as config.<key> inputs (S82).
    for (const [key, value] of Object.entries(s.config || {})) inputs[`config.${key}`] = value;
    // Every answer is part of the requirements, so every gate reads them (S66). Only a new answer for this gate restarts it.
    const decisionsFile = `${ctx.run.docs}/decisions.md`;
    if (fs.existsSync(path.join(ctx.project, decisionsFile))) inputs.decisions = decisionsFile;
    return { action: 'dispatch', gate: true, skill: s.skill, inputs, result: resultRel, runDir: ctx.runDir };
  };
  const retry = res && ((res.status === 'decide' && newAnswer(resultFile, res, path.join(ctx.project, ctx.run.docs), s.name)) || (res.status === 'failed' && !reportOnce(resultFile, res)));
  if (retry) {
    fs.rmSync(resultFile);
    fs.rmSync(`${resultFile}.sent`, { force: true });
    res = null;
  }
  if (!res) {
    const lost = noResult(resultFile, s.name);
    return lost ? { status: 'failed', reason: lost.reason } : send();
  }
  if (res.status === 'decide') return { status: 'decide', step: s.name, questions: res.decide || [] };
  if (res.status === 'failed') return { status: 'failed', reason: res.reason || `${s.name} failed. See ${resultRel}.` };
  return null;
}

function step({ project, runDir, phase, resolved, config }) {
  const abs = path.join(project, runDir);
  const run = readJson(path.join(abs, 'run.json'));
  if (!run) throw new Error(`No run.json in ${runDir}.`);
  const ctx = { project, runDir, abs, phase, resolved, config, run };
  const { state, save } = loadState(ctx);
  for (const s of state.steps) {
    const r = s.kind === 'agent' ? agentStep(s, ctx) : toolStep(s, ctx, state, save);
    if (r) return r;
  }
  return { status: 'ok', skipped: state.skipped, gates: state.steps.filter(s => !s.build).length };
}

module.exports = { step };
