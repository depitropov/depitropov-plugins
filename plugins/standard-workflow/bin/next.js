#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const STAGES = [
  { name: 'code', kind: 'dispatch' },
  { name: 'implementation-check', kind: 'phase' },
  { name: 'conventions-check', kind: 'phase' },
  { name: 'finish', kind: 'phase' },
];

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
  if (git(project, 'status', '--porcelain')) {
    return { action: 'failed', reason: 'The working tree is dirty. Commit or stash your changes, then run again.' };
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
  const runDir = `docs/runs/${branch}`;
  fs.mkdirSync(path.join(project, runDir), { recursive: true });
  fs.writeFileSync(path.join(project, runDir, 'task.md'), taskText.endsWith('\n') ? taskText : `${taskText}\n`);
  const run = { base, branch, spec: `${runDir}/task.md` };
  fs.writeFileSync(path.join(project, runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  return null;
}

function codeInputs(project, run) {
  const resolved = readJson(path.join(project, '.orchestra', 'resolved.json'));
  const config = readJson(path.join(project, '.orchestra', 'config.json')) || {};
  const stack = resolved && resolved.slots['stack-skills'];
  if (!stack) throw new Error('No resolved stack-skills slot. orchestra run resolves the slots first.');
  const inputs = { spec: run.spec, base: run.base, build: stack.declaration.build.run.replace(/\{plugin\}/g, stack.dir) };
  const guide = (stack.declaration.guides || {}).code;
  const disabled = (config['stack-skills'] || {}).disable || [];
  if (guide && !disabled.includes(guide)) inputs.guide = `${stack.plugin}:${guide}`;
  return inputs;
}

function next(project, taskFile) {
  if (taskFile !== undefined) {
    const failed = prepare(project, fs.readFileSync(path.resolve(project, taskFile), 'utf8'));
    if (failed) return failed;
  }
  const branch = git(project, 'branch', '--show-current');
  const runDir = `docs/runs/${branch}`;
  const run = branch.startsWith('task/') ? readJson(path.join(project, runDir, 'run.json')) : null;
  if (!run) return { action: 'failed', reason: `No run on branch "${branch}". Start a run with a task.` };
  for (const s of STAGES) {
    if (s.kind === 'phase') {
      const res = readJson(path.join(project, runDir, `phase-${s.name}.result.json`));
      if (res && res.status === 'ok') continue;
      return { action: 'phase', name: s.name, runDir };
    }
    const result = `${runDir}/${s.name}.result.json`;
    const file = path.join(project, result);
    let res = readResult(file);
    if (res && res.status === 'failed' && !reportOnce(file, res)) {
      fs.rmSync(file);
      res = null;
    }
    if (!res) return { action: 'dispatch', skill: `standard-workflow:${s.name}`, inputs: codeInputs(project, run), result, runDir };
    if (res.status === 'failed') return { action: 'failed', reason: res.reason || `Stage ${s.name} failed. See ${result}.`, runDir };
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
