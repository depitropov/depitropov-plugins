'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '../../plugins/orc-curator');
const SKILLS = fs.readdirSync(path.join(DIR, 'skills')).filter(s => s !== 'manifest');
const GUIDES = ['spec', 'plan', 'code'];
const PROCEDURES = fs.readdirSync(path.join(DIR, 'procedures')).map(f => f.replace(/\.md$/, ''));
const NAMES = [...SKILLS, ...PROCEDURES, ...GUIDES.map(r => `${r}-guide`)];
const skillText = {
  ...Object.fromEntries(SKILLS.map(s => [s, fs.readFileSync(path.join(DIR, 'skills', s, 'SKILL.md'), 'utf8')])),
  ...Object.fromEntries(PROCEDURES.map(r => [r, fs.readFileSync(path.join(DIR, 'procedures', `${r}.md`), 'utf8')])),
  ...Object.fromEntries(GUIDES.map(r => [`${r}-guide`, fs.readFileSync(path.join(DIR, 'guides', `${r}.md`), 'utf8')])),
};
const matrix = fs.readFileSync(path.join(DIR, 'CONTRACTS.md'), 'utf8');

// The rows of the table under a heading: first cell's backticked name → the skills named in the other cells.
function rows(heading) {
  const section = matrix.split(/^## /m).find(s => s.startsWith(heading));
  const out = {};
  for (const line of section.split('\n').filter(l => /^\| `/.test(l))) {
    const [first, ...rest] = line.split('|').slice(1, -1);
    const key = first.match(/`([^`]+)`/)[1];
    const named = [...rest.join('|').matchAll(/`([a-z-]+)`/g)].map(m => m[1]).filter(s => NAMES.includes(s));
    out[key] = new Set([...(out[key] || []), ...named]);
  }
  return out;
}

function agree(table, mentions) {
  const problems = [];
  for (const [key, named] of Object.entries(table)) {
    for (const s of NAMES) {
      const says = mentions(key).test(skillText[s]);
      if (named.has(s) && !says) problems.push(`${key}: the matrix names ${s}, which never names it`);
      if (!named.has(s) && says) problems.push(`${key}: ${s} names it, and the matrix does not`);
    }
  }
  return problems;
}

const escape = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

test('the docs matrix agrees with the skill texts', () => {
  const table = rows('The docs');
  for (const doc of ['PRODUCT.md', 'BACKLOG.md', 'DIRECTION.md', 'DECISIONS.md', 'QUESTIONS.md', 'TECH.md', 'GLOSSARY.md', 'research/']) assert.ok(table[doc], doc);
  assert.deepEqual(agree(table, k => new RegExp(`\\b${escape(k)}`)), []);
});

test('the references table agrees with the skill texts', () => {
  const table = rows('The shared policy');
  assert.deepEqual(Object.keys(table).sort(), fs.readdirSync(path.join(DIR, 'references')).sort());
  assert.deepEqual(agree(table, k => new RegExp(`references/${escape(k)}`)), []);
});

test('the README names the entries, the files, the three flows and the nudge', () => {
  const readme = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
  for (const s of ['setup', 'curate']) assert.ok(readme.includes(`\`${s}\``), s);
  for (const f of [...GUIDES.map(g => `guides/${g}.md`), ...PROCEDURES.map(p => `procedures/${p}.md`)]) assert.ok(readme.includes(f), f);
  for (const h of ['**A: set up', '**B: a burst and its landing', '**C: a run', 'a change in words', '/wayfinder', 'What `direction` decides']) assert.ok(readme.includes(h), h);
  assert.match(readme, /CONTRACTS\.md/);
});
