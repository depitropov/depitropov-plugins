'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, writePlugin } = require('../helpers');
const { resolve, load } = require('../../plugins/orchestra/lib/resolved');

const plugin = (name, declaration) => writePlugin(fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)), name, declaration);
const ST = { slot: 'stack-skills', build: { run: 'make', guide: 'fix-build' } };

function project() {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } });
  return dir;
}

test('writes the declarations, folders and versions of every slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'workflow', gates: [] });
  const st = plugin('st', ST);
  resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc');
  const r = load(dir);
  assert.equal(r.orchestra.dir, '/orc');
  assert.equal(r.slots.workflow.dir, wf);
  assert.equal(r.slots['stack-skills'].version, '0.0.1');
  assert.equal(r.slots['stack-skills'].declaration.build.run, 'make');
});

test('runs orchestra check on the config and throws every failure', () => {
  const dir = project();
  const other = plugin('other', { slot: 'workflow' });
  const st = plugin('st', { slot: 'stack-skills', build: { run: 'make' } });
  assert.throws(() => resolve(dir, { workflow: other, 'stack-skills': st }, '/orc'), e =>
    /names wf, but the resolved folder holds other/.test(e.message) && /build "guide" names no skill/.test(e.message));
});

test('fails when a plugin declares another slot, or a slot of the config has no folder', () => {
  const dir = project();
  const st = plugin('st', ST);
  assert.throws(() => resolve(dir, { workflow: plugin('wf', ST), 'stack-skills': st }, '/orc'), /"slot" is stack-skills, but it fills the workflow slot/);
  assert.throws(() => resolve(dir, { workflow: plugin('wf', { slot: 'workflow' }) }, '/orc'), /the stack-skills plugin st is not resolved/);
});

test('fails with the init hint when there is no config', () => {
  assert.throws(() => resolve(makeRepo(), {}, '/orc'), /Run orchestra init first/);
});

test('a broken JSON file names itself and the fix', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, '.orchestra/config.json'), '{ nope');
  assert.throws(() => resolve(dir, {}, '/orc'), /config\.json is not valid JSON: .+\. Fix: correct the JSON\./);
});
