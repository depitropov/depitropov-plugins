#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PHASES = ['implementation-check', 'conventions-check', 'finish'];

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

// A result file is written by a subagent, so it can be malformed. Treat that as a failed step.
function readResult(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { status: 'failed', reason: `Invalid result JSON in ${file}: ${e.message}` };
  }
}

// A failed step stops the call once. When the run is called again, the step runs again (S32).
function reportOnce(file, res) {
  if (res.reported) return false;
  writeJson(file, { ...res, reported: true });
  return true;
}

function slugify(text) {
  const firstLine = text.split('\n').find(line => line.trim()) || '';
  return firstLine.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 40).replace(/-+$/, '') || 'task';
}

function branchExists(cwd, branch) {
  try {
    git(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

function prepare(project, taskText) {
  const dirty = git(project, 'status', '--porcelain', '--untracked-files=normal').split('\n').filter(Boolean);
  if (dirty.length) {
    const files = dirty.slice(0, 5).map(line => line.slice(3)).join(', ') + (dirty.length > 5 ? ', …' : '');
    return { action: 'failed', reason: `The working tree is dirty: ${files}. Commit, stash or ignore these, then run again.` };
  }
  let defaultBranch;
  try {
    defaultBranch = git(project, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
  } catch {
    return { action: 'failed', reason: 'The default branch is unknown: origin/HEAD is not set. Run `git remote set-head origin -a`, then run again.' };
  }
  git(project, 'checkout', defaultBranch);
  git(project, 'pull', '--rebase');
  const base = git(project, 'rev-parse', 'HEAD');
  const slug = slugify(taskText);
  let branch = `task/${slug}`;
  for (let n = 2; branchExists(project, branch); n++) branch = `task/${slug}-${n}`;
  git(project, 'checkout', '-b', branch);
  // Orchestration state stays in git-ignored tmp/; only the human-readable files go to docs/ (S58).
  const runDir = `tmp/runs/${branch}`;
  const docs = `docs/runs/${branch}`;
  fs.mkdirSync(path.join(project, runDir), { recursive: true });
  fs.mkdirSync(path.join(project, docs), { recursive: true });
  fs.writeFileSync(path.join(project, docs, 'task.md'), taskText.endsWith('\n') ? taskText : `${taskText}\n`);
  const run = { base, branch, spec: `${docs}/brief.md`, docs };
  fs.writeFileSync(path.join(project, runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  return null;
}

function settings(project) {
  const resolved = readJson(path.join(project, '.orchestra', 'resolved.json'));
  const config = readJson(path.join(project, '.orchestra', 'config.json')) || {};
  const stack = resolved && resolved.slots['stack-skills'];
  if (!stack) throw new Error('No resolved stack-skills slot. orchestra run resolves the slots first.');
  const disabled = (config['stack-skills'] || {}).disable || [];
  const guide = kind => {
    const name = (stack.declaration.guides || {})[kind];
    return name && !disabled.includes(name) ? { guide: `${stack.plugin}:${name}` } : {};
  };
  const declared = resolved.slots.workflow.declaration.config['tasks-per-coder'].default;
  const perCoder = (config.workflow || {})['tasks-per-coder'] ?? declared;
  if (!Number.isInteger(perCoder) || perCoder < 1) {
    throw new Error(`workflow.tasks-per-coder in .orchestra/config.json must be a whole number of 1 or more, not ${JSON.stringify(perCoder)}.`);
  }
  return { build: stack.declaration.build.run.replace(/\{plugin\}/g, stack.dir), guide, perCoder };
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// Same rule as the gate runner: an answer is a `## <step>` section in decisions.md.
function countAnswers(docsAbs, name) {
  const file = path.join(docsAbs, 'decisions.md');
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(line => line.trim() === `## ${name}`).length;
}

// One step of the workflow: dispatch it, or stop on its result. Returns null when the step is done.
// A Decide result records how many answers existed when it stopped (`seen`). Only a new answer starts the step again.
function stage(ctx, name, inputs, skill = name) {
  const result = `${ctx.runDir}/${name}.result.json`;
  const file = path.join(ctx.project, result);
  const answers = countAnswers(path.join(ctx.project, ctx.run.docs), name);
  let res = readResult(file);
  const retry = res && ((res.status === 'failed' && !reportOnce(file, res)) || (res.status === 'decide' && res.seen !== undefined && answers > res.seen));
  if (retry) {
    fs.rmSync(file);
    res = null;
  }
  if (!res) {
    const decisions = answers > 0 ? { decisions: `${ctx.run.docs}/decisions.md` } : {};
    return { action: 'dispatch', skill: `orc-standard-workflow:${skill}`, inputs: { ...inputs, ...decisions }, result, runDir: ctx.runDir };
  }
  if (res.status === 'failed') return { action: 'failed', reason: res.reason || `Stage ${name} failed. See ${result}.`, runDir: ctx.runDir };
  if (res.status === 'decide') {
    if (res.seen === undefined) writeJson(file, { ...res, seen: answers });
    return { action: 'decide', gate: name, questions: res.decide || [], runDir: ctx.runDir };
  }
  return null;
}

// The plan's task headings, not a count a model writes, decide which code chunks run.
function planTasks(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const numbers = [...text.matchAll(/^### T(\d+)\b/gm)].map(m => Number(m[1]));
  return numbers.length && numbers.every((n, i) => n === i + 1) ? numbers.length : 0;
}

function next(project, taskFile) {
  const s = settings(project);
  if (taskFile !== undefined) {
    const failed = prepare(project, fs.readFileSync(path.resolve(project, taskFile), 'utf8'));
    if (failed) return failed;
  }
  const branch = git(project, 'branch', '--show-current');
  const runDir = `tmp/runs/${branch}`;
  const run = branch.startsWith('task/') ? readJson(path.join(project, runDir, 'run.json')) : null;
  if (!run) return { action: 'failed', reason: `No run on branch "${branch}". Start a run with a task.` };
  const ctx = { project, runDir, run };
  const notes = run.docs;
  const plan = `${notes}/plan.md`;
  const steps = [
    ['spec', { task: `${notes}/task.md`, base: run.base, notes }],
    ['plan', { spec: run.spec, notes, ...s.guide('plan') }],
    ['plan-check', { spec: run.spec, plan, notes, ...s.guide('plan') }],
  ];
  for (const [name, inputs] of steps) {
    const a = stage(ctx, name, inputs);
    if (a) return a;
  }
  const total = planTasks(path.join(project, plan));
  if (!total) {
    // Marked failed and reported, so the next call runs plan-check again (S32).
    const reason = `${plan} has no tasks numbered T1, T2, … in order. plan-check runs again on the next call.`;
    const checkFile = path.join(project, runDir, 'plan-check.result.json');
    writeJson(checkFile, { ...readJson(checkFile), status: 'failed', reason, reported: true });
    return { action: 'failed', reason, runDir };
  }
  for (let from = 1; from <= total; from += s.perCoder) {
    const to = Math.min(from + s.perCoder - 1, total);
    const a = stage(ctx, `code-${from}`, { spec: run.spec, plan, from, to, base: run.base, build: s.build, notes, ...s.guide('code') }, 'code');
    if (a) return a;
  }
  for (const phase of PHASES) {
    const res = readJson(path.join(project, runDir, `phase-${phase}.result.json`));
    if (!res || res.status !== 'ok') return { action: 'phase', name: phase, runDir };
  }
  return { action: 'done', runDir };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    console.log(JSON.stringify(next(opt('--project') || process.cwd(), opt('--task-file'))));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
  }
}

module.exports = { next, slugify };
