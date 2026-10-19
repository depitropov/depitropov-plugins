'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills', name, 'SKILL.md'), 'utf8');
const NO_MINIONS = /\/minions:|\.minions|docs\/minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b|--auto/;

test('shape-product stays functional, goes wide, and keeps rejected directions', () => {
  const t = read('shape-product');
  assert.match(t, /Functional only/i);
  assert.match(t, /at least 4/i);
  assert.match(t, /docs\/curator\/DECISIONS\.md/);
  assert.match(t, /Comparable products/);
  assert.match(t, /3–5/);
  assert.doesNotMatch(t, NO_MINIONS);
});

test('shape-product routes each answer to one file and never turns a question into a row', () => {
  const t = read('shape-product');
  for (const f of ['PRODUCT', 'BACKLOG', 'DECISIONS', 'QUESTIONS']) assert.match(t, new RegExp(`docs/curator/${f}\\.md`), f);
  assert.match(t, /A question is not a feature/);
  assert.match(t, /· open/);
  assert.match(t, /Open questions:/);
});

test('shape-tech walks the capability dimensions, one question at a time', () => {
  const t = read('shape-tech');
  for (const d of ['runs as', 'deploys to', 'persists', 'integrates with', 'authenticates', 'hard constraints']) assert.ok(t.toLowerCase().includes(d), d);
  assert.match(t, /one question at a time/i);
  assert.match(t, /exactly one named dimension|one named dimension/i);
  assert.doesNotMatch(t, NO_MINIONS);
});

test('shape-tech keeps the evidence gate and writes each dimension in one place', () => {
  const t = read('shape-tech');
  assert.match(t, /existing code/i);
  assert.match(t, /no `Dn`|without a `Dn`/i);
  assert.match(t, /docs\/curator\/TECH\.md/);
  assert.match(t, /never .*`docs\/curator\/DIRECTION\.md`|Never `DIRECTION\.md`|never write a `Cn`/i);
  for (const line of ['Result:', 'Constraints owed:', 'Worth reopening:']) assert.ok(t.includes(line), line);
});

test('shape-tech pins its callers, the no-commit rule and the DIRECTION.md hard gate', () => {
  const t = read('shape-tech');
  assert.ok(t.includes('`Caller: setup`'));
  assert.ok(t.includes('`Caller: direction`'));
  assert.ok(t.includes('exactly one named dimension'));
  assert.ok(t.includes('do not commit: the caller\ncommits.'));
  assert.ok(t.includes('**Never write `docs/curator/DIRECTION.md`**'));
});
