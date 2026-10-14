'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, writePlugin } = require('../helpers');
const { checkDeclaration, checkProject } = require('../../plugins/orchestra/lib/check');

const tmp = prefix => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const stack = (extra = {}) => ({ slot: 'stack-skills', build: { run: 'make', guide: 'fix-build' }, gates: [], ...extra });
const errors = d => checkDeclaration(d, writePlugin(tmp('st-'), 'st', d), 'st/orchestra.json');

test('a valid declaration passes', () => {
  assert.deepEqual(errors(stack({
    config: { 'entity-pattern': { type: 'string', default: '@Entity' } },
    guides: { code: 'code-guide' },
    gates: [
      { name: 'ops', phase: 'implementation-check', kind: 'agent', skill: 'review-ops', files: ['**/*.java', '**/*.sql'] },
      { name: 'entities', phase: 'conventions-check', kind: 'agent', skill: 'review-entities', grep: '{config.entity-pattern}' },
      { name: 'fmt', phase: 'finish', kind: 'tool', run: 'fmt {plugin}', fix: 'fixer', guide: 'fix-fmt', max_rounds: 1, always: true },
    ],
  })), []);
  assert.deepEqual(errors({ slot: 'workflow', config: { n: { type: 'number', default: 2 } }, gates: [] }), []);
});

test('each broken declaration rule gives one line with the rule and its fix', () => {
  const tool = extra => ({ name: 'a', phase: 'finish', kind: 'tool', run: 'x', always: true, ...extra });
  const cases = [
    [{ slot: 'curator' }, /"slot" is "curator"/],
    [stack({ params: [] }), /unknown key "params"/],
    [{ slot: 'workflow', build: { run: 'make' } }, /unknown key "build" for slot workflow/],
    [{ slot: 'stack-skills' }, /no "build" with a "run" command/],
    [stack({ config: { n: { type: 'number' } } }), /config key "n" has no number default/],
    [stack({ config: { disable: { type: 'string', default: '' } } }), /config key "disable" is reserved/],
    [stack({ guides: { review: 'x' } }), /unknown guide "review"/],
    [stack({ gates: [{ name: 'a', phase: 'later', kind: 'agent', skill: 's', always: true }] }), /gate "a" has phase "later"/],
    [stack({ gates: [tool({ run: undefined })] }), /gate "a" is a tool gate with no "run"/],
    [stack({ gates: [tool({ fix: 'fixer' })] }), /gate "a" uses the fixer but names no guide/],
    [stack({ gates: [tool({ max_rounds: 0 })] }), /gate "a" "max_rounds" is not a whole number/],
    [stack({ gates: [tool({ always: undefined })] }), /gate "a" has no selection rule/],
    [stack({ gates: [tool({ always: undefined, grep: '(' })] }), /gate "a" "grep" is not a valid regular expression/],
    [stack({ gates: [tool({ run: 'x {config.nope}' })] }), /gate "a" uses \{config\.nope\}/],
    [stack({ gates: [tool({ name: 'build' })] }), /gate "build" is not unique/],
    [stack({ gates: [tool({ always: undefined, files: 3 })] }), /gate "a" "files" is not a glob/],
  ];
  for (const [d, re] of cases) {
    const out = errors(JSON.parse(JSON.stringify(d)));
    assert.equal(out.length, 1, `${re}: ${out.join(' | ')}`);
    assert.match(out[0], re);
    assert.match(out[0], /^st\/orchestra\.json: .+\. Fix: .+\.$/);
  }
});

test('a skill the declaration names must exist in skills/', () => {
  const d = stack({ gates: [{ name: 'a', phase: 'finish', kind: 'agent', skill: 'review-a', always: true }] });
  const out = checkDeclaration(d, tmp('empty-'), 'st/orchestra.json');
  assert.deepEqual(out.map(l => l.match(/names skill "([\w-]+)"/)[1]), ['fix-build', 'review-a']);
});

const wf = { slot: 'workflow', config: { 'tasks-per-coder': { type: 'number', default: 2 } }, gates: [] };
const st = stack({ guides: { code: 'code-guide' }, gates: [{ name: 'fmt', phase: 'finish', kind: 'tool', run: 'x', always: true }] });

function project(config, declarations) {
  const dir = makeRepo();
  const slots = {};
  for (const [slot, d] of Object.entries(declarations)) {
    const name = slot === 'workflow' ? 'wf' : 'st';
    slots[slot] = { plugin: name, version: '0.0.1', dir: writePlugin(tmp(`${name}-`), name, d), declaration: d };
  }
  writeJson(path.join(dir, '.orchestra/config.json'), config);
  writeJson(path.join(dir, '.orchestra/resolved.json'), { orchestra: { dir: '/orc' }, slots });
  return dir;
}

test('a valid project config passes', () => {
  const config = {
    workflow: { plugin: 'wf', 'tasks-per-coder': 3 },
    'stack-skills': { plugin: 'st', disable: ['code-guide', 'fmt'], gates: { fmt: { max_rounds: 4 } } },
  };
  assert.deepEqual(checkProject(project(config, { workflow: wf, 'stack-skills': st })), []);
});

test('each broken config rule gives one line with the rule and its fix', () => {
  const both = { workflow: wf, 'stack-skills': st };
  const ok = { plugin: 'st' };
  const cases = [
    [{ workflow: { plugin: 'wf', 'task-per-coder': 3 }, 'stack-skills': ok }, /unknown key "task-per-coder".*wf declares: tasks-per-coder/],
    [{ workflow: { plugin: 'wf', 'tasks-per-coder': '3' }, 'stack-skills': ok }, /"workflow\.tasks-per-coder" is not a number/],
    [{ workflow: { plugin: 'other' }, 'stack-skills': ok }, /names other, but the resolved folder holds wf/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', disable: ['nope'] } }, /"stack-skills\.disable" names "nope"/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { max_rounds: 0 } } } }, /"stack-skills\.gates\.fmt\.max_rounds" is not a whole number/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { nope: { max_rounds: 2 } } } }, /"stack-skills\.gates" names "nope"/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': ok, curator: { plugin: 'c' } }, /unknown section "curator"/],
  ];
  for (const [config, re] of cases) {
    const out = checkProject(project(config, both));
    assert.equal(out.length, 1, `${re}: ${out.join(' | ')}`);
    assert.match(out[0], re);
    assert.match(out[0], /^\.orchestra\/config\.json: .+\. Fix: .+\.$/);
  }
});

test('an unresolved slot, a missing or broken config, and a declaration in the wrong slot each fail with a fix', () => {
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } };
  assert.match(checkProject(project(config, { workflow: wf })).join('\n'), /the stack-skills plugin st is not resolved\. Fix: /);
  assert.match(checkProject(makeRepo()).join('\n'), /config\.json is missing\. Fix: run orchestra init/);
  const broken = project(config, { workflow: wf, 'stack-skills': st });
  fs.writeFileSync(path.join(broken, '.orchestra/config.json'), '{ nope');
  assert.match(checkProject(broken).join('\n'), /config\.json is not valid JSON: .+\. Fix: /);
  const swapped = checkProject(project(config, { workflow: st, 'stack-skills': st }));
  assert.equal(swapped.length, 1, swapped.join(' | '));
  assert.match(swapped[0], /"slot" is stack-skills, but it fills the workflow slot/);
});

const { execFileSync } = require('node:child_process');
const { checkPlugin } = require('../../plugins/orchestra/lib/check');
const CHECK = path.join(__dirname, '../../plugins/orchestra/bin/check.js');

test('plugin rules: the manifests, the frontmatter, harness words and the manifest skill', () => {
  const dir = writePlugin(tmp('st-'), 'st', stack());
  fs.rmSync(path.join(dir, 'skills/manifest'), { recursive: true });
  writeJson(path.join(dir, '.claude-plugin/plugin.json'), { name: 'st', version: '9.9.9' });
  fs.mkdirSync(path.join(dir, 'skills/extra'));
  fs.writeFileSync(path.join(dir, 'skills/extra/SKILL.md'), '---\nname: extra\ndescription: d\nmodel: x\n---\nUse the Task tool.\n');
  const out = checkPlugin(dir);
  assert.equal(out.length, 4, out.join('\n'));
  assert.match(out[0], /the two manifests differ/);
  assert.match(out[1], /skills\/extra\/SKILL\.md: the frontmatter has the keys name, description, model/);
  assert.match(out[2], /skills\/extra\/SKILL\.md: it names a harness tool \(Task tool\)/);
  assert.match(out[3], /st: there is no manifest skill/);
  for (const line of out) assert.match(line, /\. Fix: .+\.$/);
});

test('a plugin without orchestra.json gets only the packaging rules', () => {
  const dir = writePlugin(tmp('orc-'), 'orc');
  fs.rmSync(path.join(dir, 'skills/manifest'), { recursive: true });
  assert.deepEqual(checkPlugin(dir), []);
});

test('the dry run reports a next.js that is missing, prints no action, or fails', () => {
  const dir = writePlugin(tmp('wf-'), 'wf', { slot: 'workflow', gates: [] });
  assert.match(checkPlugin(dir).join('\n'), /wf\/bin\/next\.js is missing\. Fix: /);
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin/next.js'), 'console.log("hello")\n');
  assert.match(checkPlugin(dir).join('\n'), /wf\/bin\/next\.js: the dry run did not print a valid action/);
  fs.writeFileSync(path.join(dir, 'bin/next.js'), 'console.log(JSON.stringify({ action: "failed", reason: "boom" }))\n');
  assert.match(checkPlugin(dir).join('\n'), /wf\/bin\/next\.js: the dry run ended with failed: boom/);
});

test('the command line lists the failures and exits 1, or passes and exits 0', () => {
  const bad = writePlugin(tmp('st-'), 'st', { slot: 'stack-skills' });
  assert.throws(() => execFileSync(process.execPath, [CHECK, bad], { encoding: 'utf8' }), e => e.status === 1 && /1 failed\./.test(e.stdout));
  const good = writePlugin(tmp('st-'), 'st', stack());
  assert.match(execFileSync(process.execPath, [CHECK, good], { encoding: 'utf8' }), /All checks passed\./);
  assert.throws(() => execFileSync(process.execPath, [CHECK], { encoding: 'utf8', stdio: 'pipe' }), e => e.status === 1);
});

test('a config must be an object with a section for every slot', () => {
  const config = { workflow: { plugin: 'wf' } };
  const out = checkProject(project(config, { workflow: wf }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /section "stack-skills" is missing\. Fix: /);
  const list = project([], {});
  assert.match(checkProject(list).join('\n'), /config\.json is not a JSON object\. Fix: /);
});

test('the build command takes no config placeholder, because the runtime expands only {plugin}', () => {
  const out = errors(stack({ build: { run: 'make {config.x}', guide: 'fix-build' } }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /build "run" uses \{config\.x\}/);
});

test('the dry run ignores the git variables of a calling hook', () => {
  const user = makeRepo();
  const before = execFileSync('git', ['ls-files'], { cwd: user, encoding: 'utf8' });
  process.env.GIT_INDEX_FILE = path.join(user, '.git', 'index');
  try {
    assert.deepEqual(checkPlugin(path.join(__dirname, '../../plugins/orc-standard-workflow')), []);
  } finally {
    delete process.env.GIT_INDEX_FILE;
  }
  assert.equal(execFileSync('git', ['ls-files'], { cwd: user, encoding: 'utf8' }), before);
});

test('inherited object keys do not count as declared', () => {
  const out = errors(stack({ gates: [{ name: 'a', phase: 'finish', kind: 'tool', run: 'x {config.constructor}', always: true }] }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /uses \{config\.constructor\}/);
  const cfg = checkProject(project({ workflow: { plugin: 'wf', toString: 'x' }, 'stack-skills': { plugin: 'st' } }, { workflow: wf, 'stack-skills': st }));
  assert.equal(cfg.length, 1, cfg.join(' | '));
  assert.match(cfg[0], /unknown key "toString"/);
});

test('a dry run that cannot build its scratch repo says so, and does not blame next.js', () => {
  const dir = writePlugin(tmp('wf-'), 'wf', { slot: 'workflow', gates: [] });
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin/next.js'), 'console.log(JSON.stringify({ action: "done" }))\n');
  const saved = process.env.PATH;
  process.env.PATH = '';
  let out;
  try {
    out = checkPlugin(dir).join('\n');
  } finally {
    process.env.PATH = saved;
  }
  assert.match(out, /wf\/bin\/next\.js: the dry run could not build its scratch repo: .+\. Fix: /);
  assert.doesNotMatch(out, /did not print a valid action/);
});

test('a project value that breaks a gate grep fails the config check', () => {
  const d = stack({ config: { pat: { type: 'string', default: '@Entity' } }, gates: [{ name: 'g', phase: 'finish', kind: 'agent', skill: 's', grep: '{config.pat}' }] });
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', pat: '(' } }, { workflow: wf, 'stack-skills': d }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /the values of section "stack-skills" make the "grep" of gate "g" invalid: .+\. Fix: /);
});

test('a SKILL.md with Windows line endings passes the frontmatter rule', () => {
  const dir = writePlugin(tmp('orc-'), 'orc');
  fs.writeFileSync(path.join(dir, 'skills/manifest/SKILL.md'), '---\r\nname: manifest\r\ndescription: d\r\n---\r\nBody\r\n');
  assert.deepEqual(checkPlugin(dir), []);
});
