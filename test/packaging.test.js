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
  'orc-standard-workflow/logic-review', 'orc-global-gates/clean-code', 'orc-global-gates/manifest', 'orc-java-stack/manifest', 'orc-java-stack/fix-build'];

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
    ['orc-global-gates', 'clean-code'],
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
  assert.match(text, /- `inline`: do this one yourself, in this session, not in a subagent\./);
});

test('skill examples use no names from the sample task', () => {
  for (const s of skills) assert.doesNotMatch(fs.readFileSync(s.file, 'utf8'), /PriceCalculator|VIP|50\.00|discount/i, s.file);
});

test('the skill writing-plugins explains every word of the contract that check.js knows', () => {
  const check = require('../plugins/orchestra/lib/check');
  const text = fs.readFileSync(path.join(PLUGINS, 'orchestra/skills/writing-plugins/SKILL.md'), 'utf8');
  const words = new Set([
    ...check.SLOTS, ...check.KINDS, ...check.FIXES, ...check.CONFIG_TYPES, ...Object.values(check.DECLARATION_KEYS).flat(),
    ...check.GATE_KEYS, ...check.BUILD_KEYS, ...check.MEASURE_KEYS, ...check.SETUP_KEYS, ...check.ROLES, ...check.SECTION_KEYS, ...check.PHASES, ...check.ACTIONS,
  ]);
  const quoted = [...text.matchAll(/`([^`]+)`/g)].map(m => m[1]).join('\n');
  for (const w of words) assert.match(quoted, new RegExp(`(^|[^\\w-])${w}([^\\w-]|$)`, 'm'), `writing-plugins does not explain \`${w}\``);
});

test('the clean-code gate asks for the measure and warns when the stack has none', () => {
  const wf = JSON.parse(fs.readFileSync(path.join(PLUGINS, 'orc-standard-workflow', 'orchestra.json'), 'utf8'));
  assert.equal(wf.gates.find(g => g.name === 'clean-code'), undefined);
  const d = JSON.parse(fs.readFileSync(path.join(PLUGINS, 'orc-global-gates', 'orchestra.json'), 'utf8'));
  const gate = d.gates.find(g => g.name === 'clean-code');
  assert.deepEqual(gate, { name: 'clean-code', phase: 'implementation-check', kind: 'agent', skill: 'clean-code', always: true, measure: true });
  const text = fs.readFileSync(path.join(PLUGINS, 'orc-global-gates', 'skills', 'clean-code', 'SKILL.md'), 'utf8');
  assert.match(text, /No shape measurement: the Stack Skills plugin declares no measure/);
  assert.match(text, /broken measurement/);
});
