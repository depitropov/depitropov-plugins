'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, git } = require('../helpers');
const { measureInputs } = require('../../plugins/orchestra/lib/gates');

const STACK = path.join(__dirname, '../../plugins/orc-ts-stack');
const COPY = path.join(__dirname, '../../plugins/clean-code/skills/clean-code');
const TS = path.join(__dirname, '../../node_modules/typescript');
const SCRIPTS = ['measure.py', 'languages.py', 'shape.py', 'compare.py', 'revisions.py', 'measure-ts.mjs'];
const declaration = JSON.parse(fs.readFileSync(path.join(STACK, 'orchestra.json'), 'utf8'));
const resolved = { slots: { 'stack-skills': { plugin: 'orc-ts-stack', dir: STACK, declaration } } };

function measure(dir, base) {
  const { measure: command } = measureInputs(resolved, base);
  return spawnSync(command, { cwd: dir, shell: true, encoding: 'utf8' });
}

// A project at its base commit, then one commit of task work.
function project(files) {
  const dir = makeRepo();
  fs.appendFileSync(path.join(dir, '.gitignore'), 'node_modules\n');
  fs.symlinkSync(path.dirname(TS), path.join(dir, 'node_modules'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'base');
  const base = git(dir, 'rev-parse', 'HEAD');
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'task');
  return { dir, base };
}

test('the scripts are the same as in the standalone clean-code plugin', () => {
  for (const f of SCRIPTS) assert.equal(fs.readFileSync(path.join(STACK, 'scripts', f), 'utf8'), fs.readFileSync(path.join(COPY, f), 'utf8'), f);
});

test('the measure command quotes the plugin folder and names the rules skill', () => {
  assert.match(declaration.measure.run, /^python3 "\{plugin\}\/scripts\/measure\.py" /);
  assert.equal(declaration.measure.rules, 'clean-code-typescript');
});

test('a new function over a threshold is new-over', { skip: !fs.existsSync(TS) && 'run npm ci first' }, () => {
  const { dir, base } = project({ 'src/a.ts': 'export function f(a: number, b: number, c: number, d: number) {\n  return a + b + c + d;\n}\n' });
  const r = measure(dir, base);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^VERDICT new_over=1 /m);
});

test('a task with no TypeScript or Python file measures nothing and exits 0', () => {
  const { dir, base } = project({ 'docs/notes.md': 'notes\n' });
  const r = measure(dir, base);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no Python or TypeScript files to measure/);
  assert.match(r.stdout, /^SUMMARY functions=0 /m);
});

test('a project with no typescript package is a broken run with exit code 2', () => {
  const { dir, base } = project({ 'src/a.ts': 'export const f = () => 1;\n' });
  fs.rmSync(path.join(dir, 'node_modules'));
  const r = measure(dir, base);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /typescript package not found/);
});

test('measureInputs keeps a $ pattern in the plugin dir and base literally', () => {
  const odd = { slots: { 'stack-skills': { plugin: 'x', dir: '/p/$&/q', declaration } } };
  const { measure: command } = measureInputs(odd, 'b$&b');
  assert.ok(command.includes('/p/$&/q'));
  assert.ok(!command.includes('{plugin}'));
});
