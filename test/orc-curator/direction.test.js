'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/procedures/direction.md'), 'utf8');

test('the sweep computes what is owed from Now, Next and the Evaluated table', () => {
  assert.match(text, /docs\/curator\/DIRECTION\.md/);
  assert.match(text, /## Evaluated/);
  assert.match(text, /orphan/i);
  assert.match(text, /never read `## Later`|Never read `## Later`/);
  assert.match(text, /no constraint/);
});

test('it reaches one verdict per owed row, and asks only what changes a constraint', () => {
  for (const v of ['no constraint', 'write a `Cn`', 'research first', 'open a `Qn`', 'known:', 'purpose change']) assert.ok(text.includes(v), v);
  assert.match(text, /one question at a time/i);
});

test('it writes only DIRECTION and QUESTIONS, never the backlog or a design', () => {
  assert.match(text, /never edit `docs\/curator\/BACKLOG\.md`|no `BACKLOG\.md` edits/i);
  assert.match(text, /never a schema|Never write a schema/i);
  assert.match(text, /from B/);
});

test('it ends with the return block', () => {
  for (const line of ['Result:', 'Wrote:', 'Coverage:', 'Summary:', 'Escalated:', 'Deviations/Warnings:']) assert.ok(text.includes(line), line);
});

test('it carries no minions state or modes', () => {
  assert.doesNotMatch(text, /STATE\.md|config\.yml|\.minions|\/minions:|\bmaintain\b|\bvibe\b/);
});

test('its only caller is curate, and it never names shape-tech or the old research skill', () => {
  assert.doesNotMatch(text, /Caller: (backlog|setup)|shape-tech|orc-curator:research|orc-curator:setup/);
  assert.match(text, /`curate`/);
});

test('research first uses the research skill with For: B<n> and the research path', () => {
  assert.match(text, /mattpocock-skills:research/);
  assert.match(text, /For: B<n>/);
  assert.match(text, /docs\/curator\/research\/<yyyy-mm-dd>-<topic>\.md/);
});

test('a changed dimension is known or becomes a Qn plus the wayfinder nudge', () => {
  assert.match(text, /known: <dimension> → <answer>/);
  assert.match(text, /To <purpose>, run `\/wayfinder <topic>`\./);
  assert.match(text, /To set the new direction, run `\/wayfinder/);
});
