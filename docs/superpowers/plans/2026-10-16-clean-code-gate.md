# Clean-code Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stack-free `clean-code` gate to `orc-standard-workflow` that measures the shape of the changed code with a command the Stack Skills plugin declares, add a TypeScript Stack Skills plugin `orc-ts-stack` that declares that command, and add the mentorano clean-code plugin to this repo as a standalone copy.

**Architecture:** A Stack Skills declaration gets an optional `measure` (`run`: a command, `rules`: a skill). A workflow agent gate with `"measure": true` gets the expanded command and the qualified rules skill as dispatch inputs. The gate runs the command, judges its verdict rows, checks the clean-code rules on the diff, triages, and fixes its Patch findings. A stack with no `measure` (Java) gives the gate no inputs, and the gate records an Evaluate warning that shows in `report.md`.

**Tech Stack:** Node 22, standard library only, `node:test`. Python ≥ 3.11 and the project's own `typescript@5` package for the ported measurement scripts. `typescript@5.9.3` as a dev-only dependency of this repo, for the tests.

**Spec:** The user's decisions in the session of 2026-10-16 (recorded as S75 in Task 1):
1. Add a TypeScript Stack Skills plugin. It is empty at first (no gates, no guides).
2. Option C: the Stack Skills plugin declares the measurement. The TS stack declares it. Java declares none, and a run on Java shows a warning that clean-code has no measurement.
3. Add mentorano's clean-code as a new plugin `plugins/clean-code`: copy it first, then change it. Add mentorano to `docs/PORTING.md` and port from it.
4. The gate fixes its Patch findings.
5. The comment rule stays in the workflow gate.
6. Port the TypeScript skill into the TS stack.
Answers to the follow-up questions: `plugins/clean-code` is a standalone copy and the gate skill lives in the workflow; the TS build is `npm ci && npm test`; the TS skill is a rules skill that the clean-code gate reads.

**Source:** `~/Projects-other/ai-marketplace-mentorano/plugins/clean-code` (MIT, © 2026 Mentorano Ltd., version 0.6.0) and its tests in `~/Projects-other/ai-marketplace-mentorano/tests`. Read `docs/PORTING.md` "Steps for every port" before Tasks 2, 3 and 4.

## Global Constraints

- orchestra code: Node, standard library only (S11). No new runtime dependency.
- Every `check.js` failure line has the form `<where>: <problem>. Fix: <fix>.`
- `check.js` and `plugins/orchestra/skills/writing-plugins/SKILL.md` change in the same commit (CLAUDE.md "Contracts").
- Every `SKILL.md` frontmatter has only `name` and `description`; `name` equals the folder name. Skill text names actions, never harness tool names (pillar 4).
- Orchestra skill text is in ASD-STE-100 simple English and uses the names in `docs/CONTEXT.md`. The standalone `plugins/clean-code` is a verbatim copy and keeps the source's wording.
- The copied measurement scripts stay byte-identical in `plugins/clean-code/skills/clean-code/` and `plugins/orc-ts-stack/scripts/`. A test enforces it.
- All five plugins move to version `0.12.0`, in both `plugin.json` and `.claude-plugin/plugin.json`.
- Run all tests with `npm test` from the repo root. Before Task 2 lands, Python tests do not exist; after it, `npm test` runs them through a Node wrapper.

## Review Focus

1. **The project has no `typescript` package, or has TypeScript 7.** `measure.py` exits 2 with a message. Expected: the gate does not fail the run; it records one Evaluate finding with the first error line and reviews with the rules only. Pinned in Task 4 (skill text test) and Task 3 (exit code 2 test).
2. **The run changed no `.ts`, `.tsx` or `.py` file** (only docs, JSON, CSS). Expected: `measure.py` prints `no Python or TypeScript files to measure` with `functions=0` and exits 0; the gate treats it as nothing to measure, not as a broken run. Pinned in Task 3.
3. **The plugin folder path has a space** (a user's home such as `/Users/Jane Doe/...`). Expected: the measure command still runs. Pinned in Task 3: the declaration quotes `"{plugin}/scripts/measure.py"`, and the test checks the quotes.
4. **A Java project** (no `measure` in the stack). Expected: the gate still runs, gets no `measure` or `rules` input, and its Evaluate warning reaches `report.md`. Pinned in Task 1 (runner test: no inputs) and Task 4 (skill text test).
5. **A gate that does not ask for the measurement** (`logic-review`, `plan-conformance`, every Java gate). Expected: its dispatch inputs do not change. Pinned in Task 1.

---

### Task 1: The `measure` contract

The Stack Skills plugin may declare a `measure`. An agent gate may ask for it with `"measure": true`. This task also records the decision (S75), as CLAUDE.md asks: the decision rows go in the same commit as the change they decide.

**Files:**
- Modify: `plugins/orchestra/lib/check.js` (constants at lines 13-21, the `stack-skills` block in `checkDeclaration`, the gate loop, `module.exports`)
- Modify: `plugins/orchestra/lib/gates.js` (add `measureInputs`, export it)
- Modify: `plugins/orchestra/lib/runner.js` (`agentStep`, the `send` closure, line 158)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` (the `orchestra.json` table and the gate table)
- Modify: `test/helpers.js` (`writePlugin` also writes the `measure.rules` skill)
- Modify: `test/packaging.test.js` (the contract-words test includes `MEASURE_KEYS`)
- Modify: `docs/TENSIONS.md` (row S75 after S74), `docs/DECISIONS.md` (entry S75 at the end)
- Test: `test/orchestra/check.test.js`, `test/orchestra/runner.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - Declaration key `measure` on `stack-skills`: `{ "run": "<command>", "rules": "<skill of the same plugin>" }`. `run` is required inside it, `rules` is optional. `{plugin}` and `{base}` expand in `run`; `{config.<key>}` is rejected.
  - Gate key `measure`: boolean; `true` only on an `agent` gate.
  - `measureInputs(resolved, base) → {} | { measure: string, rules?: string }` in `gates.js`. `rules` is qualified: `<stack plugin>:<skill>`.
  - `check.MEASURE_KEYS = ['run', 'rules']`.
  - Dispatch inputs of a gate with `measure: true`: `measure` and `rules` added next to `spec`, `base`, `notes`, `decisions`.

- [ ] **Step 1: Write the failing check tests**

In `test/orchestra/check.test.js`, add to the valid declaration in `a valid declaration passes` (inside `stack({...})`):

```js
    measure: { run: 'python3 "{plugin}/m.py" --base {base}', rules: 'rules-ts' },
```

and add this gate to its `gates` list:

```js
      { name: 'shape', phase: 'implementation-check', kind: 'agent', skill: 'review-shape', always: true, measure: true },
```

Add to `cases` in `each broken declaration rule gives one line with the rule and its fix`:

```js
    [stack({ measure: { rules: 'x' } }), /"measure" has no "run" command/],
    [stack({ measure: { run: 'm', every: 1 } }), /unknown measure key "every"/],
    [stack({ measure: { run: 'm {config.n}' } }), /measure "run" uses \{config\.n\}/],
    [{ slot: 'workflow', measure: { run: 'm' } }, /unknown key "measure" for slot workflow/],
    [stack({ gates: [tool({ measure: true })] }), /gate "a" asks for "measure" but is not an agent gate/],
    [stack({ gates: [{ name: 'a', phase: 'finish', kind: 'agent', skill: 's', always: true, measure: 'yes' }] }), /gate "a" "measure" is not true or false/],
```

The case with a gate `skill: 's'` writes `skills/s` through `writePlugin`; the case with `measure.rules: 'x'` writes `skills/x` once Step 4 changes the helper, so each case gives exactly one line.

Add a new test after `a skill the declaration names must exist in skills/`:

```js
test('the measure rules skill must exist in skills/', () => {
  const out = checkDeclaration(stack({ measure: { run: 'm', rules: 'rules-ts' } }), tmp('empty-'), 'st/orchestra.json');
  assert.ok(out.some(l => /measure "rules" names skill "rules-ts"/.test(l)), out.join(' | '));
});
```

- [ ] **Step 2: Write the failing runner tests**

In `test/orchestra/runner.test.js`, give `setup` a `measure` option. Change its signature and the stack line:

```js
function setup({ build = OK, maxRounds = 1, stackGates = [], workflowGates = [], measure } = {}) {
```

```js
  const st = mk('st', { slot: 'stack-skills', build: { run: build, guide: 'fix-build', max_rounds: maxRounds }, ...(measure && { measure }), gates: stackGates });
```

Return `base` from `setup` too (add `base,` to the returned object). Then add:

```js
const cleanCode = { name: 'clean-code', phase: 'implementation-check', kind: 'agent', skill: 'clean-code', always: true, measure: true };

test('a gate that asks for the measure gets the expanded command and the qualified rules skill', () => {
  const t = setup({ workflowGates: [cleanCode], measure: { run: 'python3 "{plugin}/m.py" --base {base}', rules: 'rules-ts' } });
  const a = t.step('implementation-check');
  assert.equal(a.skill, 'wf:clean-code');
  assert.match(a.inputs.measure, /^python3 ".+\/st\/m\.py" --base [0-9a-f]{40}$/);
  assert.ok(a.inputs.measure.endsWith(t.base));
  assert.equal(a.inputs.rules, 'st:rules-ts');
});

test('with no measure in the stack, the gate gets no measure inputs', () => {
  const t = setup({ workflowGates: [cleanCode] });
  const a = t.step('implementation-check');
  assert.equal(a.inputs.measure, undefined);
  assert.equal(a.inputs.rules, undefined);
});

test('a gate that does not ask for the measure gets no measure inputs', () => {
  const t = setup({ workflowGates: [logicReview], measure: { run: 'm {base}', rules: 'rules-ts' } });
  const a = t.step('implementation-check');
  assert.deepEqual(Object.keys(a.inputs).sort(), ['base', 'notes', 'spec']);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. The new check cases fail on `unknown key "measure"`; the runner tests fail on `a.inputs.measure` being `undefined`.

- [ ] **Step 4: Make `writePlugin` create the rules skill**

In `test/helpers.js`, in `writePlugin`, change the `skills.push(...)` line to also take `d.measure && d.measure.rules`:

```js
    skills.push(...[d.build && d.build.guide, d.measure && d.measure.rules, ...Object.values(d.guides || {}), ...(d.gates || []).flatMap(g => [g.skill, g.guide])].filter(Boolean));
```

- [ ] **Step 5: Change `check.js`**

Change the constants:

```js
const DECLARATION_KEYS = { workflow: ['slot', 'config', 'gates'], 'stack-skills': ['slot', 'config', 'build', 'measure', 'guides', 'gates'] };
const GATE_KEYS = ['name', 'phase', 'kind', 'skill', 'run', 'fix', 'guide', 'max_rounds', 'files', 'grep', 'when', 'always', 'measure'];
const BUILD_KEYS = ['run', 'guide', 'max_rounds'];
const MEASURE_KEYS = ['run', 'rules'];
```

In `checkDeclaration`, inside `if (d.slot === 'stack-skills') {`, after the `guides` loop, add:

```js
    if (d.measure !== undefined) {
      const m = d.measure;
      if (!isObject(m) || typeof m.run !== 'string') {
        fail('"measure" has no "run" command', 'write "measure": { "run": "<command that measures the changed code against {base}>", "rules": "<rules skill>" }, or remove it');
      } else {
        for (const key of Object.keys(m)) {
          if (!MEASURE_KEYS.includes(key)) fail(`unknown measure key "${key}"`, `remove it; the allowed keys are ${MEASURE_KEYS.join(', ')}`);
        }
        for (const p of m.run.matchAll(PLACEHOLDER)) fail(`measure "run" uses {config.${p[1]}}, but the measure command expands only {plugin} and {base}`, 'write the value into the command');
        if (m.rules !== undefined) skill(m.rules, 'measure "rules"');
      }
    }
```

In the gate loop, after the `always` check, add:

```js
    if (g.measure !== undefined && typeof g.measure !== 'boolean') fail(`${at} "measure" is not true or false`, 'set it to true, or remove it');
    else if (g.measure && g.kind !== 'agent') fail(`${at} asks for "measure" but is not an agent gate`, 'remove "measure"; only an agent gate gets the measure command');
```

Add `MEASURE_KEYS` to `module.exports`, after `BUILD_KEYS`.

- [ ] **Step 6: Add `measureInputs` to `gates.js`**

Before `function buildStep`:

```js
// The stack's shape measurement, for an agent gate that asks for it (S75). {base} is the run's base commit.
function measureInputs(resolved, base) {
  const stack = resolved.slots['stack-skills'];
  const m = stack && stack.declaration.measure;
  if (!m) return {};
  const inputs = { measure: m.run.replace(/\{plugin\}/g, stack.dir).replace(/\{base\}/g, base) };
  if (m.rules) inputs.rules = `${stack.plugin}:${m.rules}`;
  return inputs;
}
```

Export it: `module.exports = { PHASE_ORDER, globToRegExp, collect, select, buildStep, measureInputs, plan };`

- [ ] **Step 7: Pass the inputs in `runner.js`**

Import it: `const { collect, select, buildStep, measureInputs, plan } = require('./gates');`

In `agentStep`, replace the `inputs` line in `send`:

```js
    const inputs = { spec: ctx.run.spec, base: ctx.run.base, notes: ctx.run.docs, ...(s.measure ? measureInputs(ctx.resolved, ctx.run.base) : {}) };
```

- [ ] **Step 8: Document the contract in `writing-plugins`**

In `plugins/orchestra/skills/writing-plugins/SKILL.md`, in the `orchestra.json` table, after the `build` row, add:

```markdown
| `measure` | `stack-skills` | The shape measurement for a gate that asks for it. `run`: a command that measures the changed code against `{base}`, the run's base commit, and prints its verdict. `rules`: optional, a skill with the stack's clean-code rules. A stack with no `measure` gives the gate no measurement. |
```

Change the paragraph under the table to:

```markdown
In a command, `{plugin}` is the plugin's folder. In a gate's `run` or `grep`, `{config.<key>}` is
a config value; the key must be declared under `config`. The `build` command takes only `{plugin}`.
The `measure` command takes only `{plugin}` and `{base}`.
```

In the gate table, after the `always` row, add:

```markdown
| `measure` | `true`: an `agent` gate gets the stack's `measure` command and its `rules` skill as the inputs `measure` and `rules`. |
```

- [ ] **Step 9: Add `MEASURE_KEYS` to the contract-words test**

In `test/packaging.test.js`, in `the skill writing-plugins explains every word of the contract that check.js knows`, add `...check.MEASURE_KEYS,` after `...check.BUILD_KEYS,`.

- [ ] **Step 10: Record the decision**

In `docs/TENSIONS.md`, after the S74 row, add:

```markdown
| S75 | Clean code is a workflow gate; the Stack Skills plugin measures. (1) `orc-standard-workflow` gets the agent gate `clean-code` in `implementation-check`, always on, with `"measure": true`. It fixes its Patch findings. Its rules: the language-agnostic clean-code rules (comments included) and Clean Architecture phases 1–3 as rules 11–13. This changes S68 (3): clean-code now exists at workflow level, and three Clean Architecture rules come with it. (2) A Stack Skills plugin may declare `measure`: a command that measures the changed code against `{base}`, and a `rules` skill. A gate with `"measure": true` gets both as inputs. A stack with none (Java) gives the gate no measurement; the gate records an Evaluate warning that shows in the report. (3) New Stack Skills plugin `orc-ts-stack`: build `npm ci && npm test`, no gates, no guides; `measure` runs the ported mentorano `measure.py`; `rules` is the ported `clean-code-typescript`. (4) `plugins/clean-code` is a standalone copy of mentorano's clean-code 0.6.0. Dropped from orchestra: `boundaries.py` (Python and FastAPI only), the Python and logging skills (no Python stack), `architecture-fundamentals`, `rationalizations.md` (it speaks to a coder), the audit mode and the correctness pass (logic-review owns it). Full record: `docs/DECISIONS.md`. | User decision |
```

At the end of `docs/DECISIONS.md`, add:

```markdown
## S75: Clean code as a workflow gate, measured by the Stack Skills

- **Date:** 2026-10-16
- **Status:** decided
- **Question:** S68 left clean code for later, "at workflow level". mentorano's clean-code plugin
  has language-agnostic rules but measures only Python and TypeScript. Where does each part go, and
  who measures the code of a stack?
- **Options:**
  A. Port the scripts into the workflow as they are. Smallest change, but a Java run measures
     nothing, and the workflow learns two languages.
  B. One multi-language measurer (for example `lizard`) inside the workflow. Stack-free, but a new
     install on every machine, no compare mode, and nesting depth only through an extension.
  C. The Stack Skills plugin declares the measurement; the workflow gate uses it. The workflow never
     learns a parser, like `build`. Costs a contract change (`check.js`, `writing-plugins`).
- **Evidence:** The mentorano source (`docs/PORTING.md`, section "ai-marketplace-mentorano"): the
  rules section of `SKILL.md` names no language; `languages.py` accepts only `.py`, `.ts` and `.tsx`;
  `boundaries.py` reads only Python and knows FastAPI layer names. An agent gate gets `base` as an
  input, a tool gate does not (`lib/gates.js` expands only `{plugin}` and `{config.<key>}`), and the
  verdicts need judgement (a renamed function shows as `new-over`; a flat `switch` over complexity
  10 is not split).
- **Decision:** C. The gate `clean-code` in `orc-standard-workflow`, `implementation-check`, an agent
  gate that fixes its Patch findings, with the comment rule kept. Stack Skills key `measure`
  (`run`, `rules`) and gate key `measure`. New `orc-ts-stack`: build `npm ci && npm test`, the
  measure and the TypeScript rules. Java declares no measure, so its runs show a warning. The
  mentorano plugin is copied whole to `plugins/clean-code` for use outside orchestra.
- **Cost and risk:** One more subagent per run, on every stack. The comment rule overlaps the Java
  `comments` gate in `finish`; watch for double findings. The TS measure needs Python 3.11 or later
  and the project's own `typescript@5`; without them the gate reviews with the rules only. The
  scripts exist twice (`plugins/clean-code`, `plugins/orc-ts-stack/scripts`); a test keeps them
  identical. The thresholds are the defaults of `measure.py`; a project that wants others needs a
  config key, not built yet.
- **Where it lives:** `plugins/orchestra/lib/{check,gates,runner}.js`,
  `plugins/orchestra/skills/writing-plugins/SKILL.md`, `plugins/orc-standard-workflow/orchestra.json`,
  `plugins/orc-standard-workflow/skills/clean-code/SKILL.md`, `plugins/orc-ts-stack/`,
  `plugins/clean-code/`, `docs/PORTING.md`.
```

- [ ] **Step 11: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 12: Commit**

```bash
git add plugins/orchestra test docs/TENSIONS.md docs/DECISIONS.md
git commit -m "feat(orchestra): Stack Skills may declare a measure for a gate that asks for it (S75)"
```

---

### Task 2: The standalone `clean-code` plugin and its tests

A verbatim copy of mentorano's clean-code. Changes to the copy: a root `plugin.json`, the license, the install lines of the README, and the version. The source tests come along, pointed at the copy.

**Files:**
- Create: `plugins/clean-code/` (copy of the source plugin folder: `.claude-plugin/plugin.json`, `README.md`, `skills/**`)
- Create: `plugins/clean-code/plugin.json`, `plugins/clean-code/LICENSE`
- Create: `test/clean-code/test_measure.py`, `test/clean-code/test_revisions.py`, `test/clean-code/test_boundaries.py`, `test/clean-code/ts_package.py`, `test/clean-code/fixtures/` (copies of `sample.py`, `sample.ts`, `Sample.tsx`, `sample.test.ts`)
- Create: `test/clean-code/python.test.js`
- Modify: `package.json` (dev dependency `typescript`), create `package-lock.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `docs/PORTING.md` (new source row, new section "ai-marketplace-mentorano")

**Interfaces:**
- Consumes: nothing.
- Produces: the script folder `plugins/clean-code/skills/clean-code/` with `measure.py`, `languages.py`, `shape.py`, `compare.py`, `revisions.py`, `measure-ts.mjs` (Task 3 copies these six files and tests their identity). `node_modules/typescript` at the repo root after `npm ci`.

- [ ] **Step 1: Read the source in full**

Read every file under the source plugin folder and the four source test files, line by line (`docs/PORTING.md` step 2). Done when you have read every line.

- [ ] **Step 2: Copy the plugin**

```bash
SRC=~/Projects-other/ai-marketplace-mentorano
mkdir -p plugins/clean-code
cp -R "$SRC/plugins/clean-code/.claude-plugin" "$SRC/plugins/clean-code/README.md" "$SRC/plugins/clean-code/skills" plugins/clean-code/
cp "$SRC/LICENSE" plugins/clean-code/LICENSE
find plugins/clean-code -name __pycache__ -prune -exec rm -rf {} +
```

- [ ] **Step 3: Set the manifests**

Write `plugins/clean-code/plugin.json` and overwrite `plugins/clean-code/.claude-plugin/plugin.json` with the same content:

```json
{
  "name": "clean-code",
  "version": "0.12.0",
  "description": "Clean Code / Clean Architecture rules and source measurement for Python and TypeScript, logging guidance, and an architecture-fundamentals skill. A copy of mentorano's clean-code 0.6.0 (MIT).",
  "license": "MIT",
  "author": { "name": "Ivan Dachev", "email": "ivan@mentorano.com" }
}
```

- [ ] **Step 4: Change the README's install lines and test section**

In `plugins/clean-code/README.md`, replace the two lines in the "Install" code block with:

```bash
/plugin marketplace add <path or URL of depitropov-plugins>
/plugin install clean-code@depitropov-plugins
```

Add one line under the `# clean-code` title:

```markdown
A copy of mentorano's clean-code 0.6.0 (`mentorano/ai-marketplace-mentorano`, MIT, see `LICENSE`).
```

In the "Tests" section, replace the `./run-tests.sh` block and the paragraph after it with:

```markdown
```bash
npm ci && npm test
```

The Python tests live in `test/clean-code/` of this repo. `test/clean-code/python.test.js` runs them
with `python3 -m unittest`. The TypeScript tests use the `typescript` package at
`CLEAN_CODE_TS_PACKAGE`, or the repo's own `node_modules/typescript` (pinned in the root
`package.json`); without either, or without `node`, they skip.
```

Change the line "From a checkout of this marketplace, the same script is at `plugins/clean-code/skills/clean-code/measure.py`." to keep its path (it is the same in this repo). Change nothing else.

- [ ] **Step 5: Add the marketplace entry**

In `.claude-plugin/marketplace.json`, add to `plugins`:

```json
    { "name": "clean-code", "source": "./plugins/clean-code", "description": "Clean code rules and measurement for Python and TypeScript; a copy of mentorano's clean-code." }
```

- [ ] **Step 6: Copy the tests and point them at the copy**

```bash
SRC=~/Projects-other/ai-marketplace-mentorano/tests
mkdir -p test/clean-code/fixtures
cp "$SRC/test_measure.py" "$SRC/test_revisions.py" "$SRC/test_boundaries.py" "$SRC/ts_package.py" test/clean-code/
cp "$SRC/fixtures/clean-code/"* test/clean-code/fixtures/
```

Then edit the path constants. `test/clean-code/<file>.py` is two folders below the repo root, so `ROOT` gains one `.parent`:
- `test_measure.py`: `ROOT = Path(__file__).resolve().parent.parent.parent`; `FIXTURES = ROOT / "test" / "clean-code" / "fixtures"`. `SCRIPT` stays `ROOT / "plugins" / "clean-code" / "skills" / "clean-code" / "measure.py"`.
- `test_revisions.py`: `ROOT = Path(__file__).resolve().parent.parent.parent`. Change any `ROOT / "tests" / "fixtures" / "clean-code"` to `ROOT / "test" / "clean-code" / "fixtures"`.
- `test_boundaries.py`: `ROOT = Path(__file__).resolve().parent.parent.parent`.
- `ts_package.py`: `REPO_ROOT = Path(__file__).resolve().parent.parent.parent`.
- Every docstring line `Run:  python3 tests/test_<x>.py` becomes `Run:  python3 test/clean-code/test_<x>.py`.

Search each file for `"tests"` and `fixtures` and fix any other path the same way. If a test imports `fixtures` (the branch-board helper), it is not needed: `grep -n "^from fixtures\|^import fixtures" test/clean-code/*.py` must print nothing.

- [ ] **Step 7: Add the dev dependency**

In `package.json`, add after `"scripts"`:

```json
  "devDependencies": {
    "typescript": "5.9.3"
  }
```

Run: `npm install` (creates `package-lock.json`).

- [ ] **Step 8: Write the Node wrapper test**

`test/clean-code/python.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// The clean-code scripts are Python; their tests run under unittest, from npm test.
test('the clean-code Python tests pass', () => {
  const r = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', __dirname, '-p', 'test_*.py'], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});
```

- [ ] **Step 9: Run the tests**

Run: `npm test`
Expected: PASS. The packaging test also checks the new plugin (both manifests, frontmatter). If `the clean-code Python tests pass` fails, read its output: a path constant from Step 6 is the usual cause.

- [ ] **Step 10: Add mentorano to `docs/PORTING.md`**

Add a row to the "Sources" table:

```markdown
| ai-marketplace-mentorano | `~/Projects-other/ai-marketplace-mentorano/plugins/clean-code` (MIT) | Clean code (the workflow gate, orc-ts-stack, the standalone `clean-code`) |
```

Add a new section `### ai-marketplace-mentorano` at the end of the inventory, with this note under it: "Source: `~/Projects-other/ai-marketplace-mentorano/plugins/clean-code`, version 0.6.0, read in full on 2026-10-16. `plugins/clean-code` is a verbatim copy of every file below, so each part is at least `ported` there. The rows say where each part went in orchestra; decided by S75." Then one `####` subsection per source file, in the table format of the other sections (`| Part | Where now | Status | Applicable? |`). This task fills the subsections of the files that go only to the standalone copy:

```markdown
#### README.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Purpose: rules plus measurement, before and after | `plugins/clean-code/README.md`; the clean-code gate (Task 4) | ported | yes |
| Install lines | `plugins/clean-code/README.md`, pointed at this marketplace | ported (changed) | yes |
| Skills table, scripts usage, thresholds and their sources | `plugins/clean-code/README.md` | ported (copy) | yes |
| `boundaries.py` measures | `plugins/clean-code/README.md` only | dropped from orchestra (S75: Python and FastAPI only) | no |
| Tests section | `plugins/clean-code/README.md`, rewritten for `test/clean-code/` | ported (changed) | yes |
| Not in this version: CRAP, mutation, cross-file duplication | DESIGN §10 phase 2 | planned (phase 2) | yes |

#### skills/clean-code/boundaries.py, boundary_rules.py, imports.py

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files: the import graph and the boundary counts | `plugins/clean-code/skills/clean-code/` | dropped from orchestra (S75: Python only, FastAPI layer names) | no |

#### skills/clean-code/rationalizations.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole file: excuses and answers | `plugins/clean-code/skills/clean-code/rationalizations.md` | dropped from orchestra (S75: it speaks to a coder, the gate reviews) | no |

#### skills/clean-code-python/SKILL.md, skills/clean-code-logging/** , skills/architecture-fundamentals/**

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files | `plugins/clean-code/skills/` | dropped from orchestra (S75: no Python stack; logging and system architecture are not the clean-code gate's) | no |

#### tests/test_measure.py, test_revisions.py, test_boundaries.py, ts_package.py, fixtures/clean-code/*

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files, path constants changed | `test/clean-code/` | ported | yes |
| `test_skills.py` (marketplace frontmatter) | `test/packaging.test.js` checks every plugin | n/a (this repo has its own check) | no |
```

- [ ] **Step 11: Commit**

```bash
git add plugins/clean-code test/clean-code package.json package-lock.json .claude-plugin/marketplace.json docs/PORTING.md
git commit -m "feat(clean-code): a standalone copy of mentorano's clean-code, with its tests (S75)"
```

---

### Task 3: The `orc-ts-stack` plugin

An empty TypeScript Stack Skills plugin: the build, its fix guide, the measure, and the ported TypeScript rules. No gates, no guides.

**Files:**
- Create: `plugins/orc-ts-stack/plugin.json`, `plugins/orc-ts-stack/.claude-plugin/plugin.json`, `plugins/orc-ts-stack/orchestra.json`, `plugins/orc-ts-stack/LICENSE` (copy of `plugins/clean-code/LICENSE`, it covers the scripts)
- Create: `plugins/orc-ts-stack/skills/manifest/SKILL.md`, `plugins/orc-ts-stack/skills/fix-build/SKILL.md`, `plugins/orc-ts-stack/skills/clean-code-typescript/SKILL.md`
- Create: `plugins/orc-ts-stack/scripts/` (the six script files from Task 2)
- Modify: `.claude-plugin/marketplace.json`, `plugins/orchestra/skills/init/SKILL.md` (line 24)
- Modify: `docs/PORTING.md` (the subsections of the scripts and of `clean-code-typescript`)
- Test: `test/orc-ts-stack/measure.test.js`

**Interfaces:**
- Consumes: `measureInputs(resolved, base)` from Task 1; the six scripts from Task 2; `node_modules/typescript` at the repo root.
- Produces: the stack declaration `measure.run = 'python3 "{plugin}/scripts/measure.py" . --changed --base {base} --compare'`, `measure.rules = 'clean-code-typescript'`. Task 4's gate text cites `TS rule <n>` from `clean-code-typescript`.

- [ ] **Step 1: Write the failing test**

`test/orc-ts-stack/measure.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/orc-ts-stack/measure.test.js`
Expected: FAIL with `ENOENT` on `plugins/orc-ts-stack/orchestra.json`.

- [ ] **Step 3: Create the plugin files**

`plugins/orc-ts-stack/plugin.json` and `plugins/orc-ts-stack/.claude-plugin/plugin.json`, the same content:

```json
{
  "name": "orc-ts-stack",
  "version": "0.12.0",
  "description": "Stack Skills for TypeScript with npm: the build, its fix guide, and the clean-code measure and rules."
}
```

`plugins/orc-ts-stack/orchestra.json`:

```json
{
  "slot": "stack-skills",
  "config": {},
  "build": { "run": "npm ci && npm test", "guide": "fix-build", "max_rounds": 3 },
  "measure": { "run": "python3 \"{plugin}/scripts/measure.py\" . --changed --base {base} --compare", "rules": "clean-code-typescript" },
  "gates": []
}
```

```bash
mkdir -p plugins/orc-ts-stack/scripts
for f in measure.py languages.py shape.py compare.py revisions.py measure-ts.mjs; do cp plugins/clean-code/skills/clean-code/$f plugins/orc-ts-stack/scripts/; done
cp plugins/clean-code/LICENSE plugins/orc-ts-stack/LICENSE
```

`plugins/orc-ts-stack/skills/manifest/SKILL.md`:

```markdown
---
name: manifest
description: Reports where the orc-ts-stack plugin is installed. Invoked by orchestra run during resolution; not for direct use.
---

# Manifest

Find the folder that holds this `SKILL.md`. Go two folders up. That folder holds `orchestra.json`.
Check that the file exists.

Answer with exactly one line and nothing else:

PLUGIN_DIR=<absolute path of that folder>
```

`plugins/orc-ts-stack/skills/fix-build/SKILL.md`:

```markdown
---
name: fix-build
description: How to fix a failed npm install, build or test run in a TypeScript project. A fix guide for the orchestra fixer.
---

# Fix a TypeScript build

1. Find the first error in the log. Later errors often come from the first one.
   - `npm ci` fails (`npm ERR!`, a lock file that does not match `package.json`): do not add, remove
     or upgrade a dependency, and do not edit `package-lock.json`. Report it in the result as
     `failed` with the reason.
   - `npm ERR! Missing script: "test"`: the project has no test script. Report it as `failed` with
     the reason. Do not add a script.
   - A type error (`error TS<number>`): fix the code at the reported `file:line`.
   - A failing test: open the test and the code it tests. Decide which one is wrong, using the spec.
     Fix the code when the test matches the spec.
2. Run the single failing test file first, with the test runner that the `test` script in
   `package.json` names (for example `npx vitest run <file>` or `npx jest <file>`). Then run the full
   build command from the log's first line.
3. Do not skip, focus or delete a test (`.skip`, `.only`, `xit`), and do not change the `test`
   script to make the build pass.
```

- [ ] **Step 4: Port `clean-code-typescript` as the rules skill**

Read the source `skills/clean-code-typescript/SKILL.md` in full first. Write `plugins/orc-ts-stack/skills/clean-code-typescript/SKILL.md`:

````markdown
---
name: clean-code-typescript
description: The TypeScript and React rules of the clean-code gate, with the layer defaults of a React app and the smells that no linter catches. Read by the clean-code gate of an orchestra workflow; not for direct use.
---

# Clean code: TypeScript and React

The clean-code gate reads these rules next to its own rules. A finding cites `TS rule <n>` and
`file:line`. A rule that `tsc --strict`, typescript-eslint `recommended` or
`eslint-plugin-react-hooks` checks is not repeated here. Where one of them borders a rule, the rule
names the tool.

## Rules

1. **`strict` is on in `tsconfig.json`.** No lint rule reads this setting, so read the file. With
   `strict` on, `tsc` catches the implied `any`, and `no-explicit-any` catches the written one. A
   value whose shape is not known at a boundary is `unknown` plus a narrowing guard, not an `as`
   cast. An `as` cast has a comment that says why the compiler is wrong.
2. **Discriminated unions, not flags.** Two optional fields that travel together, or a boolean prop
   that switches the render, are one union with a `kind`.
3. **Each component has a named `Props` type.** A `type` or an `interface`; inline only for one or
   two fields. It is never the API response type: the component owns its contract, and the wire
   shape stays in the hook that fetched it.
4. **Data comes through a hook.** `useQuery` and `useMutation` live in `hooks/`. No `axios`, no
   `fetch`, no `useEffect` with a request in a component or a page. The exception: the framework
   owns the fetch (a route loader, a server component); then that layer does it. If the hook file
   does not exist yet, create it.
5. **Query keys are constants or a key factory in the hook file.** An inline key array in a
   component breaks the cache at the next rename.
6. **Every dependency array entry comes from a stable source.** `exhaustive-deps` flags a literal
   object, array, function or `x ?? []` declared in the component body. It cannot see a value that a
   call returns (`.filter()`, `.map()`, a `useMutation()` result) or that props pass in. Such a value
   changes identity on every render: the memo misses, dependent effects run again, and `memo()`
   children render again. Nothing remounts unless the value is a `key`. Prefer a primitive
   (`items.length`, the stable `mutate`), or derive the value inside the hook; use `useMemo` last.
   Never remove an entry from the array to fix it, and never silence `react-hooks/exhaustive-deps`:
   the warning is a bug report. Fix the source: move a constant out of the component, build the
   object inside the effect, read the primitive out of the object, and only then use `useMemo` or
   `useCallback`.
7. **A component does one job.** It is a function, so the line limit applies to it, JSX and inline
   callbacks included. A file over 500 lines holds several modules. Extract first the piece that
   owns its own state: its handlers go with it.
8. **Loading, error and empty are explicit branches.** `data?.map(...)`, `?? []` and `data!` all
   pass `tsc --strict`. The first two render the same blank list for a pending query, a failed query
   and zero rows; `data!` crashes. Only `no-non-null-assertion` catches the `!`, and it is in
   typescript-eslint `strict`, not in `recommended`. Each state gets its own JSX.
9. **`eslint-disable` has a reason after ` -- `.** The reason says why the rule is wrong here, not
   what the rule says. No recommended set asks for the reason; the project can turn on
   `@eslint-community/eslint-comments/require-description`. `@ts-ignore` and a bare
   `@ts-expect-error` are already errors under `ban-ts-comment`.
10. **Early return.** Guards first; the JSX at the bottom is the normal path.
11. **A test renders the real component.** One behaviour per test, and a name that reads as a
    sentence: `renders empty state when there are no rows`, not `test 3`.
12. **No `helpers.ts` or `utils.ts`.** `utils/` is a layer, not a file name. Each file in it does one
    job and has its name (`formatMoney.ts`, `isApiError.ts`). A function with one caller stays in
    the caller's file.
13. **URL state has one owner.** Do not copy URL state into React state.

Not listed: `console.log`, `as any` and `@ts-ignore`. typescript-eslint `recommended` makes `as any`
and `@ts-ignore` errors (`no-explicit-any`, `ban-ts-comment`). Core `no-console` covers the log, but
it is not in `eslint:recommended`; the project turns it on.

## Layers of a React app

The project's `AGENTS.md` or `CLAUDE.md` overrides these names. It may group by feature
(`features/<resource>/{api,hooks,components,types}`) instead of by layer; the arrows hold either way.

```
pages/        route components: call hooks, compose components, no rules
hooks/        one hook file per resource; query keys as constants in that file; invalidation on mutation; `select` turns the wire shape into the app's type
api/          one HTTP client with interceptors, and the wire types beside it (generated or mirrored from the backend contract)
components/   presentational and project components; no data fetching; use the app's types, never the wire shape
types/        the app's own domain and view types: what hooks give to components
utils/        pure functions that a second caller needs, one job per file, named for it
```

The direction: `pages` import `hooks` and `components`; `hooks` import `api` and `types`;
`components` import `types` and `utils`; `api` imports nothing above it; nothing imports `pages`. A
component that imports the HTTP client is an adapter in the wrong folder (gate rule 11). A component
that reads a backend field name breaks gate rule 13: the translation belongs in the hook. When the
project groups by feature, the same arrows hold inside each feature. Across features the direction
is shared → features → pages, and features do not import each other. When the project has
`import/no-restricted-paths` zones or another dependency checker, its result wins over this list.

| Layer | Smell | What it shows |
|---|---|---|
| `pages/` | a business rule in the page (`if (row.status === ...)` decides a permission) | gate rule 11: the page only composes; the rule belongs in a hook or a domain helper |
| `pages/` | 500 lines or more | several pages, or a page that carries a component |
| `components/` | `axios`, `fetch` or a `useEffect` request | gate rule 11: the component cannot be tested without IO |
| `components/` | an inline props type, or a `Props` that is the API response type | the wire shape leaks across the boundary; name the `Props` |
| `components/` | reads a backend field name (`row.created_at` from the DTO) | gate rule 13: translate in the hook's `select` |
| `hooks/` | an inline query key (`['users']`) instead of the hook's key constant | a rename or a typo in one copy, and `invalidateQueries` no longer matches |
| `hooks/` | a mutation that neither invalidates nor updates the cache (no `invalidateQueries` in `onSuccess` or `onSettled`, no `setQueryData`) | mounted lists keep the old rows until a refocus, a reconnect or a remount |
| anywhere | a memo or effect dependency held in a variable that is new on each render (`const rows = data ?? []`, `.filter()`, an inline object) | TS rule 6: the memo misses on every render; `exhaustive-deps` catches only the expression written inline in the array |

## Two searches

Run these on the changed files under `components/` and `pages/`:

```bash
command grep -ln "axios\.\|fetch(" <changed files>           # fetching outside hooks: TS rule 4
command grep -n "queryKey: \[['\"]" <changed files>          # inline query keys outside hooks: TS rule 5
```

A hit in a changed file is a finding. A hit in a file the task did not change is not in scope.

## Reading the measurement

The measure parses TypeScript with the project's own `typescript` package, from the nearest
`node_modules` above each file. Without that package it stops and prints the `npm ci` command.
TypeScript 7 has no JavaScript compiler API, so on a 7.x project it stops and asks for
`typescript@5`.

What counts as a function: declarations, methods, constructors, accessors, and an arrow or a
function expression that is the initial value of a `const`, a property, or `export default`. A
callback passed to `.map`, `useMemo` or `useEffect` belongs to the function around it, and its
branches count toward that function's complexity. So a component with a large inline callback is
one large function: that is the honest reading.

In a test file, `describe` (and `suite`, `context`) is a container like the file: its callback is
not measured. Each `it`, `test` and hook is measured alone. A callback with no name takes the name of
its call and its title, cut at 60 characters: `it("adds numbers")`, `vi.mock("./api")`,
`beforeEach()`. A test over 20 lines is a finding like any function; a long `describe` is not.
````

- [ ] **Step 5: Add the marketplace entry and offer the stack in `init`**

In `.claude-plugin/marketplace.json`, add:

```json
    { "name": "orc-ts-stack", "source": "./plugins/orc-ts-stack", "description": "Stack Skills for TypeScript with npm." }
```

In `plugins/orchestra/skills/init/SKILL.md` line 24, change "Offer `orc-standard-workflow` and `orc-java-stack` as th…" so that it offers `orc-java-stack` and `orc-ts-stack` as the Stack Skills plugins. Read the full sentence first and keep the rest of it.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. The packaging test checks `orc-ts-stack` with `checkPlugin` (its `measure.rules` skill must exist).

- [ ] **Step 7: Fill the PORTING subsections**

In `docs/PORTING.md`, section `### ai-marketplace-mentorano`, add:

```markdown
#### skills/clean-code/measure.py, languages.py, shape.py, compare.py, revisions.py, measure-ts.mjs

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files: shape per function and file, `--changed`, `--at`, `--compare` verdicts | `plugins/orc-ts-stack/scripts/` (byte-identical to `plugins/clean-code`), run by the `measure` of `orc-ts-stack` (S75) | ported (copy) | yes |
| Python measurement inside `languages.py` | `plugins/orc-ts-stack/scripts/languages.py`; measures a changed `.py` file in a TS project too | ported (copy) | yes |
| Thresholds by flag (`--max-lines` and the others) | not exposed: the measure command uses the defaults | dropped (S75: a config key when a project needs it) | yes |

#### skills/clean-code-typescript/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Companion note, project file outranks | `orc-ts-stack:clean-code-typescript` intro; gate step 5 | ported | yes |
| Rules, TypeScript shape (strict, unions, Props, hooks, query keys, dependency arrays, one job, explicit states, eslint-disable reason, early return, tests) | TS rules 1–11 | ported | yes |
| Layer defaults, direction, feature grouping, smell table | "Layers of a React app"; Phase 1 and 3 references become gate rules 11 and 13 | ported | yes |
| `console.log`, `as any`, `@ts-ignore` not listed | the "Not listed" paragraph | ported | yes |
| Measuring: the command | the stack's `measure` (S75) | ported (other mechanism) | yes |
| Measuring: the `typescript` package, TS 7, what counts as a function, test files | "Reading the measurement" | ported | yes |
| Two greps | "Two searches", tied to TS rules 4 and 5 | ported | yes |
| A hit in an untouched file is context | "Two searches", last line | ported | yes |
| What not to do: no `helpers.ts`, one URL-state owner, create the hook, fix the dependency source, do not silence `exhaustive-deps` | TS rules 12, 13, 4, 6 | ported | yes |
```

- [ ] **Step 8: Commit**

```bash
git add plugins/orc-ts-stack plugins/orchestra/skills/init/SKILL.md .claude-plugin/marketplace.json test/orc-ts-stack docs/PORTING.md
git commit -m "feat(orc-ts-stack): a TypeScript Stack Skills plugin with the clean-code measure (S75)"
```

---

### Task 4: The `clean-code` gate in the workflow

**Files:**
- Create: `plugins/orc-standard-workflow/skills/clean-code/SKILL.md`
- Modify: `plugins/orc-standard-workflow/orchestra.json` (third gate)
- Modify: `test/packaging.test.js` (`REFERENCED`, the judging list, one new test)
- Modify: `docs/PORTING.md` (the subsections of `clean-code/SKILL.md` and `architecture.md`)

**Interfaces:**
- Consumes: the gate key `measure` and the inputs `measure`, `rules` (Task 1); `TS rule <n>` citations (Task 3).
- Produces: the dispatched skill `orc-standard-workflow:clean-code`; the notes file `<notes>/clean-code.md`; a result with `"stage": "clean-code"`.

- [ ] **Step 1: Write the failing tests**

In `test/packaging.test.js`, add `'orc-standard-workflow/clean-code'` to `REFERENCED`. In `every judging skill takes its triage from orchestra:triage`, change the workflow list to `['plan-check', 'plan-conformance', 'logic-review', 'clean-code']`. Add:

```js
test('the clean-code gate asks for the measure and warns when the stack has none', () => {
  const d = JSON.parse(fs.readFileSync(path.join(PLUGINS, 'orc-standard-workflow', 'orchestra.json'), 'utf8'));
  const gate = d.gates.find(g => g.name === 'clean-code');
  assert.deepEqual(gate, { name: 'clean-code', phase: 'implementation-check', kind: 'agent', skill: 'clean-code', always: true, measure: true });
  const text = fs.readFileSync(path.join(PLUGINS, 'orc-standard-workflow', 'skills', 'clean-code', 'SKILL.md'), 'utf8');
  assert.match(text, /No shape measurement: the Stack Skills plugin declares no measure/);
  assert.match(text, /broken measurement/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL: `missing skill orc-standard-workflow/clean-code`, and `gate` is `undefined`.

- [ ] **Step 3: Declare the gate**

In `plugins/orc-standard-workflow/orchestra.json`, add as the third gate:

```json
    { "name": "clean-code", "phase": "implementation-check", "kind": "agent", "skill": "clean-code", "always": true, "measure": true }
```

- [ ] **Step 4: Write the gate skill**

Read the source `skills/clean-code/SKILL.md` and `skills/clean-code/architecture.md` in full first. Write `plugins/orc-standard-workflow/skills/clean-code/SKILL.md`:

````markdown
---
name: clean-code
description: Reviews the shape of the changed code and the clean-code rules — the stack's measurement against the base, names, one job, flags, side effects, duplication, errors, comments, dead code, tests and boundaries — then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Clean-code review

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.
- `measure` (optional): the Stack Skills command that measures the changed code against `base`.
- `rules` (optional): a skill with the stack's own clean-code rules.

## Procedure

1. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`. Read each
   changed source and test file in full. If the change has no source code and no tests, write the
   result with `"status": "skipped"` and stop.
2. **Measure.**
   - With `measure`: run it once, from the run root. Keep the whole output. Exit code 0 means it
     measured, also when it says it found no files to measure. Any other exit code is a broken
     measurement: record one Evaluate finding with the first error line of the output, and go on
     with the rules.
   - Without `measure`: record one Evaluate finding with this text: `No shape measurement: the Stack
     Skills plugin declares no measure. The review used the rules only.` Go on with the rules, and
     judge rule 3 by reading.
3. Each measured row with one of these verdicts is a finding against rule 3:

   | Verdict | Meaning |
   |---|---|
   | `new-over` | A function or a file that the task created is over a threshold. |
   | `crossed` | A function that the task touched crossed a threshold it was under, or a file crossed 500 lines. |
   | `grew` | Over before and after, and a measure that is over went up. For a file: over 500 lines, and longer. |
   | `suppressions-up` | A file has more suppressions than before. Each new one without its reason on its line is a finding. |

   `fixed`, `still-over` and `new` are not findings. A row matches by file and name, so a renamed
   function shows as `new-over`: read the diff before you call it new, and judge it against the old
   function. One exception: a flat `switch` or `match` whose arms answer one question can be over
   complexity 10. List it under Checked with that reason; it is not a finding. Never split it into
   helpers that take a flag the caller already knows.
4. Check the lines this change adds or edits against each rule below. When `rules` is given, invoke
   that skill and check its rules too. Code the change does not touch is not in scope: the whole
   repository does not need to be clean, but the task's code must not get worse.
5. The project wins. The project's `AGENTS.md` or `CLAUDE.md` overrides every rule and threshold
   here. Existing long or complex code is not a project rule: it does not excuse a new finding.
6. The title of each finding starts with its rule, as in `▸ Rule 3: <title>` or
   `▸ TS rule 4: <title>`, and its "In the code" line gives `file:line`. A finding against rule 3
   gives the before and after numbers of its row.
7. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
8. Write `<notes>/clean-code.md` in the triage notes format. Under Checked, give the `SUMMARY`,
   `BEFORE` and `VERDICT` lines of the measurement, or the reason there is none.
9. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
10. Otherwise fix every Patch finding and every answered Decide. A fix changes the shape, never the
    behaviour: extract, rename, flatten, delete dead code. Run only the tests of the files you
    changed. Never pipe a test command: the pipe hides the exit code. With `measure`, run it once
    more and give its `VERDICT` line under Patched; undo a fix that makes a row worse. Commit once:
    `refactor(clean-code): <summary>`. orchestra commits `notes` itself: do not stage files under
    `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: whether the behaviour is right (logic-review), whether the plan was followed
(plan-conformance), log statements, formatting.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "clean-code",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 1, "noise": 0 },
  "evaluate": ["No shape measurement: the Stack Skills plugin declares no measure. The review used the rules only."],
  "files": ["<notes>/clean-code.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line, with `file:line` when it has one.

## Permitted actions

Edit code and tests. Run tests and the `measure` command. Commit. Do not push. Do not change
branches. Do not ask the user; a question goes into `decide`.

## Rules

1. **Names say what, not how.** `remainingBudget`, not `calc`. A name that needs a comment is the
   wrong name.
2. **One job per function.** A function is a paragraph. When it has sections with heading comments,
   each section is a function.
3. **Small.** A function has at most 20 lines (blank lines and doc comments count), complexity at
   most 10, at most 3 parameters, and nesting at most 2. A file has at most 500 lines. Each
   suppression of a check carries its reason on its line. The measured rows are the evidence. What
   crossing a threshold usually means:
   - lines: the sections (declarations, setup, loop, output) are several jobs; extract each one;
   - complexity: an `if` chain or a `switch` that does several things; put it once behind
     polymorphism, or extract each branch;
   - parameters: arguments that travel together are a missing object; a flag argument is two
     functions (rule 4);
   - nesting: nested blocks hide the normal flow; return early with a guard clause, or extract each
     block into a one-line call;
   - file lines: more than one job in one file; split by job, not by line count.
   Bring a touched function that was already over a threshold under it when the change is small.
   When it stays over, the finding says why, and what the split would be.
4. **No flag arguments.** A boolean parameter that picks a path means two functions.
5. **No hidden side effects.** A function named like a query does not write.
6. **No duplication inside one responsibility.** Extract at the second copy, not the third, when
   both copies change for the same reason. Only true duplication counts: every change to one copy
   forces the same change to the other. Two similar views, queries or data shapes that serve
   different use cases, or different domain contexts, stay apart.
7. **Errors are types.** A domain error is a class in the domain: not a string, not a status code,
   not a null with a comment.
8. **Comments explain why.** Intent, a warning, a consequence the reader would not expect. A comment
   that repeats the next line is deleted, and its reason goes into a better name. Code you cannot
   rename (a regular expression, an obscure library argument) is the one place where a comment may
   say what the code does.
9. **Dead code is deleted.** Not commented out, not kept "in case".
10. **Tests are code.** The same rules apply. One behaviour per test, not one assertion; a name that
    reads as a sentence; no logic in a test that needs its own test.
11. **The core works without the UI and the IO.** A handler, a component or a template asks a domain
    function for each decision and translates the answer into HTML, JSON or text. It does not
    compute the rule itself. A correct import direction does not excuse a copy: an adapter that
    computes what a domain function already gives is wrong, and so is a domain function that only
    the tests call while the adapter keeps its own copy.
12. **Dependencies point inward.** A domain module does not import the ORM, the HTTP framework or a
    client library, does not take the framework's request object, and does not read an environment
    variable. It defines an interface; the adapter implements it. A stable platform facility, such
    as the standard library, is not a finding. Judge by the imports, not by the folder name.
13. **A simple typed value crosses a boundary.** No ORM row or entity, no request schema, no free map
    whose keys the receiver must know. The adapter translates. An error crosses in the form the inner
    module defines: the adapter turns an outside failure into a domain error, and a domain error into
    a transport error.
````

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Fill the PORTING subsections**

In `docs/PORTING.md`, section `### ai-marketplace-mentorano`, add:

```markdown
#### skills/clean-code/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Overview: two deliverables, numbers not feelings | gate step 2, rule 3 | ported | yes |
| Project file outranks, also on the edit tool | gate step 5 (`AGENTS.md` or `CLAUDE.md`); the edit tool comes from the dispatch prompt | ported | yes |
| When to use: before any edit, any review | the gate runs on every run (`always`) | ported (other mechanism) | yes |
| Load the language skill | the stack's `rules` skill (S75) | ported (other mechanism) | yes |
| Process 1: measure before, keep the whole table | `--compare` against `base` in one run | ported (other mechanism) | yes |
| Process 1: `CLAUDE_PLUGIN_ROOT` check | `{plugin}` expanded by orchestra | n/a (orchestra gives the path) | no |
| Process 1 and 3: `boundaries.py` | — | dropped (S75: Python and FastAPI only) | no |
| Process 2: write | the code stage | n/a (the gate reviews) | no |
| Process 3: measure after, verdict table, the five floor rules | gate step 3, rule 3 | ported | yes |
| Process 3: renamed function shows as a new row | gate step 3 | ported | yes |
| Process 3: `--at HEAD` for another session's work | — | n/a (a run has its own worktree, S74) | no |
| Process 3: not done until the shape holds; Boy Scout | gate step 10, rule 3 last lines | ported | yes |
| Process 4: verify with the project's gate | the build (S48) | ported (other mechanism) | yes |
| Process 5: correctness pass | logic-review | dropped (S75: logic-review owns correctness) | yes |
| Process 5: design and readability passes | rules 1–13 | ported | yes |
| Process 5: revalidate each finding, report rejected ones | `orchestra:triage` "Check the finding first" | ported (other mechanism) | yes |
| Process 6: report | `<notes>/clean-code.md` and the result JSON | ported (other mechanism) | yes |
| Audit mode | — | n/a (a gate always has a diff) | no |
| Rules that do not depend on the language | rules 1–10 | ported | yes |
| Reading the numbers: shape rows | rule 3 | ported | yes |
| Reading the numbers: boundary rows | — | dropped (S75: `boundaries.py` not ported) | no |
| Thresholds change by flag, in the project file | gate step 5 (the project file wins); no flag in the command | partial (no config key yet, S75) | yes |
| Honest report: task files not worse; never edit a threshold; never add a suppression to pass; rejected stays rejected | gate step 4, rule 3, `orchestra:triage` | ported | yes |

#### skills/clean-code/architecture.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Scope: source boundaries, not system style | gate rules 11–13 only | ported | yes |
| Vocabulary | the words in rules 11–13 | ported | yes |
| Phase 1, UI and core separation, duplicated logic | rule 11 | ported | yes |
| Phase 2, dependency rule | rule 12 | ported | yes |
| Phase 3, information hiding | rule 13 | ported | yes |
| Phase 4, local quality at the boundary | rules 1–10 (duplication: rule 6; errors: rule 13) | ported | yes |
| Automated checks: run the project's dependency checker | the build runs it when the project has one | ported (other mechanism) | yes |
| Automated checks: add one when practical | — | dropped (S75: the gate fixes the shape, it does not add tooling) | yes |
```

- [ ] **Step 7: Commit**

```bash
git add plugins/orc-standard-workflow test/packaging.test.js docs/PORTING.md
git commit -m "feat(orc-standard-workflow): the clean-code gate (S75)"
```

---

### Task 5: The design docs and the version

**Files:**
- Modify: `docs/DESIGN.md` (§2 plugin table, §4.2 declaration text, §6.1 gate table, §8 workflow gate table, §9 Stack Skills contract, §10 a new subsection, §12 repo layout)
- Modify: `docs/CONTEXT.md` (new term **Measure**)
- Modify: the `plugin.json` and `.claude-plugin/plugin.json` of `orchestra`, `orc-standard-workflow`, `orc-java-stack` (to `0.12.0`)

**Interfaces:**
- Consumes: everything above.
- Produces: docs only.

- [ ] **Step 1: Update `docs/DESIGN.md`**

- §2: "All three plugins" → "All plugins". Add rows:
  `| orc-ts-stack | Stack Skills | build, its fix guide, measure and its rules skill, its manifest skill |`
  `| clean-code | Standalone | A copy of mentorano's clean-code for use outside orchestra (S75). Not a slot plugin |`
- §4.2: under the JSON example, add: "A Stack Skills declaration may also have `measure`: `{ "run": "<command>", "rules": "<skill>" }`. `{plugin}` and `{base}` (the run's base commit) expand in its `run` (S75)."
- §6.1: add a row `| measure | true or absent | An agent gate gets the stack's measure command and rules skill as inputs (S75) |`.
- §8 workflow gate table: add `| clean-code | implementation-check | agent | The shape of the changed code (the stack's measure) and the clean-code rules 1–13; warns when the stack has no measure (S75) |`. Change "A generic bug hunter and a generic architecture reviewer are candidates for later." to "A generic bug hunter is a candidate for later."
- §9 table: add `| measure | no | The shape measurement and the stack's clean-code rules for a gate that asks for them (S75). |`.
- §10: add a subsection after the Java section:

```markdown
### 10.1 `orc-ts-stack`

Empty at the start (S75): `build` is `npm ci && npm test` with the fix guide `fix-build`; no gates,
no guides. Its `measure` runs mentorano's `measure.py` (copied to `scripts/`) against `{base}`, and
its `rules` skill `clean-code-typescript` holds the TypeScript and React rules. The measure needs
Python 3.11 or later and the project's own `typescript@5`.
```

- §12: add `skills/clean-code` to the `orc-standard-workflow` skills line, and add:

```
  orc-ts-stack/
    orchestra.json
    scripts/{measure.py,languages.py,shape.py,compare.py,revisions.py,measure-ts.mjs}
    skills/{manifest,fix-build,clean-code-typescript}/SKILL.md
  clean-code/            standalone copy of mentorano's clean-code
```

- [ ] **Step 2: Add the term to `docs/CONTEXT.md`**

After the **Build** row:

```markdown
| **Measure** | An optional declaration of the Stack Skills: a command that measures the shape of the changed code against the run's base commit, and a skill with the stack's clean-code rules. A gate that asks for it gets both as inputs. |
```

- [ ] **Step 3: Bump the versions**

Set `"version": "0.12.0"` in both manifests of `orchestra`, `orc-standard-workflow` and `orc-java-stack`.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS (the packaging test checks that both manifests of each plugin agree).

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md docs/CONTEXT.md plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json
git commit -m "docs: clean-code gate, measure and orc-ts-stack in the design; plugins 0.12.0 (S75)"
```

---

## After the plan

Tell the user which sections of `docs/guide.html` are now out of date (CLAUDE.md "Guide"): at least
the plugin list, the gate list of the workflow, the Stack Skills contract, and the version and last
`S` number in the rail and the footer (`plugins 0.12.0 · decisions to S75`). Offer to update them.
