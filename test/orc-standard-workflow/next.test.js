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

const DOCS = 'docs/runs/task/add-a-discount';

function writePlan(dir, headings) {
  fs.writeFileSync(path.join(dir, DOCS, 'plan.md'), `# Plan\n\n## Tasks\n\n${headings.map(h => `### ${h} — a task\n`).join('\n')}`);
}

// Writes a plan with tasks T1..Tn, then passes plan-check.
function checked(dir, check, n) {
  writePlan(dir, Array.from({ length: n }, (_, i) => `T${i + 1}`));
  return pass(dir, check);
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
  assert.equal(checked(dir, check, 1).skill, 'orc-standard-workflow:code');
});

test('plan and plan-check get the plan guide, code gets the code guide, unless disabled', () => {
  const guides = { plan: 'plan-guide', code: 'code-guide' };
  const dir = project({ guides });
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.inputs.guide, 'st:plan-guide');
  const check = pass(dir, plan);
  assert.equal(check.inputs.guide, 'st:plan-guide');
  assert.equal(checked(dir, check, 1).inputs.guide, 'st:code-guide');

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
  const code = checked(dir, pass(dir, pass(dir, next(dir, '.orchestra/task.txt'))), 1);
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

function toPlanCheck(dir) {
  return pass(dir, pass(dir, next(dir, '.orchestra/task.txt')));
}

function answer(dir, heading, text) {
  const file = path.join(dir, 'docs/runs/task/add-a-discount/decisions.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `## ${heading}\n\n${text}\n\n`);
}

test('a plan-check Decide stops the run until decisions.md answers plan-check', () => {
  const dir = project();
  const check = toPlanCheck(dir);
  const q = 'business fact: the VIP rate? — options: 5% | 10%';
  writeJson(path.join(dir, check.result), { stage: 'plan-check', status: 'decide', decide: [q] });
  assert.deepEqual(next(dir), { action: 'decide', gate: 'plan-check', questions: [q], runDir: check.runDir });
  assert.equal(next(dir).action, 'decide');

  answer(dir, 'logic-review', 'not for plan-check');
  assert.equal(next(dir).action, 'decide');

  answer(dir, 'plan-check', '10%');
  const again = next(dir);
  assert.equal(again.skill, 'orc-standard-workflow:plan-check');
  assert.equal(again.inputs.decisions, 'docs/runs/task/add-a-discount/decisions.md');
});

test('a used answer does not start plan-check again after a second Decide', () => {
  const dir = project();
  const check = toPlanCheck(dir);
  writeJson(path.join(dir, check.result), { stage: 'plan-check', status: 'decide', decide: ['a?'] });
  next(dir);
  answer(dir, 'plan-check', 'a');
  next(dir);
  writeJson(path.join(dir, check.result), { stage: 'plan-check', status: 'decide', decide: ['b?'] });
  assert.deepEqual(next(dir).questions, ['b?']);
  assert.deepEqual(next(dir).questions, ['b?']);
  answer(dir, 'plan-check', 'b');
  assert.equal(next(dir).action, 'dispatch');
});

function writeBrief(dir, text) {
  fs.writeFileSync(path.join(dir, DOCS, 'brief.md'), text);
}

test('business facts in the brief stop the run after the spec', () => {
  const dir = project();
  const spec = next(dir, '.orchestra/task.txt');
  writeBrief(dir, '# Brief\n\n## Assumptions\n- Rounding is half up.\n- business fact: the VIP rate — options: 5% | 10%\n  - business fact: the fee — options: 4.99 | 5.99\n');
  writeJson(path.join(dir, spec.result), { stage: 'spec', status: 'ok' });
  assert.deepEqual(next(dir), {
    action: 'decide',
    gate: 'business-facts',
    questions: ['business fact: the VIP rate — options: 5% | 10%', 'business fact: the fee — options: 4.99 | 5.99'],
    runDir: spec.runDir,
  });
  answer(dir, 'plan-check', 'not for business facts');
  assert.equal(next(dir).action, 'decide');
  answer(dir, 'business-facts', 'The VIP rate is 10%. The fee is 4.99.');
  const plan = next(dir);
  assert.equal(plan.skill, 'orc-standard-workflow:plan');
  assert.equal(plan.inputs.decisions, `${DOCS}/decisions.md`);
});

test('a brief that only mentions business facts in prose does not stop the run', () => {
  const dir = project();
  const spec = next(dir, '.orchestra/task.txt');
  writeBrief(dir, '# Brief\n\nNo business fact: is open here.\n- Rounding is half up.\n');
  assert.equal(pass(dir, spec).skill, 'orc-standard-workflow:plan');
});

test('a stage gets no decisions input while decisions.md does not exist', () => {
  const dir = project();
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.inputs.decisions, undefined);
  answer(dir, 'logic-review', 'x');
  assert.equal(pass(dir, plan).inputs.decisions, `${DOCS}/decisions.md`);
});

test('the code stage runs in chunks of tasks-per-coder, default 2', () => {
  const dir = project();
  const c1 = checked(dir, toPlanCheck(dir), 3);
  assert.equal(c1.result, `${c1.runDir}/code-1.result.json`);
  assert.equal(c1.inputs.from, 1);
  assert.equal(c1.inputs.to, 2);
  const c3 = pass(dir, c1);
  assert.equal(c3.result, `${c1.runDir}/code-3.result.json`);
  assert.equal(c3.inputs.from, 3);
  assert.equal(c3.inputs.to, 3);
  assert.equal(pass(dir, c3).action, 'phase');
});

test('the project config overrides tasks-per-coder', () => {
  const dir = project({ workflow: { 'tasks-per-coder': 1 } });
  let a = checked(dir, toPlanCheck(dir), 2);
  assert.deepEqual([a.inputs.from, a.inputs.to], [1, 1]);
  a = pass(dir, a);
  assert.deepEqual([a.inputs.from, a.inputs.to], [2, 2]);
});

test('a bad tasks-per-coder value fails with the key name', () => {
  for (const bad of [0, -1, 1.5, '2']) {
    assert.throws(() => next(project({ workflow: { 'tasks-per-coder': bad } }), '.orchestra/task.txt'), /tasks-per-coder/);
  }
});

test('a plan without tasks T1..Tn in order fails, then plan-check runs again', () => {
  for (const headings of [null, [], ['T1', 'T3'], ['T2']]) {
    const dir = project();
    const check = toPlanCheck(dir);
    if (headings) writePlan(dir, headings);
    const a = pass(dir, check);
    assert.equal(a.action, 'failed', JSON.stringify(headings));
    assert.match(a.reason, /plan\.md has no tasks numbered T1, T2/);
    assert.equal(next(dir).skill, 'orc-standard-workflow:plan-check');
  }
});

test('the dirty-tree failure names a changed tracked file in full', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'README.md'), 'changed\n');
  assert.match(next(dir, '.orchestra/task.txt').reason, /dirty: README\.md/);
});
