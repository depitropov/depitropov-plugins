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
  fs.writeFileSync(file, JSON.stringify({ ...res, reported: true }, null, 2) + '\n');
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
  return { build: stack.declaration.build.run.replace(/\{plugin\}/g, stack.dir), guide };
}

// One step of the workflow: dispatch it, or stop on its result. Returns null when the step is done.
function stage(ctx, name, inputs, skill = name) {
  const result = `${ctx.runDir}/${name}.result.json`;
  const file = path.join(ctx.project, result);
  let res = readResult(file);
  if (res && res.status === 'failed' && !reportOnce(file, res)) {
    fs.rmSync(file);
    res = null;
  }
  if (!res) return { action: 'dispatch', skill: `orc-standard-workflow:${skill}`, inputs, result, runDir: ctx.runDir };
  if (res.status === 'failed') return { action: 'failed', reason: res.reason || `Stage ${name} failed. See ${result}.`, runDir: ctx.runDir };
  return null;
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
    ['code', { spec: run.spec, plan, base: run.base, build: s.build, notes, ...s.guide('code') }],
  ];
  for (const [name, inputs] of steps) {
    const a = stage(ctx, name, inputs);
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
