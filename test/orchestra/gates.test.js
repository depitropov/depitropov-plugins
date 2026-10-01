'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { globToRegExp, collect, select, buildStep, plan } = require('../../plugins/orchestra/lib/gates');

const resolved = {
  slots: {
    workflow: { plugin: 'wf', dir: '/p/wf', declaration: { gates: [
      { name: 'logic-review', phase: 'implementation-check', kind: 'agent', skill: 'logic-review', always: true },
    ] } },
    'stack-skills': { plugin: 'st', dir: '/p/st', declaration: {
      config: { 'entity-pattern': { type: 'string', default: '@Entity' } },
      build: { run: '{plugin}/build.sh', guide: 'fix-build', max_rounds: 3 },
      gates: [
        { name: 'crap', phase: 'implementation-check', kind: 'tool', run: 'java -jar {plugin}/crap.jar', fix: 'fixer', guide: 'fix-crap', files: '**/*.java' },
        { name: 'arch', phase: 'implementation-check', kind: 'agent', skill: 'review-arch', always: true },
        { name: 'entities', phase: 'conventions-check', kind: 'agent', skill: 'review-entities', grep: '{config.entity-pattern}' },
      ],
    } },
  },
};

test('globToRegExp matches paths like a shell glob with **', () => {
  assert.ok(globToRegExp('**/*.java').test('src/main/A.java'));
  assert.ok(globToRegExp('**/*.java').test('A.java'));
  assert.ok(!globToRegExp('**/*.java').test('A.sql'));
  assert.ok(globToRegExp('src/*.java').test('src/A.java'));
  assert.ok(!globToRegExp('src/*.java').test('src/x/A.java'));
  assert.ok(globToRegExp('**/db/migration/*.sql').test('app/db/migration/V1.sql'));
});

test('collect puts workflow gates first, expands placeholders and sets defaults', () => {
  const gates = collect(resolved, {}, 'implementation-check');
  assert.deepEqual(gates.map(g => g.name), ['logic-review', 'crap', 'arch']);
  assert.equal(gates[1].run, 'java -jar /p/st/crap.jar');
  assert.equal(gates[1].max_rounds, 2);
  assert.equal(gates[0].fix, 'self');
  assert.equal(gates[0].plugin, 'wf');
  assert.equal(collect(resolved, {}, 'conventions-check')[0].grep, '@Entity');
});

test('collect applies the project config: disable, max_rounds, config values', () => {
  const config = { 'stack-skills': { plugin: 'st', disable: ['arch'], gates: { crap: { max_rounds: 10 } }, 'entity-pattern': 'CarEntity' } };
  const gates = collect(resolved, config, 'implementation-check');
  assert.deepEqual(gates.map(g => g.name), ['logic-review', 'crap']);
  assert.equal(gates[1].max_rounds, 10);
  assert.equal(collect(resolved, config, 'conventions-check')[0].grep, 'CarEntity');
});

test('collect rejects a fixer gate without a guide', () => {
  const bad = { slots: { 'stack-skills': { plugin: 'st', dir: '/p', declaration: { gates: [
    { name: 'x', phase: 'finish', kind: 'tool', run: 'x', fix: 'fixer' },
  ] } } } };
  assert.throws(() => collect(bad, {}, 'finish'), /names no guide/);
});

test('select applies files and grep, and records why a gate is skipped', () => {
  const gates = [
    { name: 'java', files: '**/*.java' },
    { name: 'sql', files: '**/*.sql' },
    { name: 'entity', files: '**/*.java', grep: '@Entity' },
    { name: 'dto', grep: '@Dto' },
    { name: 'all', always: true },
    { name: 'none' },
    { name: 'judged', when: 'Only converters' },
  ];
  const files = { 'src/Car.java': '@Entity class Car {}' };
  const v = select(gates, ['src/Car.java'], f => files[f] ?? null);
  assert.deepEqual(v.map(x => [x.name, x.selected]), [
    ['java', true], ['sql', false], ['entity', true], ['dto', false], ['all', true], ['none', false], ['judged', true],
  ]);
  assert.match(v[1].why, /no changed file matches/);
  assert.match(v[3].why, /no changed file contains/);
});

test('plan orders each phase: build, tools and agents in the fixed order', () => {
  const build = buildStep(resolved);
  assert.equal(build.run, '/p/st/build.sh');
  assert.equal(build.max_rounds, 3);
  const gates = [
    { name: 'a1', kind: 'agent' }, { name: 't1', kind: 'tool' }, { name: 'a2', kind: 'agent' }, { name: 't2', kind: 'tool' },
  ];
  const names = phase => plan(phase, gates, build).map(g => g.name);
  assert.deepEqual(names('implementation-check'), ['build', 't1', 't2', 'a1', 'a2']);
  assert.deepEqual(names('conventions-check'), ['t1', 't2', 'a1', 'a2']);
  assert.deepEqual(names('finish'), ['a1', 'a2', 't1', 't2', 'build']);
});

test('buildStep fails when the stack plugin declares no build', () => {
  assert.throws(() => buildStep({ slots: { 'stack-skills': { declaration: {} } } }), /declares no build/);
});
