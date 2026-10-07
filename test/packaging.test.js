'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGINS = path.join(__dirname, '../plugins');
const plugins = fs.readdirSync(PLUGINS);
const skills = plugins.flatMap(p => {
  const dir = path.join(PLUGINS, p, 'skills');
  return fs.existsSync(dir) ? fs.readdirSync(dir).map(s => ({ plugin: p, name: s, file: path.join(dir, s, 'SKILL.md') })) : [];
});
const REFERENCED = ['orchestra/run', 'orchestra/fixer', 'orc-standard-workflow/manifest', 'orc-standard-workflow/spec',
  'orc-standard-workflow/plan', 'orc-standard-workflow/plan-check', 'orc-standard-workflow/code',
  'orc-standard-workflow/logic-review', 'orc-java-stack/manifest', 'orc-java-stack/fix-build'];

test('every skill the code dispatches exists', () => {
  const have = skills.map(s => `${s.plugin}/${s.name}`);
  for (const r of REFERENCED) assert.ok(have.includes(r), `missing skill ${r}`);
});

test('SKILL.md frontmatter has only name and description, and name matches the folder', () => {
  for (const s of skills) {
    const text = fs.readFileSync(s.file, 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(m, `${s.file}: no frontmatter`);
    const keys = m[1].split('\n').filter(l => /^\S/.test(l)).map(l => l.split(':')[0]);
    assert.deepEqual(keys, ['name', 'description'], s.file);
    assert.match(m[1], new RegExp(`^name: ${s.name}$`, 'm'), s.file);
  }
});

test('shipped files use no harness-specific words', () => {
  const banned = /Task tool|subagent_type|TodoWrite|Skill tool|claude -p/;
  for (const s of skills) assert.doesNotMatch(fs.readFileSync(s.file, 'utf8'), banned, s.file);
});

test('both manifests of each plugin parse and have the same version', () => {
  for (const p of plugins) {
    const a = JSON.parse(fs.readFileSync(path.join(PLUGINS, p, 'plugin.json'), 'utf8'));
    const b = JSON.parse(fs.readFileSync(path.join(PLUGINS, p, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(a.name, p);
    assert.equal(a.version, b.version, p);
  }
});
