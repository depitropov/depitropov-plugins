'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, `../../plugins/orc-standard-workflow/skills/${name}/SKILL.md`), 'utf8');

test('logic-review leaves transactions to the stack gates', () => {
  assert.doesNotMatch(read('logic-review'), /transaction/i);
});

for (const n of ['logic-review', 'plan-conformance']) {
  test(`${n} has the gate shape`, () => {
    const t = read(n);
    assert.match(t, /## Scope/);
    assert.doesNotMatch(t, /## (Inputs|Procedure|Result|Permitted actions)|Not yours|shared-role\.triage|counts|Patch|Evaluate/);
  });
}

test('logic-review and plan-conformance say the project code excuses nothing', () => {
  assert.match(read('logic-review'), /The project's code does not excuse a bug or a broken criterion\./);
  assert.match(read('plan-conformance'), /The project's code does not excuse a gap against the plan\./);
});

test('plan-check keeps its own permitted actions and points nowhere at triage', () => {
  const t = read('plan-check');
  assert.match(t, /Do not change code\. Do not commit\./);
  assert.doesNotMatch(t, /shared-role\.triage|counts|Patch|Evaluate/);
});

const lastScopeParagraph = t => t.split('## Scope')[1].split('\n## ')[0].trim().split(/\n\s*\n/).pop().replace(/\s+/g, ' ');
const cleanCode = () => fs.readFileSync(path.join(__dirname, '../../plugins/orc-core/skills/clean-code/SKILL.md'), 'utf8');

test('logic-review, plan-conformance and clean-code opt out in the last paragraph of their Scope', () => {
  assert.match(lastScopeParagraph(read('logic-review')), /does not excuse/);
  assert.match(lastScopeParagraph(read('plan-conformance')), /does not excuse/);
  assert.match(lastScopeParagraph(cleanCode()), /Untouched code that breaks a rule of `rules\.md` or of a language skill, also long or complex code, does not excuse a new break\./);
  assert.doesNotMatch(cleanCode(), /and threshold/);
});

const format = name => fs.readFileSync(path.join(__dirname, `../../plugins/orc-standard-workflow/formats/${name}.md`), 'utf8');

test('the spec format holds the template, the business fact line and the answer procedure', () => {
  const t = format('spec');
  for (const re of [/^# Spec$/m, /## Acceptance criteria/, /- business fact: <what is missing> — options: <a> \| <b>/, /sets behaviour/, /null handling, where rounding happens, which limit is checked first/, /Remove its `business fact:` line from Assumptions/]) assert.match(t, re);
});

test('the plan format holds the template, the limits and the heading rule', () => {
  const t = format('plan');
  for (const re of [/### T1 — <title>/, /about four files/, /ten lines of\s+pseudo-code/, /`### T1`, `### T2`, … in order, with no gap/]) assert.match(t, re);
});

test('the workflow skills do not repeat the format rules', () => {
  assert.doesNotMatch(read('spec'), /## Acceptance criteria|never has a default/);
  assert.doesNotMatch(read('plan'), /### T1 — <title>|about four files/);
  assert.doesNotMatch(read('plan-check'), /null handling, where rounding happens|about four files|ten lines of pseudo-code|already in the spec: the plan step wrote them/);
  assert.doesNotMatch(read('code'), /a rate, a price, a limit value/);
  assert.match(read('logic-review'), /formats\/spec\.md/);
  assert.doesNotMatch(read('logic-review'), /null handling, where rounding happens/);
  for (const n of ['spec', 'plan', 'plan-check', 'code']) assert.match(read(n), /`spec-format`/, n);
});

test('triage names no workflow word for a product answer', () => {
  const t = fs.readFileSync(path.join(__dirname, '../../plugins/orc-core/skills/triage/SKILL.md'), 'utf8');
  assert.doesNotMatch(t, /business fact/i);
  assert.match(t, /a rate, a price, a limit value, who qualifies/i);
});

test('logic-review lists the spec format among the files its Scope lets it read', () => {
  const scope = read('logic-review').split('## Scope')[1].split('\n## ')[0];
  assert.match(scope, /Read only the spec, `decisions`, `formats\/spec\.md`/);
});

test('the spec step records a question that a guide says only a person can answer', () => {
  assert.match(read('spec').replace(/\s+/g, ' '), /A guide can name a question that only a person can answer/);
});
