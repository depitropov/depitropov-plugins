'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { next, slugify } = require('../../plugins/orc-standard-workflow/bin/next');

function project({ guides, disable, workflow = {} } = {}) {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'orc-standard-workflow', ...workflow }, 'stack-skills': { plugin: 'st', ...(disable ? { disable } : {}) } });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  writeJson(path.join(dir, '.orchestra/resolved.json'), {
    orchestra: { dir: '/orc' },
    slots: {
      workflow: { plugin: 'orc-standard-workflow', dir: '/p/wf', declaration: { config: { 'tasks-per-coder': { type: 'number', default: 2 } } } },
      'stack-skills': { plugin: 'st', dir: '/p/st', declaration: { build: { run: '{plugin}/mvnw -B verify' }, ...(guides ? { guides } : {}) } },
    },
  });
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n\nOrders over 100 get 10%.\n');
  return dir;
}

// Writes an ok result for the dispatched stage and returns the next action.
function pass(dir, a, extra = {}) {
  writeJson(path.join(dir, a.result), { stage: a.skill.split(':')[1], status: 'ok', ...extra });
  return next(dir);
}

test('slugify makes a safe branch name from any task text', () => {
  assert.equal(slugify('Add “discount” > 100!\nmore'), 'add-discount-100');
  assert.equal(slugify('!!!'), 'task');
  assert.equal(slugify('\n\n  Fix it  '), 'fix-it');
  const long = slugify('a'.repeat(30) + ' ' + 'b'.repeat(30));
  assert.ok(long.length <= 40 && !long.endsWith('-'));
});

test('a dirty tree stops the run before any branch is made', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'dirty.txt'), 'x');
  const a = next(dir, '.orchestra/task.txt');
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /dirty/);
  assert.equal(git(dir, 'branch', '--show-current'), 'main');
});

test('prepare makes the task branch and the run folder, then dispatches spec', () => {
  const dir = project();
  const base = git(dir, 'rev-parse', 'HEAD');
  const a = next(dir, '.orchestra/task.txt');
  const runDir = 'tmp/runs/task/add-a-discount';
  const docs = 'docs/runs/task/add-a-discount';
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, runDir, 'run.json'), 'utf8')), { base, branch: 'task/add-a-discount', spec: `${docs}/brief.md`, docs });
  assert.match(fs.readFileSync(path.join(dir, docs, 'task.md'), 'utf8'), /Orders over 100/);
  assert.deepEqual(a, {
    action: 'dispatch',
    skill: 'orc-standard-workflow:spec',
    inputs: { task: `${docs}/task.md`, base, notes: docs },
    result: `${runDir}/spec.result.json`,
    runDir,
  });
});

test('spec, plan and plan-check run in order with their inputs', () => {
  const dir = project();
  const docs = 'docs/runs/task/add-a-discount';
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.skill, 'orc-standard-workflow:plan');
  assert.deepEqual(plan.inputs, { spec: `${docs}/brief.md`, notes: docs });
  const check = pass(dir, plan);
  assert.equal(check.skill, 'orc-standard-workflow:plan-check');
  assert.deepEqual(check.inputs, { spec: `${docs}/brief.md`, plan: `${docs}/plan.md`, notes: docs });
  assert.equal(pass(dir, check, { tasks: 1 }).skill, 'orc-standard-workflow:code');
});

test('plan and plan-check get the plan guide, code gets the code guide, unless disabled', () => {
  const guides = { plan: 'plan-guide', code: 'code-guide' };
  const dir = project({ guides });
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.inputs.guide, 'st:plan-guide');
  const check = pass(dir, plan);
  assert.equal(check.inputs.guide, 'st:plan-guide');
  assert.equal(pass(dir, check, { tasks: 1 }).inputs.guide, 'st:code-guide');

  const off = project({ guides, disable: ['plan-guide', 'code-guide'] });
  const plan2 = pass(off, next(off, '.orchestra/task.txt'));
  assert.equal(plan2.inputs.guide, undefined);
});

test('a second run of the same task gets its own branch', () => {
  const dir = project();
  next(dir, '.orchestra/task.txt');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'run files');
  git(dir, 'checkout', 'main');
  fs.rmSync(path.join(dir, 'docs'), { recursive: true, force: true });
  next(dir, '.orchestra/task.txt');
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount-2');
});

test('after code, the three phases follow in order, then done', () => {
  const dir = project();
  const code = pass(dir, pass(dir, pass(dir, next(dir, '.orchestra/task.txt'))), { tasks: 1 });
  const runDir = code.runDir;
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  for (const phase of ['implementation-check', 'conventions-check', 'finish']) {
    assert.deepEqual(next(dir), { action: 'phase', name: phase, runDir });
    writeJson(path.join(dir, runDir, `phase-${phase}.result.json`), { stage: `phase-${phase}`, status: 'ok' });
  }
  assert.deepEqual(next(dir), { action: 'done', runDir });
});

test('no task on a branch without a run fails with a hint', () => {
  const a = next(project());
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /No run on branch "main"/);
});

test('a failed stage is reported once, then a resume dispatches it again', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'spec', status: 'failed', reason: 'no idea' });
  const f = next(dir);
  assert.equal(f.action, 'failed');
  assert.equal(f.reason, 'no idea');
  assert.equal(next(dir).skill, 'orc-standard-workflow:spec');
});

test('a malformed stage result names the file', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  fs.writeFileSync(path.join(dir, a.result), 'not json');
  const r = next(dir);
  assert.equal(r.action, 'failed');
  assert.match(r.reason, /Invalid result JSON in .*spec\.result\.json/);
});

test('a repo without origin/HEAD fails with the remedy', () => {
  const dir = project();
  git(dir, 'remote', 'set-head', 'origin', '-d');
  const a = next(dir, '.orchestra/task.txt');
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /git remote set-head origin -a/);
});

test('the dirty-tree failure names the dirty files', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'dirty.txt'), 'x');
  assert.match(next(dir, '.orchestra/task.txt').reason, /dirty\.txt/);
});
