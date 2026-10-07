'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { changedFiles, commitAll, commitRunDir } = require('../../plugins/orchestra/lib/git');

test('changedFiles excludes run files and .orchestra', () => {
  const dir = makeRepo();
  const base = git(dir, 'rev-parse', 'HEAD');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/A.java'), 'class A {}\n');
  writeJson(path.join(dir, 'docs/runs/task/t/run.json'), { base });
  writeJson(path.join(dir, '.orchestra/config.json'), {});
  writeJson(path.join(dir, 'tmp/runs/task/t/run.json'), { base });
  git(dir, 'add', '-A', '-f');
  git(dir, 'commit', '-m', 'all');
  assert.deepEqual(changedFiles(dir, base), ['src/A.java']);
});

test('commitAll leaves run files out; commitRunDir commits only them', () => {
  const dir = makeRepo();
  fs.writeFileSync(path.join(dir, 'A.java'), 'class A {}\n');
  writeJson(path.join(dir, 'docs/runs/task/t/x.json'), {});
  assert.equal(commitAll(dir, 'code'), true);
  assert.equal(git(dir, 'show', '--name-only', '--format=', 'HEAD'), 'A.java');
  assert.equal(commitRunDir(dir, 'docs/runs/task/t', 'state'), true);
  assert.equal(git(dir, 'show', '--name-only', '--format=', 'HEAD'), 'docs/runs/task/t/x.json');
  assert.equal(commitAll(dir, 'nothing'), false);
});
