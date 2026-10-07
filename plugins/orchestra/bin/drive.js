#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateAction, withPrompt } = require('../lib/protocol');
const { load } = require('../lib/resolved');
const runner = require('../lib/runner');
const { writeReport } = require('../lib/report');
const { git, dirtyFiles, commitAll, commitRunDir } = require('../lib/git');

function callNext(nextJs, project, args) {
  const out = execFileSync(process.execPath, [nextJs, '--project', project, ...args], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

function finish(project, action, resolved) {
  if (!action.runDir) return action;
  const report = writeReport(project, action.runDir, action, resolved);
  commitRunDir(project, path.dirname(report), `orchestra: run notes (${action.action})`);
  return { ...action, report };
}

// Subagents should commit their work. When one does not, commit it here, so the gates review it.
function commitLeftovers(project) {
  const branch = git(project, 'branch', '--show-current');
  if (!branch.startsWith('task/') || !fs.existsSync(path.join(project, 'tmp', 'runs', branch, 'run.json'))) return;
  commitAll(project, 'orchestra: commit work left uncommitted');
}

// The model is told the branch on every action, so it never guesses where the commits went.
function drive(project, extraArgs = [], { resume = false } = {}) {
  const action = step(project, extraArgs, resume);
  return { ...action, branch: git(project, 'branch', '--show-current') };
}

// Result names sort wrong (code-1, code-3, plan-check, plan, spec), so the report takes the dispatch order from here.
function remember(project, a) {
  const file = path.join(project, a.runDir, 'stages.json');
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const name = path.basename(a.result);
  if (!list.includes(name)) fs.writeFileSync(file, JSON.stringify([...list, name]) + '\n');
}

function step(project, extraArgs, resume) {
  const resolved = load(project);
  if (resume) {
    // Between two calls of orchestra run, only the user changes files. Never commit them into the task.
    const dirty = dirtyFiles(project);
    if (dirty.length) {
      const files = dirty.slice(0, 5).join(', ') + (dirty.length > 5 ? ', …' : '');
      return { action: 'failed', reason: `Files changed since the run stopped: ${files}. If a stopped subagent left them, commit them; if they are yours, stash them. Then run again.` };
    }
  } else if (!extraArgs.length) {
    commitLeftovers(project);
  }
  const config = JSON.parse(fs.readFileSync(path.join(project, '.orchestra', 'config.json'), 'utf8'));
  const nextJs = path.join(resolved.slots.workflow.dir, 'bin', 'next.js');
  let args = extraArgs;
  for (;;) {
    const a = validateAction(callNext(nextJs, project, args));
    args = [];
    if (a.action === 'dispatch') {
      remember(project, a);
      return withPrompt(a);
    }
    if (a.action !== 'phase') return finish(project, a, resolved);
    const r = runner.step({ project, runDir: a.runDir, phase: a.name, resolved, config });
    if (r.action === 'dispatch') return withPrompt(r);
    const phaseResult = path.join(project, a.runDir, `phase-${a.name}.result.json`);
    fs.writeFileSync(phaseResult, JSON.stringify({ stage: `phase-${a.name}`, ...r }, null, 2) + '\n');
    if (r.status !== 'ok') {
      return finish(project, { action: r.status, runDir: a.runDir, reason: r.reason, gate: r.gate, questions: r.questions }, resolved);
    }
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--task-file');
  try {
    console.log(JSON.stringify(drive(process.cwd(), i >= 0 ? ['--task-file', argv[i + 1]] : [], { resume: argv.includes('--resume') })));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
    process.exitCode = 1;
  }
}

module.exports = { drive };
