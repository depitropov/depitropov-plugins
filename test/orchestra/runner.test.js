'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { resolve } = require('../../plugins/orchestra/lib/resolved');
const runner = require('../../plugins/orchestra/lib/runner');

const ORCHESTRA = path.join(__dirname, '../../plugins/orchestra');
const OK = 'node -e "process.exit(0)"';

function setup({ build = OK, maxRounds = 1, stackGates = [], workflowGates = [] } = {}) {
  const dir = makeRepo();
  const plugins = fs.mkdtempSync(path.join(os.tmpdir(), 'plugins-'));
  const mk = (name, declaration) => {
    const d = path.join(plugins, name);
    writeJson(path.join(d, 'plugin.json'), { name, version: '0.0.1' });
    writeJson(path.join(d, 'orchestra.json'), declaration);
    return d;
  };
  const wf = mk('wf', { slot: 'workflow', gates: workflowGates });
  const st = mk('st', { slot: 'stack-skills', build: { run: build, guide: 'fix-build', max_rounds: maxRounds }, gates: stackGates });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } };
  writeJson(path.join(dir, '.orchestra/config.json'), config);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  const resolved = resolve(dir, { workflow: wf, 'stack-skills': st }, ORCHESTRA);
  const base = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'checkout', '-b', 'task/t');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/Car.java'), '@Entity class Car {}\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'code');
  const runDir = 'docs/runs/task/t';
  writeJson(path.join(dir, runDir, 'run.json'), { base, branch: 'task/t', spec: `${runDir}/task.md` });
  return {
    dir,
    runDir,
    step: phase => runner.step({ project: dir, runDir, phase, resolved, config }),
    write: (rel, data) => writeJson(path.join(dir, rel), data),
    read: rel => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')),
  };
}

const logicReview = { name: 'logic-review', phase: 'implementation-check', kind: 'agent', skill: 'logic-review', always: true };

test('implementation-check runs the build, then dispatches the agent gate', () => {
  const t = setup({ workflowGates: [logicReview] });
  const a = t.step('implementation-check');
  assert.equal(a.action, 'dispatch');
  assert.equal(a.skill, 'wf:logic-review');
  assert.equal(a.result, `${t.runDir}/implementation-check.logic-review.result.json`);
  assert.equal(a.inputs.spec, `${t.runDir}/task.md`);
  assert.equal(a.inputs.decisions, undefined);
  assert.equal(t.read(`${t.runDir}/implementation-check.build.result.json`).status, 'ok');
  t.write(a.result, { stage: 'logic-review', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
});

test('a dispatch with no result is sent again on the next step', () => {
  const t = setup({ workflowGates: [logicReview] });
  assert.deepEqual(t.step('implementation-check'), t.step('implementation-check'));
});

test('a red build dispatches the fixer, and a fixed build lets the phase go on', () => {
  const t = setup({ build: `node -e "process.exit(require('fs').existsSync('fixed') ? 0 : 1)"` });
  const a = t.step('implementation-check');
  assert.equal(a.skill, 'orchestra:fixer');
  assert.equal(a.inputs.guide, 'st:fix-build');
  assert.equal(a.inputs.output, `${t.runDir}/implementation-check.build.run0.log`);
  assert.equal(a.result, `${t.runDir}/implementation-check.build.fix1.result.json`);
  assert.deepEqual(t.step('implementation-check'), a);
  fs.writeFileSync(path.join(t.dir, 'fixed'), '');
  t.write(a.result, { stage: 'fixer', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
});

test('a build still red after max_rounds fails the phase', () => {
  const t = setup({ build: 'node -e "process.exit(1)"', maxRounds: 1 });
  const a = t.step('implementation-check');
  t.write(a.result, { stage: 'fixer', status: 'ok' });
  const r = t.step('implementation-check');
  assert.equal(r.status, 'failed');
  assert.match(r.reason, /build still fails after 1 fix round/);
});

test('a tool gate still red after max_rounds goes to Evaluate and the phase goes on', () => {
  const crap = { name: 'crap', phase: 'implementation-check', kind: 'tool', run: 'node -e "process.exit(2)"', fix: 'fixer', guide: 'fix-crap', max_rounds: 1, files: '**/*.java' };
  const t = setup({ stackGates: [crap] });
  const a = t.step('implementation-check');
  assert.equal(a.inputs.guide, 'st:fix-crap');
  t.write(a.result, { stage: 'fixer', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
  assert.equal(t.read(`${t.runDir}/implementation-check.crap.result.json`).status, 'evaluate');
});

test('a missing command counts as a failure, not a crash', () => {
  const lint = { name: 'lint', phase: 'conventions-check', kind: 'tool', run: 'definitely-not-a-command-xyz', files: '**/*.java' };
  const t = setup({ stackGates: [lint] });
  assert.equal(t.step('conventions-check').status, 'ok');
  assert.equal(t.read(`${t.runDir}/conventions-check.lint.result.json`).status, 'evaluate');
});

test('selection skips gates that do not match and records why', () => {
  const gate = (name, rule) => ({ name, phase: 'conventions-check', kind: 'agent', skill: `review-${name}`, ...rule });
  const t = setup({ stackGates: [gate('entities', { files: '**/*.java', grep: '@Entity' }), gate('dtos', { grep: '@Dto' }), gate('sql', { files: '**/*.sql' })] });
  const a = t.step('conventions-check');
  assert.equal(a.skill, 'st:review-entities');
  const state = t.read(`${t.runDir}/conventions-check.state.json`);
  assert.deepEqual(state.skipped.map(s => s.name), ['dtos', 'sql']);
});

test('finish runs the agent gates before the final build', () => {
  const comments = { name: 'comments', phase: 'finish', kind: 'agent', skill: 'review-comments', always: true };
  const t = setup({ build: `node -e "require('fs').writeFileSync('built', '')"`, stackGates: [comments] });
  const a = t.step('finish');
  assert.equal(a.skill, 'st:review-comments');
  assert.equal(fs.existsSync(path.join(t.dir, 'built')), false);
  t.write(a.result, { stage: 'comments', status: 'ok' });
  assert.equal(t.step('finish').status, 'ok');
  assert.equal(fs.existsSync(path.join(t.dir, 'built')), true);
});

test('a self-fixing tool commits its changes', () => {
  const spotless = { name: 'spotless', phase: 'finish', kind: 'tool', run: `node -e "require('fs').appendFileSync('src/Car.java', '// formatted')"`, fix: 'self', always: true };
  const t = setup({ stackGates: [spotless] });
  assert.equal(t.step('finish').status, 'ok');
  assert.equal(git(t.dir, 'log', '-1', '--format=%s'), 'orchestra: spotless (finish)');
});

test('a Decide stops the phase until decisions.md answers that gate', () => {
  const t = setup({ workflowGates: [logicReview] });
  const a = t.step('implementation-check');
  t.write(a.result, { stage: 'logic-review', status: 'decide', decide: ['Round half up or half even? — options: up | even'] });
  assert.deepEqual(t.step('implementation-check'), { status: 'decide', gate: 'logic-review', questions: ['Round half up or half even? — options: up | even'] });
  const decisions = path.join(t.dir, t.runDir, 'decisions.md');
  fs.writeFileSync(decisions, '## other-gate\nup\n');
  assert.equal(t.step('implementation-check').status, 'decide');
  fs.appendFileSync(decisions, '## logic-review\nup\n');
  const again = t.step('implementation-check');
  assert.equal(again.action, 'dispatch');
  assert.equal(again.inputs.decisions, `${t.runDir}/decisions.md`);
  t.write(again.result, { stage: 'logic-review', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
});
