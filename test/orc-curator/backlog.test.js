'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills/backlog/SKILL.md'), 'utf8');

test('backlog takes plain words for each operation and confirms before it touches a file', () => {
  for (const op of ['**add**', '**drop**', '**move**', '**groom**', '**reconcile**']) assert.ok(text.includes(op), op);
  assert.match(text, /git diff docs\/curator\/BACKLOG\.md/);
  assert.match(text, /confirm/i);
});

test('backlog walks the consequence chain for every change and reports the empty checks', () => {
  for (const c of ['**dropped**', '**demoted to `## Later`**', '**added to `## Now` or `## Next`**', '**added to `## Later`**', '**promoted from `## Later` to `## Next`**', '**moved between `## Next` and `## Now`**', '**item text rewritten', '**reordered inside a section**']) assert.ok(text.includes(c), c);
  assert.match(text, /## Evaluated/);
  assert.match(text, /including the empty ones/i);
});

test('backlog sweeps once at the end and never derives a constraint itself', () => {
  assert.match(text, /orc-curator:direction/);
  assert.match(text, /Caller: backlog/);
  assert.match(text, /`## Later` only/);
  assert.match(text, /`Caller: setup`\. Setup runs the sweep next/);
  assert.match(text, /Never read `docs\/curator\/TECH\.md` or source code/);
  assert.match(text, /Never write a `Cn`/);
  assert.match(text, /Never edit or delete a `Dn`/);
  assert.match(text, /references\/recording-rules\.md/);
  for (const line of ['Result:', 'Wrote:', 'Coverage:', 'Escalated:', 'Deviations/Warnings:']) assert.ok(text.includes(line), line);
});

test('backlog carries no minions state or modes', () => {
  assert.doesNotMatch(text, /STATE\.md|config\.yml|\.minions|\/minions:|\bmaintain\b|\bvibe\b|specify/);
});
