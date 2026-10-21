'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/procedures/backlog.md'), 'utf8');

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

test('backlog is called by curate, runs no sweep and never derives a constraint itself', () => {
  assert.match(text, /`curate` runs the sweep/);
  assert.doesNotMatch(text, /Caller: (backlog|setup)|orc-curator:direction/);
  assert.match(text, /Never read `docs\/curator\/TECH\.md` or source code/);
  assert.match(text, /Never write a `Cn`/);
  assert.match(text, /Never edit or delete a `Dn`/);
  assert.match(text, /references\/recording-rules\.md/);
  for (const line of ['Result:', 'Wrote:', 'Summary:', 'Deviations/Warnings:']) assert.ok(text.includes(line), line);
  assert.doesNotMatch(text.split('## End of run')[1], /Coverage:|Escalated:/);
});

test('backlog carries no minions state or modes', () => {
  assert.doesNotMatch(text, /STATE\.md|config\.yml|\.minions|\/minions:|\bmaintain\b|\bvibe\b|specify/);
});
