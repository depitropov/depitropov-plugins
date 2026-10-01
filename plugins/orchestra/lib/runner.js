'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readJson } = require('./resolved');
const { changedFiles, commitAll } = require('./git');
const { collect, select, buildStep, plan } = require('./gates');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function runCommand(command, cwd, logFile) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  fs.writeFileSync(logFile, `$ ${command}\n${r.stdout || ''}${r.stderr || ''}${r.error ? String(r.error) : ''}`);
  return r.status === null ? 1 : r.status;
}

function countAnswers(runDirAbs, name) {
  const file = path.join(runDirAbs, 'decisions.md');
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(line => line.trim() === `## ${name}`).length;
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
    state = { steps: plan(ctx.phase, chosen, buildStep(ctx.resolved)), skipped: verdicts.filter(v => !v.selected), rounds: {}, seen: {} };
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
      guide: `${s.plugin}:${s.guide}`,
      gate: s.name,
      spec: ctx.run.spec,
      base: ctx.run.base,
    },
  };
}

function toolStep(s, ctx, state, save) {
  const resultFile = path.join(ctx.abs, `${ctx.phase}.${s.name}.result.json`);
  const done = readJson(resultFile);
  if (done) return done.status === 'failed' ? { status: 'failed', reason: done.reason } : null;
  const rounds = state.rounds[s.name] || 0;
  if (rounds > 0 && !fs.existsSync(path.join(ctx.abs, `${ctx.phase}.${s.name}.fix${rounds}.result.json`))) {
    return fixerDispatch(s, ctx, rounds);
  }
  const logRel = `${ctx.runDir}/${ctx.phase}.${s.name}.run${rounds}.log`;
  const code = runCommand(s.run, ctx.project, path.join(ctx.project, logRel));
  if (code === 0) {
    if (s.fix === 'self') commitAll(ctx.project, `orchestra: ${s.name} (${ctx.phase})`);
    writeJson(resultFile, { stage: `${ctx.phase}.${s.name}`, status: 'ok', log: logRel, rounds });
    return null;
  }
  if (s.fix === 'fixer' && rounds < s.max_rounds) {
    state.rounds[s.name] = rounds + 1;
    save();
    return fixerDispatch(s, ctx, rounds + 1);
  }
  const reason = `${s.name} still fails after ${rounds} fix round(s). See ${logRel}.`;
  const status = s.build ? 'failed' : 'evaluate';
  writeJson(resultFile, { stage: `${ctx.phase}.${s.name}`, status, log: logRel, rounds, reason });
  return status === 'failed' ? { status: 'failed', reason } : null;
}

function agentStep(s, ctx, state, save) {
  const resultRel = `${ctx.runDir}/${ctx.phase}.${s.name}.result.json`;
  const resultFile = path.join(ctx.project, resultRel);
  const res = readJson(resultFile);
  const answers = countAnswers(ctx.abs, s.name);
  const send = () => {
    state.seen[s.name] = answers;
    save();
    const inputs = { spec: ctx.run.spec, base: ctx.run.base, runDir: ctx.runDir };
    if (answers > 0) inputs.decisions = `${ctx.runDir}/decisions.md`;
    return { action: 'dispatch', skill: `${s.plugin}:${s.skill}`, inputs, result: resultRel, runDir: ctx.runDir };
  };
  if (!res) return send();
  if (res.status === 'decide') {
    if (answers > (state.seen[s.name] || 0)) {
      fs.rmSync(resultFile);
      return send();
    }
    return { status: 'decide', gate: s.name, questions: res.decide || [] };
  }
  if (res.status === 'failed') return { status: 'failed', reason: `${s.name} failed. See ${resultRel}.` };
  return null;
}

function step({ project, runDir, phase, resolved, config }) {
  const abs = path.join(project, runDir);
  const run = readJson(path.join(abs, 'run.json'));
  if (!run) throw new Error(`No run.json in ${runDir}.`);
  const ctx = { project, runDir, abs, phase, resolved, config, run };
  const { state, save } = loadState(ctx);
  for (const s of state.steps) {
    const r = s.kind === 'agent' ? agentStep(s, ctx, state, save) : toolStep(s, ctx, state, save);
    if (r) return r;
  }
  return { status: 'ok', skipped: state.skipped };
}

module.exports = { step };
