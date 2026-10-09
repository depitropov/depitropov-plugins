'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '../../plugins/orc-java-stack/skills/review-comments/SKILL.md');
const FIX = path.join(__dirname, 'fixtures/comments');

// The skill is the source of truth for the patterns. grep -E and JavaScript agree on \b, \s and the groups used here.
function pattern(name) {
  const m = fs.readFileSync(SKILL, 'utf8').match(new RegExp(`^${name}='(.+)'$`, 'm'));
  assert.ok(m, `${name} not found in the skill`);
  return new RegExp(m[1]);
}
const lines = file => fs.readFileSync(path.join(FIX, file), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));

test('tier 1 flags every plan coordinate and change description', () => {
  const t1 = pattern('TIER1');
  for (const l of [...lines('flagged.txt'), ...lines('flagged-regressions.txt')]) assert.match(l, t1);
});

test('tier 1 leaves good comments alone', () => {
  const t1 = pattern('TIER1');
  for (const l of lines('clean.txt')) assert.doesNotMatch(l, t1);
});

test('tier 2 flags the bare shorthand that tier 1 cannot see', () => {
  const t1 = pattern('TIER1');
  const t2 = pattern('TIER2');
  for (const l of lines('flagged-tier2.txt')) {
    assert.match(l, t2);
    assert.doesNotMatch(l, t1);
  }
});

test('tier 2 also flags known collisions, which is why its hits are hints', () => {
  const t2 = pattern('TIER2');
  for (const l of lines('tier2-collisions.txt')) assert.match(l, t2);
});
