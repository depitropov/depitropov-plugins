'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGINS = path.join(__dirname, '../../plugins');
const read = name => fs.readFileSync(path.join(PLUGINS, 'orc-curator/guides', `${name}.md`), 'utf8');
const FILES = ['orc-curator/guides/spec.md', 'orc-curator/guides/plan.md', 'orc-curator/guides/code.md', 'orc-java-stack/guides/code.md'];

test('a guide is a file with no frontmatter, and no skill is a guide', () => {
  for (const f of FILES) {
    const text = fs.readFileSync(path.join(PLUGINS, f), 'utf8');
    assert.match(text, /^# /, f);
    assert.doesNotMatch(text, /^---/, f);
    assert.doesNotMatch(text, /Task tool|subagent_type|TodoWrite|Skill tool|claude -p/, f);
  }
  for (const p of ['orc-curator', 'orc-java-stack']) {
    assert.deepEqual(fs.readdirSync(path.join(PLUGINS, p, 'skills')).filter(s => s.endsWith('-guide')), [], p);
  }
});

test('every guide reads the docs only and never talks to the user', () => {
  for (const g of ['spec', 'plan', 'code']) {
    const text = read(g);
    assert.match(text, /docs\/curator\//, g);
    assert.match(text, /Do not ask the user/, g);
    assert.match(text, /Do not (change|write|edit) (any|a) file under `docs\/curator\/`/, g);
    assert.match(text.split('## Permitted actions')[1], /Do not change[^.]*GLOSSARY\.md/, `${g}: the glossary is protected too`);
    assert.doesNotMatch(text, /orc-curator:research|research first/, `${g}: research stays out of spec and plan (S76)`);
  }
});

test('the spec guide asks for the Direction section of the brief', () => {
  const text = read('spec');
  assert.match(text, /^## Direction$/m);
  assert.match(text, /- Serves: B<n> \| new/);
  assert.match(text, /- Deferred:/);
  assert.match(text, /- Question:/);
  assert.match(text, /never Later/i);
  assert.match(text, /never stops the run/);
  assert.match(text, /business fact: <what is missing> — options:/);
});

test('the plan guide makes DIRECTION binding and keeps the plan to this task', () => {
  const text = read('plan');
  assert.match(text, /docs\/curator\/DIRECTION\.md/);
  assert.match(text, /binding where it applies/);
  assert.match(text, /context, never scope/);
  assert.match(text, /`Warning:` line under `## Approach`/);
  assert.match(text, /Never write a `Bn`, `Cn`, `Dn` or `Qn`/);
});

test('the code guide keeps GLOSSARY names and cites only Dn in code', () => {
  const text = read('code');
  assert.match(text, /GLOSSARY\.md/);
  assert.match(text, /`Dn`/);
  for (const id of ['`Cn`', '`Bn`', '`Tn`', '`ACn`']) assert.ok(text.includes(id), id);
});

test('every skill and guide that read the glossary name GLOSSARY.md and none names CONTEXT.md', () => {
  const d = path.join(PLUGINS, 'orc-curator');
  const files = ['skills/curate/SKILL.md', 'skills/setup/SKILL.md', 'guides/spec.md', 'guides/plan.md', 'guides/code.md', 'references/glossary.md'];
  for (const f of files) assert.match(fs.readFileSync(path.join(d, f), 'utf8'), /GLOSSARY\.md/, f);
  const walk = p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap(n => walk(path.join(p, n))) : [p];
  for (const f of walk(d)) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /CONTEXT\.md/, f);
});
