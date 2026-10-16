'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills', name, 'SKILL.md'), 'utf8');

test('every guide reads the docs only and never talks to the user', () => {
  for (const g of ['spec-guide', 'plan-guide', 'code-guide']) {
    const text = read(g);
    assert.match(text, /docs\/curator\//, g);
    assert.match(text, /Do not ask the user/, g);
    assert.match(text, /Do not (change|write|edit) (any|a) file under `docs\/curator\/`/, g);
    assert.doesNotMatch(text, /orc-curator:research|research first/, `${g}: research stays out of spec and plan (S76)`);
  }
});

test('the spec guide asks for the Direction section of the brief', () => {
  const text = read('spec-guide');
  assert.match(text, /^## Direction$/m);
  assert.match(text, /- Serves: B<n> \| new/);
  assert.match(text, /- Deferred:/);
  assert.match(text, /- Question:/);
  assert.match(text, /never Later/i);
  assert.match(text, /never stops the run/);
  assert.match(text, /business fact: <what is missing> — options:/);
});

test('the plan guide makes DIRECTION binding and keeps the plan to this task', () => {
  const text = read('plan-guide');
  assert.match(text, /docs\/curator\/DIRECTION\.md/);
  assert.match(text, /binding where it applies/);
  assert.match(text, /context, never scope/);
  assert.match(text, /`Warning:` line under `## Approach`/);
  assert.match(text, /Never write a `Bn`, `Cn`, `Dn` or `Qn`/);
});

test('the code guide keeps CONTEXT names and cites only Dn in code', () => {
  const text = read('code-guide');
  assert.match(text, /docs\/curator\/CONTEXT\.md/);
  assert.match(text, /`Dn`/);
  for (const id of ['`Cn`', '`Bn`', '`Tn`', '`ACn`']) assert.ok(text.includes(id), id);
});
