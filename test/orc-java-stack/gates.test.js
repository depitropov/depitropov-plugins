'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.join(__dirname, '../../plugins/orc-java-stack');
const skill = name => fs.readFileSync(path.join(PLUGIN, 'skills', name, 'SKILL.md'), 'utf8');
const SKILLS = path.join(PLUGIN, 'skills');
const gates = () => JSON.parse(fs.readFileSync(path.join(PLUGIN, 'orchestra.json'), 'utf8')).gates;
const gate = name => JSON.parse(fs.readFileSync(path.join(PLUGIN, 'orchestra.json'), 'utf8')).gates.find(g => g.name === name);

test('orchestra.json declares the persistence gate', () => {
  assert.deepEqual(gate('persistence'), { name: 'persistence', phase: 'implementation-check', kind: 'agent', skill: 'review-persistence', files: ['**/*.java', '**/*.sql'] });
});

test('migrations live only in review-persistence', () => {
  const persistence = skill('review-persistence');
  for (const re of [/CREATE INDEX CONCURRENTLY IF NOT EXISTS/, /NOT VALID/, /V\*__/, /@Transactional/]) assert.match(persistence, re);
  assert.doesNotMatch(skill('review-general'), /CONCURRENTLY|Flyway|migration/i);
});

test('persistence sorts a non-backward-compatible migration as Decide and a missing @Transactional as Fix', () => {
  const persistence = skill('review-persistence');
  assert.match(persistence, /not backward compatible[\s\S]*?Decide/);
  assert.match(persistence, /@Transactional[\s\S]*?Fix/);
});

test('review-persistence skips a change with nothing in scope', () => {
  assert.match(skill('review-persistence'), /## Scope[\s\S]*?skip\./);
});

const STACK_LINE = 'Read `references/stack-reference.md` in the plugin folder, two folders above this skill\'s folder, not in the `references/` folder of this skill, and do what it says. Do this step before you read the change.';
const lastScopeParagraph = t => t.split('## Scope')[1].split('\n## ')[0].trim().split(/\n\s*\n/).pop().replace(/\s+/g, ' ');

const GATES = ['review-persistence', 'review-general', 'review-testing', 'review-comments', 'review-logging', 'review-layout'];
const skillsWithReferences = () => fs.readdirSync(path.join(PLUGIN, 'skills')).filter(s => fs.existsSync(path.join(PLUGIN, 'skills', s, 'references')));
const ref = (s, f) => fs.readFileSync(path.join(PLUGIN, 'skills', s, 'references', f), 'utf8');

test('every gate with a references folder reads the stack line', () => {
  const withRefs = skillsWithReferences();
  assert.ok(withRefs.includes('review-logging') && withRefs.includes('review-general'));
  for (const s of withRefs) assert.ok(skill(s).replace(/\s+/g, ' ').includes(STACK_LINE), s);
});

test('the reflection rule fires only for native images and accepts central registration', () => {
  const quarkus = ref('review-general', 'quarkus.md');
  for (const re of [/native/, /pom\.xml/, /@RegisterForReflection\(targets/]) assert.match(quarkus, re);
});

test('orchestra.json declares the general gate', () => {
  assert.deepEqual(gate('general'), { name: 'general', phase: 'implementation-check', kind: 'agent', skill: 'review-general', files: '**/*.java' });
});

test('general holds exceptions, arguments and money, and ops is gone', () => {
  const t = skill('review-general');
  for (const h of ['### Exceptions', '### Arguments', '### Money']) assert.match(t, new RegExp(h));
  assert.match(t, /9\. \*\*Money is never binary floating point/);
  assert.ok(t.replace(/\s+/g, ' ').includes(STACK_LINE));
  assert.ok(fs.existsSync(path.join(SKILLS, 'review-general/references/quarkus.md')));
  assert.ok(!fs.existsSync(path.join(SKILLS, 'review-ops')));
  assert.ok(!gates().some(g => g.name === 'ops'));
});

test('general numbers its rules 1 to 9 under the three groups', () => {
  const t = skill('review-general');
  const nums = [...t.matchAll(/^(\d+)\. \*\*/gm)].map(m => Number(m[1]));
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.match(t, /### Exceptions[\s\S]*?\n6\. [\s\S]*### Arguments[\s\S]*?\n8\. [\s\S]*### Money[\s\S]*?\n9\. /);
});

test('review-general holds the money rule', () => {
  const general = skill('review-general');
  for (const re of [/double/, /float/, /BigDecimal/, /RoundingMode/]) assert.match(general, re);
});

test('general keeps the exception and argument rules', () => {
  const t = skill('review-general');
  for (const re of [/Wrapping keeps the cause/, /No swallowed exception/, /isValidArgument/, /ObjectUtils\.isEmpty/]) assert.match(t, re);
});

test('orc-java-stack has no security gate', () => {
  assert.ok(!fs.existsSync(path.join(SKILLS, 'review-security')));
  assert.ok(!gates().some(g => g.name === 'security'));
});

test('general keeps the intro that sends a growing subject to its own gate', () => {
  assert.match(skill('review-general'), /When one subject grows, it moves to its own gate\./);
});

test('a gate reads its stack reference before it reads the change', () => {
  for (const s of skillsWithReferences()) {
    const text = skill(s).replace(/\s+/g, ' ');
    assert.ok(text.includes(STACK_LINE), s);
  }
});

test('the money rule asks a person for a shared DTO and fixes everything else', () => {
  assert.match(skill('review-general'), /shared DTO[\s\S]*?Decide[\s\S]*?Fix/);
});

for (const n of GATES) test(`${n} has the gate shape`, () => {
  const t = skill(n);
  assert.match(t, /## Scope/); assert.match(t, /## Rules/);
  assert.doesNotMatch(t, /## (Inputs|Procedure|Result|Permitted actions)|Not yours|shared-role\.triage|counts|Patch|Evaluate/);
});

test('stack-reference.md holds the stack step once', () => {
  const t = fs.readFileSync(path.join(PLUGIN, 'references/stack-reference.md'), 'utf8');
  assert.match(t, /The stack of every project is `quarkus`/);
  assert.match(t, /references\/quarkus\.md/);
  for (const s of GATES) assert.doesNotMatch(skill(s), /stack-detection/, s);
});

test('logging keeps its stack rules in references', () => {
  const t = skill('review-logging');
  assert.ok(t.replace(/\s+/g, ' ').includes(STACK_LINE));
  assert.doesNotMatch(t, /kv\(|scValue\(|io\.quarkus|spring-boot/);
  assert.match(ref('review-logging', 'quarkus.md'), /kv\("transaction", transactionDto\)/);
  assert.ok(!fs.existsSync(path.join(SKILLS, 'review-logging/references/spring.md')));
});

test('every reference file numbers its rules from 1', () => {
  for (const s of fs.readdirSync(SKILLS)) {
    const dir = path.join(SKILLS, s, 'references');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const numbers = [...ref(s, f).matchAll(/^(\d+)\. /gm)].map(m => Number(m[1]));
      if (numbers.length) assert.deepEqual(numbers, numbers.map((_, i) => i + 1), `${s}/references/${f}`);
    }
  }
});
