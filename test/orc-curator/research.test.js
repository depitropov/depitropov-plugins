'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills/research/SKILL.md'), 'utf8');

test('research takes its topic from the caller and never decides', () => {
  assert.match(text, /Never pick a topic for yourself|Never choose your own topic/);
  assert.match(text, /never decide the answer/i);
  for (const ground of ['preference', 'already settled', 'already covered']) assert.ok(text.includes(ground), ground);
});

test('a wide run fixes the axes before one agent per candidate, and ranks last', () => {
  assert.match(text, /Beat 1[\s\S]*Beat 2[\s\S]*Beat 3[\s\S]*Beat 4/);
  assert.match(text, /one agent for each candidate/i);
  assert.match(text, /cannot start agents/);
  assert.match(text, /references\/right-sizing\.md/);
  assert.match(text, /references\/ask-vs-research\.md/);
});

test('research writes only its notes and hands the rest to the caller', () => {
  assert.match(text, /docs\/curator\/research\//);
  assert.match(text, /templates\/RESEARCH\.md/);
  assert.match(text, /not even a `Qn`/);
  for (const line of ['Result:', 'Recommendation:', 'Ranking:', 'Refuted:', 'Could not settle:', 'Recorded:']) assert.ok(text.includes(line), line);
});

test('research carries no minions state or modes', () => {
  assert.doesNotMatch(text, /STATE\.md|config\.yml|\.minions|\/minions:|\bmaintain\b|\bvibe\b|subagent_type|Agent tool/);
});
