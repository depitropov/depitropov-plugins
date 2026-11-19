'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '../../plugins/orchestra', rel), 'utf8');

const ROOT = path.join(__dirname, '../..');
const walk = (dir, re) => fs.readdirSync(path.join(ROOT, dir), { recursive: true }).filter(f => re.test(f)).map(f => path.join(ROOT, dir, f));

const TRIAGE_METHOD = /\b(Origin|Fix-Risk|Probability|Impact|B1|B2|Decide test|axes)\b|🔴|🟡/;
test('judging.md defines the four buckets, the stop and the result', () => {
  const t = read('contract/judging.md');
  for (const b of ['Decide', 'Fix', 'Report', 'Noise']) assert.match(t, new RegExp(`\\*\\*${b}\\*\\*`));
  assert.match(t, /An answered Decide is Fix/);
  assert.match(t, /"decide": \[\][\s\S]*"fix": \[\][\s\S]*"report": \[\][\s\S]*"noise": \[\][\s\S]*"notes"/);
  assert.match(t, /`shared-role\.triage`/);
  assert.doesNotMatch(t, /counts|Patch|Evaluate/);
  assert.doesNotMatch(t, /Never ask the user/);
});
test('agent-gate.md starts from judging.md and holds the gate rules', () => {
  const t = read('contract/agent-gate.md');
  assert.match(t, /Read `dispatch\.md` and `judging\.md` first\./);
  assert.doesNotMatch(t, /Do not push|Do not stage|the pipe hides/);
  assert.match(t, /fix\(<gate>\): <summary>/);
  assert.match(t, /When a test fails after your fix, undo that fix and record the finding as Report/);
  assert.match(t, /pre-commit hook/);
  assert.match(t, /`finish` phase/);
  assert.match(t, /The project's code wins/);
  assert.match(t, /The last paragraph of your `## Scope` may say where this does not apply\./);
  assert.match(read('skills/writing-plugins/SKILL.md'), /Its last paragraph may turn off "The project's code wins"/);
  assert.match(t, /Read the project's `AGENTS\.md` and `CLAUDE\.md` files: at the root, and in each folder that\s+the change touches\./);
  assert.match(t, /Your skill may give its own title form\./);
  assert.match(read('contract/judging.md'), /`<step>` is the name of your step; a gate's is its `gate` input\./);
  assert.match(t, /▸ Rule <n>: <title>/);
  assert.match(t, /A file `references\/<name>\.md` of your skill numbers its rules from 1\. Cite such a rule as `<gate>:<name>:<n>`/);
  assert.match(t, /- `phase`: the phase the gate runs in: `implementation-check`, `conventions-check` or `finish`/);
  assert.match(t, /When you fixed nothing, do not commit/);
  assert.match(t, /When a step of your skill says it comes before the change, do that step first\./);
});
test('orchestra skills and lib use no triage method words', () => {
  for (const f of walk('plugins/orchestra', /\.(md|js)$/)) assert.doesNotMatch(read(f), TRIAGE_METHOD, f);
});
test('writing-plugins describes the gate skill shape and the judging flag', () => {
  const t = read('skills/writing-plugins/SKILL.md');
  assert.match(t, /^## A gate skill$/m);
  for (const h of ['`## Scope`, required', '`## Steps`: extra check steps', '`## Rules`: numbered rules', '`## Fixing`, optional']) assert.ok(t.includes(h), h);
  assert.match(t, /"judging": true/);
  assert.doesNotMatch(t, /Patch/);
});

test('dispatch.md holds the rules of every dispatch', () => {
  const t = read('contract/dispatch.md');
  assert.match(t, /An answer in `decisions` is a requirement: act on it\./);
  assert.match(t, /the pipe hides the exit code/);
  assert.match(t, /Do not run the full build/);
  assert.match(t, /Do not stage files under `docs\/runs\/` or `tmp\/`/);
  assert.match(t, /Do not push\. Do not change branches\. Do not ask the user\./);
});
