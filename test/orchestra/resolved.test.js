'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson } = require('../helpers');
const { resolve, load } = require('../../plugins/orchestra/lib/resolved');

function plugin(name, declaration) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  writeJson(path.join(dir, 'plugin.json'), { name, version: '1.2.3' });
  writeJson(path.join(dir, 'orchestra.json'), declaration);
  return dir;
}

function project() {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } });
  return dir;
}

test('writes the declarations, folders and versions of every slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'workflow', gates: [] });
  const st = plugin('st', { slot: 'stack-skills', build: { run: 'make' } });
  resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc');
  const r = load(dir);
  assert.equal(r.orchestra.dir, '/orc');
  assert.equal(r.slots.workflow.dir, wf);
  assert.equal(r.slots['stack-skills'].version, '1.2.3');
  assert.equal(r.slots['stack-skills'].declaration.build.run, 'make');
});

test('fails when a folder holds another plugin than the config names', () => {
  const dir = project();
  const wf = plugin('other', { slot: 'workflow' });
  const st = plugin('st', { slot: 'stack-skills' });
  assert.throws(() => resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc'), /config names wf/);
});

test('fails when a plugin declares another slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'stack-skills' });
  const st = plugin('st', { slot: 'stack-skills' });
  assert.throws(() => resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc'), /declares slot stack-skills/);
});

test('fails when a slot of the config has no folder, or a folder has no slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'workflow' });
  const st = plugin('st', { slot: 'stack-skills' });
  assert.throws(() => resolve(dir, { workflow: wf }, '/orc'), /no plugin folder/);
  assert.throws(() => resolve(dir, { workflow: wf, 'stack-skills': st, curator: st }, '/orc'), /not in the config/);
});
