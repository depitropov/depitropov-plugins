'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '../../plugins/orchestra/skills');
const read = name => fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8');

test('log-feedback writes one self-contained note with the five sections, outside the repo', () => {
  const text = read('log-feedback');
  assert.match(text, /^---\nname: log-feedback\ndescription: .+\n---\n/);
  for (const s of ['## The rule', '## The evidence', '## The origin', '## Proposed level']) assert.ok(text.includes(s), s);
  for (const l of ['`project`', '`stack`', '`workflow`', '`core`', '`process`']) assert.ok(text.includes(l), l);
  assert.match(text, /absolute path/);
  assert.match(text, /\.orchestra\/resolved\.json/);
  assert.match(text, /never invent code/i);
  assert.match(text, /outside the repo/);
  assert.match(text, /commit nothing/i);
});

test('process-feedback extends before it adds, stops for approval, and keeps the note as eval material', () => {
  const text = read('process-feedback');
  assert.match(text, /^---\nname: process-feedback\ndescription: .+\n---\n/);
  assert.match(text, /already/);
  assert.match(text, /approval/);
  assert.match(text, /evals\/pending\//);
  assert.match(text, /\.orchestra\/project\/evals\/pending\//);
  assert.match(text, /node --test/);
  assert.match(text, /skip/i);
  assert.match(text, /uncommitted changes/);
  assert.match(text, /does not exist/);
  assert.doesNotMatch(text, /plugins\/cache|\.claude\/plugins/);
});
