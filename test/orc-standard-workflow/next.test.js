'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { next, slugify } = require('../../plugins/orc-standard-workflow/bin/next');

function project({ guides, disable } = {}) {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'orc-standard-workflow' }, 'stack-skills': { plugin: 'st', ...(disable ? { disable } : {}) } });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  writeJson(path.join(dir, '.orchestra/resolved.json'), {
    orchestra: { dir: '/orc' },
    slots: { 'stack-skills': { plugin: 'st', dir: '/p/st', declaration: { build: { run: '{plugin}/mvnw -B verify' }, ...(guides ? { guides } : {}) } } },
  });
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n\nOrders over 100 get 10%.\n');
  return dir;
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

test('prepare makes the task branch and the run folder, then dispatches code', () => {
  const dir = project();
  const base = git(dir, 'rev-parse', 'HEAD');
  const a = next(dir, '.orchestra/task.txt');
  const runDir = 'tmp/runs/task/add-a-discount';
  const docs = 'docs/runs/task/add-a-discount';
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, runDir, 'run.json'), 'utf8')), { base, branch: 'task/add-a-discount', spec: `${docs}/task.md`, docs });
  assert.match(fs.readFileSync(path.join(dir, docs, 'task.md'), 'utf8'), /Orders over 100/);
  assert.deepEqual(a, {
    action: 'dispatch',
    skill: 'orc-standard-workflow:code',
    inputs: { spec: `${docs}/task.md`, base, build: '/p/st/mvnw -B verify', notes: docs },
    result: `${runDir}/code.result.json`,
    runDir,
  });
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
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'code', status: 'ok' });
  for (const phase of ['implementation-check', 'conventions-check', 'finish']) {
    assert.deepEqual(next(dir), { action: 'phase', name: phase, runDir: a.runDir });
    writeJson(path.join(dir, a.runDir, `phase-${phase}.result.json`), { stage: `phase-${phase}`, status: 'ok' });
  }
  assert.deepEqual(next(dir), { action: 'done', runDir: a.runDir });
});

test('a failed code stage fails the run', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'code', status: 'failed' });
  assert.equal(next(dir).action, 'failed');
});

test('the code guide is passed when declared and not disabled', () => {
  assert.equal(next(project({ guides: { code: 'code-guide' } }), '.orchestra/task.txt').inputs.guide, 'st:code-guide');
  assert.equal(next(project({ guides: { code: 'code-guide' }, disable: ['code-guide'] }), '.orchestra/task.txt').inputs.guide, undefined);
});

test('no task on a branch without a run fails with a hint', () => {
  const a = next(project());
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /No run on branch "main"/);
});

test('a failed code stage is reported once, then a resume dispatches code again', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'code', status: 'failed' });
  assert.equal(next(dir).action, 'failed');
  assert.equal(next(dir).action, 'dispatch');
});

test('a malformed code result names the file', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  fs.writeFileSync(path.join(dir, a.result), 'not json');
  const r = next(dir);
  assert.equal(r.action, 'failed');
  assert.match(r.reason, /Invalid result JSON in .*code\.result\.json/);
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
