'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGINS = path.join(__dirname, '../plugins');
const plugins = fs.readdirSync(PLUGINS);
const skills = plugins.flatMap(p => {
  const dir = path.join(PLUGINS, p, 'skills');
  return fs.existsSync(dir) ? fs.readdirSync(dir).map(s => ({ plugin: p, name: s, file: path.join(dir, s, 'SKILL.md') })) : [];
});
const REFERENCED = ['orchestra/run', 'orchestra/fixer', 'orchestra/triage', 'orc-standard-workflow/manifest', 'orc-standard-workflow/spec',
  'orc-standard-workflow/plan', 'orc-standard-workflow/plan-check', 'orc-standard-workflow/plan-conformance', 'orc-standard-workflow/code',
  'orc-standard-workflow/logic-review', 'orc-java-stack/manifest', 'orc-java-stack/fix-build'];

const { checkPlugin } = require('../plugins/orchestra/lib/check');

test('orchestra check passes on every plugin, and each plugin is named after its folder', () => {
  for (const p of plugins) {
    assert.deepEqual(checkPlugin(path.join(PLUGINS, p)), [], p);
    assert.equal(JSON.parse(fs.readFileSync(path.join(PLUGINS, p, 'plugin.json'), 'utf8')).name, p);
  }
});

test('every skill the code dispatches exists', () => {
  const have = skills.map(s => `${s.plugin}/${s.name}`);
  for (const r of REFERENCED) assert.ok(have.includes(r), `missing skill ${r}`);
});

test('shipped skills carry no ship.cars names', () => {
  for (const s of skills) assert.doesNotMatch(fs.readFileSync(s.file, 'utf8'), /cars\.ship|SC[A-Z]\w*Utils|scValue|LITE-/, s.file);
});

test('every judging skill takes its triage from orchestra:triage, not from its own copy', () => {
  const judging = [
    ...['plan-check', 'plan-conformance', 'logic-review'].map(n => ['orc-standard-workflow', n]),
    ...skills.filter(s => s.plugin === 'orc-java-stack' && s.name.startsWith('review-')).map(s => [s.plugin, s.name]),
  ];
  for (const [plugin, name] of judging) {
    const text = fs.readFileSync(path.join(PLUGINS, plugin, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(text, /invoke the skill\s+`orchestra:triage`/i, name);
    assert.doesNotMatch(text, /\*\*Noise\*\*: not a real problem/, `${name} still has its own bucket list`);
  }
});

test('the run skill stops when it cannot dispatch a subagent, and never does a stage itself', () => {
  const text = fs.readFileSync(path.join(PLUGINS, 'orchestra', 'skills', 'run', 'SKILL.md'), 'utf8');
  assert.match(text, /cannot dispatch a subagent, stop the run/);
  assert.doesNotMatch(text, /invoke the skill named in `skill` yourself/);
});

test('skill examples use no names from the sample task', () => {
  for (const s of skills) assert.doesNotMatch(fs.readFileSync(s.file, 'utf8'), /PriceCalculator|VIP|50\.00|discount/i, s.file);
});
