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

test('collect orders the providers workflow, core, stack-skills, and honours disable', () => {
  const withGlobal = { slots: { ...resolved.slots, 'core': { plugin: 'gg', dir: '/p/gg', declaration: { gates: [
    { name: 'clean-code', phase: 'implementation-check', kind: 'agent', skill: 'clean-code', always: true },
  ] } } } };
  const gates = collect(withGlobal, {}, 'implementation-check');
  assert.deepEqual(gates.map(g => g.name), ['logic-review', 'clean-code', 'crap', 'arch']);
  assert.equal(gates[1].provider, 'core');
  assert.equal(gates[1].plugin, 'gg');
  const off = collect(withGlobal, { 'core': { disable: ['clean-code'] } }, 'implementation-check');
  assert.deepEqual(off.map(g => g.name), ['logic-review', 'crap', 'arch']);
});

test('globToRegExp matches paths like a shell glob with **', () => {
  assert.ok(globToRegExp('**/*.java').test('src/main/A.java'));
  assert.ok(globToRegExp('**/*.java').test('A.java'));
  assert.ok(!globToRegExp('**/*.java').test('A.sql'));
  assert.ok(globToRegExp('src/*.java').test('src/A.java'));
  assert.ok(!globToRegExp('src/*.java').test('src/x/A.java'));
  assert.ok(globToRegExp('**/src/test/**/*.java').test('src/test/java/a/FooTests.java'));
  assert.ok(globToRegExp('**/src/test/**/*.java').test('mod/src/test/java/a/Helper.java'));
  assert.ok(!globToRegExp('**/src/test/**/*.java').test('src/main/java/a/Foo.java'));
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
  assert.deepEqual(collect(resolved, config, 'conventions-check')[0].config, { 'entity-pattern': 'CarEntity' });
  assert.deepEqual(collect(resolved, {}, 'conventions-check')[0].config, { 'entity-pattern': '@Entity' });
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

test('select takes a list of globs in files', () => {
  const gates = [{ name: 'ops', files: ['**/*.java', '**/*.sql'] }, { name: 'none', files: ['**/*.kt'] }];
  const v = select(gates, ['db/migration/V2__idx.sql'], () => null);
  assert.deepEqual(v.map(x => [x.name, x.selected]), [['ops', true], ['none', false]]);
  assert.match(v[1].why, /no changed file matches \*\*\/\*\.kt/);
});

test('plan orders each phase: build, tools and agents in the fixed order', () => {
  const build = buildStep(resolved, {});
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
  assert.throws(() => buildStep({ slots: { 'stack-skills': { declaration: {} } } }, {}), /declares no build/);
});

const withProject = { slots: { ...resolved.slots, project: { plugin: 'project', dir: '.orchestra/project', declaration: { gates: [
  { name: 'money', phase: 'conventions-check', kind: 'agent', skill: 'check-money', always: true },
  { name: 'archunit', phase: 'implementation-check', kind: 'tool', run: '{plugin}/arch.sh', fix: 'fixer', guide: 'fix-arch', always: true },
] } } } };

test('collect puts project gates last and refers to their skills by path', () => {
  const gates = collect(withProject, {}, 'implementation-check');
  assert.deepEqual(gates.map(g => g.name), ['logic-review', 'crap', 'arch', 'archunit']);
  const archunit = gates.find(g => g.name === 'archunit');
  assert.equal(archunit.run, '.orchestra/project/arch.sh');
  assert.equal(archunit.guide, '.agents/skills/fix-arch/SKILL.md');
  assert.equal(gates.find(g => g.name === 'arch').skill, 'st:review-arch');
  assert.equal(gates.find(g => g.name === 'crap').guide, 'st:fix-crap');
  const conventions = collect(withProject, {}, 'conventions-check');
  assert.equal(conventions.at(-1).skill, '.agents/skills/check-money/SKILL.md');
});

test('collect merges a gate override over the declaration', () => {
  const crap = collect(resolved, { 'stack-skills': { gates: { crap: { run: 'crap {plugin}', files: '**/*.kt', max_rounds: 5 } } } }, 'implementation-check').find(g => g.name === 'crap');
  assert.equal(crap.run, 'crap /p/st');
  assert.equal(crap.files, '**/*.kt');
  assert.equal(crap.max_rounds, 5);
  assert.equal(crap.phase, 'implementation-check');
  assert.equal(crap.fix, 'fixer');
});

test('buildStep merges the build override, and a project guide is a path', () => {
  const plain = buildStep(resolved, {});
  assert.equal(plain.run, '/p/st/build.sh');
  assert.equal(plain.guide, 'st:fix-build');
  assert.equal(plain.max_rounds, 3);
  const own = buildStep(resolved, { 'stack-skills': { build: { run: 'make all', guide: 'fix-all' } } });
  assert.equal(own.run, 'make all');
  assert.equal(own.guide, '.agents/skills/fix-all/SKILL.md');
  assert.equal(own.max_rounds, 3);
});
