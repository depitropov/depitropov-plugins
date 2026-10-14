'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const wt = require('../../plugins/orchestra/lib/worktree');

test('create adds a detached worktree at origin/<default> and leaves the checkout alone', () => {
  const dir = makeRepo();
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const { root, base } = wt.create(dir);
  assert.equal(base, 'origin/main');
  assert.equal(root, fs.realpathSync(path.join(dir, wt.DIR, `.new-${process.pid}`)));
  assert.equal(git(root, 'branch', '--show-current'), '');
  assert.equal(git(root, 'rev-parse', 'HEAD'), git(dir, 'rev-parse', 'origin/main'));
  assert.equal(git(dir, 'branch', '--show-current'), 'main');
  assert.ok(fs.existsSync(path.join(dir, 'mine.txt')));
  assert.equal(fs.existsSync(path.join(root, 'mine.txt')), false);
});

test('create fails with a hint when origin/HEAD is not set', () => {
  const dir = makeRepo();
  git(dir, 'remote', 'set-head', 'origin', '-d');
  assert.match(wt.create(dir).failed, /git remote set-head origin -a/);
});

test('rename moves the worktree under the branch name, and find lists runs only', () => {
  const dir = makeRepo();
  const { root } = wt.create(dir);
  git(root, 'checkout', '-b', 'task/x');
  writeJson(path.join(root, 'tmp/runs/task/x/run.json'), {});
  const moved = wt.rename(dir, root, 'task/x');
  assert.equal(moved, path.join(fs.realpathSync(dir), wt.DIR, 'task/x'));
  const other = wt.create(dir).root;
  git(other, 'checkout', '-b', 'task/no-run');
  assert.deepEqual(wt.find(dir), [{ root: moved, branch: 'task/x' }]);
});

test('remove deletes a clean worktree and keeps the branch; it refuses untracked work', () => {
  const dir = makeRepo();
  const { root } = wt.create(dir);
  git(root, 'checkout', '-b', 'task/x');
  fs.mkdirSync(path.join(root, 'tmp'));
  fs.writeFileSync(path.join(root, 'tmp', 'state'), 'ignored');
  assert.equal(wt.remove(dir, root), null);
  assert.equal(fs.existsSync(root), false);
  assert.match(git(dir, 'branch', '--list', 'task/x'), /task\/x/);

  const kept = wt.create(dir).root;
  fs.writeFileSync(path.join(kept, 'work.txt'), 'x');
  assert.match(wt.remove(dir, kept), /untracked|modified/);
  assert.ok(fs.existsSync(path.join(kept, 'work.txt')));
});

test('create cleans a leftover detached .new- worktree of an earlier create', () => {
  const dir = makeRepo();
  assert.ok(wt.create(dir).root);
  const again = wt.create(dir);
  assert.ok(again.root, again.failed);
  assert.equal(git(dir, 'worktree', 'list', '--porcelain').split('\n').filter(l => l.includes('/.new-')).length, 1);
});

test('create fails, not throws, when origin is unreachable', () => {
  const dir = makeRepo();
  git(dir, 'remote', 'set-url', 'origin', '/nonexistent');
  assert.match(wt.create(dir).failed, /git fetch origin failed/);
});

test('rename returns the old root when the target folder already exists', () => {
  const dir = makeRepo();
  const { root } = wt.create(dir);
  git(root, 'checkout', '-b', 'task/x');
  fs.mkdirSync(path.join(dir, wt.DIR, 'task/x'), { recursive: true });
  fs.writeFileSync(path.join(dir, wt.DIR, 'task/x', 'f'), 'x');
  assert.equal(wt.rename(dir, root, 'task/x'), root);
});
