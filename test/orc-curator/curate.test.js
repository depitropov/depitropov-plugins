'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills/curate/SKILL.md'), 'utf8');

test('curate takes the inline inputs and runs by hand on a commit range', () => {
  for (const input of ['`base`', '`brief`', '`notes`']) assert.ok(text.includes(input), input);
  assert.match(text, /by hand/i);
  assert.match(text, /commit range/i);
});

test('it ships the served row, or adds a new one, and asks when the row was dropped', () => {
  assert.match(text, /## Direction/);
  assert.match(text, /Serves: B<n>|`Serves`/);
  assert.match(text, /`## Shipped`/);
  assert.match(text, /Serves: new|`new`/);
  assert.match(text, /dropped while the run was open|was dropped/);
  assert.match(text, /no `## Direction` section|has no Direction section/i);
});

test('before it adds a row for Serves: new, it checks Now, Next and Later for a match', () => {
  assert.match(text, /check `## Now`, `## Next` and `## Later`/i);
});

test('it subtracts as well as adds: PRODUCT, Vision, QUESTIONS, CONTEXT and DIRECTION', () => {
  assert.match(text, /docs\/curator\/PRODUCT\.md/);
  assert.match(text, /## Vision/);
  assert.match(text, /answered → D/);
  assert.match(text, /docs\/curator\/CONTEXT\.md/);
  for (const check of ['satisfied by', 'orphan', 'retire']) assert.match(text, new RegExp(check, 'i'), check);
  assert.match(text, /orc-curator:direction/);
  assert.match(text, /Caller: curate/);
});

test('sure edits and answers are committed once; a judgement call is a question', () => {
  assert.match(text, /one question at a time/i);
  assert.match(text, /one commit/i);
  assert.match(text, /\{ "status": "ok" \}/);
  assert.match(text, /"status": "failed"/);
});

test('it never writes code knowledge and carries no minions state', () => {
  assert.doesNotMatch(text, /knowledge-ledger|promote_threshold|\.claude\/rules|STATE\.md|config\.yml|\.minions|\/minions:|journal/);
  assert.match(text, /Do not change files outside `docs\/curator\/`/);
});

test('DECISIONS stays append-only, and a rerun can finish and write its result', () => {
  assert.match(text, /except `docs\/curator\/DECISIONS\.md`[^]*new `Dn`/);
  assert.match(text, /except the result file/);
  assert.match(text, /nothing to commit/i);
});
