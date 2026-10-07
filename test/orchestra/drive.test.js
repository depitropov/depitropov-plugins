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

// Walks spec, plan and plan-check with ok results, and returns the first code dispatch.
function toCode(dir, tasks = 1) {
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  for (const stage of ['spec', 'plan']) {
    assert.equal(a.skill, `orc-standard-workflow:${stage}`);
    writeJson(path.join(dir, a.result), { stage, status: 'ok' });
    a = drive(dir);
  }
  assert.equal(a.skill, 'orc-standard-workflow:plan-check');
  const tasks_ = Array.from({ length: tasks }, (_, i) => `### T${i + 1} — a task\n`).join('\n');
  fs.writeFileSync(path.join(dir, a.inputs.plan), `# Plan\n\n${tasks_}`);
  writeJson(path.join(dir, a.result), { stage: 'plan-check', status: 'ok', counts: { patch: 1 } });
  return drive(dir);
}

test('a run goes from task to done: code, logic-review, report, committed run files', () => {
  const dir = project();
  const code = toCode(dir);
  assert.equal(code.skill, 'orc-standard-workflow:code');
  assert.equal(code.branch, 'task/add-a-discount');
  assert.match(code.prompt, /Invoke the skill `orc-standard-workflow:code`/);
  fs.writeFileSync(path.join(dir, 'Discount.java'), 'class Discount {}\n');
  git(dir, 'add', 'Discount.java');
  git(dir, 'commit', '-m', 'feat: discount');
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok', assumptions: ['The limit applies before rounding.'] });

  const review = drive(dir);
  assert.equal(review.skill, 'orc-standard-workflow:logic-review');
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok', counts: { patch: 1, evaluate: 1 }, evaluate: ['PriceCalculator.java:9 — null now throws; before it returned null'] });

  const done = drive(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.branch, 'task/add-a-discount');
  assert.equal(done.report, 'docs/runs/task/add-a-discount/report.md');
  assert.match(git(dir, 'ls-files', 'docs/runs'), /report\.md/);
  assert.match(git(dir, 'ls-files', 'docs/runs'), /task\.md/);
  assert.equal(git(dir, 'ls-files', 'tmp'), '');
  const report = fs.readFileSync(path.join(dir, done.report), 'utf8');
  assert.match(report, /- Status: done/);
  assert.match(report, /feat: discount/);
  assert.match(report, /orc-standard-workflow 0\.5\.0/);
  assert.match(report, /\| implementation-check\.logic-review \| ok \| patch 1, evaluate 1 \|/);
  assert.equal(git(dir, 'log', '-1', '--format=%s'), 'orchestra: run notes (done)');
  assert.equal(git(dir, 'status', '--porcelain'), '');
  assert.match(report, /- implementation-check\.logic-review: PriceCalculator\.java:9 — null now throws/);
  assert.match(report, /## Assumptions\n\n- code-1: The limit applies before rounding\./);
  assert.match(report, /\| phase-conventions-check \| ok \(no gates\) \|/);
  const order = ['| spec |', '| plan |', '| plan-check |', '| code-1 |', '| implementation-check.build |', '| implementation-check.logic-review |',
    '| phase-implementation-check |', '| phase-conventions-check |', '| finish.build |', '| phase-finish |'].map(row => report.indexOf(row));
  assert.ok(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), `rows out of run order: ${order}`);
});

test('a Decide ends the call with the questions and a report that says how to answer', () => {
  const dir = project();
  const code = toCode(dir);
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'decide', decide: ['Half up or half even? — options: up | even'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.deepEqual(stop.questions, ['Half up or half even? — options: up | even']);
  assert.match(fs.readFileSync(path.join(dir, stop.report), 'utf8'), /Add a new section `## logic-review`/);
});

test('drive throws when resolved.json is missing; the CLI prints that as failed', () => {
  const dir = makeRepo();
  assert.throws(() => drive(dir), /No \.orchestra\/resolved\.json/);
});

test('work a subagent left uncommitted is committed before the next step', () => {
  const dir = project();
  const code = toCode(dir);
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

test('a plan-check Decide ends the call before any code, with how to answer', () => {
  const dir = project();
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  writeJson(path.join(dir, a.result), { stage: 'spec', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(dir, a.result), { stage: 'plan', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(dir, a.result), { stage: 'plan-check', status: 'decide', decide: ['business fact: the rate? — options: 5% | 10%'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  const text = fs.readFileSync(path.join(dir, stop.report), 'utf8');
  assert.match(text, /Add a new section `## plan-check` at the end of `docs\/runs\/task\/add-a-discount\/decisions\.md`/);
  assert.match(text, /Text added to an old section is not read as an answer/);
});

test('chunked code steps keep run order in the report', () => {
  const dir = project();
  const c1 = toCode(dir, 3);
  writeJson(path.join(dir, c1.result), { stage: 'code', status: 'ok' });
  const c3 = drive(dir);
  assert.match(c3.result, /code-3\.result\.json$/);
  writeJson(path.join(dir, c3.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok' });
  const report = fs.readFileSync(path.join(dir, drive(dir).report), 'utf8');
  const order = ['| spec |', '| plan |', '| plan-check |', '| code-1 |', '| code-3 |'].map(row => report.indexOf(row));
  assert.ok(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), `rows out of run order: ${order}`);
});

test('the report copies decisions.md, with its headings one level down', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(dir, 'docs/runs/task/add-a-discount/decisions.md'), '## business-facts\n\nThe VIP rate is 10%.\n');
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok' });
  const report = fs.readFileSync(path.join(dir, drive(dir).report), 'utf8');
  assert.match(report, /## Decisions\n\n### business-facts\n\nThe VIP rate is 10%\./);
  assert.doesNotMatch(report, /^## business-facts$/m);
});

test('a resume with changed files stops and names them, and commits nothing', () => {
  const dir = project();
  toCode(dir);
  const head = git(dir, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const a = drive(dir, [], { resume: true });
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /mine\.txt/);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
});

test('a resume with only notes changed goes on', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(dir, 'docs/runs/task/add-a-discount/decisions.md'), '## plan-check\n\nok\n');
  assert.equal(drive(dir, [], { resume: true }).skill, code.skill);
});
