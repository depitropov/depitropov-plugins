# Contracts (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `orchestra check` (every contract rule as plain code, with a dry run of a workflow's `next.js`), run it at the start of each run, add `orchestra:init` and one authoring skill, `orchestra:writing-plugins`.

**Architecture:** `plugins/orchestra/lib/check.js` holds every rule and exports its key lists. `bin/check.js` is a thin command line over it: plugin folders (all rules) or `--project <dir>` (the config and the declarations of the resolved plugins). `lib/resolved.js` writes `resolved.json` without its own checks, then calls the project rules and throws their lines. The dry run builds a throwaway git repo with a bare remote, the same way the tests do, and runs the workflow's real `next.js` there. Two skills are new: `init` (interactive set-up) and `writing-plugins` (a reference card). A test keeps the skill in step with the key lists of `check.js`.

**Tech Stack:** Node 22, standard library only, `node:test`.

**Spec:** `docs/DESIGN.md` §4, §5.1, §5.3, §5.4, §7, §9 (written before S56; the grilling below replaces it where they differ), `docs/TENSIONS.md` S28, S31, S33, S39, S52, S61.

## Scope

The record of the grilling of 2026-10-14. Nothing in this plan comes from a source plugin, so `docs/PORTING.md` does not apply.

| # | Question | Decision | Task |
|---|---|---|---|
| Q1 | Does `check` ship as a command? | Yes. All rules move from `test/packaging.test.js` into `check.js`; the test runs `check` on every plugin. The "no ship.cars names" test stays in the repo tests. | 1, 2 |
| Q2 | JSON Schema files? | No. The shape rules are plain code in `check.js`. | 1 |
| Q3 | Authoring skills | One short skill, `orchestra:writing-plugins`. | 5 |
| Q4 | How init finds the plugins | From its skill list (`<plugin>:manifest`); asks the user when the list shows none. | 4 |
| Q5 | Keep the dry run? | Yes. | 2 |
| Q6 | Keeping the skill and `check` in step | A test (each word of the key lists appears in the skill) plus one `CLAUDE.md` line. | 5 |
| Q7 | `check` at run start | `resolve.js` runs the project rules. The interim checks in `resolved.js` and `gates.js` go. | 3 |
| Q8 | Command line and output | `check.js <plugin-folder>…` and `check.js --project <dir>`. It lists every failure with its rule and its fix, then exits non-zero. | 2 |
| Q9 | What init writes | Only `plugin` per section, plus the `.gitignore` lines; resolves and checks; asks before it overwrites; commits nothing. | 4 |
| Q10 | How the dry run works | A throwaway git repo with a bare remote; the real `next.js --task-file`; no `--dry-run` flag. Changes S52. | 2 |
| Q11 | The `params` key | Removed: no code reads it. | 2, 6 |
| Q12 | What `writing-plugins` covers | The declaration, the gate keys, the phases, the `next.js` actions; ends with "run `check`". | 5 |

One rule added while planning (not asked in the grilling): a config key in a declaration must have a `default`, because init writes no values (Q9) and `{config.<key>}` must always expand. It is in the S70 record.

## Global Constraints

- Node, standard library only (S11). No `package.json` dependencies.
- `SKILL.md` frontmatter has only `name` and `description` (S33).
- Skill text names actions ("dispatch a subagent", "invoke the skill"), never a harness's tool names (Pillar 4).
- The decision records go in the same commit as the change they decide (`CLAUDE.md`).
- Every failure line has the form `<where>: <problem>. Fix: <fix>.`
- Run the tests with `npm test` (`node --test "test/**/*.test.js"`).

## Review Focus

1. Bad JSON in the config or a declaration → one failure line with the parse error, never a stack trace. Pinned in Task 1.
2. A typo in a config key (`task-per-coder`) → the failure names the keys the plugin declares. Pinned in Task 1.
3. `check` on a plugin folder with no `orchestra.json` (`plugins/orchestra` itself) → only the packaging rules, no manifest-skill or declaration failures. Pinned in Task 2.
4. A workflow `next.js` that prints text that is not an action, or prints `failed` → a failure line, not a crash of `check`. Pinned in Task 2.
5. The config names a plugin that is not installed (no folder resolved for a section) → "is not resolved" with a fix, before any subagent runs. Pinned in Task 1 (rule) and Task 3 (through `resolve`).

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `plugins/orchestra/lib/check.js` | Create | Every contract rule; the key lists |
| `plugins/orchestra/bin/check.js` | Create | The command line |
| `plugins/orchestra/lib/git.js` | Modify | `scratchRepo(root)`, shared by the dry run and the tests |
| `plugins/orchestra/lib/resolved.js` | Modify | Writes `resolved.json`, then runs the project rules |
| `plugins/orchestra/lib/gates.js` | Modify | Drops the two run-time checks that `check` now owns |
| `plugins/orchestra/skills/init/SKILL.md` | Create | Interactive set-up |
| `plugins/orchestra/skills/writing-plugins/SKILL.md` | Create | Reference card for plugin authors |
| `plugins/orc-standard-workflow/orchestra.json`, `plugins/orc-java-stack/orchestra.json` | Modify | Drop `params` |
| `test/helpers.js` | Modify | `makeRepo` uses `scratchRepo`; new `writePlugin` |
| `test/orchestra/check.test.js` | Create | The rules, the dry run, the command line |
| `test/packaging.test.js` | Modify | Runs `check` on every plugin; the skill-sync test |
| `test/orchestra/resolved.test.js`, `runner.test.js`, `drive.test.js`, `gates.test.js` | Modify | Stub plugins that pass `check`; new messages |
| `CLAUDE.md`, `docs/TENSIONS.md`, `docs/DECISIONS.md`, `docs/DESIGN.md` | Modify | Rule line, S70, design |

---

### Task 1: The declaration and config rules

**Files:**
- Create: `plugins/orchestra/lib/check.js`
- Modify: `test/helpers.js`
- Test: `test/orchestra/check.test.js`
- Modify: `docs/TENSIONS.md`, `docs/DECISIONS.md` (the S70 records go in this first commit)

**Interfaces:**
- Consumes: `PHASES`, `ACTIONS` from `plugins/orchestra/lib/protocol.js`.
- Produces:
  - `checkDeclaration(declaration, dir, where) → string[]` — `dir` is the plugin folder (skills are looked up in `<dir>/skills/<name>/SKILL.md`), `where` is the label that starts each line.
  - `checkProject(project) → string[]` — reads `<project>/.orchestra/config.json` and `<project>/.orchestra/resolved.json`.
  - Constants: `SLOTS`, `KINDS`, `FIXES`, `CONFIG_TYPES`, `DECLARATION_KEYS`, `GATE_KEYS`, `BUILD_KEYS`, `GUIDE_KINDS`, `SECTION_KEYS`, and re-exported `PHASES`, `ACTIONS`.
  - `test/helpers.js`: `writePlugin(dir, name, declaration) → dir` — writes `plugin.json`, `.claude-plugin/plugin.json` (version `0.0.1`), `orchestra.json` (when `declaration` is given), a `manifest` skill, and a `SKILL.md` with valid frontmatter for every skill the declaration names (`build.guide`, each `guides` value, each gate `skill` and `guide`).

- [ ] **Step 1: Add `writePlugin` to `test/helpers.js`**

Add after `writeJson`, and export it:

```js
// A plugin folder that passes the packaging rules: both manifests, a manifest skill, and a SKILL.md
// for every skill the declaration names.
function writePlugin(dir, name, declaration) {
  writeJson(path.join(dir, 'plugin.json'), { name, version: '0.0.1' });
  writeJson(path.join(dir, '.claude-plugin', 'plugin.json'), { name, version: '0.0.1' });
  const skills = ['manifest'];
  if (declaration) {
    writeJson(path.join(dir, 'orchestra.json'), declaration);
    const d = declaration;
    skills.push(...[d.build && d.build.guide, ...Object.values(d.guides || {}), ...(d.gates || []).flatMap(g => [g.skill, g.guide])].filter(Boolean));
  }
  for (const s of skills) {
    fs.mkdirSync(path.join(dir, 'skills', s), { recursive: true });
    fs.writeFileSync(path.join(dir, 'skills', s, 'SKILL.md'), `---\nname: ${s}\ndescription: Test skill.\n---\n`);
  }
  return dir;
}

module.exports = { git, writeJson, writePlugin, makeRepo };
```

- [ ] **Step 2: Write the failing tests**

Create `test/orchestra/check.test.js`:

```js
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
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `node --test test/orchestra/check.test.js`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/lib/check'`.

- [ ] **Step 4: Write `plugins/orchestra/lib/check.js`**

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { PHASES, ACTIONS } = require('./protocol');

// The contract of a plugin declaration and of the project config. The skill writing-plugins explains
// every word in these lists; a test fails when one is missing there.
const SLOTS = ['workflow', 'stack-skills'];
const KINDS = ['tool', 'agent'];
const FIXES = ['self', 'fixer', 'none'];
const CONFIG_TYPES = ['string', 'number', 'boolean'];
const DECLARATION_KEYS = { workflow: ['slot', 'config', 'gates'], 'stack-skills': ['slot', 'config', 'build', 'guides', 'gates'] };
const GATE_KEYS = ['name', 'phase', 'kind', 'skill', 'run', 'fix', 'guide', 'max_rounds', 'files', 'grep', 'when', 'always'];
const BUILD_KEYS = ['run', 'guide', 'max_rounds'];
const GUIDE_KINDS = ['plan', 'code'];
const SECTION_KEYS = ['plugin', 'disable', 'gates'];
const CONFIG = '.orchestra/config.json';

const wholeNumber = v => Number.isInteger(v) && v >= 1;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const skillExists = (dir, name) => fs.existsSync(path.join(dir, 'skills', name, 'SKILL.md'));
const PLACEHOLDER = /\{config\.([\w-]+)\}/g;

// undefined when the file is missing, null when it is not valid JSON (and the failure is pushed).
function parseJson(file, label, out) {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    out.push(`${label} is not valid JSON: ${e.message}. Fix: correct the JSON.`);
    return null;
  }
}

function checkDeclaration(d, dir, where) {
  const out = [];
  const fail = (problem, fix) => out.push(`${where}: ${problem}. Fix: ${fix}.`);
  if (!isObject(d)) {
    fail('the declaration is not a JSON object', 'write orchestra.json as an object with a "slot" key');
    return out;
  }
  if (!SLOTS.includes(d.slot)) {
    fail(`"slot" is ${JSON.stringify(d.slot)}`, `set it to one of ${SLOTS.join(', ')}`);
    return out;
  }
  const allowed = DECLARATION_KEYS[d.slot];
  for (const key of Object.keys(d)) {
    if (!allowed.includes(key)) fail(`unknown key "${key}" for slot ${d.slot}`, `remove it; the allowed keys are ${allowed.join(', ')}`);
  }
  const config = isObject(d.config) ? d.config : {};
  for (const [key, spec] of Object.entries(config)) {
    if (SECTION_KEYS.includes(key)) fail(`config key "${key}" is reserved by orchestra`, 'rename it');
    if (!spec || !CONFIG_TYPES.includes(spec.type)) {
      fail(`config key "${key}" has type ${JSON.stringify(spec && spec.type)}`, `set "type" to one of ${CONFIG_TYPES.join(', ')}`);
    } else if (typeof spec.default !== spec.type) {
      fail(`config key "${key}" has no ${spec.type} default`, `add "default" with a ${spec.type} value`);
    }
  }
  const skill = (name, what) => {
    if (typeof name !== 'string') fail(`${what} names no skill`, 'name a skill of this plugin');
    else if (!skillExists(dir, name)) fail(`${what} names skill "${name}", which is not in skills/`, `add skills/${name}/SKILL.md or fix the name`);
  };
  const placeholders = (text, what) => {
    for (const m of String(text).matchAll(PLACEHOLDER)) {
      if (!config[m[1]]) fail(`${what} uses {config.${m[1]}}, which "config" does not declare`, `declare "${m[1]}" under "config" or fix the name`);
    }
  };
  if (d.slot === 'stack-skills') {
    const b = d.build;
    if (!isObject(b) || typeof b.run !== 'string') {
      fail('there is no "build" with a "run" command', 'add "build": { "run": "<full build command>", "guide": "<fix guide skill>" }');
    } else {
      for (const key of Object.keys(b)) {
        if (!BUILD_KEYS.includes(key)) fail(`unknown build key "${key}"`, `remove it; the allowed keys are ${BUILD_KEYS.join(', ')}`);
      }
      skill(b.guide, 'build "guide"');
      if (b.max_rounds !== undefined && !wholeNumber(b.max_rounds)) fail('build "max_rounds" is not a whole number of 1 or more', 'set it to 1 or more');
    }
    for (const [kind, name] of Object.entries(d.guides || {})) {
      if (!GUIDE_KINDS.includes(kind)) fail(`unknown guide "${kind}"`, `use one of ${GUIDE_KINDS.join(', ')}`);
      skill(name, `guide "${kind}"`);
    }
  }
  if (d.gates !== undefined && !Array.isArray(d.gates)) {
    fail('"gates" is not a list', 'make it a list of gate objects');
    return out;
  }
  const names = new Set(['build']);
  for (const g of d.gates || []) {
    if (!isObject(g) || typeof g.name !== 'string' || !g.name) {
      fail('a gate has no "name"', 'give every gate a unique name');
      continue;
    }
    const at = `gate "${g.name}"`;
    if (names.has(g.name)) fail(`${at} is not unique`, 'rename it; "build" and the names of the other gates are taken');
    names.add(g.name);
    for (const key of Object.keys(g)) {
      if (!GATE_KEYS.includes(key)) fail(`${at} has unknown key "${key}"`, `remove it; the allowed keys are ${GATE_KEYS.join(', ')}`);
    }
    if (!PHASES.includes(g.phase)) fail(`${at} has phase ${JSON.stringify(g.phase)}`, `use one of ${PHASES.join(', ')}`);
    if (!KINDS.includes(g.kind)) fail(`${at} has kind ${JSON.stringify(g.kind)}`, `use one of ${KINDS.join(', ')}`);
    if (g.kind === 'agent') skill(g.skill, at);
    if (g.kind === 'tool' && typeof g.run !== 'string') fail(`${at} is a tool gate with no "run" command`, 'add "run"');
    if (g.run !== undefined) placeholders(g.run, at);
    if (g.fix !== undefined && !FIXES.includes(g.fix)) fail(`${at} has fix ${JSON.stringify(g.fix)}`, `use one of ${FIXES.join(', ')}`);
    if (g.fix === 'fixer') {
      if (g.guide === undefined) fail(`${at} uses the fixer but names no guide`, 'add "guide" with its fix guide skill');
      else skill(g.guide, `${at} "guide"`);
    }
    if (g.max_rounds !== undefined && !wholeNumber(g.max_rounds)) fail(`${at} "max_rounds" is not a whole number of 1 or more`, 'set it to 1 or more');
    if (g.files !== undefined && ![].concat(g.files).every(f => typeof f === 'string' && f)) {
      fail(`${at} "files" is not a glob or a list of globs`, 'use a glob such as "**/*.java", or a list of them');
    }
    if (g.grep !== undefined) {
      placeholders(g.grep, at);
      try {
        new RegExp(String(g.grep).replace(PLACEHOLDER, (m, key) => (config[key] ? String(config[key].default) : '')));
      } catch (e) {
        fail(`${at} "grep" is not a valid regular expression: ${e.message}`, 'fix the pattern');
      }
    }
    if (g.when !== undefined && typeof g.when !== 'string') fail(`${at} "when" is not text`, 'write the rule in words');
    if (g.always !== undefined && typeof g.always !== 'boolean') fail(`${at} "always" is not true or false`, 'set it to true, or remove it');
    if (!g.always && g.files === undefined && g.grep === undefined && g.when === undefined) {
      fail(`${at} has no selection rule, so it never runs`, 'add "files", "grep", "when" or "always": true');
    }
  }
  return out;
}

function checkSection(slot, section, s, out) {
  const fail = (problem, fix) => out.push(`${CONFIG}: ${problem}. Fix: ${fix}.`);
  const d = s.declaration;
  if (!isObject(d)) {
    fail(`the ${slot} plugin ${s.plugin} has no orchestra.json`, 'choose a plugin that declares this slot');
    return;
  }
  if (d.slot !== slot) {
    out.push(`${s.plugin}/orchestra.json: "slot" is ${d.slot}, but it fills the ${slot} slot. Fix: choose a ${slot} plugin in ${CONFIG}.`);
    return;
  }
  out.push(...checkDeclaration(d, s.dir, `${s.plugin}/orchestra.json`));
  const declared = isObject(d.config) ? d.config : {};
  const gates = (Array.isArray(d.gates) ? d.gates : []).map(g => g && g.name);
  const turnable = [...gates, ...Object.values(d.guides || {})];
  for (const [key, value] of Object.entries(section)) {
    if (key === 'plugin') continue;
    if (key === 'disable') {
      if (!Array.isArray(value)) {
        fail(`"${slot}.disable" is not a list`, 'make it a list of gate or guide names');
        continue;
      }
      for (const name of value) {
        if (!turnable.includes(name)) fail(`"${slot}.disable" names ${JSON.stringify(name)}, which is no gate or guide of ${s.plugin}`, `use one of: ${turnable.join(', ')}`);
      }
    } else if (key === 'gates') {
      if (!isObject(value)) {
        fail(`"${slot}.gates" is not an object`, 'write { "<gate>": { "max_rounds": <n> } }');
        continue;
      }
      for (const [name, override] of Object.entries(value)) {
        if (!gates.includes(name)) {
          fail(`"${slot}.gates" names "${name}", which is no gate of ${s.plugin}`, `use one of: ${gates.join(', ')}`);
          continue;
        }
        for (const k of Object.keys(override || {})) {
          if (k !== 'max_rounds') fail(`"${slot}.gates.${name}" has unknown key "${k}"`, 'only "max_rounds" is allowed');
        }
        if (!override || !wholeNumber(override.max_rounds)) fail(`"${slot}.gates.${name}.max_rounds" is not a whole number of 1 or more`, 'set it to 1 or more');
      }
    } else if (!declared[key]) {
      const keys = Object.keys(declared);
      fail(`section "${slot}" has unknown key "${key}"`, keys.length ? `remove it or use a key that ${s.plugin} declares: ${keys.join(', ')}` : `remove it; ${s.plugin} declares no config keys`);
    } else if (typeof value !== declared[key].type) {
      fail(`"${slot}.${key}" is not a ${declared[key].type}`, `set it to a ${declared[key].type}, or remove it to take the default ${JSON.stringify(declared[key].default)}`);
    }
  }
}

function checkProject(project) {
  const out = [];
  const config = parseJson(path.join(project, CONFIG), CONFIG, out);
  const resolved = parseJson(path.join(project, '.orchestra', 'resolved.json'), '.orchestra/resolved.json', out);
  if (config === undefined) return [`${CONFIG} is missing. Fix: run orchestra init.`];
  if (resolved === undefined) return ['.orchestra/resolved.json is missing. Fix: start orchestra run or orchestra init; both resolve the plugins first.'];
  if (!config || !resolved) return out;
  const slots = resolved.slots || {};
  for (const [slot, section] of Object.entries(config)) {
    const fail = (problem, fix) => out.push(`${CONFIG}: ${problem}. Fix: ${fix}.`);
    if (!SLOTS.includes(slot)) {
      fail(`unknown section "${slot}"`, `use the slots ${SLOTS.join(', ')}`);
      continue;
    }
    if (!isObject(section) || typeof section.plugin !== 'string') {
      fail(`section "${slot}" names no "plugin"`, `add "plugin": "<the ${slot} plugin>"`);
      continue;
    }
    const s = slots[slot];
    if (!s) {
      fail(`the ${slot} plugin ${section.plugin} is not resolved`, 'install the plugin, check that its manifest skill answers, and run again');
      continue;
    }
    if (s.plugin !== section.plugin) {
      fail(`section "${slot}" names ${section.plugin}, but the resolved folder holds ${s.plugin}`, `give the folder of ${section.plugin}, or name ${s.plugin} in the config`);
      continue;
    }
    checkSection(slot, section, s, out);
  }
  return out;
}

module.exports = {
  SLOTS, KINDS, FIXES, CONFIG_TYPES, DECLARATION_KEYS, GATE_KEYS, BUILD_KEYS, GUIDE_KINDS, SECTION_KEYS, PHASES, ACTIONS,
  parseJson, skillExists, checkDeclaration, checkProject,
};
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `node --test test/orchestra/check.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 6: Write the S70 records**

Add this row to the end of the settled table in `docs/TENSIONS.md`, after S69:

```markdown
| S70 | Plan 2, the contracts. (1) `orchestra check` ships as `orchestra/bin/check.js`, Node standard library only; every rule is plain code in `lib/check.js`, with no JSON Schema files; `test/packaging.test.js` runs it on every plugin. (2) Two modes: plugin folders (all rules, plus a dry run) and `--project` (the config and the declarations of the resolved plugins). It lists every failure with its rule and its fix, then exits non-zero. (3) The dry run starts the workflow's real `next.js` with a task in a throwaway git repo with a bare remote, and validates the first action; the workflow contract gets no `--dry-run` flag. This changes S52. (4) `resolve.js` runs the `--project` rules; the interim checks in `resolved.js` and `gates.js` are removed (S61). (5) `orchestra:init` finds the plugins from its skill list (`<plugin>:manifest`), asks the user when the list shows none, writes only `plugin` per section, adds the `.gitignore` lines, resolves and checks, and commits nothing. (6) One authoring skill, `orchestra:writing-plugins`, replaces the two of §5.4; a test fails when a key list of `check.js` has a word the skill misses, and `CLAUDE.md` says to update both. (7) The declaration key `params` is removed: no code read it. (8) A config key in a declaration must have a default. Full record: `docs/DECISIONS.md`. | Grilling, user decision |
```

Append this entry to the end of `docs/DECISIONS.md`:

```markdown
## S70: The contracts (plan 2)

- **Date:** 2026-10-14
- **Status:** decided
- **Question:** `docs/DESIGN.md` §5.1, §5.3 and §5.4 were written before S56, and later decisions changed the declaration, the guides and the selection keys. What do `orchestra check`, `orchestra:init` and the authoring skills look like now, and how do the rules stay true as the plugins change?
- **Options:**
  1. Build §5 as written: JSON Schema files, a `--dry-run` flag in every workflow's `next.js`, two authoring skills, `check` stops on the first failure. Rejected: S11 allows no schema validator, so the schemas would be a second copy of the rules or a validator to maintain; the flag is a second code path in each workflow that only the check uses; two skills is more text than one author needs.
  2. No shipped check: keep the rules in `test/packaging.test.js`. Rejected: S28 makes the check the guarantee of the contracts, and a plugin outside this repo would get no guarantee.
  3. One rule set as plain code in `lib/check.js`, shipped and also run by the repo tests; a dry run that runs the real `next.js` in a throwaway repo; one short authoring skill kept in step by a test. Chosen.
- **Evidence:** the grilling of 2026-10-14 (record: the Scope table of `docs/superpowers/plans/2026-10-14-orchestra-contracts.md`); the code facts checked that day: `test/packaging.test.js` already held the packaging rules; `orc-standard-workflow/bin/next.js` does `prepare` itself when it gets a task; no code read `params`; `config.disable` and `config.gates` are read by `orchestra/lib/gates.js`.
- **Decision:**
  - `check.js <plugin-folder>…` runs every rule; `check.js --project <dir>` runs the config rules and the declaration rules of each resolved plugin. Every failure is one line, `<where>: <problem>. Fix: <fix>.`, and all are listed.
  - The dry run builds a git repo with a bare remote in the system temp folder, a config, a `resolved.json` with a stub Stack Skills slot (`build.run: true`), and a task file outside the repo. It runs `next.js --project <repo> --task-file <file>` and validates the printed action with the protocol's `validateAction`. `failed` fails the rule.
  - `resolve.js` runs the project rules after it writes `resolved.json`, so a bad config stops the run before any subagent.
  - init reads the skill list in its context for `<plugin>:manifest` skills, and asks the user when it finds none. It writes only `plugin`; every other key takes its default.
  - A config key must declare a default, so a config with no values always works and `{config.<key>}` always expands.
  - `params` is removed from the declarations.
- **Cost and risk:** the sync test checks one direction only: a key that the runtime reads but `check.js` does not know is caught only by the `CLAUDE.md` rule. The dry run needs `git` on the path and takes about a second. init depends on the harness showing its skill list; the question to the user is the fallback.
- **Where it lives:** `orchestra/lib/check.js`, `orchestra/bin/check.js`, `orchestra/lib/resolved.js`, `orchestra/lib/gates.js`, `orchestra/lib/git.js`, the skills `orchestra:init` and `orchestra:writing-plugins`, `test/packaging.test.js`, `CLAUDE.md`.
```

- [ ] **Step 7: Commit**

```bash
git add plugins/orchestra/lib/check.js test/helpers.js test/orchestra/check.test.js docs/TENSIONS.md docs/DECISIONS.md
git commit -m "feat(orchestra): the declaration and config rules of orchestra check (S70)"
```

---

### Task 2: Plugin rules, the dry run and the command line

**Files:**
- Modify: `plugins/orchestra/lib/git.js` (add `scratchRepo`)
- Modify: `plugins/orchestra/lib/check.js` (add `checkPlugin`)
- Create: `plugins/orchestra/bin/check.js`
- Modify: `test/helpers.js` (`makeRepo` uses `scratchRepo`)
- Modify: `plugins/orc-standard-workflow/orchestra.json`, `plugins/orc-java-stack/orchestra.json` (drop `"params": []`)
- Modify: `test/packaging.test.js`
- Test: `test/orchestra/check.test.js`

**Interfaces:**
- Consumes: `checkDeclaration`, `parseJson`, `skillExists` from Task 1; `validateAction` from `lib/protocol.js`; `writePlugin` from Task 1.
- Produces:
  - `scratchRepo(root) → string` in `lib/git.js` — makes `<root>/origin.git` (bare, branch `main`) and `<root>/work` (a clone with one commit, a `.gitignore` with the three orchestra lines, `origin/HEAD` set); returns the `work` path.
  - `checkPlugin(dir) → string[]` in `lib/check.js`.
  - `node plugins/orchestra/bin/check.js <plugin-folder>…` and `node plugins/orchestra/bin/check.js --project <dir>` — prints each failure, then `<n> failed.` or `All checks passed.`; exit code 1 on any failure or on no arguments.

- [ ] **Step 1: Move the repo builder into `lib/git.js`**

In `plugins/orchestra/lib/git.js`, add `const fs = require('node:fs');` and `const path = require('node:path');` at the top, add this function before `module.exports`, and export it:

```js
// A repo with a bare remote and one commit. orchestra check's dry run uses it, and so do the tests.
function scratchRepo(root) {
  const origin = path.join(root, 'origin.git');
  const dir = path.join(root, 'work');
  git(root, 'init', '--bare', '-b', 'main', origin);
  git(root, 'clone', origin, dir);
  git(dir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(dir, 'config', 'user.email', 'orchestra@example.com');
  git(dir, 'config', 'user.name', 'orchestra');
  git(dir, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.orchestra/*\n!.orchestra/config.json\ntmp/\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'sample\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'init');
  git(dir, 'push', '-u', 'origin', 'main');
  git(dir, 'remote', 'set-head', 'origin', 'main');
  return dir;
}

module.exports = { EXCLUDE, git, changedFiles, dirtyFiles, isClean, commitAll, commitKeeping, commitRunDir, scratchRepo };
```

In `test/helpers.js`, replace the body of `makeRepo` with:

```js
const { scratchRepo } = require('../plugins/orchestra/lib/git');

function makeRepo() {
  return scratchRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-')));
}
```

Run: `npm test`
Expected: PASS (only the author's name and e-mail of the test commits change).

- [ ] **Step 2: Write the failing tests**

Append to `test/orchestra/check.test.js`:

```js
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
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `node --test test/orchestra/check.test.js`
Expected: FAIL with `checkPlugin is not a function`.

- [ ] **Step 4: Add `checkPlugin` and the dry run to `lib/check.js`**

Add at the top of `plugins/orchestra/lib/check.js`:

```js
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { validateAction } = require('./protocol');
const { git, scratchRepo } = require('./git');
```

(Merge `validateAction` into the existing `require('./protocol')` line.) Add before `module.exports`:

```js
const HARNESS_WORDS = /Task tool|subagent_type|TodoWrite|Skill tool|claude -p/;

function checkSkills(dir, label) {
  const out = [];
  const skillsDir = path.join(dir, 'skills');
  const names = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter(s => fs.existsSync(path.join(skillsDir, s, 'SKILL.md'))).sort() : [];
  for (const s of names) {
    const where = `${label}/skills/${s}/SKILL.md`;
    const text = fs.readFileSync(path.join(skillsDir, s, 'SKILL.md'), 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) {
      out.push(`${where}: it has no frontmatter. Fix: start it with ---, name, description, ---.`);
    } else {
      const keys = m[1].split('\n').filter(l => /^\S/.test(l)).map(l => l.split(':')[0]);
      if (keys.join() !== 'name,description') out.push(`${where}: the frontmatter has the keys ${keys.join(', ')}. Fix: keep only name and description.`);
      if (!new RegExp(`^name: ${s}$`, 'm').test(m[1])) out.push(`${where}: the frontmatter name is not "${s}". Fix: set name to the folder name.`);
    }
    const word = text.match(HARNESS_WORDS);
    if (word) out.push(`${where}: it names a harness tool (${word[0]}). Fix: name the action instead, such as "dispatch a subagent" or "invoke the skill".`);
  }
  return out;
}

// Runs the workflow's next.js with a task in a throwaway repo, and validates the first action it prints.
function dryRun(dir, label, declaration) {
  const where = `${label}/bin/next.js`;
  const nextJs = path.join(dir, 'bin', 'next.js');
  if (!fs.existsSync(nextJs)) return [`${where} is missing. Fix: add it; it prints the next action of a run as one JSON line.`];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-check-'));
  try {
    const project = scratchRepo(root);
    const stack = { plugin: 'check-stack', version: '0.0.0', dir: root, declaration: { slot: 'stack-skills', build: { run: 'true' } } };
    fs.mkdirSync(path.join(project, '.orchestra'));
    fs.writeFileSync(path.join(project, CONFIG), JSON.stringify({ workflow: { plugin: label }, 'stack-skills': { plugin: stack.plugin } }) + '\n');
    git(project, 'add', CONFIG);
    git(project, 'commit', '-m', 'config');
    const resolved = { orchestra: { dir: path.join(__dirname, '..') }, slots: { workflow: { plugin: label, version: '0.0.0', dir, declaration }, 'stack-skills': stack } };
    fs.writeFileSync(path.join(project, '.orchestra', 'resolved.json'), JSON.stringify(resolved) + '\n');
    const task = path.join(root, 'task.txt');
    fs.writeFileSync(task, 'Dry run of orchestra check\n');
    const printed = execFileSync(process.execPath, [nextJs, '--project', project, '--task-file', task], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
    const action = validateAction(JSON.parse(printed.trim().split('\n').pop()));
    if (action.action === 'failed') return [`${where}: the dry run ended with failed: ${action.reason}. Fix: make the first call of a new run work.`];
    return [];
  } catch (e) {
    return [`${where}: the dry run did not print a valid action: ${e.message.split('\n')[0]}. Fix: print one action of the orchestra protocol as JSON on the last line.`];
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function checkPlugin(dir) {
  const out = [];
  const a = parseJson(path.join(dir, 'plugin.json'), `${dir}/plugin.json`, out);
  const b = parseJson(path.join(dir, '.claude-plugin', 'plugin.json'), `${dir}/.claude-plugin/plugin.json`, out);
  if (a === undefined) out.push(`${dir}: plugin.json is missing. Fix: add it with "name" and "version".`);
  if (b === undefined) out.push(`${dir}: .claude-plugin/plugin.json is missing. Fix: add it with the same "name" and "version" as plugin.json.`);
  if (a && b && (!a.name || !a.version || a.name !== b.name || a.version !== b.version)) {
    out.push(`${dir}: the two manifests differ or lack a name or version (${a.name} ${a.version}, ${b.name} ${b.version}). Fix: give both the same name and version.`);
  }
  const label = (a && a.name) || path.basename(dir);
  out.push(...checkSkills(dir, label));
  const d = parseJson(path.join(dir, 'orchestra.json'), `${label}/orchestra.json`, out);
  if (d === undefined || d === null) return out;
  const declaration = checkDeclaration(d, dir, `${label}/orchestra.json`);
  out.push(...declaration);
  if (!skillExists(dir, 'manifest')) out.push(`${label}: there is no manifest skill. Fix: add skills/manifest/SKILL.md; it answers PLUGIN_DIR=<folder>.`);
  if (!declaration.length && d.slot === 'workflow') out.push(...dryRun(dir, label, d));
  return out;
}
```

Add `checkPlugin` to `module.exports`.

The dry run runs only when the declaration has no failures, because `next.js` reads the declaration.

- [ ] **Step 5: Write `plugins/orchestra/bin/check.js`**

```js
#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { checkPlugin, checkProject } = require('../lib/check');

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('Usage: check.js <plugin-folder>…  or  check.js --project <dir>');
  process.exit(1);
}
const i = argv.indexOf('--project');
const failures = i >= 0 ? checkProject(path.resolve(argv[i + 1] || '.')) : argv.flatMap(dir => checkPlugin(path.resolve(dir)));
for (const f of failures) console.log(f);
console.log(failures.length ? `${failures.length} failed.` : 'All checks passed.');
process.exitCode = failures.length ? 1 : 0;
```

- [ ] **Step 6: Run the check tests and see them pass**

Run: `node --test test/orchestra/check.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 7: Drop `params` and run `check` from the packaging test**

Remove the line `"params": [],` from `plugins/orc-standard-workflow/orchestra.json` and from `plugins/orc-java-stack/orchestra.json`.

In `test/packaging.test.js`, delete these four tests: "SKILL.md frontmatter has only name and description, and name matches the folder", "shipped files use no harness-specific words", "both manifests of each plugin parse and have the same version", "every skill and guide a declaration names is a skill in that plugin". Add, after the `skills` constant:

```js
const { checkPlugin } = require('../plugins/orchestra/lib/check');

test('orchestra check passes on every plugin, and each plugin is named after its folder', () => {
  for (const p of plugins) {
    assert.deepEqual(checkPlugin(path.join(PLUGINS, p)), [], p);
    assert.equal(JSON.parse(fs.readFileSync(path.join(PLUGINS, p, 'plugin.json'), 'utf8')).name, p);
  }
});
```

Run: `node plugins/orchestra/bin/check.js plugins/orchestra plugins/orc-standard-workflow plugins/orc-java-stack`
Expected: `All checks passed.` (The workflow's dry run prints a `dispatch` of `orc-standard-workflow:spec`.)

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add plugins/orchestra/lib/git.js plugins/orchestra/lib/check.js plugins/orchestra/bin/check.js test/helpers.js test/orchestra/check.test.js test/packaging.test.js plugins/orc-standard-workflow/orchestra.json plugins/orc-java-stack/orchestra.json
git commit -m "feat(orchestra): plugin rules, the dry run and the check command (S70)"
```

---

### Task 3: `check` at the start of each run

**Files:**
- Modify: `plugins/orchestra/lib/resolved.js`
- Modify: `plugins/orchestra/lib/gates.js:44-46` (`expand`), `:59-62` (`collect`)
- Modify: `test/orchestra/resolved.test.js`, `test/orchestra/runner.test.js:16-24`, `test/orchestra/drive.test.js:14-17`, `test/orchestra/gates.test.js:53-58`

**Interfaces:**
- Consumes: `checkProject` from Task 1; `writePlugin` from Task 1.
- Produces: `resolve(project, slotDirs, orchestraDir)` keeps its signature. It writes `resolved.json` with `declaration: null` when a folder has no `orchestra.json`, then throws `new Error(failures.join('\n'))` when `checkProject` returns failures.

- [ ] **Step 1: Rewrite the resolution tests**

Replace `test/orchestra/resolved.test.js` from the `function plugin` helper to the end with:

```js
const plugin = (name, declaration) => writePlugin(fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)), name, declaration);
const ST = { slot: 'stack-skills', build: { run: 'make', guide: 'fix-build' } };

function project() {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } });
  return dir;
}

test('writes the declarations, folders and versions of every slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'workflow', gates: [] });
  const st = plugin('st', ST);
  resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc');
  const r = load(dir);
  assert.equal(r.orchestra.dir, '/orc');
  assert.equal(r.slots.workflow.dir, wf);
  assert.equal(r.slots['stack-skills'].version, '0.0.1');
  assert.equal(r.slots['stack-skills'].declaration.build.run, 'make');
});

test('runs orchestra check on the config and throws every failure', () => {
  const dir = project();
  const other = plugin('other', { slot: 'workflow' });
  const st = plugin('st', { slot: 'stack-skills', build: { run: 'make' } });
  assert.throws(() => resolve(dir, { workflow: other, 'stack-skills': st }, '/orc'), e =>
    /names wf, but the resolved folder holds other/.test(e.message) && /build "guide" names no skill/.test(e.message));
});

test('fails when a plugin declares another slot, or a slot of the config has no folder', () => {
  const dir = project();
  const st = plugin('st', ST);
  assert.throws(() => resolve(dir, { workflow: plugin('wf', ST), 'stack-skills': st }, '/orc'), /"slot" is stack-skills, but it fills the workflow slot/);
  assert.throws(() => resolve(dir, { workflow: plugin('wf', { slot: 'workflow' }) }, '/orc'), /the stack-skills plugin st is not resolved/);
});

test('fails with the init hint when there is no config', () => {
  assert.throws(() => resolve(makeRepo(), {}, '/orc'), /Run orchestra init first/);
});
```

Change the helpers import at the top to `const { makeRepo, writeJson, writePlugin } = require('../helpers');`.

In `test/orchestra/runner.test.js`, replace the `mk` helper in `setup` with:

```js
  const mk = (name, declaration) => writePlugin(path.join(plugins, name), name, declaration);
```

and import `writePlugin` from `../helpers`.

In `test/orchestra/drive.test.js`, replace the two lines that write `st/plugin.json` and `st/orchestra.json` with:

```js
  writePlugin(st, 'st', { slot: 'stack-skills', build: { run: 'node -e "process.exit(0)"', guide: 'fix-build' }, gates: [] });
```

and import `writePlugin` from `../helpers`.

In `test/orchestra/gates.test.js`, delete the test "collect rejects a fixer gate without a guide" (lines 53–58). `check` owns that rule now.

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test test/orchestra/resolved.test.js`
Expected: FAIL. The old `resolve` throws `Slot workflow: the config names wf, but … holds other.` alone, without the build guide failure.

- [ ] **Step 3: Rewrite `resolve` in `plugins/orchestra/lib/resolved.js`**

Add `const { checkProject } = require('./check');` at the top. Replace `resolve` with:

```js
// Writes resolved.json from the folders the manifest skills reported, then runs orchestra check on the
// config, so a bad config stops the run before any subagent (S70).
function resolve(project, slotDirs, orchestraDir) {
  if (!readJson(path.join(project, '.orchestra', 'config.json'))) throw new Error('No .orchestra/config.json. Run orchestra init first.');
  const slots = {};
  for (const [slot, dir] of Object.entries(slotDirs)) {
    const info = pluginInfo(dir);
    slots[slot] = { plugin: info.name, version: info.version, dir: path.resolve(dir), declaration: readJson(path.join(dir, 'orchestra.json')) };
  }
  const resolved = { orchestra: { dir: path.resolve(orchestraDir) }, slots };
  fs.writeFileSync(path.join(project, FILE), JSON.stringify(resolved, null, 2) + '\n');
  const failures = checkProject(project);
  if (failures.length) throw new Error(failures.join('\n'));
  return resolved;
}
```

- [ ] **Step 4: Drop the two run-time checks from `plugins/orchestra/lib/gates.js`**

In `expand`, replace the callback so it no longer throws (check guarantees every `{config.<key>}` is declared and has a default):

```js
function expand(text, dir, values) {
  return text.replace(/\{plugin\}/g, dir).replace(/\{config\.([\w-]+)\}/g, (match, key) => String(values[key]));
}
```

In `collect`, delete these three lines:

```js
      if (fix === 'fixer' && !g.guide) {
        throw new Error(`Gate "${g.name}" in ${slot.plugin} uses the fixer but names no guide.`);
      }
```

- [ ] **Step 5: Run all tests and see them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orchestra/lib/resolved.js plugins/orchestra/lib/gates.js test/orchestra/resolved.test.js test/orchestra/runner.test.js test/orchestra/drive.test.js test/orchestra/gates.test.js
git commit -m "feat(orchestra): resolution runs orchestra check; the interim checks go (S70)"
```

---

### Task 4: `orchestra:init`

**Files:**
- Create: `plugins/orchestra/skills/init/SKILL.md`

**Interfaces:**
- Consumes: `node <orchestra>/bin/resolve.js <slot>=<folder> …` (Task 3: it resolves and runs the project rules); the `<plugin>:manifest` skills (answer `PLUGIN_DIR=<folder>`).
- Produces: `.orchestra/config.json` with only `plugin` per section; the three `.gitignore` lines.

- [ ] **Step 1: Write the skill**

Create `plugins/orchestra/skills/init/SKILL.md`:

````markdown
---
name: init
description: Use when the user wants to set up orchestra in a project — "orchestra init", "set up orchestra here" — or to change which workflow or Stack Skills plugin the project uses.
---

# orchestra init

You set up orchestra in the project in the current folder. You ask the user which plugins to use,
write one file and three ignore lines, and check the result. You commit nothing.

`<orchestra>` is the folder two levels above this skill's folder. Run every command from the
project root.

## 1. An existing config

If `.orchestra/config.json` exists, show it and ask the user if you may replace it. If not, stop.

## 2. Find the plugins

Look at the list of skills available to you. Each skill named `<plugin>:manifest` belongs to a
plugin that can fill a slot.

If the list shows no manifest skills, ask the user for the name of the workflow plugin and of the
Stack Skills plugin. Offer `orc-standard-workflow` and `orc-java-stack` as the defaults.

For each plugin, invoke the skill `<plugin>:manifest`. It answers with one line,
`PLUGIN_DIR=<folder>`. Read `<folder>/orchestra.json`. Its `slot` is `workflow` or `stack-skills`.

## 3. Ask

Ask the user which plugin fills each slot. Offer only the plugins of that slot. When a slot has one
plugin, propose it and ask for a yes. When a slot has none, tell the user that orchestra needs one
plugin for each slot, and stop.

## 4. Write

Write `.orchestra/config.json` with only `plugin` in each section:

```json
{
  "workflow": { "plugin": "<workflow plugin>" },
  "stack-skills": { "plugin": "<Stack Skills plugin>" }
}
```

Add each of these lines to `.gitignore` when it is missing. Create the file when there is none.

```
.orchestra/*
!.orchestra/config.json
tmp/
```

## 5. Check

Run:

```
node <orchestra>/bin/resolve.js workflow=<workflow folder> stack-skills=<Stack Skills folder>
```

It resolves the plugins and runs orchestra check on the config. If it fails, show each line: every
line names the rule and its fix. Leave the config in place, so the user can fix it.

When it passes, tell the user:
- The config holds only the plugins. Every other key takes its default from the plugin's
  `orchestra.json`. A project can set those keys, turn gates off with `disable`, and change a gate's
  `max_rounds` under `gates`.
- Commit `.orchestra/config.json` and `.gitignore`, so everyone on the project uses the same plugins.
- Start a run with orchestra run.

## Permitted actions

- Change only `.orchestra/config.json` and `.gitignore`.
- Do not commit, push or start a run.
````

- [ ] **Step 2: Run the packaging rules on it**

Run: `node plugins/orchestra/bin/check.js plugins/orchestra && npm test`
Expected: `All checks passed.` and PASS. (The frontmatter and harness-word rules now cover `init`.)

- [ ] **Step 3: Try it by hand**

In a scratch copy of the sample Java repo (or any git repo with a remote), with the plugins installed, invoke `orchestra:init`. Expected: it proposes `orc-standard-workflow` and `orc-java-stack`, writes the config with two `plugin` lines, adds the three `.gitignore` lines, prints the resolution lines and no failures, and leaves `git status` showing only `.orchestra/config.json` and `.gitignore`. Note the result in the commit body. If no harness is at hand, say so in the commit body.

- [ ] **Step 4: Commit**

```bash
git add plugins/orchestra/skills/init/SKILL.md
git commit -m "feat(orchestra): orchestra:init sets up a project and checks it (S70)"
```

---

### Task 5: `orchestra:writing-plugins` and the sync guard

**Files:**
- Create: `plugins/orchestra/skills/writing-plugins/SKILL.md`
- Modify: `test/packaging.test.js`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the key lists of `lib/check.js` (Task 1): `SLOTS`, `KINDS`, `FIXES`, `CONFIG_TYPES`, `DECLARATION_KEYS`, `GATE_KEYS`, `BUILD_KEYS`, `GUIDE_KINDS`, `SECTION_KEYS`, `PHASES`, `ACTIONS`.
- Produces: nothing other tasks use.

- [ ] **Step 1: Write the failing test**

Add to `test/packaging.test.js`:

```js
test('the skill writing-plugins explains every word of the contract that check.js knows', () => {
  const check = require('../plugins/orchestra/lib/check');
  const text = fs.readFileSync(path.join(PLUGINS, 'orchestra/skills/writing-plugins/SKILL.md'), 'utf8');
  const words = new Set([
    ...check.SLOTS, ...check.KINDS, ...check.FIXES, ...check.CONFIG_TYPES, ...Object.values(check.DECLARATION_KEYS).flat(),
    ...check.GATE_KEYS, ...check.BUILD_KEYS, ...check.GUIDE_KINDS, ...check.SECTION_KEYS, ...check.PHASES, ...check.ACTIONS,
  ]);
  const quoted = [...text.matchAll(/`([^`]+)`/g)].map(m => m[1]).join('\n');
  for (const w of words) assert.match(quoted, new RegExp(`(^|[^\\w-])${w}([^\\w-]|$)`, 'm'), `writing-plugins does not explain \`${w}\``);
});
```

Run: `node --test test/packaging.test.js`
Expected: FAIL with `ENOENT … writing-plugins/SKILL.md`.

- [ ] **Step 2: Write the skill**

Create `plugins/orchestra/skills/writing-plugins/SKILL.md`:

````markdown
---
name: writing-plugins
description: Use when writing or changing a plugin that fills an orchestra slot — a workflow plugin or a Stack Skills plugin — its orchestra.json, its gates or its next.js.
---

# Writing an orchestra plugin

A plugin fills one slot: `workflow` or `stack-skills`. orchestra reads the plugin's declaration
and runs it. The plugin never runs or orders its own gates. This page is the reference. orchestra
check is the guarantee: run it when you finish (last section).

`<orchestra>` is the folder two levels above this skill's folder.

## Every plugin

- `plugin.json` and `.claude-plugin/plugin.json`, with the same `name` and `version`.
- A `manifest` skill. It finds its own folder, goes two folders up, and answers with one line:
  `PLUGIN_DIR=<that folder>`. Copy the one of `orc-standard-workflow`.
- `orchestra.json` at the plugin root.
- Each `SKILL.md` has only `name` and `description` in its frontmatter. Skill text names actions
  ("dispatch a subagent", "invoke the skill"), never a harness's tool names.

## orchestra.json

| Key | Slot | Meaning |
|---|---|---|
| `slot` | both | `workflow` or `stack-skills`. |
| `config` | both | Keys a project may set in its config section. Each is `{ "type": …, "default": … }`, with type `string`, `number` or `boolean`, and a default of that type. |
| `gates` | both | The checks after the code. See "A gate". |
| `build` | `stack-skills`, required | `run`: the full build and the tests. `guide`: its fix guide skill. `max_rounds`: fixer rounds, default 2. |
| `guides` | `stack-skills` | `plan` and `code`: a skill with short rules for the planner and the coder. |

In a command, `{plugin}` is the plugin's folder and `{config.<key>}` is a config value. The key
must be declared under `config`.

## A gate

| Key | Meaning |
|---|---|
| `name` | Unique in the plugin. Not `build`. |
| `phase` | `implementation-check` (is the code correct?), `conventions-check` (does it follow our conventions?) or `finish` (is the final state clean? nothing here may change behaviour). |
| `kind` | `tool`: a command; exit code 0 passes. `agent`: a skill run by a subagent. |
| `skill` | An `agent` gate's review skill. It fixes its own Patch findings. |
| `run` | A `tool` gate's command. |
| `fix` | For a `tool` gate: `self` (the tool fixes, orchestra commits), `fixer` (orchestra's fixer, with `guide`) or `none` (report only). |
| `guide` | The fix guide skill for `fix: fixer`. |
| `max_rounds` | Fixer rounds. Default 2. |
| `files` | A glob, or a list of globs, on the changed paths. |
| `grep` | A regular expression on the content of the changed files. |
| `when` | A rule in words, judged on the diff. |
| `always` | `true`: the gate runs on every run. |

A gate needs at least one of `files`, `grep`, `when` or `always`. Inside a phase, the order is
fixed by orchestra, not by you.

## The project config

A project's `.orchestra/config.json` has one section per slot. orchestra owns three keys in it:
`plugin`, `disable` (gate or guide names to turn off) and `gates`
(`{ "<gate>": { "max_rounds": <n> } }`). Every other key must be one your `config` declares.

## A workflow: bin/next.js

Node, standard library only. orchestra calls `node bin/next.js --project <dir>`, with
`--task-file <file>` on the first call of a run. Each call decides from the files on disk and prints
one action as JSON on its last line:

- `dispatch`: `skill`, `inputs`, `result` (the file the subagent writes) and `runDir`.
- `phase`: `name` (one of the three phases) and `runDir`. orchestra runs that phase's gates.
- `done`, `decide` (with `questions`) or `failed` (with `reason`). orchestra writes the report.

The run folder `tmp/runs/<branch>/` holds the state and is git-ignored. The notes folder
`docs/runs/<branch>/` holds what a human reads. Write `run.json` in the run folder with `base`,
`branch`, `spec` and `docs`. Detail: `docs/DESIGN.md` §7 in the orchestra repo.

## Check

Run `node <orchestra>/bin/check.js <your plugin folder>`. It lists every failed rule with its fix.
For a workflow, it also runs your `next.js` with a task in a throwaway git repo and checks the first
action.
````

- [ ] **Step 3: Run the test and see it pass**

Run: `npm test`
Expected: PASS. If the sync test names a word, add it to the skill inside backticks.

- [ ] **Step 4: Add the rule line to `CLAUDE.md`**

Add after the **Decisions.** paragraph:

```markdown
**Contracts.** When a change adds, renames or removes something a plugin may declare, or something
orchestra reads from a declaration or the project config, update `plugins/orchestra/lib/check.js`
and the skill `plugins/orchestra/skills/writing-plugins/SKILL.md` in the same change.
```

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/skills/writing-plugins/SKILL.md test/packaging.test.js CLAUDE.md
git commit -m "feat(orchestra): orchestra:writing-plugins, kept in step with check.js (S70)"
```

---

### Task 6: The design document and the version

**Files:**
- Modify: `docs/DESIGN.md` §2, §3, §4.2, §5.1, §5.3, §5.4, §7, §12, §15
- Modify: the six `plugin.json` files under `plugins/*/` and `plugins/*/.claude-plugin/`
- Modify: `test/orchestra/drive.test.js` (the version in the report assertion)

**Interfaces:** none.

- [ ] **Step 1: Update `docs/DESIGN.md`**

- §2 table, `orchestra` row: replace "`orchestra check`, the schemas, the authoring skills" with "`orchestra check`, the authoring skill `writing-plugins`".
- §3 flow: keep "runs orchestra check on the config and resolved.json"; add "(inside `resolve.js`)" after it.
- §4.2: delete `"params": [],` from the example. In the paragraph after it, replace "its `params`, its `config` keys" with "its `config` keys". Add one sentence after the `{plugin}` paragraph: "Every `config` key has a `type` (`string`, `number` or `boolean`) and a `default` of that type (S70)."
- §5.1: replace steps 1–3 with: "1. Finds the plugins from the `<plugin>:manifest` skills in its skill list; asks the user when it finds none (S70). 2. Asks which plugin fills each slot. 3. Writes `.orchestra/config.json` with only `plugin` per section, and adds the three `.gitignore` lines. 4. Runs `resolve.js`, which resolves the plugins and runs `orchestra check --project`. Shows the result. It commits nothing."
- §5.3: replace the first paragraph with: "A Node command, standard library only (S11, S28, S70): `bin/check.js <plugin-folder>…` runs every rule; `bin/check.js --project <dir>` runs the config rules and the declaration rules of each resolved plugin. The rules are plain code in `lib/check.js`; there are no schema files. It lists every failure as `<where>: <problem>. Fix: <fix>.`, then exits non-zero. A project's `.gitignore` has `.orchestra/*`, `!.orchestra/config.json` and `tmp/`." In the table, Declaration row: replace "Valid against its slot schema." with "Only the keys of its slot; the gate keys and values of 6.1; every `{config.<key>}` declared; every config key typed with a default."; Workflow plugin row: replace "`next.js --dry-run` prints a valid action." with "The dry run: `next.js` with a task, in a throwaway git repo with a bare remote, prints a valid action that is not `failed`."; Stack Skills row: replace "Has a `build` declaration" with "Has a `build` with `run` and `guide`". In the last paragraph, replace "`orchestra:run` runs it on the config and `resolved.json` at the start of each run" with "`resolve.js` runs the `--project` rules at the start of each run and in init".
- §5.4: replace with: "`orchestra:writing-plugins` is a short reference card: the slots, the `manifest` skill, the declaration and gate keys, the phases, the `next.js` actions. It ends with \"run `orchestra check` on the plugin\". The skill is the guide. The check is the guarantee. A test fails when a word of the key lists in `check.js` is missing from the skill (S70)."
- §7 table, Declaration row: replace "its parameters, its config keys" with "its config keys".
- §12 layout: `skills/{init,run,fixer,triage,select,writing-plugins}/SKILL.md`, `bin/{check.js,resolve.js,drive.js}`, `lib/{check.js,…}`; delete the `schemas/…` line.
- §15: delete "and the `--dry-run` output" from the first point.

- [ ] **Step 2: Bump the version to 0.10.0**

Run: `/usr/bin/grep -rln '"version": "0.9.1"' plugins`
Expected: the six `plugin.json` files. Change each to `"version": "0.10.0"`. In `test/orchestra/drive.test.js`, change `orc-standard-workflow 0\.9\.1` to `orc-standard-workflow 0\.10\.0`.

- [ ] **Step 3: Run everything**

Run: `npm test && node plugins/orchestra/bin/check.js plugins/orchestra plugins/orc-standard-workflow plugins/orc-java-stack`
Expected: PASS and `All checks passed.`

- [ ] **Step 4: Commit**

```bash
git add docs/DESIGN.md plugins test/orchestra/drive.test.js
git commit -m "docs: the design after plan 2; bump the orchestra plugins to 0.10.0 (S70)"
```

- [ ] **Step 5: Tell the user which guide sections are out of date**

Per `CLAUDE.md`: list the sections of `docs/guide.html` that name `orchestra check`, the schemas, `--dry-run`, init or the authoring skills (`/usr/bin/grep -n -iE "check|schema|dry-run|init|authoring|params" docs/guide.html`), and offer to update them, with the version and the last `S` number (S70) in its rail and footer.
