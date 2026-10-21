'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkPlugin } = require('../../plugins/orchestra/lib/check');

const DIR = path.join(__dirname, '../../plugins/orc-curator');
const read = rel => fs.readFileSync(path.join(DIR, rel), 'utf8');
const DOCS = ['BACKLOG', 'PRODUCT', 'DIRECTION', 'DECISIONS', 'QUESTIONS', 'CONTEXT', 'TECH'];

test('orc-curator passes orchestra check and declares the curator slot', () => {
  assert.deepEqual(checkPlugin(DIR), []);
  assert.deepEqual(JSON.parse(read('orchestra.json')), {
    slot: 'curator',
    config: {},
    curate: 'curate',
    setup: { skill: 'setup', done: 'docs/curator/.setup' },
    guides: { spec: 'guides/spec.md', plan: 'guides/plan.md', code: 'guides/code.md' },
  });
});

test('the plugin ships a template for each doc and the two references', () => {
  for (const d of DOCS) assert.ok(fs.existsSync(path.join(DIR, 'templates', `${d}.md`)), d);
  assert.match(read('templates/BACKLOG.md'), /^## Vision$/m);
  for (const h of ['Now', 'Next', 'Later', 'Shipped']) assert.match(read('templates/BACKLOG.md'), new RegExp(`^## ${h}$`, 'm'));
  for (const h of ['Constraints', 'Size', 'Evaluated']) assert.match(read('templates/DIRECTION.md'), new RegExp(`^## ${h}$`, 'm'));
  assert.match(read('templates/DIRECTION.md'), /\| id \| from \| constraint \| status \|/);
  assert.match(read('templates/DIRECTION.md'), /\| Bn \| horizon at eval \| date \| outcome \|/);
  assert.match(read('references/recording-rules.md'), /hard:/);
  assert.match(read('references/recording-rules.md'), /soft:/);
  assert.match(read('references/glossary.md'), /_Avoid_/);
});

test('the templates and references name no minions paths, modes or state', () => {
  for (const f of [...DOCS.map(d => `templates/${d}.md`), 'references/recording-rules.md', 'references/glossary.md']) {
    const text = read(f);
    assert.doesNotMatch(text, /\/minions:|\.minions|docs\/minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b/, f);
  }
});

test('setup bootstraps from the templates, runs the interviews and the sweep, and writes the flag last', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /docs\/curator\//);
  assert.match(text, /Do not copy `CONTEXT\.md`/);
  assert.match(text, /never overwrite/i);
  for (const s of ['orc-curator:shape-product', 'orc-curator:shape-tech', 'orc-curator:direction']) assert.ok(text.includes(s), s);
  assert.match(text, /Caller: setup/);
  assert.match(text, /template-shaped/);
  assert.match(text, /docs\/curator\/\.setup/);
  assert.match(text, /last/);
  assert.match(text, /\{ "status": "ok" \}/);
  assert.match(text, /except the result file/);
  assert.doesNotMatch(text, /\/minions:|\.minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b|--auto/);
});

test('setup reshapes a set-up project on approval and always ends with the sweep', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /reshape/i);
  assert.match(text, /approv/i);
  assert.match(text, /every open `Qn`/);
  assert.match(text, /invoke `orc-curator:backlog` with the line\s+`Caller: setup`/);
});

test('setup resumes an unconfirmed product half and respects existing code', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /Ask the user whether the product shape was confirmed/);
  assert.match(text, /When the project already has code/);
  assert.match(text, /goes wide only on what is not built yet/);
  assert.match(text, /purpose change/);
});

test('the interview and research references are shipped', () => {
  const cadence = read('references/interview-cadence.md');
  assert.match(cadence, /3–5/);
  assert.match(cadence, /one at a time/i);
  assert.doesNotMatch(cadence, /config\.yml|questions: |Decide/);
  const ask = read('references/ask-vs-research.md');
  assert.match(ask, /ask the user/i);
  assert.match(ask, /research/i);
  for (const f of ['references/interview-cadence.md', 'references/ask-vs-research.md']) {
    assert.doesNotMatch(read(f), /\/minions:|\.minions|STATE\.md|\bmaintain\b|\bvibe\b/, f);
  }
});

test('the right-sizing reference and the research template are shipped', () => {
  const sizing = read('references/right-sizing.md');
  assert.match(sizing, /set by the caller/);
  assert.match(sizing, /## Research depth/);
  assert.doesNotMatch(sizing, /other tier|too small/i);
  const note = read('templates/RESEARCH.md');
  for (const h of ['**For:**', '**Supersedes:**', '## Recommendation', '## Comparison', '## Refuted', '## Open questions']) assert.ok(note.includes(h), h);
  for (const f of ['references/right-sizing.md', 'templates/RESEARCH.md']) {
    assert.doesNotMatch(read(f), /\/minions:|\.minions|docs\/minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b/, f);
  }
});

test('no skill or reference falls back for a Curator skill that is missing', () => {
  const files = [
    ...fs.readdirSync(path.join(DIR, 'skills')).map(s => `skills/${s}/SKILL.md`),
    ...fs.readdirSync(path.join(DIR, 'references')).map(r => `references/${r}`),
  ];
  for (const f of files) assert.doesNotMatch(read(f), /is not installed|`orc-curator:[a-z-]+` is not built|when it is built/, f);
});

test('the marketplace lists orc-curator', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.claude-plugin/marketplace.json'), 'utf8'));
  assert.ok(m.plugins.some(p => p.name === 'orc-curator' && p.source === './plugins/orc-curator'));
});
