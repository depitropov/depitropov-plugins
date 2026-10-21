'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkPlugin } = require('../../plugins/orchestra/lib/check');

const DIR = path.join(__dirname, '../../plugins/orc-curator');
const read = rel => fs.readFileSync(path.join(DIR, rel), 'utf8');
const DOCS = ['BACKLOG', 'PRODUCT', 'DIRECTION', 'DECISIONS', 'QUESTIONS', 'GLOSSARY', 'TECH'];

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

test('setup records the present, writes the flag last and nudges to a burst', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /never overwrite/i);
  for (const f of ['BACKLOG', 'PRODUCT', 'DIRECTION', 'DECISIONS', 'QUESTIONS', 'TECH']) assert.ok(text.includes(`${f}.md`), f);
  assert.match(text, /Do not copy `GLOSSARY\.md`/);
  assert.match(text, /docs\/curator\/research\//);
  assert.match(text, /docs\/curator\/maps\//);
  assert.match(text, /\.scratch\//);
  assert.match(text, /\.gitignore/);
  assert.match(text, /no source files outside `docs\/`[^.]*ask nothing/i);
  assert.match(text, /references\/tech\.md/);
  assert.match(text, /references\/product\.md/);
  assert.match(text, /no `Dn`/);
  for (const q of ['what it is', 'who it is for', 'why it exists', 'deliberately is not']) assert.ok(text.includes(q), q);
  assert.match(text, /one at a time/i);
  assert.match(text, /never (invoke|run)s? `?(orc-curator:)?direction/i);
  assert.match(text, /docs\/curator\/\.setup/);
  assert.match(text, /flag last/i);
  assert.match(text, /\{ "status": "ok" \}/);
  assert.match(text, /\{ "status": "failed"/);
  assert.ok(text.includes('To set the direction of the project, run `/wayfinder <your idea>`.'));
  assert.ok(text.includes('To change the present or the plan, run `curate` with a change in words. To set the direction, run `/wayfinder <topic>`.'));
  const set = text.split(/^## /m).find(x => x.startsWith('Step 3'));
  assert.ok(set, 'Step 3 exists');
  assert.match(set, /docs\/curator\/\.setup/);
  assert.match(set, /only the\s+files that were missing/);
  assert.match(set, /Write nothing else/);
  assert.match(set, /no `Dn`/i);
  assert.match(set, /no row/i);
  assert.match(set, /\bStop\.\s*$/);
  assert.doesNotMatch(set, /Step 4/);
  assert.ok(set.includes('To change the present or the plan, run `curate` with a change in words. To set the direction, run `/wayfinder <topic>`.'));
  assert.doesNotMatch(text, /shape-product|shape-tech|backlog/);
  assert.doesNotMatch(text, /\/minions:|\.minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b|--auto/);
});

test('the plugin ships three skills, three guides and three procedures, and names no removed skill', () => {
  assert.deepEqual(fs.readdirSync(path.join(DIR, 'skills')).sort(), ['curate', 'manifest', 'setup']);
  assert.deepEqual(fs.readdirSync(path.join(DIR, 'guides')).sort(), ['code.md', 'plan.md', 'spec.md']);
  assert.deepEqual(fs.readdirSync(path.join(DIR, 'procedures')).sort(), ['backlog.md', 'direction.md', 'landing.md']);
  assert.deepEqual(fs.readdirSync(path.join(DIR, 'references')).sort(), ['glossary.md', 'product.md', 'recording-rules.md', 'tech.md']);
  assert.ok(!fs.existsSync(path.join(DIR, 'templates/RESEARCH.md')));
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(DIR)) {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /shape-product|shape-tech|orc-curator:research|interview-cadence|ask-vs-research|right-sizing|CONTEXT\.md|orc-curator:(direction|backlog|spec-guide|plan-guide|code-guide)/, f);
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

test('the references product and tech hold rules only', () => {
  const p = read('references/product.md');
  for (const s of ['would deleting one backlog row make it false', 'Never list features', 'one paragraph', '3 or 4 lines', '2 to 4 entries', 'cite the `Dn`']) assert.ok(p.includes(s), s);
  const t = read('references/tech.md');
  for (const s of ['runs as', 'deploys to', 'persists', 'integrates with', 'authenticates', 'hard constraints', '50 lines', 'never a path', 'a transcription has no `Dn`', 'one place']) assert.ok(t.includes(s), s);
  for (const f of [t, read('templates/TECH.md')]) assert.match(f, /architecture style.*`hard:`.*`Dn`/);
  assert.match(t, /GLOSSARY-MAP\.md/);
  for (const f of [p, t]) assert.doesNotMatch(f, /^## Step/m);
  assert.match(read('references/glossary.md'), /GLOSSARY-MAP\.md/);
  assert.match(read('references/glossary.md'), /domain-modeling/);
});

test('the procedures are plain files: a heading, no frontmatter, no harness word, no commit of their own', () => {
  const dir = path.join(DIR, 'procedures');
  const files = fs.readdirSync(dir);
  assert.deepEqual(files.sort(), ['backlog.md', 'direction.md', 'landing.md']);
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(text, /^# /, f);
    assert.doesNotMatch(text, /^---$/m, f);
    assert.doesNotMatch(text, /Task tool|subagent_type|TodoWrite|Skill tool|claude -p/, f);
    assert.doesNotMatch(text.replaceAll('`curate` commits', ''), /commit/i, f);
  }
});
