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
    guides: { code: 'guides/code.md' },
    gates: [
      { name: 'ops', phase: 'implementation-check', kind: 'agent', skill: 'review-ops', files: ['**/*.java', '**/*.sql'] },
      { name: 'entities', phase: 'conventions-check', kind: 'agent', skill: 'review-entities', grep: '{config.entity-pattern}' },
      { name: 'fmt', phase: 'finish', kind: 'tool', run: 'fmt {plugin}', fix: 'fixer', guide: 'fix-fmt', max_rounds: 1, always: true },
      { name: 'shape', phase: 'implementation-check', kind: 'agent', skill: 'review-shape', always: true },
    ],
  })), []);
  assert.deepEqual(errors({ slot: 'workflow', config: { n: { type: 'number', default: 2 } }, gates: [] }), []);
});

test('a guide is a path to a file inside the plugin', () => {
  const d = stack({ guides: { code: 'guides/code.md' } });
  const dir = writePlugin(tmp('st-'), 'st', d);
  assert.deepEqual(checkDeclaration(d, dir, 'st/orchestra.json'), []);
  fs.rmSync(path.join(dir, 'guides/code.md'));
  const out = checkDeclaration(d, dir, 'st/orchestra.json').join('\n');
  assert.match(out, /guide "code" names the file "guides\/code\.md", which is not in the plugin\. Fix: .*guides\/code\.md/);
  for (const bad of ['../x.md', '/abs/code.md', 'guides/../../x.md']) {
    const e = errors(stack({ guides: { code: bad } })).join('\n');
    assert.match(e, /guide "code"/, bad);
  }
});

test('each broken declaration rule gives one line with the rule and its fix', () => {
  const tool = extra => ({ name: 'a', phase: 'finish', kind: 'tool', run: 'x', always: true, ...extra });
  const cases = [
    [{ slot: 'psk' }, /"slot" is "psk"/],
    [curator({ curate: undefined }), /"curate" names no skill/],
    [curator({ setup: undefined }), /there is no "setup"/],
    [curator({ setup: { skill: 'setup', done: 'x', when: 'once' } }), /unknown setup key "when"/],
    [curator({ setup: { skill: 'setup' } }), /setup "done" is undefined/],
    [curator({ setup: { skill: 'setup', done: '/abs/.setup' } }), /setup "done" is "\/abs\/\.setup"/],
    [curator({ setup: { skill: 'setup', done: '../out/.setup' } }), /setup "done" is "\.\.\/out\/\.setup"/],
    [curator({ build: { run: 'make' } }), /unknown key "build" for slot curator/],
    [curator({ guides: { review: 'x' } }), /unknown guide stage "review"/],
    [stack({ params: [] }), /unknown key "params"/],
    [{ slot: 'workflow', build: { run: 'make' } }, /unknown key "build" for slot workflow/],
    [{ slot: 'stack-skills' }, /no "build" with a "run" command/],
    [stack({ config: { n: { type: 'number' } } }), /config key "n" has no number default/],
    [stack({ config: { disable: { type: 'string', default: '' } } }), /config key "disable" is reserved/],
    [stack({ guides: { review: 'x' } }), /unknown guide stage "review"/],
    [stack({ guides: 'plan-guide' }), /"guides" is not an object/],
    [{ slot: 'workflow', stages: ['spec', 'review'] }, /"stages" is \["spec","review"\]/],
    [{ slot: 'workflow', stages: ['plan', 'plan'] }, /"stages" is \["plan","plan"\]/],
    [{ slot: 'workflow', guides: { plan: 'x' } }, /unknown key "guides" for slot workflow/],
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

const curator = (extra = {}) => ({ slot: 'curator', curate: 'curate', setup: { skill: 'setup', done: 'docs/curator/.setup' }, ...extra });
const wf = { slot: 'workflow', config: { 'tasks-per-coder': { type: 'number', default: 2 } }, stages: ['spec', 'plan', 'code'], gates: [] };
const st = stack({ guides: { code: 'guides/code.md' }, gates: [{ name: 'fmt', phase: 'finish', kind: 'tool', run: 'x', always: true }] });

function project(config, declarations) {
  const dir = makeRepo();
  const slots = {};
  for (const [slot, d] of Object.entries(declarations)) {
    const name = { workflow: 'wf', 'stack-skills': 'st', curator: 'cur', core: 'core' }[slot];
    slots[slot] = { plugin: name, version: '0.0.1', dir: writePlugin(tmp(`${name}-`), name, d), declaration: d };
  }
  writeJson(path.join(dir, '.orchestra/config.json'), config);
  writeJson(path.join(dir, '.orchestra/resolved.json'), { orchestra: { dir: '/orc' }, slots });
  return dir;
}

test('a workflow declaration with the old key roles fails with the rename', () => {
  assert.match(errors({ slot: 'workflow', roles: ['code'] }).join('\n'), /unknown key "roles" for slot workflow\. Fix: rename it to "stages"/);
});

test('a guide for a stage the workflow has no stage for fails, unless the config disables it', () => {
  const noCode = { ...wf, stages: ['spec', 'plan'] };
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, { workflow: noCode, 'stack-skills': st }));
  assert.deepEqual(out, ['.orchestra/config.json: st declares a "code" guide, but the workflow wf has no code stage. Fix: add "guides/code.md" to "stack-skills.disable", or choose a workflow with a code stage.']);
  const off = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', disable: ['guides/code.md'] } };
  assert.deepEqual(checkProject(project(off, { workflow: noCode, 'stack-skills': st })), []);
});

test('a stack that declares measure fails: the clean-code gate measures by itself (S85)', () => {
  assert.match(errors(stack({ measure: { run: 'm' } })).join('\n'), /unknown key "measure" for slot stack-skills/);
  assert.match(errors(stack({ gates: [{ name: 'a', phase: 'finish', kind: 'agent', skill: 's', always: true, measure: true }] })).join('\n'), /measure/);
});

test('a core declaration takes only slot, config, gates and shared-roles', () => {
  const gate = { name: 'shape', phase: 'implementation-check', kind: 'agent', skill: 'review-shape', always: true };
  assert.deepEqual(errors({ slot: 'core', config: {}, gates: [gate] }), []);
  for (const key of ['guides', 'build', 'measure']) {
    assert.match(errors({ slot: 'core', gates: [], [key]: {} }).join('\n'), new RegExp(`unknown key "${key}" for slot core`));
  }
});

test('a gate name declared by two slots fails, unless one section disables it', () => {
  const shape = { name: 'shape', phase: 'implementation-check', kind: 'agent', skill: 'review-shape', always: true };
  const wf2 = { slot: 'workflow', stages: ['code'], gates: [shape] };
  const core = { slot: 'core', gates: [shape] };
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, core: { plugin: 'core' } };
  assert.deepEqual(checkProject(project(config, { workflow: wf2, 'stack-skills': st, core })),
    ['.orchestra/config.json: gate "shape" is declared by both wf and core. Fix: add "shape" to the "disable" list of one of the two sections, or rename it in one plugin.']);
  config.core.disable = ['shape'];
  assert.deepEqual(checkProject(project(config, { workflow: wf2, 'stack-skills': st, core })), []);
});

test('a valid project config passes', () => {
  const config = {
    workflow: { plugin: 'wf', 'tasks-per-coder': 3 },
    'stack-skills': { plugin: 'st', disable: ['guides/code.md', 'fmt'], gates: { fmt: { max_rounds: 4 } } },
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
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { max_rounds: 0 } } } }, /"stack-skills\.gates\.fmt" "max_rounds" is not a whole number/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { phase: 'finish' } } } }, /"stack-skills\.gates\.fmt" has unknown key "phase".*max_rounds, run, files, grep, when, always/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { always: false } } } }, /"stack-skills\.gates\.fmt" has no selection rule, so it never runs/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { grep: '(' } } } }, /"stack-skills\.gates\.fmt" "grep" is not a valid regular expression/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { files: 3 } } } }, /"stack-skills\.gates\.fmt" "files" is not a glob/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', build: { run: 'x', cache: true } } }, /unknown build key "cache"/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', build: { max_rounds: 0 } } }, /"stack-skills\.build\.max_rounds" is not a whole number/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', build: { guide: 'fix-all' } } }, /names skill "fix-all", which is not in .*\.agents\/skills/],
    [{ workflow: { plugin: 'wf', build: { run: 'x' } }, 'stack-skills': ok }, /section "workflow" has unknown key "build"/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { run: null } } } }, /"stack-skills\.gates\.fmt" "run" is not a command/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', build: { run: '' } } }, /"stack-skills\.build\.run" is not a command/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', build: { run: 'make {config.x}' } } }, /"stack-skills\.build\.run" uses \{config\.x\}/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { run: 5 } } } }, /"stack-skills\.gates\.fmt" "run" is not a command/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { grep: 5 } } } }, /"stack-skills\.gates\.fmt" "grep" is not text/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { always: false, grep: '' } } } }, /"stack-skills\.gates\.fmt" has no selection rule, so it never runs/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { always: false, when: '' } } } }, /"stack-skills\.gates\.fmt" has no selection rule, so it never runs/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { nope: { max_rounds: 2 } } } }, /"stack-skills\.gates" names "nope"/],
    [{ workflow: { plugin: 'wf' }, 'stack-skills': ok, nope: { plugin: 'c' } }, /unknown section "nope"/],
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

test('a grep broken with the defaults is reported once, by the declaration rule', () => {
  const gate = grep => [{ name: 'g', phase: 'finish', kind: 'agent', skill: 's', grep }];
  const cases = [
    [stack({ config: { pat: { type: 'string', default: '(' } }, gates: gate('{config.pat}') }), '('],
    [stack({ config: { pat: { type: 'string', default: 'x' } }, gates: gate('[{config.pat}') }), 'y'],
  ];
  for (const [d, value] of cases) {
    const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', pat: value } }, { workflow: wf, 'stack-skills': d }));
    assert.equal(out.length, 1, out.join(' | '));
    assert.match(out[0], /^st\/orchestra\.json: gate "g" "grep" is not a valid regular expression/);
  }
});

test('a config value of the wrong type is reported once, by the type rule', () => {
  const d = stack({ config: { pat: { type: 'string', default: '@Entity' } }, gates: [{ name: 'g', phase: 'finish', kind: 'agent', skill: 's', grep: '{config.pat}' }] });
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', pat: ['('] } }, { workflow: wf, 'stack-skills': d }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /"stack-skills\.pat" is not a string/);
});

test('the project must ignore the run worktrees', () => {
  const both = { workflow: wf, 'stack-skills': st };
  const dir = project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, both);
  fs.writeFileSync(path.join(dir, '.gitignore'), 'tmp/\n');
  const out = checkProject(dir);
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /^\.gitignore: \.orchestra\/worktrees\/ is not ignored\. Fix: .+\.$/);
});

test('a valid curator declaration passes, and the curator section is optional', () => {
  const cur = curator({ guides: { spec: 'guides/spec.md', plan: 'guides/plan.md' } });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, curator: { plugin: 'cur' } };
  assert.deepEqual(checkProject(project(config, { workflow: wf, 'stack-skills': st, curator: cur })), []);
  assert.deepEqual(checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, { workflow: wf, 'stack-skills': st })), []);
});

test('a curator guide for a stage the workflow lacks names the curator section in its fix', () => {
  const cur = curator({ guides: { spec: 'guides/spec.md' } });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, curator: { plugin: 'cur' } };
  const out = checkProject(project(config, { workflow: { ...wf, stages: ['plan', 'code'] }, 'stack-skills': st, curator: cur }));
  assert.deepEqual(out, ['.orchestra/config.json: cur declares a "spec" guide, but the workflow wf has no spec stage. Fix: add "guides/spec.md" to "curator.disable", or choose a workflow with a spec stage.']);
});

// Writes .orchestra/project/ with its guides, the named skills in .agents/skills/, the resolved slot and the .gitignore line.
function addProject(dir, d, { skills = [], ignore = false } = {}) {
  writeJson(path.join(dir, '.orchestra/project/orchestra.json'), d);
  for (const g of Object.values(d.guides || {})) {
    fs.mkdirSync(path.dirname(path.join(dir, '.orchestra/project', g)), { recursive: true });
    fs.writeFileSync(path.join(dir, '.orchestra/project', g), '# A guide\n');
  }
  for (const s of skills) {
    fs.mkdirSync(path.join(dir, '.agents/skills', s), { recursive: true });
    fs.writeFileSync(path.join(dir, '.agents/skills', s, 'SKILL.md'), `---\nname: ${s}\ndescription: Test skill.\n---\n`);
  }
  if (!ignore) fs.appendFileSync(path.join(dir, '.gitignore'), '!.orchestra/project/\n');
  const file = path.join(dir, '.orchestra/resolved.json');
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  r.slots.project = { plugin: 'project', version: 'local', dir: '.orchestra/project', declaration: d };
  writeJson(file, r);
  return dir;
}
const both = (config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, workflow = wf) => project(config, { workflow, 'stack-skills': st });
const money = { name: 'money', phase: 'conventions-check', kind: 'agent', skill: 'check-money', files: '**/*.java' };

test('a valid project declaration passes', () => {
  const d = { slot: 'project', guides: { code: 'guides/code.md' }, gates: [money, { name: 'arch', phase: 'implementation-check', kind: 'tool', run: 'make arch', fix: 'fixer', guide: 'fix-arch', always: true }] };
  assert.deepEqual(checkProject(addProject(both(), d, { skills: ['check-money', 'fix-arch'] })), []);
});

test('a project skill must exist in .agents/skills/ with only name and description', () => {
  const d = { slot: 'project', gates: [money] };
  const missing = checkProject(addProject(both(), d));
  assert.equal(missing.length, 1, missing.join(' | '));
  assert.match(missing[0], /names skill "check-money", which is not in .*\.agents\/skills/);
  const dir = addProject(both(), d, { skills: ['check-money'] });
  fs.writeFileSync(path.join(dir, '.agents/skills/check-money/SKILL.md'), '---\nname: check-money\ndescription: x\nmodel: opus\n---\n');
  const extra = checkProject(dir);
  assert.equal(extra.length, 1, extra.join(' | '));
  assert.match(extra[0], /frontmatter has the keys name, description, model/);
});

test('a project declaration takes only slot, gates and guides', () => {
  for (const [key, value] of [['build', { run: 'x' }], ['config', {}], ['stages', ['code']]]) {
    assert.match(checkProject(addProject(both(), { slot: 'project', [key]: value })).join('\n'), new RegExp(`unknown key "${key}" for slot project`));
  }
});

test('a project gate may not reuse a plugin gate name, even a disabled one', () => {
  const out = checkProject(addProject(both({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', disable: ['fmt'] } }), { slot: 'project', gates: [{ ...money, name: 'fmt' }] }, { skills: ['check-money'] }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /gate "fmt".*project.*st.*Fix: .*rename/);
});

test('a project guide for a stage the workflow lacks fails', () => {
  const out = checkProject(addProject(both(undefined, { ...wf, stages: ['spec', 'plan'] }), { slot: 'project', guides: { code: 'guides/code.md' } }));
  const mine = out.filter(l => /project declares/.test(l));
  assert.equal(mine.length, 1, out.join(' | '));
  assert.match(mine[0], /project declares a "code" guide, but the workflow wf has no code stage\. Fix: remove .+ from \.orchestra\/project\/orchestra\.json/);
});

test('the project folder must not be ignored', () => {
  const out = checkProject(addProject(both(), { slot: 'project', gates: [] }, { ignore: true }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /^\.gitignore: \.orchestra\/project\/ is ignored\. Fix: add the line !\.orchestra\/project\/ to \.gitignore\.$/);
});

test('a plugin cannot fill the project slot', () => {
  const { checkPlugin } = require('../../plugins/orchestra/lib/check');
  assert.match(checkPlugin(writePlugin(tmp('p-'), 'p', { slot: 'project', gates: [] })).join('\n'), /"slot" is project, which only a project's \.orchestra\/project\/ fills/);
});

test('a config section named project is unknown', () => {
  assert.match(checkProject(both({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, project: { plugin: 'x' } })).join('\n'), /unknown section "project"/);
});

test('a valid override of a gate and the build passes', () => {
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { run: 'y', files: '**/*.ts', max_rounds: 3 } }, build: { run: 'make all', guide: 'fix-all', max_rounds: 4 } } };
  const dir = project(config, { workflow: wf, 'stack-skills': st });
  fs.mkdirSync(path.join(dir, '.agents/skills/fix-all'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents/skills/fix-all/SKILL.md'), '---\nname: fix-all\ndescription: Test skill.\n---\n');
  assert.deepEqual(checkProject(dir), []);
});

test('an empty list of files selects nothing, so check says so', () => {
  const out = checkProject(both({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { fmt: { always: false, files: [] } } } })).join('\n');
  assert.match(out, /"stack-skills\.gates\.fmt" "files" is not a glob or a list of globs/);
  assert.match(out, /"stack-skills\.gates\.fmt" has no selection rule, so it never runs/);
});

test('the project declaration must have the slot project', () => {
  for (const slot of ['workflow', undefined]) {
    const out = checkProject(addProject(both(), { slot, gates: [] }));
    assert.equal(out.length, 1, out.join(' | '));
    assert.match(out[0], /^\.orchestra\/project\/orchestra\.json: "slot" is .+\. Fix: set it to "project"\.$/);
  }
});

test('a broken declared gate with an override says "never runs" once', () => {
  const bad = stack({ gates: [{ name: 'bad', phase: 'finish', kind: 'tool', run: 'x' }] });
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', gates: { bad: { max_rounds: 3 } } } }, { workflow: wf, 'stack-skills': bad }));
  assert.equal(out.filter(l => /never runs/.test(l)).length, 1, out.join(' | '));
});

test('a grep the override replaces is not tested with the section values', () => {
  const d = stack({ config: { pat: { type: 'string', default: '@Entity' } }, gates: [{ name: 'g', phase: 'finish', kind: 'agent', skill: 's', grep: '{config.pat}' }] });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', pat: '(', gates: { g: { grep: 'Entity' } } } };
  assert.deepEqual(checkProject(project(config, { workflow: wf, 'stack-skills': d })), []);
});

test('a missing project guide names the project folder, not a plugin', () => {
  const dir = addProject(both(), { slot: 'project', guides: { code: 'guides/code.md' } });
  fs.rmSync(path.join(dir, '.orchestra/project/guides/code.md'));
  const out = checkProject(dir);
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /names the file "guides\/code\.md", which is not in \.orchestra\/project\//);
});

test('shared-roles names known roles and skills of the plugin, and only core and project carry it', () => {
  assert.deepEqual(errors({ slot: 'core', gates: [], 'shared-roles': { triage: 'triage' } }), []);
  assert.match(errors({ slot: 'core', 'shared-roles': { review: 'x' } }).join('\n'), /unknown shared role "review"\. Fix: use one of triage, writing-style, pr-review, pr-description/);
  assert.match(errors(stack({ 'shared-roles': { triage: 'triage' } })).join('\n'), /unknown key "shared-roles" for slot stack-skills/);
  const d = { slot: 'core', 'shared-roles': { triage: 'triage' } };
  const dir = writePlugin(tmp('core-'), 'core', { slot: 'core' });
  assert.match(checkDeclaration(d, dir, 'core/orchestra.json').join('\n'), /shared role "triage" names skill "triage", which is not in skills\//);
});

test('a config with the old global-gates section fails with the rename', () => {
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, 'global-gates': { plugin: 'orc-global-gates' } }, { workflow: wf, 'stack-skills': st }));
  assert.deepEqual(out, ['.orchestra/config.json: section "global-gates" is now "core". Fix: rename the section to "core" and choose orc-core.']);
});

test('a project guide may be keyed by a shared role that the core plugin or the project fills', () => {
  const amend = { slot: 'project', guides: { triage: 'guides/triage.md' } };
  assert.deepEqual(checkProject(addProject(both(), amend)), ['.orchestra/project/orchestra.json: the project declares a "triage" guide, but no core plugin or project skill fills the shared role triage. Fix: add a core plugin that fills it, add "triage" under "shared-roles" with a project skill, or remove the guide.']);
  assert.deepEqual(checkProject(addProject(both(), { ...amend, 'shared-roles': { triage: 'our-triage' } }, { skills: ['our-triage'] })), []);
  const withCore = project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, core: { plugin: 'core' } }, { workflow: wf, 'stack-skills': st, core: { slot: 'core', 'shared-roles': { triage: 'triage' } } });
  assert.deepEqual(checkProject(addProject(withCore, amend)), []);
  assert.match(checkProject(addProject(both(), { slot: 'project', guides: { review: 'guides/review.md' } })).join('\n'), /unknown guide stage "review"/);
});
