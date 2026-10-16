'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills/direction/SKILL.md'), 'utf8');

test('the sweep computes what is owed from Now, Next and the Evaluated table', () => {
  assert.match(text, /docs\/curator\/DIRECTION\.md/);
  assert.match(text, /## Evaluated/);
  assert.match(text, /orphan/i);
  assert.match(text, /never read `## Later`|Never read `## Later`/);
  assert.match(text, /no constraint/);
});

test('it reaches one verdict per owed row, and asks only what changes a constraint', () => {
  for (const v of ['no constraint', 'write a `Cn`', 'research first', 'open a `Qn`', 'escalate', 'purpose change']) assert.ok(text.includes(v), v);
  assert.match(text, /one question at a time/i);
});

test('it writes only DIRECTION and QUESTIONS, never the backlog or a design', () => {
  assert.match(text, /never edit `docs\/curator\/BACKLOG\.md`|no `BACKLOG\.md` edits/i);
  assert.match(text, /never a schema|Never write a schema/i);
  assert.match(text, /from B/);
});

test('it names its callers and ends with the return block', () => {
  assert.match(text, /Caller: curate/);
  for (const line of ['Result:', 'Wrote:', 'Coverage:', 'Summary:', 'Escalated:', 'Deviations/Warnings:']) assert.ok(text.includes(line), line);
});

test('it carries no minions state or modes', () => {
  assert.doesNotMatch(text, /STATE\.md|config\.yml|\.minions|\/minions:|\bmaintain\b|\bvibe\b/);
});
