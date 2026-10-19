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
    guides: { spec: 'spec-guide', plan: 'plan-guide', code: 'code-guide' },
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

test('the minimal setup copies the templates into docs/curator and writes the flag last', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /docs\/curator\//);
  assert.match(text, /docs\/curator\/\.setup/);
  assert.match(text, /last/);
  assert.match(text, /never overwrite/i);
  assert.match(text, /Do not copy `CONTEXT\.md`/);
  assert.doesNotMatch(text, /`QUESTIONS\.md`,\s+`CONTEXT\.md`/);
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

test('the marketplace lists orc-curator', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.claude-plugin/marketplace.json'), 'utf8'));
  assert.ok(m.plugins.some(p => p.name === 'orc-curator' && p.source === './plugins/orc-curator'));
});
