'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { resolve } = require('../../plugins/orchestra/lib/resolved');
const { drive } = require('../../plugins/orchestra/bin/drive');

const PLUGINS = path.join(__dirname, '../../plugins');

function project() {
  const dir = makeRepo();
  const st = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  writeJson(path.join(st, 'plugin.json'), { name: 'st', version: '0.0.1' });
  writeJson(path.join(st, 'orchestra.json'), { slot: 'stack-skills', build: { run: 'node -e "process.exit(0)"', guide: 'fix-build' }, gates: [] });
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'orc-standard-workflow' }, 'stack-skills': { plugin: 'st' } });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  resolve(dir, { workflow: path.join(PLUGINS, 'orc-standard-workflow'), 'stack-skills': st }, path.join(PLUGINS, 'orchestra'));
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n');
  return dir;
}

test('a run goes from task to done: code, logic-review, report, committed run files', () => {
  const dir = project();
  const code = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(code.skill, 'orc-standard-workflow:code');
  assert.match(code.prompt, /Invoke the skill `orc-standard-workflow:code`/);
  fs.writeFileSync(path.join(dir, 'Discount.java'), 'class Discount {}\n');
  git(dir, 'add', 'Discount.java');
  git(dir, 'commit', '-m', 'feat: discount');
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });

  const review = drive(dir);
  assert.equal(review.skill, 'orc-standard-workflow:logic-review');
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok', counts: { patch: 1 } });

  const done = drive(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.report, `${done.runDir}/report.md`);
  const report = fs.readFileSync(path.join(dir, done.report), 'utf8');
  assert.match(report, /- Status: done/);
  assert.match(report, /feat: discount/);
  assert.match(report, /orc-standard-workflow 0\.1\.0/);
  assert.match(report, /\| implementation-check\.logic-review \| ok \| patch 1 \|/);
  assert.equal(git(dir, 'log', '-1', '--format=%s'), 'orchestra: run state (done)');
  assert.equal(git(dir, 'status', '--porcelain'), '');
});

test('a Decide ends the call with the questions and a report that says how to answer', () => {
  const dir = project();
  const code = drive(dir, ['--task-file', '.orchestra/task.txt']);
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'decide', decide: ['Half up or half even? — options: up | even'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.deepEqual(stop.questions, ['Half up or half even? — options: up | even']);
  assert.match(fs.readFileSync(path.join(dir, stop.report), 'utf8'), /under the heading `## logic-review`/);
});

test('drive throws when resolved.json is missing; the CLI prints that as failed', () => {
  const dir = makeRepo();
  assert.throws(() => drive(dir), /No \.orchestra\/resolved\.json/);
});

test('work a subagent left uncommitted is committed before the next step', () => {
  const dir = project();
  const code = drive(dir, ['--task-file', '.orchestra/task.txt']);
  fs.writeFileSync(path.join(dir, 'Discount.java'), 'class Discount {}\n');
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  drive(dir);
  assert.match(git(dir, 'log', '--format=%s'), /orchestra: commit work left uncommitted/);
  assert.equal(git(dir, 'status', '--porcelain', '--', 'Discount.java'), '');
});

test('leftover changes on a branch without a run are not committed', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  drive(dir);
  assert.match(git(dir, 'status', '--porcelain'), /mine\.txt/);
});
