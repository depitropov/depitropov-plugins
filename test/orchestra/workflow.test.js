'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeJson } = require('../helpers');
const wf = require('../../plugins/orchestra/lib/workflow');

function project(config = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-wf-'));
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, ...config });
  writeJson(path.join(dir, '.orchestra/resolved.json'), {
    orchestra: { dir: '/orc' },
    slots: {
      workflow: { plugin: 'wf', dir: '/p/wf', declaration: { slot: 'workflow', config: { 'tasks-per-coder': { type: 'number', default: 2 } } } },
      'stack-skills': { plugin: 'st', dir: '/p/st', declaration: { slot: 'stack-skills', build: { run: '{plugin}/mvnw -B verify', guide: 'fix-build' } } },
    },
  });
  return dir;
}

test('settings gives the build that the engine runs, with the project override', () => {
  assert.equal(wf.settings(project()).build, '/p/st/mvnw -B verify');
  assert.equal(wf.settings(project({ 'stack-skills': { plugin: 'st', build: { run: 'make all' } } })).build, 'make all');
});

test('settings gives the workflow config values with their defaults', () => {
  assert.equal(wf.settings(project()).config['tasks-per-coder'], 2);
  assert.equal(wf.settings(project({ workflow: { plugin: 'wf', 'tasks-per-coder': 3 } })).config['tasks-per-coder'], 3);
});

test('newAnswer records seen once, then sees only a new section', () => {
  const dir = project();
  const file = path.join(dir, 'x.result.json');
  const res = { status: 'decide', decide: ['q?'] };
  writeJson(file, res);
  assert.equal(wf.newAnswer(file, res, dir, 'x'), false);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(saved.seen, 0);
  assert.equal(wf.newAnswer(file, saved, dir, 'x'), false);
  fs.writeFileSync(path.join(dir, 'decisions.md'), '## x\n\n- q? → yes\n');
  assert.equal(wf.newAnswer(file, saved, dir, 'x'), true);
});

test('phaseDone reads the phase result that writePhaseResult writes', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, 'tmp/runs/task/x'), { recursive: true });
  assert.equal(wf.phaseDone(dir, 'tmp/runs/task/x', 'finish'), false);
  wf.writePhaseResult(dir, 'tmp/runs/task/x', 'finish', { status: 'report' });
  assert.equal(wf.phaseDone(dir, 'tmp/runs/task/x', 'finish'), false);
  wf.writePhaseResult(dir, 'tmp/runs/task/x', 'finish', { status: 'ok' });
  assert.equal(wf.phaseDone(dir, 'tmp/runs/task/x', 'finish'), true);
});
