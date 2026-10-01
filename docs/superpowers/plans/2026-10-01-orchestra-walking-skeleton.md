# Orchestra Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `orchestra:run` on Claude Code takes one task in a sample Java repo to a task branch with commits, a green final build and `report.md`. It goes through resolution, the driver loop, `next.js`, the gate runner (build, fixer, one agent gate) and all three phases.

**Architecture:** Three plugins in this repo. `orchestra` holds the deterministic core in Node: resolution, the action protocol, the gate runner, the report and the driver CLI. It also holds two skills, `run` and `fixer`. `standard-workflow` holds `next.js` (prepare → code → three phases) and the skills `manifest`, `code` and `logic-review`. `java-stack` holds only a `build` declaration and its fix guide. The model only invokes skills, runs `drive.js` and dispatches the subagents that `drive.js` asks for. All order lives in code.

**Tech Stack:** Node 22, standard library only, `node:test`. Git 2.50. Java 21 and Maven 3.9 for the sample repo.

**Spec:** `docs/DESIGN.md` (phase 1 design), `docs/CONTEXT.md` (glossary), `docs/TENSIONS.md` (settled rows S1–S55).

## Scope of this plan

This is plan 1 of 5 for phase 1. Each plan ends with working software.

| Plan | Delivers |
|---|---|
| **1. Walking skeleton (this plan)** | Resolution, driver, protocol, gate runner, report, `next.js` with prepare and code, `logic-review`, java-stack `build`, sample repo, one run on Claude Code |
| 2. Contracts | `orchestra check`, the JSON Schemas, `orchestra:init`, the authoring skills, `--dry-run` |
| 3. Full workflow | spec, plan, plan-check, guides, Decide handling for stages |
| 4. java-stack gates | The gate skills and fix guides, the `select` step for `when` rules |
| 5. Portability | Manifest generator, Codex catalog, the run on Codex |

Not in this plan: the `when` select step (a gate with only `when` is selected, and its own safety net decides), `orchestra check`, `orchestra:init`, spec and plan stages, JaCoCo coverage, Codex. Long tool commands are assumed to work in the harness shell.

## Global Constraints

- Node, standard library only (S11). No `package.json` dependencies.
- `SKILL.md` frontmatter has only `name` and `description` (S33).
- Skill text names actions ("dispatch a subagent", "invoke the X skill"), never tool names: no `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p` (S33).
- Each plugin has `plugin.json` and `.claude-plugin/plugin.json` with the same version (S33).
- Run folder: `docs/runs/<branch>/`. Task branches: `task/<slug>` (S22).
- The workflow never pushes and never opens a PR (S17).
- Phases: `implementation-check`, `conventions-check`, `finish` (S45).
- Phase order: implementation-check = build, tools, agents. conventions-check = tools, agents. finish = agents, tools, build. Workflow gates before stack gates, then the order of declaration (S45).
- Default `max_rounds` = 2 (S47).
- The changed-file list for selection excludes `docs/runs` and `.orchestra`.
- A project `.gitignore` has `.orchestra/*` and `!.orchestra/config.json`.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Run files leaking into the diff.** Files in `docs/runs/` and `.orchestra/` must never count as changed code, or every gate's `files` filter matches run state. Test in Task 4: `changedFiles` excludes both.
2. **A crash between a dispatch and its result.** If the subagent never writes its result, the next `drive.js` call must send the same dispatch again, not skip the step. Test in Task 4: two `step` calls with no result give equal dispatches.
3. **A Decide answer for another gate.** A `## other-gate` section in `decisions.md` must not restart `logic-review`. Test in Task 4.
4. **Odd task text.** Quotes, unicode, `>` and new lines in the task must give a safe branch name. Test in Task 5: `slugify`.
5. **A tool command that does not exist.** Exit code 127, or a spawn error with no status, counts as a failure, not a crash. Test in Task 4.

---

## File structure

```
.gitignore
package.json                                   test script only
.claude-plugin/marketplace.json                Claude Code catalog
test/helpers.js                                temp git repos with a bare origin
test/orchestra/{protocol,resolved,gates,git,runner,drive}.test.js
test/standard-workflow/next.test.js
test/packaging.test.js
plugins/orchestra/
  plugin.json, .claude-plugin/plugin.json
  lib/protocol.js      action names, validation, the dispatch prompt
  lib/resolved.js      resolution: config + plugin folders → .orchestra/resolved.json
  lib/gates.js         collect, select, order the gates of one phase
  lib/git.js           git calls, changed files, commits
  lib/runner.js        the gate runner: one phase, with checkpoint and fixer loop
  lib/report.js        report.md
  bin/resolve.js       CLI for resolution
  bin/drive.js         CLI for the driver: prints the next action for the model
  skills/run/SKILL.md
  skills/fixer/SKILL.md
plugins/standard-workflow/
  plugin.json, .claude-plugin/plugin.json, orchestra.json
  bin/next.js          prepare, stages, phase actions
  skills/{manifest,code,logic-review}/SKILL.md
plugins/java-stack/
  plugin.json, .claude-plugin/plugin.json, orchestra.json
  skills/{manifest,fix-build}/SKILL.md
```

Sample repo, outside this repo: `~/Projects-other/orchestra-sample-java` with a bare origin at `~/Projects-other/orchestra-sample-java.git`.

## Shared formats (used across tasks)

**Action** (one JSON line on stdout of `next.js` and `drive.js`):

```json
{ "action": "dispatch", "skill": "standard-workflow:code", "inputs": { "spec": "docs/runs/task/x/task.md" }, "result": "docs/runs/task/x/code.result.json", "runDir": "docs/runs/task/x", "prompt": "…" }
{ "action": "phase", "name": "implementation-check", "runDir": "docs/runs/task/x" }
{ "action": "done" | "decide" | "failed", "runDir": "…", "reason": "…", "questions": ["…"], "gate": "…", "report": "docs/runs/task/x/report.md" }
```

`next.js` never prints `prompt`; `drive.js` adds it. `phase` never reaches the model.

**`.orchestra/resolved.json`:**

```json
{ "orchestra": { "dir": "/abs/orchestra" },
  "slots": { "workflow": { "plugin": "standard-workflow", "version": "0.1.0", "dir": "/abs/standard-workflow", "declaration": { } },
             "stack-skills": { "plugin": "java-stack", "version": "0.1.0", "dir": "/abs/java-stack", "declaration": { } } } }
```

**`run.json`** (written by `next.js`): `{ "base": "<sha>", "branch": "task/x", "spec": "docs/runs/task/x/task.md" }`.

**Result file** (written by a subagent or the runner): `{ "stage": "…", "status": "ok|decide|failed|skipped|evaluate", "decide": [], "counts": {}, "files": [], "reason": "…" }`.

**File names in the run folder:** `code.result.json`, `phase-<phase>.result.json`, `<phase>.state.json`, `<phase>.<gate>.result.json`, `<phase>.<gate>.run<k>.log`, `<phase>.<gate>.fix<k>.result.json`, `decisions.md`, `report.md`.

---

### Task 0: Repo setup and plugin manifests

**Files:**
- Create: `.gitignore`, `package.json`, `.claude-plugin/marketplace.json`
- Create: `plugins/{orchestra,standard-workflow,java-stack}/plugin.json` and `.claude-plugin/plugin.json`
- Create: `plugins/standard-workflow/orchestra.json`, `plugins/java-stack/orchestra.json`

**Interfaces:**
- Produces: the plugin names `orchestra`, `standard-workflow`, `java-stack`, version `0.1.0`; the declarations that later tasks read.

- [ ] **Step 1: Initialise git**

```bash
cd ~/Projects-other/depitropov-plugins
git init -b main
```

- [ ] **Step 2: Write `.gitignore` and `package.json`**

`.gitignore`:

```
node_modules/
.DS_Store
```

`package.json`:

```json
{
  "name": "depitropov-plugins",
  "private": true,
  "scripts": {
    "test": "node --test \"test/**/*.test.js\""
  }
}
```

- [ ] **Step 3: Write the plugin manifests**

Write the same content to `plugins/orchestra/plugin.json` and `plugins/orchestra/.claude-plugin/plugin.json`:

```json
{
  "name": "orchestra",
  "version": "0.1.0",
  "description": "Runs one task through a configured workflow and its gates, on any harness."
}
```

Write the same content to `plugins/standard-workflow/plugin.json` and `plugins/standard-workflow/.claude-plugin/plugin.json`:

```json
{
  "name": "standard-workflow",
  "version": "0.1.0",
  "description": "A headless, stack-agnostic workflow: prepare, code, then the three gate phases."
}
```

Write the same content to `plugins/java-stack/plugin.json` and `plugins/java-stack/.claude-plugin/plugin.json`:

```json
{
  "name": "java-stack",
  "version": "0.1.0",
  "description": "Stack Skills for Java with Maven: the build, its gates and their fix guides."
}
```

- [ ] **Step 4: Write the declarations**

`plugins/standard-workflow/orchestra.json`:

```json
{
  "slot": "workflow",
  "params": [],
  "config": {},
  "gates": [
    { "name": "logic-review", "phase": "implementation-check", "kind": "agent", "skill": "logic-review", "always": true }
  ]
}
```

`plugins/java-stack/orchestra.json`:

```json
{
  "slot": "stack-skills",
  "params": [],
  "config": {},
  "build": { "run": "./mvnw -B verify", "guide": "fix-build", "max_rounds": 3 },
  "gates": []
}
```

- [ ] **Step 5: Write the catalog**

`.claude-plugin/marketplace.json`:

```json
{
  "name": "depitropov-plugins",
  "owner": { "name": "Dimitar Epitropov" },
  "plugins": [
    { "name": "orchestra", "source": "./plugins/orchestra", "description": "Runs one task through a configured workflow and its gates." },
    { "name": "standard-workflow", "source": "./plugins/standard-workflow", "description": "Headless, stack-agnostic workflow." },
    { "name": "java-stack", "source": "./plugins/java-stack", "description": "Stack Skills for Java with Maven." }
  ]
}
```

- [ ] **Step 6: Check that every JSON file parses**

Run: `find . -name '*.json' -not -path './node_modules/*' -exec node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" {} \; && echo OK`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: repo setup, plugin manifests and declarations" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Test helpers and the action protocol

**Files:**
- Create: `test/helpers.js`
- Create: `plugins/orchestra/lib/protocol.js`
- Test: `test/orchestra/protocol.test.js`

**Interfaces:**
- Produces: `makeRepo(): string` (path of a clone with `main` pushed to a bare origin and `origin/HEAD` set); `writeJson(file, data)`; `git(cwd, ...args): string`.
- Produces: `protocol.PHASES`, `protocol.TERMINAL`, `validateAction(action): action` (throws on error), `withPrompt(dispatchAction): action`.

- [ ] **Step 1: Write `test/helpers.js`**

```js
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-'));
  const origin = path.join(root, 'origin.git');
  const dir = path.join(root, 'work');
  git(root, 'init', '--bare', '-b', 'main', origin);
  git(root, 'clone', origin, dir);
  git(dir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.orchestra/*\n!.orchestra/config.json\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'sample\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'init');
  git(dir, 'push', '-u', 'origin', 'main');
  git(dir, 'remote', 'set-head', 'origin', 'main');
  return dir;
}

module.exports = { git, writeJson, makeRepo };
```

- [ ] **Step 2: Write the failing test**

`test/orchestra/protocol.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAction, withPrompt, PHASES } = require('../../plugins/orchestra/lib/protocol');

const dispatch = { action: 'dispatch', skill: 'wf:code', inputs: { spec: 'a/task.md' }, result: 'a/code.result.json', runDir: 'a' };

test('accepts the known actions', () => {
  assert.equal(validateAction(dispatch), dispatch);
  assert.ok(validateAction({ action: 'phase', name: 'finish', runDir: 'a' }));
  assert.ok(validateAction({ action: 'done', runDir: 'a' }));
  assert.deepEqual(PHASES, ['implementation-check', 'conventions-check', 'finish']);
});

test('rejects unknown actions, incomplete dispatches and unknown phases', () => {
  assert.throws(() => validateAction({ action: 'jump' }), /unknown action/);
  assert.throws(() => validateAction({ ...dispatch, result: undefined }), /dispatch needs result/);
  assert.throws(() => validateAction({ action: 'phase', name: 'lint', runDir: 'a' }), /unknown phase/);
  assert.throws(() => validateAction(null), /must be an object/);
});

test('withPrompt names the skill, every input and the result path', () => {
  const a = withPrompt(dispatch);
  assert.match(a.prompt, /Invoke the skill `wf:code`/);
  assert.match(a.prompt, /- spec: a\/task\.md/);
  assert.match(a.prompt, /`a\/code\.result\.json`/);
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/lib/protocol'`

- [ ] **Step 4: Write `plugins/orchestra/lib/protocol.js`**

```js
'use strict';

const PHASES = ['implementation-check', 'conventions-check', 'finish'];
const TERMINAL = ['done', 'decide', 'failed'];
const ACTIONS = ['dispatch', 'phase', ...TERMINAL];

function validateAction(a) {
  if (!a || typeof a !== 'object') throw new Error('An action must be an object.');
  if (!ACTIONS.includes(a.action)) throw new Error(`unknown action: ${a.action}`);
  if (a.action === 'dispatch') {
    for (const key of ['skill', 'result']) {
      if (typeof a[key] !== 'string') throw new Error(`dispatch needs ${key}`);
    }
    if (!a.inputs || typeof a.inputs !== 'object') throw new Error('dispatch needs inputs');
  }
  if (a.action === 'phase') {
    if (!PHASES.includes(a.name)) throw new Error(`unknown phase: ${a.name}`);
    if (typeof a.runDir !== 'string') throw new Error('phase needs runDir');
  }
  return a;
}

function withPrompt(a) {
  const prompt = [
    `Invoke the skill \`${a.skill}\` and follow it.`,
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill describes to \`${a.result}\`.`,
  ].join('\n');
  return { ...a, prompt };
}

module.exports = { PHASES, TERMINAL, ACTIONS, validateAction, withPrompt };
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npm test`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(orchestra): action protocol and test helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Resolution

**Files:**
- Create: `plugins/orchestra/lib/resolved.js`, `plugins/orchestra/bin/resolve.js`
- Test: `test/orchestra/resolved.test.js`

**Interfaces:**
- Consumes: `makeRepo`, `writeJson` (Task 1).
- Produces: `resolve(project, slotDirs, orchestraDir): resolved` (writes `.orchestra/resolved.json`; `slotDirs` is `{ <slot>: <plugin folder> }`); `load(project): resolved`; `readJson(file): object|null`.
- CLI: `node <orchestra>/bin/resolve.js <slot>=<folder> …`, run from the project root. Prints one line per slot. Exit 1 with the reason on stderr on failure.

- [ ] **Step 1: Write the failing test**

`test/orchestra/resolved.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson } = require('../helpers');
const { resolve, load } = require('../../plugins/orchestra/lib/resolved');

function plugin(name, declaration) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  writeJson(path.join(dir, 'plugin.json'), { name, version: '1.2.3' });
  writeJson(path.join(dir, 'orchestra.json'), declaration);
  return dir;
}

function project() {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } });
  return dir;
}

test('writes the declarations, folders and versions of every slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'workflow', gates: [] });
  const st = plugin('st', { slot: 'stack-skills', build: { run: 'make' } });
  resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc');
  const r = load(dir);
  assert.equal(r.orchestra.dir, '/orc');
  assert.equal(r.slots.workflow.dir, wf);
  assert.equal(r.slots['stack-skills'].version, '1.2.3');
  assert.equal(r.slots['stack-skills'].declaration.build.run, 'make');
});

test('fails when a folder holds another plugin than the config names', () => {
  const dir = project();
  const wf = plugin('other', { slot: 'workflow' });
  const st = plugin('st', { slot: 'stack-skills' });
  assert.throws(() => resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc'), /config names wf/);
});

test('fails when a plugin declares another slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'stack-skills' });
  const st = plugin('st', { slot: 'stack-skills' });
  assert.throws(() => resolve(dir, { workflow: wf, 'stack-skills': st }, '/orc'), /declares slot stack-skills/);
});

test('fails when a slot of the config has no folder, or a folder has no slot', () => {
  const dir = project();
  const wf = plugin('wf', { slot: 'workflow' });
  const st = plugin('st', { slot: 'stack-skills' });
  assert.throws(() => resolve(dir, { workflow: wf }, '/orc'), /no plugin folder/);
  assert.throws(() => resolve(dir, { workflow: wf, 'stack-skills': st, curator: st }, '/orc'), /not in the config/);
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/lib/resolved'`

- [ ] **Step 3: Write `plugins/orchestra/lib/resolved.js`**

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join('.orchestra', 'resolved.json');

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function pluginInfo(dir) {
  for (const manifest of ['plugin.json', path.join('.claude-plugin', 'plugin.json')]) {
    const info = readJson(path.join(dir, manifest));
    if (info) return { name: info.name, version: info.version };
  }
  throw new Error(`No plugin.json in ${dir}.`);
}

function resolve(project, slotDirs, orchestraDir) {
  const config = readJson(path.join(project, '.orchestra', 'config.json'));
  if (!config) throw new Error('No .orchestra/config.json. Run orchestra init first.');
  for (const slot of Object.keys(slotDirs)) {
    if (!config[slot]) throw new Error(`Slot ${slot} is not in the config.`);
  }
  const slots = {};
  for (const [slot, section] of Object.entries(config)) {
    const dir = slotDirs[slot];
    if (!dir) throw new Error(`Slot ${slot}: no plugin folder given.`);
    const info = pluginInfo(dir);
    if (info.name !== section.plugin) {
      throw new Error(`Slot ${slot}: the config names ${section.plugin}, but ${dir} holds ${info.name}.`);
    }
    const declaration = readJson(path.join(dir, 'orchestra.json'));
    if (!declaration) throw new Error(`Slot ${slot}: ${info.name} has no orchestra.json.`);
    if (declaration.slot !== slot) {
      throw new Error(`Slot ${slot}: ${info.name} declares slot ${declaration.slot}.`);
    }
    slots[slot] = { plugin: info.name, version: info.version, dir: path.resolve(dir), declaration };
  }
  const resolved = { orchestra: { dir: path.resolve(orchestraDir) }, slots };
  fs.writeFileSync(path.join(project, FILE), JSON.stringify(resolved, null, 2) + '\n');
  return resolved;
}

function load(project) {
  const resolved = readJson(path.join(project, FILE));
  if (!resolved) throw new Error('No .orchestra/resolved.json. orchestra run resolves the slots first.');
  return resolved;
}

module.exports = { FILE, readJson, resolve, load };
```

- [ ] **Step 4: Write `plugins/orchestra/bin/resolve.js`**

```js
#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { resolve } = require('../lib/resolved');

const slotDirs = {};
for (const pair of process.argv.slice(2)) {
  const i = pair.indexOf('=');
  if (i < 1) {
    console.error(`Expected <slot>=<folder>, got "${pair}".`);
    process.exit(1);
  }
  slotDirs[pair.slice(0, i)] = pair.slice(i + 1);
}

try {
  const resolved = resolve(process.cwd(), slotDirs, path.join(__dirname, '..'));
  for (const [slot, s] of Object.entries(resolved.slots)) console.log(`${slot}: ${s.plugin} ${s.version} (${s.dir})`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(orchestra): resolve slots into .orchestra/resolved.json" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Gates: collect, select, order

**Files:**
- Create: `plugins/orchestra/lib/gates.js`
- Test: `test/orchestra/gates.test.js`

**Interfaces:**
- Consumes: the `resolved` shape (Task 2) and the project config object.
- Produces:
  - `globToRegExp(glob): RegExp`
  - `collect(resolved, config, phase): Gate[]`. A Gate is the declared gate plus `provider` (`workflow`|`stack-skills`), `plugin`, `fix` (default `self` for agents, `none` for tools), `max_rounds` (project override, then declared, then 2), and `run` and `grep` with `{plugin}` and `{config.<key>}` expanded.
  - `select(gates, changedFiles, readFile): { name, selected, why }[]`
  - `buildStep(resolved): Gate` (`name: 'build'`, `kind: 'tool'`, `build: true`, `fix: 'fixer'`)
  - `plan(phase, gates, build): Gate[]`

- [ ] **Step 1: Write the failing test**

`test/orchestra/gates.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/lib/gates'`

- [ ] **Step 3: Write `plugins/orchestra/lib/gates.js`**

```js
'use strict';

const PHASE_ORDER = {
  'implementation-check': ['build', 'tool', 'agent'],
  'conventions-check': ['tool', 'agent'],
  finish: ['agent', 'tool', 'build'],
};
const PROVIDERS = ['workflow', 'stack-skills'];

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') {
        i++;
        re += '(?:.*/)?';
      } else {
        re += '.*';
      }
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function slotValues(declaration, section) {
  const values = {};
  for (const [key, spec] of Object.entries(declaration.config || {})) {
    values[key] = section[key] !== undefined ? section[key] : spec.default;
  }
  return values;
}

function expand(text, dir, values) {
  return text.replace(/\{plugin\}/g, dir).replace(/\{config\.([\w-]+)\}/g, (match, key) => {
    if (values[key] === undefined) throw new Error(`Unknown config key "${key}" in "${text}".`);
    return String(values[key]);
  });
}

function collect(resolved, config, phase) {
  const gates = [];
  for (const provider of PROVIDERS) {
    const slot = resolved.slots[provider];
    if (!slot) continue;
    const section = config[provider] || {};
    const disabled = section.disable || [];
    const overrides = section.gates || {};
    const values = slotValues(slot.declaration, section);
    for (const g of slot.declaration.gates || []) {
      if (g.phase !== phase || disabled.includes(g.name)) continue;
      const fix = g.fix || (g.kind === 'agent' ? 'self' : 'none');
      if (fix === 'fixer' && !g.guide) {
        throw new Error(`Gate "${g.name}" in ${slot.plugin} uses the fixer but names no guide.`);
      }
      gates.push({
        ...g,
        provider,
        plugin: slot.plugin,
        fix,
        run: g.run && expand(g.run, slot.dir, values),
        grep: g.grep && expand(g.grep, slot.dir, values),
        max_rounds: (overrides[g.name] || {}).max_rounds ?? g.max_rounds ?? 2,
      });
    }
  }
  return gates;
}

function select(gates, changed, readFile) {
  return gates.map(g => {
    if (g.always) return { name: g.name, selected: true, why: 'always' };
    if (!g.files && !g.grep && !g.when) return { name: g.name, selected: false, why: 'no selection rule' };
    let files = changed;
    if (g.files) {
      const re = globToRegExp(g.files);
      files = files.filter(f => re.test(f));
      if (!files.length) return { name: g.name, selected: false, why: `no changed file matches ${g.files}` };
    }
    if (g.grep) {
      const re = new RegExp(g.grep);
      const hit = files.some(f => {
        const text = readFile(f);
        return text !== null && re.test(text);
      });
      if (!hit) return { name: g.name, selected: false, why: `no changed file contains ${g.grep}` };
    }
    // ponytail: a `when` rule is not judged yet; the select step comes in plan 4.
    return { name: g.name, selected: true, why: g.when ? 'when rule not judged yet' : 'matched' };
  });
}

function buildStep(resolved) {
  const stack = resolved.slots['stack-skills'];
  const build = stack && stack.declaration.build;
  if (!build) throw new Error('The stack-skills plugin declares no build.');
  return {
    name: 'build',
    kind: 'tool',
    build: true,
    run: build.run.replace(/\{plugin\}/g, stack.dir),
    fix: 'fixer',
    guide: build.guide,
    max_rounds: build.max_rounds ?? 2,
    plugin: stack.plugin,
  };
}

function plan(phase, gates, build) {
  const order = PHASE_ORDER[phase];
  if (!order) throw new Error(`Unknown phase "${phase}".`);
  return order.flatMap(kind => (kind === 'build' ? [build] : gates.filter(g => g.kind === kind)));
}

module.exports = { PHASE_ORDER, globToRegExp, collect, select, buildStep, plan };
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npm test`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(orchestra): collect, select and order the gates of a phase" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Git helpers and the gate runner

**Files:**
- Create: `plugins/orchestra/lib/git.js`, `plugins/orchestra/lib/runner.js`
- Test: `test/orchestra/git.test.js`, `test/orchestra/runner.test.js`

**Interfaces:**
- Consumes: `collect`, `select`, `buildStep`, `plan` (Task 3); `resolve`, `readJson` (Task 2); `makeRepo`, `writeJson`, `git` (Task 1).
- Produces:
  - `git.git(cwd, ...args): string`, `changedFiles(cwd, base): string[]`, `commitAll(cwd, message): boolean` (all except `docs/runs` and `.orchestra`), `commitRunDir(cwd, runDir, message): boolean`.
  - `runner.step({ project, runDir, phase, resolved, config })`. It returns a dispatch action (`{ action: 'dispatch', skill, inputs, result, runDir }`), or `{ status: 'ok', skipped }`, or `{ status: 'decide', gate, questions }`, or `{ status: 'failed', reason }`.
  - Fixer dispatch: `skill: 'orchestra:fixer'`, inputs `output`, `guide` (`<plugin>:<guide>`), `gate`, `spec`, `base`.
  - Agent dispatch: `skill: '<plugin>:<skill>'`, inputs `spec`, `base`, `runDir`, and `decisions` when answers exist.

- [ ] **Step 1: Write the failing git test**

`test/orchestra/git.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { changedFiles, commitAll, commitRunDir } = require('../../plugins/orchestra/lib/git');

test('changedFiles excludes run files and .orchestra', () => {
  const dir = makeRepo();
  const base = git(dir, 'rev-parse', 'HEAD');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/A.java'), 'class A {}\n');
  writeJson(path.join(dir, 'docs/runs/task/t/run.json'), { base });
  writeJson(path.join(dir, '.orchestra/config.json'), {});
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'all');
  assert.deepEqual(changedFiles(dir, base), ['src/A.java']);
});

test('commitAll leaves run files out; commitRunDir commits only them', () => {
  const dir = makeRepo();
  fs.writeFileSync(path.join(dir, 'A.java'), 'class A {}\n');
  writeJson(path.join(dir, 'docs/runs/task/t/x.json'), {});
  assert.equal(commitAll(dir, 'code'), true);
  assert.equal(git(dir, 'show', '--name-only', '--format=', 'HEAD'), 'A.java');
  assert.equal(commitRunDir(dir, 'docs/runs/task/t', 'state'), true);
  assert.equal(git(dir, 'show', '--name-only', '--format=', 'HEAD'), 'docs/runs/task/t/x.json');
  assert.equal(commitAll(dir, 'nothing'), false);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/lib/git'`

- [ ] **Step 3: Write `plugins/orchestra/lib/git.js`**

```js
'use strict';
const { execFileSync } = require('node:child_process');

const EXCLUDE = [':(exclude)docs/runs', ':(exclude).orchestra'];

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function changedFiles(cwd, base) {
  const out = git(cwd, 'diff', '--name-only', base, 'HEAD', '--', '.', ...EXCLUDE);
  return out ? out.split('\n') : [];
}

function commitPaths(cwd, message, paths) {
  git(cwd, 'add', '-A', '--', ...paths);
  if (!git(cwd, 'diff', '--cached', '--name-only')) return false;
  git(cwd, 'commit', '-m', message);
  return true;
}

const commitAll = (cwd, message) => commitPaths(cwd, message, ['.', ...EXCLUDE]);
const commitRunDir = (cwd, runDir, message) => commitPaths(cwd, message, [runDir]);

module.exports = { git, changedFiles, commitAll, commitRunDir };
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test`
Expected: PASS, 16 tests.

- [ ] **Step 5: Write the failing runner test**

`test/orchestra/runner.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { resolve } = require('../../plugins/orchestra/lib/resolved');
const runner = require('../../plugins/orchestra/lib/runner');

const ORCHESTRA = path.join(__dirname, '../../plugins/orchestra');
const OK = 'node -e "process.exit(0)"';

function setup({ build = OK, maxRounds = 1, stackGates = [], workflowGates = [] } = {}) {
  const dir = makeRepo();
  const plugins = fs.mkdtempSync(path.join(os.tmpdir(), 'plugins-'));
  const mk = (name, declaration) => {
    const d = path.join(plugins, name);
    writeJson(path.join(d, 'plugin.json'), { name, version: '0.0.1' });
    writeJson(path.join(d, 'orchestra.json'), declaration);
    return d;
  };
  const wf = mk('wf', { slot: 'workflow', gates: workflowGates });
  const st = mk('st', { slot: 'stack-skills', build: { run: build, guide: 'fix-build', max_rounds: maxRounds }, gates: stackGates });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } };
  writeJson(path.join(dir, '.orchestra/config.json'), config);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  const resolved = resolve(dir, { workflow: wf, 'stack-skills': st }, ORCHESTRA);
  const base = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'checkout', '-b', 'task/t');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/Car.java'), '@Entity class Car {}\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'code');
  const runDir = 'docs/runs/task/t';
  writeJson(path.join(dir, runDir, 'run.json'), { base, branch: 'task/t', spec: `${runDir}/task.md` });
  return {
    dir,
    runDir,
    step: phase => runner.step({ project: dir, runDir, phase, resolved, config }),
    write: (rel, data) => writeJson(path.join(dir, rel), data),
    read: rel => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')),
  };
}

const logicReview = { name: 'logic-review', phase: 'implementation-check', kind: 'agent', skill: 'logic-review', always: true };

test('implementation-check runs the build, then dispatches the agent gate', () => {
  const t = setup({ workflowGates: [logicReview] });
  const a = t.step('implementation-check');
  assert.equal(a.action, 'dispatch');
  assert.equal(a.skill, 'wf:logic-review');
  assert.equal(a.result, `${t.runDir}/implementation-check.logic-review.result.json`);
  assert.equal(a.inputs.spec, `${t.runDir}/task.md`);
  assert.equal(a.inputs.decisions, undefined);
  assert.equal(t.read(`${t.runDir}/implementation-check.build.result.json`).status, 'ok');
  t.write(a.result, { stage: 'logic-review', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
});

test('a dispatch with no result is sent again on the next step', () => {
  const t = setup({ workflowGates: [logicReview] });
  assert.deepEqual(t.step('implementation-check'), t.step('implementation-check'));
});

test('a red build dispatches the fixer, and a fixed build lets the phase go on', () => {
  const t = setup({ build: `node -e "process.exit(require('fs').existsSync('fixed') ? 0 : 1)"` });
  const a = t.step('implementation-check');
  assert.equal(a.skill, 'orchestra:fixer');
  assert.equal(a.inputs.guide, 'st:fix-build');
  assert.equal(a.inputs.output, `${t.runDir}/implementation-check.build.run0.log`);
  assert.equal(a.result, `${t.runDir}/implementation-check.build.fix1.result.json`);
  assert.deepEqual(t.step('implementation-check'), a);
  fs.writeFileSync(path.join(t.dir, 'fixed'), '');
  t.write(a.result, { stage: 'fixer', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
});

test('a build still red after max_rounds fails the phase', () => {
  const t = setup({ build: 'node -e "process.exit(1)"', maxRounds: 1 });
  const a = t.step('implementation-check');
  t.write(a.result, { stage: 'fixer', status: 'ok' });
  const r = t.step('implementation-check');
  assert.equal(r.status, 'failed');
  assert.match(r.reason, /build still fails after 1 fix round/);
});

test('a tool gate still red after max_rounds goes to Evaluate and the phase goes on', () => {
  const crap = { name: 'crap', phase: 'implementation-check', kind: 'tool', run: 'node -e "process.exit(2)"', fix: 'fixer', guide: 'fix-crap', max_rounds: 1, files: '**/*.java' };
  const t = setup({ stackGates: [crap] });
  const a = t.step('implementation-check');
  assert.equal(a.inputs.guide, 'st:fix-crap');
  t.write(a.result, { stage: 'fixer', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
  assert.equal(t.read(`${t.runDir}/implementation-check.crap.result.json`).status, 'evaluate');
});

test('a missing command counts as a failure, not a crash', () => {
  const lint = { name: 'lint', phase: 'conventions-check', kind: 'tool', run: 'definitely-not-a-command-xyz', files: '**/*.java' };
  const t = setup({ stackGates: [lint] });
  assert.equal(t.step('conventions-check').status, 'ok');
  assert.equal(t.read(`${t.runDir}/conventions-check.lint.result.json`).status, 'evaluate');
});

test('selection skips gates that do not match and records why', () => {
  const gate = (name, rule) => ({ name, phase: 'conventions-check', kind: 'agent', skill: `review-${name}`, ...rule });
  const t = setup({ stackGates: [gate('entities', { files: '**/*.java', grep: '@Entity' }), gate('dtos', { grep: '@Dto' }), gate('sql', { files: '**/*.sql' })] });
  const a = t.step('conventions-check');
  assert.equal(a.skill, 'st:review-entities');
  const state = t.read(`${t.runDir}/conventions-check.state.json`);
  assert.deepEqual(state.skipped.map(s => s.name), ['dtos', 'sql']);
});

test('finish runs the agent gates before the final build', () => {
  const comments = { name: 'comments', phase: 'finish', kind: 'agent', skill: 'review-comments', always: true };
  const t = setup({ build: `node -e "require('fs').writeFileSync('built', '')"`, stackGates: [comments] });
  const a = t.step('finish');
  assert.equal(a.skill, 'st:review-comments');
  assert.equal(fs.existsSync(path.join(t.dir, 'built')), false);
  t.write(a.result, { stage: 'comments', status: 'ok' });
  assert.equal(t.step('finish').status, 'ok');
  assert.equal(fs.existsSync(path.join(t.dir, 'built')), true);
});

test('a self-fixing tool commits its changes', () => {
  const spotless = { name: 'spotless', phase: 'finish', kind: 'tool', run: `node -e "require('fs').appendFileSync('src/Car.java', '// formatted')"`, fix: 'self', always: true };
  const t = setup({ stackGates: [spotless] });
  assert.equal(t.step('finish').status, 'ok');
  assert.equal(git(t.dir, 'log', '-1', '--format=%s'), 'orchestra: spotless (finish)');
});

test('a Decide stops the phase until decisions.md answers that gate', () => {
  const t = setup({ workflowGates: [logicReview] });
  const a = t.step('implementation-check');
  t.write(a.result, { stage: 'logic-review', status: 'decide', decide: ['Round half up or half even? — options: up | even'] });
  assert.deepEqual(t.step('implementation-check'), { status: 'decide', gate: 'logic-review', questions: ['Round half up or half even? — options: up | even'] });
  const decisions = path.join(t.dir, t.runDir, 'decisions.md');
  fs.writeFileSync(decisions, '## other-gate\nup\n');
  assert.equal(t.step('implementation-check').status, 'decide');
  fs.appendFileSync(decisions, '## logic-review\nup\n');
  const again = t.step('implementation-check');
  assert.equal(again.action, 'dispatch');
  assert.equal(again.inputs.decisions, `${t.runDir}/decisions.md`);
  t.write(again.result, { stage: 'logic-review', status: 'ok' });
  assert.equal(t.step('implementation-check').status, 'ok');
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/lib/runner'`

- [ ] **Step 7: Write `plugins/orchestra/lib/runner.js`**

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readJson } = require('./resolved');
const { changedFiles, commitAll } = require('./git');
const { collect, select, buildStep, plan } = require('./gates');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function runCommand(command, cwd, logFile) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  fs.writeFileSync(logFile, `$ ${command}\n${r.stdout || ''}${r.stderr || ''}${r.error ? String(r.error) : ''}`);
  return r.status === null ? 1 : r.status;
}

function countAnswers(runDirAbs, name) {
  const file = path.join(runDirAbs, 'decisions.md');
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(line => line.trim() === `## ${name}`).length;
}

function loadState(ctx) {
  const file = path.join(ctx.abs, `${ctx.phase}.state.json`);
  let state = readJson(file);
  if (!state) {
    const gates = collect(ctx.resolved, ctx.config, ctx.phase);
    const readFile = rel => {
      const p = path.join(ctx.project, rel);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    };
    const verdicts = select(gates, changedFiles(ctx.project, ctx.run.base), readFile);
    const chosen = gates.filter((g, i) => verdicts[i].selected);
    state = { steps: plan(ctx.phase, chosen, buildStep(ctx.resolved)), skipped: verdicts.filter(v => !v.selected), rounds: {}, seen: {} };
    writeJson(file, state);
  }
  return { state, save: () => writeJson(file, state) };
}

function fixerDispatch(s, ctx, round) {
  return {
    action: 'dispatch',
    skill: 'orchestra:fixer',
    runDir: ctx.runDir,
    result: `${ctx.runDir}/${ctx.phase}.${s.name}.fix${round}.result.json`,
    inputs: {
      output: `${ctx.runDir}/${ctx.phase}.${s.name}.run${round - 1}.log`,
      guide: `${s.plugin}:${s.guide}`,
      gate: s.name,
      spec: ctx.run.spec,
      base: ctx.run.base,
    },
  };
}

function toolStep(s, ctx, state, save) {
  const resultFile = path.join(ctx.abs, `${ctx.phase}.${s.name}.result.json`);
  const done = readJson(resultFile);
  if (done) return done.status === 'failed' ? { status: 'failed', reason: done.reason } : null;
  const rounds = state.rounds[s.name] || 0;
  if (rounds > 0 && !fs.existsSync(path.join(ctx.abs, `${ctx.phase}.${s.name}.fix${rounds}.result.json`))) {
    return fixerDispatch(s, ctx, rounds);
  }
  const logRel = `${ctx.runDir}/${ctx.phase}.${s.name}.run${rounds}.log`;
  const code = runCommand(s.run, ctx.project, path.join(ctx.project, logRel));
  if (code === 0) {
    if (s.fix === 'self') commitAll(ctx.project, `orchestra: ${s.name} (${ctx.phase})`);
    writeJson(resultFile, { stage: `${ctx.phase}.${s.name}`, status: 'ok', log: logRel, rounds });
    return null;
  }
  if (s.fix === 'fixer' && rounds < s.max_rounds) {
    state.rounds[s.name] = rounds + 1;
    save();
    return fixerDispatch(s, ctx, rounds + 1);
  }
  const reason = `${s.name} still fails after ${rounds} fix round(s). See ${logRel}.`;
  const status = s.build ? 'failed' : 'evaluate';
  writeJson(resultFile, { stage: `${ctx.phase}.${s.name}`, status, log: logRel, rounds, reason });
  return status === 'failed' ? { status: 'failed', reason } : null;
}

function agentStep(s, ctx, state, save) {
  const resultRel = `${ctx.runDir}/${ctx.phase}.${s.name}.result.json`;
  const resultFile = path.join(ctx.project, resultRel);
  const res = readJson(resultFile);
  const answers = countAnswers(ctx.abs, s.name);
  const send = () => {
    state.seen[s.name] = answers;
    save();
    const inputs = { spec: ctx.run.spec, base: ctx.run.base, runDir: ctx.runDir };
    if (answers > 0) inputs.decisions = `${ctx.runDir}/decisions.md`;
    return { action: 'dispatch', skill: `${s.plugin}:${s.skill}`, inputs, result: resultRel, runDir: ctx.runDir };
  };
  if (!res) return send();
  if (res.status === 'decide') {
    if (answers > (state.seen[s.name] || 0)) {
      fs.rmSync(resultFile);
      return send();
    }
    return { status: 'decide', gate: s.name, questions: res.decide || [] };
  }
  if (res.status === 'failed') return { status: 'failed', reason: `${s.name} failed. See ${resultRel}.` };
  return null;
}

function step({ project, runDir, phase, resolved, config }) {
  const abs = path.join(project, runDir);
  const run = readJson(path.join(abs, 'run.json'));
  if (!run) throw new Error(`No run.json in ${runDir}.`);
  const ctx = { project, runDir, abs, phase, resolved, config, run };
  const { state, save } = loadState(ctx);
  for (const s of state.steps) {
    const r = s.kind === 'agent' ? agentStep(s, ctx, state, save) : toolStep(s, ctx, state, save);
    if (r) return r;
  }
  return { status: 'ok', skipped: state.skipped };
}

module.exports = { step };
```

- [ ] **Step 8: Run all tests to see them pass**

Run: `npm test`
Expected: PASS, 26 tests.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(orchestra): gate runner with checkpoints, fixer loop and Decide stop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `next.js` of standard-workflow

**Files:**
- Create: `plugins/standard-workflow/bin/next.js`
- Test: `test/standard-workflow/next.test.js`

**Interfaces:**
- Consumes: `.orchestra/resolved.json` (for the stack build command and the code guide) and `.orchestra/config.json` (for `disable`).
- Produces: `next(project, taskFile?): action` and `slugify(text): string`. CLI: `node next.js [--project <dir>] [--task-file <path>]` prints one action JSON line and always exits 0.
- Writes: `docs/runs/<branch>/task.md` and `run.json` (`{ base, branch, spec }`).
- Stage order: `code` (dispatch `standard-workflow:code`), then the phases `implementation-check`, `conventions-check`, `finish`. A phase is done when `phase-<name>.result.json` has `status: ok`.

- [ ] **Step 1: Write the failing test**

`test/standard-workflow/next.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { next, slugify } = require('../../plugins/standard-workflow/bin/next');

function project({ guides, disable } = {}) {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'standard-workflow' }, 'stack-skills': { plugin: 'st', ...(disable ? { disable } : {}) } });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  writeJson(path.join(dir, '.orchestra/resolved.json'), {
    orchestra: { dir: '/orc' },
    slots: { 'stack-skills': { plugin: 'st', dir: '/p/st', declaration: { build: { run: '{plugin}/mvnw -B verify' }, ...(guides ? { guides } : {}) } } },
  });
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n\nOrders over 100 get 10%.\n');
  return dir;
}

test('slugify makes a safe branch name from any task text', () => {
  assert.equal(slugify('Add “discount” > 100!\nmore'), 'add-discount-100');
  assert.equal(slugify('!!!'), 'task');
  assert.equal(slugify('\n\n  Fix it  '), 'fix-it');
  const long = slugify('a'.repeat(30) + ' ' + 'b'.repeat(30));
  assert.ok(long.length <= 40 && !long.endsWith('-'));
});

test('a dirty tree stops the run before any branch is made', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'dirty.txt'), 'x');
  const a = next(dir, '.orchestra/task.txt');
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /dirty/);
  assert.equal(git(dir, 'branch', '--show-current'), 'main');
});

test('prepare makes the task branch and the run folder, then dispatches code', () => {
  const dir = project();
  const base = git(dir, 'rev-parse', 'HEAD');
  const a = next(dir, '.orchestra/task.txt');
  const runDir = 'docs/runs/task/add-a-discount';
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, runDir, 'run.json'), 'utf8')), { base, branch: 'task/add-a-discount', spec: `${runDir}/task.md` });
  assert.match(fs.readFileSync(path.join(dir, runDir, 'task.md'), 'utf8'), /Orders over 100/);
  assert.deepEqual(a, {
    action: 'dispatch',
    skill: 'standard-workflow:code',
    inputs: { spec: `${runDir}/task.md`, base, build: '/p/st/mvnw -B verify' },
    result: `${runDir}/code.result.json`,
    runDir,
  });
});

test('a second run of the same task gets its own branch', () => {
  const dir = project();
  next(dir, '.orchestra/task.txt');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'run files');
  git(dir, 'checkout', 'main');
  next(dir, '.orchestra/task.txt');
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount-2');
});

test('after code, the three phases follow in order, then done', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'code', status: 'ok' });
  for (const phase of ['implementation-check', 'conventions-check', 'finish']) {
    assert.deepEqual(next(dir), { action: 'phase', name: phase, runDir: a.runDir });
    writeJson(path.join(dir, a.runDir, `phase-${phase}.result.json`), { stage: `phase-${phase}`, status: 'ok' });
  }
  assert.deepEqual(next(dir), { action: 'done', runDir: a.runDir });
});

test('a failed code stage fails the run', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'code', status: 'failed' });
  assert.equal(next(dir).action, 'failed');
});

test('the code guide is passed when declared and not disabled', () => {
  assert.equal(next(project({ guides: { code: 'code-guide' } }), '.orchestra/task.txt').inputs.guide, 'st:code-guide');
  assert.equal(next(project({ guides: { code: 'code-guide' }, disable: ['code-guide'] }), '.orchestra/task.txt').inputs.guide, undefined);
});

test('no task on a branch without a run fails with a hint', () => {
  const a = next(project());
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /No run on branch "main"/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/standard-workflow/bin/next'`

- [ ] **Step 3: Write `plugins/standard-workflow/bin/next.js`**

```js
#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const STAGES = [
  { name: 'code', kind: 'dispatch' },
  { name: 'implementation-check', kind: 'phase' },
  { name: 'conventions-check', kind: 'phase' },
  { name: 'finish', kind: 'phase' },
];

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function slugify(text) {
  const firstLine = text.split('\n').find(line => line.trim()) || '';
  return firstLine.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 40).replace(/-+$/, '') || 'task';
}

function branchExists(cwd, branch) {
  try {
    git(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

function prepare(project, taskText) {
  if (git(project, 'status', '--porcelain')) {
    return { action: 'failed', reason: 'The working tree is dirty. Commit or stash your changes, then run again.' };
  }
  const defaultBranch = git(project, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
  git(project, 'checkout', defaultBranch);
  git(project, 'pull', '--rebase');
  const base = git(project, 'rev-parse', 'HEAD');
  const slug = slugify(taskText);
  let branch = `task/${slug}`;
  for (let n = 2; branchExists(project, branch); n++) branch = `task/${slug}-${n}`;
  git(project, 'checkout', '-b', branch);
  const runDir = `docs/runs/${branch}`;
  fs.mkdirSync(path.join(project, runDir), { recursive: true });
  fs.writeFileSync(path.join(project, runDir, 'task.md'), taskText.endsWith('\n') ? taskText : `${taskText}\n`);
  const run = { base, branch, spec: `${runDir}/task.md` };
  fs.writeFileSync(path.join(project, runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  return null;
}

function codeInputs(project, run) {
  const resolved = readJson(path.join(project, '.orchestra', 'resolved.json'));
  const config = readJson(path.join(project, '.orchestra', 'config.json')) || {};
  const stack = resolved && resolved.slots['stack-skills'];
  if (!stack) throw new Error('No resolved stack-skills slot. orchestra run resolves the slots first.');
  const inputs = { spec: run.spec, base: run.base, build: stack.declaration.build.run.replace(/\{plugin\}/g, stack.dir) };
  const guide = (stack.declaration.guides || {}).code;
  const disabled = (config['stack-skills'] || {}).disable || [];
  if (guide && !disabled.includes(guide)) inputs.guide = `${stack.plugin}:${guide}`;
  return inputs;
}

function next(project, taskFile) {
  if (taskFile !== undefined) {
    const failed = prepare(project, fs.readFileSync(path.resolve(project, taskFile), 'utf8'));
    if (failed) return failed;
  }
  const branch = git(project, 'branch', '--show-current');
  const runDir = `docs/runs/${branch}`;
  const run = branch.startsWith('task/') ? readJson(path.join(project, runDir, 'run.json')) : null;
  if (!run) return { action: 'failed', reason: `No run on branch "${branch}". Start a run with a task.` };
  for (const s of STAGES) {
    if (s.kind === 'phase') {
      const res = readJson(path.join(project, runDir, `phase-${s.name}.result.json`));
      if (res && res.status === 'ok') continue;
      return { action: 'phase', name: s.name, runDir };
    }
    const result = `${runDir}/${s.name}.result.json`;
    const res = readJson(path.join(project, result));
    if (!res) return { action: 'dispatch', skill: `standard-workflow:${s.name}`, inputs: codeInputs(project, run), result, runDir };
    if (res.status === 'failed') return { action: 'failed', reason: `Stage ${s.name} failed. See ${result}.`, runDir };
  }
  return { action: 'done', runDir };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    console.log(JSON.stringify(next(opt('--project') || process.cwd(), opt('--task-file'))));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
  }
}

module.exports = { next, slugify };
```

- [ ] **Step 4: Run all tests to see them pass**

Run: `npm test`
Expected: PASS, 34 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(standard-workflow): next.js with prepare, code and the three phases" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The report and the driver CLI

**Files:**
- Create: `plugins/orchestra/lib/report.js`, `plugins/orchestra/bin/drive.js`
- Test: `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: `validateAction`, `withPrompt` (Task 1); `load` (Task 2); `runner.step` (Task 4); `git`, `commitRunDir` (Task 4); the workflow's `bin/next.js` (Task 5), called as a child process.
- Produces:
  - `writeReport(project, runDir, final, resolved): string` (the path of `report.md`).
  - `drive(project, extraArgs): action`. CLI: `node <orchestra>/bin/drive.js [--task-file <path>]`, run from the project root. It prints one action JSON line.
  - Behaviour: it loops over `next.js`. On `phase` it runs the gate runner and writes `phase-<name>.result.json`. It returns the first dispatch (with `prompt`), or a terminal action. A terminal action with a `runDir` also writes `report.md`, commits the run folder as `orchestra: run state (<status>)`, and adds `report` to the action.

- [ ] **Step 1: Write the failing test**

`test/orchestra/drive.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const { resolve } = require('../../plugins/orchestra/lib/resolved');
const { drive } = require('../../plugins/orchestra/bin/drive');

const PLUGINS = path.join(__dirname, '../../plugins');

function project() {
  const dir = makeRepo();
  const st = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  writeJson(path.join(st, 'plugin.json'), { name: 'st', version: '0.0.1' });
  writeJson(path.join(st, 'orchestra.json'), { slot: 'stack-skills', build: { run: 'node -e "process.exit(0)"', guide: 'fix-build' }, gates: [] });
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'standard-workflow' }, 'stack-skills': { plugin: 'st' } });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  resolve(dir, { workflow: path.join(PLUGINS, 'standard-workflow'), 'stack-skills': st }, path.join(PLUGINS, 'orchestra'));
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n');
  return dir;
}

test('a run goes from task to done: code, logic-review, report, committed run files', () => {
  const dir = project();
  const code = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(code.skill, 'standard-workflow:code');
  assert.match(code.prompt, /Invoke the skill `standard-workflow:code`/);
  fs.writeFileSync(path.join(dir, 'Discount.java'), 'class Discount {}\n');
  git(dir, 'add', 'Discount.java');
  git(dir, 'commit', '-m', 'feat: discount');
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });

  const review = drive(dir);
  assert.equal(review.skill, 'standard-workflow:logic-review');
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok', counts: { patch: 1 } });

  const done = drive(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.report, `${done.runDir}/report.md`);
  const report = fs.readFileSync(path.join(dir, done.report), 'utf8');
  assert.match(report, /- Status: done/);
  assert.match(report, /feat: discount/);
  assert.match(report, /standard-workflow 0\.1\.0/);
  assert.match(report, /\| implementation-check\.logic-review \| ok \| patch 1 \|/);
  assert.equal(git(dir, 'log', '-1', '--format=%s'), 'orchestra: run state (done)');
  assert.equal(git(dir, 'status', '--porcelain'), '');
});

test('a Decide ends the call with the questions and a report that says how to answer', () => {
  const dir = project();
  const code = drive(dir, ['--task-file', '.orchestra/task.txt']);
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'decide', decide: ['Half up or half even? — options: up | even'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.deepEqual(stop.questions, ['Half up or half even? — options: up | even']);
  assert.match(fs.readFileSync(path.join(dir, stop.report), 'utf8'), /under the heading `## logic-review`/);
});

test('drive throws when resolved.json is missing; the CLI prints that as failed', () => {
  const dir = makeRepo();
  assert.throws(() => drive(dir), /No \.orchestra\/resolved\.json/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../../plugins/orchestra/bin/drive'`

- [ ] **Step 3: Write `plugins/orchestra/lib/report.js`**

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { git } = require('./git');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function counts(r) {
  return r.counts ? Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ') : '';
}

function writeReport(project, runDir, final, resolved) {
  const abs = path.join(project, runDir);
  const files = fs.readdirSync(abs).sort();
  const run = files.includes('run.json') ? readJson(path.join(abs, 'run.json')) : null;
  const results = files.filter(f => f.endsWith('.result.json'))
    .map(f => ({ ...readJson(path.join(abs, f)), step: f.replace('.result.json', '') }));
  const skipped = files.filter(f => f.endsWith('.state.json')).flatMap(f =>
    (readJson(path.join(abs, f)).skipped || []).map(s => `${f.replace('.state.json', '')}: ${s.name} (${s.why})`));
  const commits = run ? git(project, 'log', '--oneline', `${run.base}..HEAD`) : '';
  const evaluate = results.filter(r => r.status === 'evaluate');
  const list = items => (items.length ? items.map(i => `- ${i}`) : ['- none']);

  const lines = ['# Run report', '', `- Status: ${final.action}`];
  if (final.reason) lines.push(`- Reason: ${final.reason}`);
  if (run) lines.push(`- Branch: ${run.branch}`, `- Base: ${run.base}`);
  lines.push('', '## Plugins', '', ...list(Object.entries(resolved.slots).map(([slot, s]) => `${slot}: ${s.plugin} ${s.version}`)));
  lines.push('', '## Commits', '', ...list(commits ? commits.split('\n') : []));
  lines.push('', '## Results', '', '| Step | Status | Counts |', '|---|---|---|');
  for (const r of results) lines.push(`| ${r.step} | ${r.status} | ${counts(r)} |`);
  lines.push('', '## Evaluate', '', ...list(evaluate.map(r => `${r.step}: ${r.reason}`)));
  lines.push('', '## Skipped gates', '', ...list(skipped));
  if (final.action === 'decide') {
    lines.push('', '## Decide', '',
      `Write your answers in \`${runDir}/decisions.md\` under the heading \`## ${final.gate}\`, then run again.`, '',
      ...list(final.questions || []));
  }
  const rel = `${runDir}/report.md`;
  fs.writeFileSync(path.join(project, rel), lines.join('\n') + '\n');
  return rel;
}

module.exports = { writeReport };
```

- [ ] **Step 4: Write `plugins/orchestra/bin/drive.js`**

```js
#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateAction, withPrompt } = require('../lib/protocol');
const { load } = require('../lib/resolved');
const runner = require('../lib/runner');
const { writeReport } = require('../lib/report');
const { commitRunDir } = require('../lib/git');

function callNext(nextJs, project, args) {
  const out = execFileSync(process.execPath, [nextJs, '--project', project, ...args], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

function finish(project, action, resolved) {
  if (!action.runDir) return action;
  const report = writeReport(project, action.runDir, action, resolved);
  commitRunDir(project, action.runDir, `orchestra: run state (${action.action})`);
  return { ...action, report };
}

function drive(project, extraArgs = []) {
  const resolved = load(project);
  const config = JSON.parse(fs.readFileSync(path.join(project, '.orchestra', 'config.json'), 'utf8'));
  const nextJs = path.join(resolved.slots.workflow.dir, 'bin', 'next.js');
  let args = extraArgs;
  for (;;) {
    const a = validateAction(callNext(nextJs, project, args));
    args = [];
    if (a.action === 'dispatch') return withPrompt(a);
    if (a.action !== 'phase') return finish(project, a, resolved);
    const r = runner.step({ project, runDir: a.runDir, phase: a.name, resolved, config });
    if (r.action === 'dispatch') return withPrompt(r);
    const phaseResult = path.join(project, a.runDir, `phase-${a.name}.result.json`);
    fs.writeFileSync(phaseResult, JSON.stringify({ stage: `phase-${a.name}`, ...r }, null, 2) + '\n');
    if (r.status !== 'ok') {
      return finish(project, { action: r.status, runDir: a.runDir, reason: r.reason, gate: r.gate, questions: r.questions }, resolved);
    }
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--task-file');
  try {
    console.log(JSON.stringify(drive(process.cwd(), i >= 0 ? ['--task-file', argv[i + 1]] : [])));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
    process.exitCode = 1;
  }
}

module.exports = { drive };
```

- [ ] **Step 5: Run all tests to see them pass**

Run: `npm test`
Expected: PASS, 37 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(orchestra): driver CLI and report.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The skills

**Files:**
- Create: `plugins/orchestra/skills/run/SKILL.md`, `plugins/orchestra/skills/fixer/SKILL.md`
- Create: `plugins/standard-workflow/skills/{manifest,code,logic-review}/SKILL.md`
- Create: `plugins/java-stack/skills/{manifest,fix-build}/SKILL.md`
- Test: `test/packaging.test.js`

**Interfaces:**
- Consumes: `bin/resolve.js` (Task 2), `bin/drive.js` (Task 6), the dispatch inputs of Tasks 4 and 5, and the result format.
- Produces: the skill names the code dispatches: `orchestra:fixer`, `standard-workflow:code`, `standard-workflow:logic-review`, `<plugin>:manifest`, `java-stack:fix-build`.

- [ ] **Step 1: Write the failing packaging test**

`test/packaging.test.js`:

```js
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
const REFERENCED = ['orchestra/run', 'orchestra/fixer', 'standard-workflow/manifest', 'standard-workflow/code',
  'standard-workflow/logic-review', 'java-stack/manifest', 'java-stack/fix-build'];

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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL in "every skill the code dispatches exists" with `missing skill orchestra/run`.

- [ ] **Step 3: Write `plugins/orchestra/skills/run/SKILL.md`**

````markdown
---
name: run
description: Use when the user wants orchestra to take one task to reviewed, committed code — "orchestra run <task>", "run this task with orchestra" — or to resume a stopped orchestra run on a task branch.
---

# orchestra run

You drive one run. Code decides every step. You only do what the printed action says.

`<orchestra>` is the folder two levels above this skill's folder. Run every command from the
project root.

## 1. Read the config

Read `.orchestra/config.json`. If it does not exist, tell the user to run orchestra init, and stop.

## 2. Resolve the slots

For each section in the config, take its `plugin` value. Invoke the skill `<plugin>:manifest`. It
answers with one line, `PLUGIN_DIR=<folder>`.

Then run:

```
node <orchestra>/bin/resolve.js <slot>=<folder> <slot>=<folder> …
```

If it exits with an error, show the error and stop.

## 3. Drive

Start the run:
- If the user gave a task as text, write it to `.orchestra/task.txt` and run
  `node <orchestra>/bin/drive.js --task-file .orchestra/task.txt`.
- If the user gave a file path, run `node <orchestra>/bin/drive.js --task-file <path>`.
- If the user gave no task, this is a resume. Run `node <orchestra>/bin/drive.js`.

The command prints one JSON line. Act on its `action`:

- `dispatch`: dispatch a subagent with a clean context. Give it the `prompt` text exactly. Wait
  until it finishes. Then run `node <orchestra>/bin/drive.js` again, with no task.
- `done`: tell the user the run is done. Show the `report` path.
- `failed`: show the `reason` and the `report` path, if there is one.
- `decide`: show each line of `questions`. Tell the user to write the answers in
  `<runDir>/decisions.md` under the heading `## <gate>`, then call orchestra run again.

Stop after `done`, `failed` or `decide`.

## Permitted actions

- Do not edit project files yourself. Subagents do the work.
- Do not change the order, skip a dispatch or run a stage that was not printed.
- Do not push and do not open a pull request.
- If you cannot dispatch a subagent, invoke the skill named in `skill` yourself, follow the
  `prompt`, and continue the loop.
````

- [ ] **Step 4: Write `plugins/orchestra/skills/fixer/SKILL.md`**

````markdown
---
name: fixer
description: Fixes the findings of one failed tool gate in an orchestra run, using the gate's fix guide. Dispatched by orchestra; not for direct use.
---

# Fixer

You get the output of one tool that failed, and the name of a fix guide.

## Inputs

- `output`: the log of the failed run.
- `guide`: the fix guide skill for this tool.
- `gate`: the gate name.
- `spec`: the file with the task and its acceptance criteria.
- `base`: the commit before any work on this task.

## Procedure

1. Invoke the skill named in `guide`. Follow its rules for this tool.
2. Read `output`. List each finding it reports.
3. Fix only what the output reports. Stay inside the files changed since `base`
   (`git diff --name-only <base> HEAD`), unless the output names another file.
4. Never delete or weaken a test to make a tool pass. Never change the tool's configuration or
   threshold.
5. Commit your fix once, with the message `fix(<gate>): <short summary>`. Do not add files under
   `docs/runs/`.
6. Write the result JSON.

## Result

Write to the path given in the prompt:

```json
{ "stage": "fixer", "status": "ok", "files": ["<changed file>"] }
```

Use `"status": "failed"` and add `"reason"` if you could not fix anything.

## Permitted actions

Edit code and tests. Run the build and the tool. Commit. Do not push. Do not change branches.
````

- [ ] **Step 5: Write the two `manifest` skills**

`plugins/standard-workflow/skills/manifest/SKILL.md`:

```markdown
---
name: manifest
description: Reports where the standard-workflow plugin is installed. Invoked by orchestra run during resolution; not for direct use.
---

# Manifest

Find the folder that holds this `SKILL.md`. Go two folders up. That folder holds `orchestra.json`.
Check that the file exists.

Answer with exactly one line and nothing else:

PLUGIN_DIR=<absolute path of that folder>
```

`plugins/java-stack/skills/manifest/SKILL.md`: the same text, with `standard-workflow` replaced by `java-stack` in the description.

```markdown
---
name: manifest
description: Reports where the java-stack plugin is installed. Invoked by orchestra run during resolution; not for direct use.
---

# Manifest

Find the folder that holds this `SKILL.md`. Go two folders up. That folder holds `orchestra.json`.
Check that the file exists.

Answer with exactly one line and nothing else:

PLUGIN_DIR=<absolute path of that folder>
```

- [ ] **Step 6: Write `plugins/standard-workflow/skills/code/SKILL.md`**

````markdown
---
name: code
description: Implements the task of one standard-workflow run, with tests, as small commits. Dispatched by orchestra; not for direct use.
---

# Code

## Inputs

- `spec`: the task and its acceptance criteria.
- `base`: the commit before any work.
- `build`: the command that builds the project and runs all tests.
- `guide` (optional): a skill with short rules for writing code in this stack.

## Procedure

1. Read `spec`. List what must be true when you are done.
2. If `guide` is given, invoke it and follow its rules.
3. Read the code you will change. Follow the patterns you find.
4. Make the smallest change that does the task. Write unit tests that prove each point of the
   spec.
5. Run `build`. Fix until it passes.
6. Commit in small steps, one commit per logical change. Use messages like `feat: <summary>`. Do not
   add files under `docs/runs/`.
7. Write the result JSON.

## Result

Write to the path given in the prompt:

```json
{ "stage": "code", "status": "ok", "files": ["<changed file>"] }
```

Use `"status": "failed"` and add `"reason"` if the build does not pass, or if you cannot do the
task.

## Permitted actions

Edit code and tests. Run the build. Commit. Do not push. Do not change branches. Do not ask the
user: when something is unclear, pick the simplest reading of the spec and write it in your commit
message as an assumption.
````

- [ ] **Step 7: Write `plugins/standard-workflow/skills/logic-review/SKILL.md`**

````markdown
---
name: logic-review
description: Reviews the code of one run for correctness and for a test behind every acceptance criterion, then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Logic review

## Inputs

- `spec`: the task and its acceptance criteria. This is your answer key.
- `base`: the commit before any work.
- `runDir`: the run folder.
- `decisions` (optional): the human's answers to your earlier questions.

## Procedure

1. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs'`.
2. If nothing in the change concerns code or tests, write the result with `"status": "skipped"` and
   stop.
3. For each point in `spec`, find the code that does it and the test that proves it. A point with
   no code or no test is a finding.
4. Look for correctness bugs in the changed code: wrong conditions, off-by-one, null handling,
   rounding, wrong error handling.
5. Put each finding into one bucket:
   - **Decide**: a real fork with two or more options, and a choice you cannot make (a product
     question). Write it as one line: `<question> — options: <a> | <b>`.
   - **Patch**: you can fix it now.
   - **Evaluate**: real, but not for you to fix. A human should look.
   - **Noise**: not a real problem. Drop it.
6. Write all findings to `<runDir>/logic-review.md`, each with `file:line` and the point of the
   spec it concerns.
7. If there is a Decide finding and no `decisions` input, stop here. Do not fix anything. Write the
   result with `"status": "decide"`.
8. Otherwise, read `decisions` if given, and fix every Patch finding (and the answered Decide
   findings). Run the tests you touched. Commit once: `fix(logic-review): <summary>`. Do not add
   files under `docs/runs/`. Do not review your own fixes again.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "logic-review",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 1, "noise": 0 },
  "files": ["<runDir>/logic-review.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user;
a question goes into `decide`.
````

- [ ] **Step 8: Write `plugins/java-stack/skills/fix-build/SKILL.md`**

```markdown
---
name: fix-build
description: How to fix a failed Maven build or test run in a Java project. A fix guide for the orchestra fixer.
---

# Fix a Java build

1. Find the first error in the log. Later errors are often caused by the first one.
   - `COMPILATION ERROR`: fix the code at the reported `file:[line,col]`.
   - `Tests run: … Failures: …`: open the failing test and the code it tests. Decide which one is
     wrong, using the spec. Fix the code when the test matches the spec.
   - `Could not resolve dependencies`: do not add or change dependencies. Report it in the result
     as `failed` with the reason.
2. Run the single failing test first: `./mvnw -B -Dtest=<TestClass>#<method> test`. Then run the
   full build command from the log's first line.
3. Do not use `-DskipTests`, `@Disabled`, or `-Dmaven.test.failure.ignore`.
```

- [ ] **Step 9: Run all tests to see them pass**

Run: `npm test`
Expected: PASS, 41 tests.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: orchestra run and fixer, workflow and java-stack skills" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The sample Java repo

**Files (in a new repo, `~/Projects-other/orchestra-sample-java`):**
- Create: `pom.xml`, `src/main/java/sample/PriceCalculator.java`, `src/test/java/sample/PriceCalculatorTest.java`
- Create: `AGENTS.md`, `.gitignore`, `.orchestra/config.json`
- Create via Maven: `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`

**Interfaces:**
- Produces: a clean repo on `main` with `origin/HEAD` set, where `./mvnw -B verify` passes.

- [ ] **Step 1: Make the repo and its bare origin**

```bash
cd ~/Projects-other
git init --bare -b main orchestra-sample-java.git
git clone orchestra-sample-java.git orchestra-sample-java
cd orchestra-sample-java
git symbolic-ref HEAD refs/heads/main
```

- [ ] **Step 2: Write `pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>sample</groupId>
  <artifactId>orchestra-sample-java</artifactId>
  <version>0.1.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 3: Write the code and its test**

`src/main/java/sample/PriceCalculator.java`:

```java
package sample;

import java.math.BigDecimal;

public final class PriceCalculator {

    public BigDecimal total(BigDecimal amount) {
        return amount;
    }
}
```

`src/test/java/sample/PriceCalculatorTest.java`:

```java
package sample;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PriceCalculatorTest {

    @Test
    void totalIsTheAmount() {
        assertEquals(new BigDecimal("10.00"), new PriceCalculator().total(new BigDecimal("10.00")));
    }
}
```

- [ ] **Step 4: Write `AGENTS.md`, `.gitignore` and the orchestra config**

`AGENTS.md`:

```markdown
# orchestra-sample-java

A small Java 21 project for testing orchestra. Build and test with `./mvnw -B verify`.
```

`.gitignore`:

```
target/
.orchestra/*
!.orchestra/config.json
```

`.orchestra/config.json`:

```json
{
  "workflow": { "plugin": "standard-workflow" },
  "stack-skills": { "plugin": "java-stack" }
}
```

- [ ] **Step 5: Add the Maven wrapper and check the build**

```bash
mvn -B -q wrapper:wrapper -Dmaven=3.9.11
./mvnw -B verify
```

Expected: `BUILD SUCCESS`, `Tests run: 1, Failures: 0`.

- [ ] **Step 6: Commit, push and set origin/HEAD**

```bash
git add -A
git commit -m "chore: sample project for orchestra" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin main
git remote set-head origin main
git status --porcelain
```

Expected: the last command prints nothing.

---

### Task 9: The run on Claude Code (manual)

This task needs a human, because it runs a new Claude Code session. Each step says what you should
see.

- [ ] **Step 1: Install the plugins**

In any Claude Code session:

```
/plugin marketplace add ~/Projects-other/depitropov-plugins
/plugin install orchestra@depitropov-plugins
/plugin install standard-workflow@depitropov-plugins
/plugin install java-stack@depitropov-plugins
```

Expected: three plugins installed. Restart Claude Code.

- [ ] **Step 2: Start the run**

Open a new Claude Code session in `~/Projects-other/orchestra-sample-java` and type:

```
orchestra run: Orders over 100.00 get a 10% discount. Amounts of 100.00 or less stay unchanged. Round the result to 2 decimals, half up.
```

Expected, in order:
1. The model invokes `standard-workflow:manifest` and `java-stack:manifest`, then runs `resolve.js`, which prints two lines.
2. `drive.js` prints a `dispatch` for `standard-workflow:code`. A subagent implements the change and commits.
3. `drive.js` runs the build itself. Then it prints a `dispatch` for `standard-workflow:logic-review`.
4. `drive.js` prints `done`, with a `report` path.

- [ ] **Step 3: Check the outcome**

```bash
cd ~/Projects-other/orchestra-sample-java
git branch --show-current
git log --oneline main..HEAD
cat docs/runs/task/*/report.md
./mvnw -B verify
git status --porcelain
```

Expected: branch `task/orders-over-100-00-get-a-10-discount-amo`. At least one `feat:` commit and a last commit `orchestra: run state (done)`. The report says `- Status: done`, lists both plugins, and shows `implementation-check.build`, `implementation-check.logic-review` and `finish.build` as `ok`. The build passes. The status output is empty.

- [ ] **Step 4: Record the result**

Write in `docs/TENSIONS.md`, as a new row under "Open (phase 1)", every step that did not behave as
expected: which step, what you saw, and the `report.md` path. If all steps passed, write nothing.
Then commit:

```bash
cd ~/Projects-other/depitropov-plugins
git add -A
git commit -m "docs: record the first Claude Code run" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage (`DESIGN.md`).** §3 runtime flow: Tasks 2, 6 and 7. §4 config and declarations: Tasks 0, 2 and 3 (no schema yet; plan 2). §5.2 resolution and driver: Tasks 2, 6 and 7. §6 gates, phases, build, selection, fixer, stops: Tasks 3, 4 and 7 (`when` judging is plan 4). §7 workflow contract: Tasks 5 and 6. §8 standard-workflow: Task 5 with stages prepare and code only (spec, plan and plan-check are plan 3). §8.3 git policy: Task 5. §8.5 report: Task 6. §9 and §10 Stack Skills and java-stack: Tasks 0 and 7, build only. §11 packaging: Tasks 0 and 7 (generator and Codex catalog are plan 5). §13 done criteria: 1 in Task 8, 2 in Task 9; 3, 4 and 5 are in plans 2–5 (4 is covered by unit tests in Tasks 4 and 6).
- **Names used across tasks:** `step`, `collect`, `select`, `buildStep`, `plan`, `changedFiles`, `commitAll`, `commitRunDir`, `resolve`, `load`, `readJson`, `validateAction`, `withPrompt`, `writeReport`, `drive`, `next` and `slugify` are each defined once, with the signatures used by their callers.
