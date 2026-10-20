'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '../../plugins/orc-curator');
const SKILLS = fs.readdirSync(path.join(DIR, 'skills')).filter(s => s !== 'manifest');
const skillText = Object.fromEntries(SKILLS.map(s => [s, fs.readFileSync(path.join(DIR, 'skills', s, 'SKILL.md'), 'utf8')]));
const matrix = fs.readFileSync(path.join(DIR, 'CONTRACTS.md'), 'utf8');

// The rows of the table under a heading: first cell's backticked name → the skills named in the other cells.
function rows(heading) {
  const section = matrix.split(/^## /m).find(s => s.startsWith(heading));
  const out = {};
  for (const line of section.split('\n').filter(l => /^\| `/.test(l))) {
    const [first, ...rest] = line.split('|').slice(1, -1);
    const key = first.match(/`([^`]+)`/)[1];
    const named = [...rest.join('|').matchAll(/`([a-z-]+)`/g)].map(m => m[1]).filter(s => SKILLS.includes(s));
    out[key] = new Set([...(out[key] || []), ...named]);
  }
  return out;
}

function agree(table, mentions) {
  const problems = [];
  for (const [key, named] of Object.entries(table)) {
    for (const s of SKILLS) {
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
  for (const doc of ['PRODUCT.md', 'BACKLOG.md', 'DIRECTION.md', 'DECISIONS.md', 'QUESTIONS.md', 'TECH.md', 'CONTEXT.md', 'research/']) assert.ok(table[doc], doc);
  assert.deepEqual(agree(table, k => new RegExp(`\\b${escape(k)}`)), []);
});

test('the references table agrees with the skill texts', () => {
  const table = rows('The shared policy');
  assert.deepEqual(Object.keys(table).sort(), fs.readdirSync(path.join(DIR, 'references')).sort());
  assert.deepEqual(agree(table, k => new RegExp(`references/${escape(k)}`)), []);
});

test('the README names every skill, the three flows and the verdict ladder', () => {
  const readme = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
  for (const s of fs.readdirSync(path.join(DIR, 'skills'))) assert.ok(readme.includes(`\`${s}\``), s);
  for (const h of ['**A:', '**B:', '**C:', 'What `direction` decides']) assert.ok(readme.includes(h), h);
  assert.match(readme, /CONTRACTS\.md/);
});
