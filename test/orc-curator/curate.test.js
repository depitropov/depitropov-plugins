'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '../../plugins/orc-curator');
const text = fs.readFileSync(path.join(DIR, 'skills/curate/SKILL.md'), 'utf8');
const landing = fs.existsSync(path.join(DIR, 'procedures/landing.md')) ? fs.readFileSync(path.join(DIR, 'procedures/landing.md'), 'utf8') : '';

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

test('it subtracts as well as adds: PRODUCT, Vision, QUESTIONS, GLOSSARY and DIRECTION', () => {
  assert.match(text, /docs\/curator\/PRODUCT\.md/);
  assert.match(text, /## Vision/);
  assert.match(text, /answered → D/);
  assert.match(text, /GLOSSARY\.md/);
  for (const check of ['satisfied by', 'orphan', 'retire']) assert.match(text, new RegExp(check, 'i'), check);
  assert.match(text, /procedures\/direction\.md/);
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

test('curate takes three inputs: a diff, a map or a change in words, and asks when none is given', () => {
  for (const i of ['a diff', 'a map', 'a change in words']) assert.match(text, new RegExp(i, 'i'), i);
  assert.match(text, /\.scratch\/<effort>\//);
  assert.match(text, /no input[^]{0,120}ask[^]{0,80}which/i);
  assert.match(text, /^description: .*diff.*map.*change in words/im);
  assert.match(text, /procedures\/landing\.md/);
});

test('a change in words is sorted known, unknown or a bug', () => {
  for (const k of ['known', 'unknown', 'bug']) assert.match(text, new RegExp(`\\*\\*${k}`, 'i'), k);
  assert.match(text, /procedures\/backlog\.md/);
  assert.match(text, /names the `Dn` (that )?it reverses/);
  assert.match(text, /references\/product\.md/);
  assert.match(text, /references\/tech\.md/);
  assert.match(text, /retire the `## Evaluated` row of (each|every) near-term `Bn`/i);
  assert.match(text, /from Bn/);
  assert.match(text, /outcome/);
  assert.match(text, /To <purpose>, run `\/wayfinder <topic>`\./);
  assert.match(text, /no `Dn`/);
  assert.match(text, /diagnosing-bugs/);
});

test('every input ends in one shared end: the sweep once, then one commit', () => {
  assert.match(text, /The only writer of `Dn` and `Qn`/i);
  assert.match(text, /every input/i);
  assert.match(text, /once/);
  assert.match(text, /docs\/curator\/maps\//);
  assert.match(text, /mattpocock-skills:research/);
  assert.match(text, /only through the `direction` procedure/);
  assert.doesNotMatch(text, /orc-curator:direction|orc-curator:backlog/);
  assert.match(text, /known: <dimension> → <answer>/);
});

test('landing is a procedure that never commits', () => {
  assert.match(landing, /^# Landing procedure/);
  assert.doesNotMatch(landing, /^---$/m);
  assert.match(landing, /`curate` commits/);
});

test('landing sets hard: from an ADR and soft: from a bare answer, and shows the markers before the commit', () => {
  assert.match(landing, /docs\/adr\//);
  assert.match(landing, /no `Dn` links[^]{0,200}`hard:`/);
  assert.match(landing, /no (such )?ADR covers[^]{0,120}`soft:`/);
  assert.match(landing, /^Markers: /m);
  assert.match(text, /marker[^]{0,200}before the commit/i);
});

test('landing routes scope, fog and answered questions', () => {
  assert.match(landing, /## Out of scope[^]{0,200}Deliberately not[^]{0,80}`Dn`/);
  assert.match(landing, /## Not yet specified[^]{0,200}QUESTIONS\.md/);
  assert.match(landing, /· answered → Dn/);
  assert.match(landing, /never delete/i);
});

test('landing copies research notes from their branches and names a missing branch', () => {
  assert.match(landing, /research\/\*/);
  assert.match(landing, /docs\/curator\/research\//);
  assert.match(landing, /missing[^]{0,200}summary/i);
  assert.match(landing, /pointer[^]{0,120}refs/i);
});

test('landing cuts the work into tracer bullets in Next and moves the map', () => {
  for (const w of ['vertical', 'demoable', 'one run', 'prefactoring first', 'expand–contract']) assert.ok(landing.includes(w), w);
  assert.match(landing, /## Next/);
  for (const r of ['map:', '`Dn`', 'after B<n>']) assert.ok(landing.includes(r), r);
  assert.match(landing, /docs\/curator\/maps\/<effort>\//);
});

test('a Cn that cites a reversed Dn or a changed dimension goes to the sweep, which judges it again', () => {
  const direction = fs.readFileSync(path.join(DIR, 'procedures/direction.md'), 'utf8');
  assert.match(text, /a live `Cn` that a reversed `Dn` or a changed dimension contradicts/);
  assert.match(text.split('## Step 9')[1].split('## Step 10')[0], /retire rule/);
  assert.match(direction, /a live `Cn` that the diff, a reversed `Dn` or a changed dimension contradicts gets a fresh verdict/);
  assert.match(direction, /A `Cn` that the shipped code, a reversed `Dn` or a changed dimension \*\*contradicts\*\*/);
});

test('a landing that ends blocked or needs-input leaves nothing behind: discard, no sweep, no commit', () => {
  const step7 = text.split('## Step 7')[1].split('## Step 8')[0];
  assert.match(step7, /`blocked` or `needs-input`/);
  assert.match(step7, /discard[^]{0,200}docs\/curator\//i);
  assert.match(step7, /do not run the sweep/i);
  assert.match(step7, /do not commit/i);
});
