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
