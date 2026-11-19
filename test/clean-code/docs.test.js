'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '../../plugins/clean-code');
const read = rel => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');
const flat = rel => read(rel).replace(/\s+/g, ' ');

test('rules.md holds the 13 rules, with the thresholds once, as "at most"', () => {
  const t = read('skills/clean-code/rules.md');
  assert.deepEqual([...t.matchAll(/^(\d+)\. \*\*/gm)].map(m => Number(m[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const f = flat('skills/clean-code/rules.md');
  for (const re of [/at most 20 lines/, /complexity at most 10/, /flat `switch`/, /The core works without the UI and the IO/, /Dependencies point inward/, /A simple typed value crosses a boundary/]) assert.match(f, re);
  assert.doesNotMatch(f, /under 20|under 10/);
});

test('measurement.md holds the command, the verdicts, the output lines and the row-match rule', () => {
  const f = flat('skills/clean-code/measurement.md');
  for (const re of [/--changed --base <base> --compare/, /--at HEAD/, /--legacy/, /`SUMMARY`/, /`BEFORE`/, /`VERDICT`/, /file, name and its position among the functions of that name/, /shape\.py/, /Python traceback/]) assert.match(f, re);
  for (const v of ['new-over', 'crossed', 'grew', 'suppressions-up', 'fixed', 'still-over', 'new']) assert.ok(f.includes(`\`${v}\``), v);
});

test('the two files need no orchestra', () => {
  for (const f of ['skills/clean-code/rules.md', 'skills/clean-code/measurement.md']) assert.doesNotMatch(read(f), /orchestra|\bgate\b|config\.legacy/, f);
});

test('the main skill points to the rules and the measurement, and repeats neither', () => {
  const f = flat('skills/clean-code/SKILL.md');
  assert.match(f, /rules\.md/);
  assert.match(f, /measurement\.md/);
  assert.doesNotMatch(f, /Under 20 lines|complexity under 10|matched by file and name\./);
});

test('the language skills cite rules 11 to 13 by number, not as gate rules', () => {
  for (const s of ['clean-code-java', 'clean-code-typescript']) {
    const t = read(`skills/${s}/SKILL.md`);
    assert.doesNotMatch(t, /[Gg]ate rule/, s);
    assert.match(t, /rule 11/, s);
  }
});

test('the Python skill has numbered rules and the section names of the other two', () => {
  const t = read('skills/clean-code-python/SKILL.md');
  assert.match(t, /^## Rules$/m);
  assert.match(t, /^## Layers of a FastAPI service$/m);
  const nums = [...t.split('## Rules\n')[1].split('\n## ')[0].matchAll(/^(\d+)\. \*\*/gm)].map(m => Number(m[1]));
  assert.deepEqual(nums, nums.map((_, i) => i + 1));
  assert.ok(nums.length >= 9);
  assert.doesNotMatch(t, /architecture\.md` Phase/);
});

test('only rules.md and measurement.md state the limits in prose', () => {
  const files = ['skills/clean-code/SKILL.md', 'skills/clean-code/architecture.md', 'skills/clean-code/rationalizations.md', 'skills/clean-code-java/SKILL.md', 'skills/clean-code-typescript/SKILL.md', 'skills/clean-code-python/SKILL.md'];
  for (const f of files) assert.doesNotMatch(flat(f), /\b(under|at most|over) 20 lines\b|complexity (under|at most) 10/, f);
});

const gate = () => fs.readFileSync(path.join(__dirname, '../../plugins/orc-core/skills/clean-code/SKILL.md'), 'utf8').replace(/\s+/g, ' ');

test('the gate measures its fixes before the commit, on the working tree', () => {
  assert.match(gate(), /Before you commit, run the command once more without `--at HEAD`/);
});

test('the gate makes a finding only of a new suppression without its reason', () => {
  assert.match(gate(), /a new suppression without its reason on its line/);
});

test('the gate checks the changed lines against every rule it reads', () => {
  assert.match(gate(), /Check the lines that the change adds or edits against each rule of `rules\.md` and of the language skills/);
});

test('a language skill cites a rule of rules.md with "of `rules.md`", never as a bare number', () => {
  for (const s of ['clean-code-java', 'clean-code-typescript', 'clean-code-python']) {
    const t = flat(`skills/${s}/SKILL.md`);
    assert.doesNotMatch(t, /(?<!(TS|Java|Python) )\brule (3|11|12|13)\b(?! of `rules\.md`)/, s);
  }
});
