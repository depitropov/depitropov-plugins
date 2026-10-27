# Project Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One project can change its orchestra run: override build and gate keys in its config, add its own gates and guides, and keep its own skills, all committed in the project (S86).

**Architecture:** The Project Customization is a fourth gate provider and a third guide source, the slot `project`. It has no plugin: `resolve.js` reads `.orchestra/project/orchestra.json` from the checkout into `resolved.json`, with the folder as `dir` (relative to the run root). Overrides live in the existing config sections and are merged over the plugin's gate or build when the gate runner collects the steps. A project skill is dispatched by its path `.agents/skills/<name>/SKILL.md`, never by name.

**Tech Stack:** Node standard library only (`node:test`, `node:assert/strict`). Run all tests with `npm test`.

**Spec:** `docs/DESIGN.md` §4.1, §4.3, §5.1a, §5.3 (the Project row), §6.2 and §7 (Roles); the decision S86 in `docs/DECISIONS.md`.

## Global Constraints

- The slot is `project`. Its folder is `.orchestra/project/`. Its declaration keys are exactly `['slot', 'gates', 'guides']`.
- Project skills live in `.agents/skills/<name>/SKILL.md`. orchestra refers to them by the path relative to the run root, never as `<plugin>:<name>`.
- Gate override keys (`<slot>.gates.<name>.<key>`): exactly `['max_rounds', 'run', 'files', 'grep', 'when', 'always']`.
- Build override keys (`stack-skills.build.<key>`): `BUILD_KEYS`, that is `['run', 'guide', 'max_rounds']`. Only the `stack-skills` section has `build`.
- An override's `guide` (the build's) names a project skill. Overrides cannot change a gate's `phase`, `kind`, `fix`, `skill` or `guide`.
- `PROVIDERS` order: `['workflow', 'global-gates', 'stack-skills', 'project']`. `GUIDE_SLOTS` order: `['curator', 'stack-skills', 'project']`.
- A project gate name differs from every gate name of every resolved slot plugin, disabled or not.
- In `resolved.json` the project slot is `{ "plugin": "project", "version": "local", "dir": ".orchestra/project", "declaration": … }`.
- The project's `.gitignore` gets `!.orchestra/project/`.
- All 14 `plugin.json` files go to version `0.22.0`, as the repo bumps every plugin together.
- Every word that `check.js` adds to a key list, and the slot name `project`, is explained in `plugins/orchestra/skills/writing-plugins/SKILL.md` (the packaging test checks it).
- Prose in skills follows the house style: short sentences, active voice, terms from `docs/CONTEXT.md`. Keep skill text lean: no new granular lines beyond what the task names.

## Review Focus

1. A project folder that `.gitignore` still ignores: the worktree has no project files, so every project gate and guide is missing. Expect `orchestra check` to fail with a fix that names `!.orchestra/project/` (Task 1).
2. The checkout's `.orchestra/project/orchestra.json` differs from the one on `origin/<default>`: the run would mix the checkout's declaration with the worktree's files. Expect the start to fail, as for a differing config (Task 5).
3. An override that removes a gate's only selection rule (`"always": false`, or `files` on a gate with only `always`): the gate would never run. Expect `orchestra check` to fail with "never runs" (Task 2).
4. An override `grep` that is not a valid regular expression. Expect `orchestra check` to fail on the config, once (Task 2).
5. A project gate named like a plugin gate that the config disables: shadowing by the back door. Expect `orchestra check` to fail (Task 1).

---

### Task 1: The project slot in resolution and in orchestra check

**Files:**
- Modify: `plugins/orchestra/lib/check.js`
- Modify: `plugins/orchestra/lib/resolved.js`
- Test: `test/orchestra/check.test.js`, `test/orchestra/resolved.test.js`

**Interfaces:**
- Produces in `check.js`:
  - `PROJECT_DIR = '.orchestra/project'`, `PROJECT_SKILLS = '.agents/skills'` (exported).
  - `DECLARATION_KEYS.project = ['slot', 'gates', 'guides']`. `SLOTS` does not change: `project` is no config section, so a `"project"` section in the config still fails as an unknown section.
  - `checkDeclaration(d, dir, where, skillsDir = path.join(dir, 'skills'))`: a named skill is `<skillsDir>/<name>/SKILL.md`. A `slot` is valid when it is a key of `DECLARATION_KEYS`.
  - `checkSkillFile(file, name, where) -> string[]`: the frontmatter and harness-word rules of `checkSkills`, for one file. `checkSkills` uses it.
  - `checkPlugin` fails a plugin whose `orchestra.json` has `"slot": "project"`.
  - `checkProject` checks `resolved.slots.project` when present (rules below).
- Produces in `resolved.js`: `resolve()` adds `slots.project` when `<project>/.orchestra/project/orchestra.json` exists, in the form of the Global Constraints.

`checkProject` rules for the project slot, each one line `<where>: <problem>. Fix: <fix>.`:
- The declaration rules, with `where` = `.orchestra/project/orchestra.json`, `dir` = `<project>/.orchestra/project`, `skillsDir` = `<project>/.agents/skills`.
- `checkSkillFile` on every skill the project declaration names (agent gate `skill`, tool gate `guide`).
- A project guide for a role the workflow has no stage for fails, as for the other slots. Its fix: remove the guide from `.orchestra/project/orchestra.json`.
- A project gate name that any resolved slot plugin declares fails, even when disabled. Fix: rename the project gate; to replace a plugin gate, disable it and give the project gate another name.
- `git check-ignore -q .orchestra/project/orchestra.json` succeeds (the file is ignored): fail with `Fix: add the line !.orchestra/project/ to .gitignore.`

- [ ] **Step 1: Write the failing tests** in `test/orchestra/check.test.js`

Add a helper next to `project()`:

```js
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
const both = () => project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, { workflow: wf, 'stack-skills': st });
const money = { name: 'money', phase: 'conventions-check', kind: 'agent', skill: 'check-money', files: '**/*.java' };
```

Tests:
- `a valid project declaration passes`: `addProject(both(), { slot: 'project', guides: { code: 'guides/code.md' }, gates: [money, { name: 'arch', phase: 'implementation-check', kind: 'tool', run: 'make arch', fix: 'fixer', guide: 'fix-arch', always: true }] }, { skills: ['check-money', 'fix-arch'] })` → `checkProject` gives `[]`.
- `a project skill must exist in .agents/skills/ with only name and description`: no skills written → one line matching `/names skill "check-money", which is not in/` and naming `.agents/skills`; then a skill file with frontmatter `name`, `description`, `model` → one line matching `/frontmatter has the keys name, description, model/`.
- `a project declaration takes only slot, gates and guides`: `{ slot: 'project', build: { run: 'x' } }` → `/unknown key "build" for slot project/`; same for `config` and `roles`.
- `a project gate may not reuse a plugin gate name, even a disabled one`: gate `{ ...money, name: 'fmt' }` with config `'stack-skills': { plugin: 'st', disable: ['fmt'] }` → exactly one line matching `/gate "fmt".*project.*st.*Fix: .*rename/`.
- `a project guide for a role the workflow lacks fails`: workflow roles `['spec', 'plan']`, project `guides: { code: 'guides/code.md' }` → one line matching `/project declares a "code" guide, but the workflow wf has no code stage\. Fix: remove .+ from \.orchestra\/project\/orchestra\.json/`.
- `the project folder must not be ignored`: `addProject(..., { ignore: true })` → one line `/^\.gitignore: \.orchestra\/project\/ is ignored\. Fix: add the line !\.orchestra\/project\/ to \.gitignore\.$/`.
- `a plugin cannot fill the project slot`: `checkPlugin(writePlugin(tmp('p-'), 'p', { slot: 'project', gates: [] }))` → a line matching `/"slot" is project, which only a project's \.orchestra\/project\/ fills/`.
- `a config section named project is unknown`: config with `project: { plugin: 'x' }` → `/unknown section "project"/`.

In `test/orchestra/resolved.test.js`:
- `adds the project slot when .orchestra/project/orchestra.json exists`: write `{ slot: 'project', gates: [] }` there and `!.orchestra/project/` in `.gitignore`; after `resolve`, `load(dir).slots.project` deep-equals `{ plugin: 'project', version: 'local', dir: '.orchestra/project', declaration: { slot: 'project', gates: [] } }`. Without the file, `slots.project` is `undefined`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/orchestra/check.test.js test/orchestra/resolved.test.js`
Expected: the new tests FAIL; the old ones pass.

- [ ] **Step 3: Implement the rules in `check.js` and the slot in `resolved.js`** as in Interfaces. In `checkProject`, resolve the project slot's `dir` against `project`, because `resolved.json` holds it relative.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/check.js plugins/orchestra/lib/resolved.js test/orchestra/check.test.js test/orchestra/resolved.test.js
git commit -m "feat(orchestra): the project slot in resolution and check (S86)"
```

---

### Task 2: Config overrides in orchestra check

**Files:**
- Modify: `plugins/orchestra/lib/check.js` (`checkSection` and the gate loop of `checkDeclaration`)
- Test: `test/orchestra/check.test.js`

**Interfaces:**
- Consumes: `checkProject`, `project()` and `st` from Task 1's test file.
- Produces in `check.js`:
  - `GATE_OVERRIDE_KEYS = ['max_rounds', 'run', 'files', 'grep', 'when', 'always']` (exported).
  - `SECTION_KEYS = ['plugin', 'disable', 'gates', 'build']`.
  - `checkGateValues(g, at, fail, config, keys)`: the value rules the gate loop runs today for `max_rounds`, `run` placeholders, `files`, `grep`, `when` and `always`, limited to `keys`, plus the "no selection rule, so it never runs" rule on the whole `g`. The gate loop of `checkDeclaration` calls it with every key; `checkSection` calls it with the merged gate `{ ...gate, ...override }`, only the override's keys, and `at` = `"<slot>.gates.<name>"`, so a declaration error is not reported twice and the line names the config path.

Rules in `checkSection`:
- `<slot>.gates.<name>`: a key outside `GATE_OVERRIDE_KEYS` fails with `Fix: …the allowed keys are max_rounds, run, files, grep, when, always`. The old rule "only max_rounds" goes.
- A `grep` override expands `{config.<key>}` with the section's values (or the defaults) before it compiles.
- `stack-skills.build`: an object whose keys are in `BUILD_KEYS`; `run` a string; `max_rounds` a whole number of 1 or more; `guide` a project skill in `<project>/.agents/skills/` (pass the project folder to `checkSection`). In any other section, `build` fails as an unknown key.

- [ ] **Step 1: Write the failing tests**

- `a valid override of a gate and the build passes`: config `'stack-skills': { plugin: 'st', gates: { fmt: { run: 'y', files: '**/*.ts', max_rounds: 3 } }, build: { run: 'make all', guide: 'fix-all', max_rounds: 4 } }`, with `.agents/skills/fix-all/SKILL.md` written → `[]`.
- Extend `each broken config rule gives one line with the rule and its fix` with these cases, each exactly one line:
  - `gates: { fmt: { phase: 'finish' } }` → `/"stack-skills\.gates\.fmt" has unknown key "phase".*max_rounds, run, files, grep, when, always/`
  - `gates: { fmt: { always: false } }` → `/"stack-skills\.gates\.fmt" has no selection rule, so it never runs/`
  - `gates: { fmt: { grep: '(' } }` → `/"stack-skills\.gates\.fmt" "grep" is not a valid regular expression/`
  - `gates: { fmt: { files: 3 } }` → `/"stack-skills\.gates\.fmt" "files" is not a glob/`
  - `build: { run: 'x', cache: true }` → `/unknown build key "cache"/`
  - `build: { max_rounds: 0 }` → `/"stack-skills\.build\.max_rounds" is not a whole number/`
  - `build: { guide: 'fix-all' }` with no skill file → `/names skill "fix-all", which is not in .*\.agents\/skills/`
  - `workflow: { plugin: 'wf', build: { run: 'x' } }` → `/section "workflow" has unknown key "build"/`
- Change the regex of the existing case `gates: { fmt: { max_rounds: 0 } }` to `/"stack-skills\.gates\.fmt" "max_rounds" is not a whole number/`; it stays one line.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/orchestra/check.test.js`
Expected: the new cases FAIL.

- [ ] **Step 3: Implement `checkGateValues` and the override rules in `check.js`**

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/check.js test/orchestra/check.test.js
git commit -m "feat(orchestra): override gate and build keys in the config (S86)"
```

---

### Task 3: The gate runner runs project gates and applies overrides

**Files:**
- Modify: `plugins/orchestra/lib/gates.js`
- Modify: `plugins/orchestra/lib/runner.js` (`loadState`, `fixerDispatch`, `agentStep`)
- Test: `test/orchestra/gates.test.js`, `test/orchestra/runner.test.js`

**Interfaces:**
- Consumes: `resolved.slots.project` from Task 1; the override keys from Task 2.
- Produces in `gates.js`:
  - `PROVIDERS = ['workflow', 'global-gates', 'stack-skills', 'project']`.
  - `skillRef(provider, plugin, name) -> string`: `.agents/skills/<name>/SKILL.md` for `project`, else `<plugin>:<name>`. Exported.
  - `collect(resolved, config, phase)`: merges `config[provider].gates[name]` over the gate before it expands `run` and `grep`; sets `skill` and `guide` of each gate to their `skillRef`. `max_rounds` = merged value, default 2. The project provider has no config section, so its `values` are `{}`.
  - `buildStep(resolved, config)`: merges `config['stack-skills'].build` over the declared build. `guide` is the full reference: `skillRef('project', …)` when the config sets `guide`, else `<stack plugin>:<declared guide>`.
- Produces in `runner.js`: `agentStep` dispatches `skill: s.skill`; `fixerDispatch` gives `guide: s.guide`. Both now take the reference as `collect` and `buildStep` made it.

- [ ] **Step 1: Write the failing tests**

In `test/orchestra/gates.test.js`:

```js
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
```

- `collect merges a gate override over the declaration`: config `{ 'stack-skills': { gates: { crap: { run: 'crap {plugin}', files: '**/*.kt', max_rounds: 5 } } } }` → the `crap` gate has `run` `'crap /p/st'`, `files` `'**/*.kt'`, `max_rounds` 5, and still `phase` `'implementation-check'` and `fix` `'fixer'`.
- `buildStep merges the build override, and a project guide is a path`: `buildStep(resolved, {})` has `run` `'/p/st/build.sh'`, `guide` `'st:fix-build'`, `max_rounds` 3. `buildStep(resolved, { 'stack-skills': { build: { run: 'make all', guide: 'fix-all' } } })` has `run` `'make all'`, `guide` `'.agents/skills/fix-all/SKILL.md'`, `max_rounds` 3.
- Update the existing callers `buildStep(x)` in this file to `buildStep(x, {})`.

In `test/orchestra/runner.test.js`, extend `setup()` with `projectGates = []` and `buildOverride`: when `projectGates` is not empty it writes `.orchestra/project/orchestra.json` `{ slot: 'project', gates: projectGates }`, each gate's skill in `.agents/skills/`, and `!.orchestra/project/` in `.gitignore`, before the config commit; `buildOverride` goes into `config['stack-skills'].build`. Tests:
- `a project agent gate is dispatched by the path of its skill`: `projectGates: [{ name: 'money', phase: 'implementation-check', kind: 'agent', skill: 'check-money', always: true }]` → after the build, `a.skill` is `'.agents/skills/check-money/SKILL.md'` and `a.result` ends with `implementation-check.money.result.json`.
- `a build override runs the project command and its fixer gets the project guide`: `build: OK`, `buildOverride: { run: 'node -e "process.exit(1)"', guide: 'fix-all' }`, `maxRounds: 1` → the first step is a fixer dispatch whose `inputs.guide` is `'.agents/skills/fix-all/SKILL.md'`, and the build log names the override command.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/orchestra/gates.test.js test/orchestra/runner.test.js`
Expected: the new tests FAIL.

- [ ] **Step 3: Implement `skillRef`, the merge in `collect` and `buildStep`, and the runner changes**

`loadState` calls `buildStep(ctx.resolved, ctx.config)`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/gates.js plugins/orchestra/lib/runner.js test/orchestra/gates.test.js test/orchestra/runner.test.js
git commit -m "feat(orchestra): run project gates and apply gate and build overrides (S86)"
```

---

### Task 4: Prompts read project skills and guides by path

**Files:**
- Modify: `plugins/orchestra/lib/protocol.js`
- Modify: `plugins/orchestra/skills/fixer/SKILL.md` (step 1 only)
- Test: `test/orchestra/protocol.test.js`

**Interfaces:**
- Consumes: the skill references of Task 3 (`.agents/skills/<name>/SKILL.md`).
- Produces in `protocol.js`:
  - `GUIDE_SLOTS = ['curator', 'stack-skills', 'project']`. `guidesFor` keeps its signature; for the project slot it gives `.orchestra/project/<file>`, relative to the run root, because the slot's `dir` is relative.
  - `withPrompt`: when `a.skill` ends with `/SKILL.md`, the first line is ``Read the skill file `<path>` and follow it.``; otherwise it stays ``Invoke the skill `<name>` and follow it.``.
- Produces in the fixer skill, step 1: ``Invoke the skill named in `guide`. When `guide` is a file path, read that file instead. Follow its rules for this tool.``

- [ ] **Step 1: Write the failing tests**

- Extend `guidesFor lists the curator guide first, then the stack guide, and leaves out disabled ones` with a slot `project: { plugin: 'project', dir: '.orchestra/project', declaration: { guides: { code: 'guides/code.md' } } }` → `guidesFor('code', resolved, {})` is `['/s/guides/code.md', '.orchestra/project/guides/code.md']`.
- `withPrompt reads a project skill by its path`: `withPrompt({ ...dispatch, skill: '.agents/skills/check-money/SKILL.md' }, '/r').prompt` starts with ``Read the skill file `.agents/skills/check-money/SKILL.md` and follow it.`` and does not match `/Invoke the skill/`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/orchestra/protocol.test.js`
Expected: the new assertions FAIL.

- [ ] **Step 3: Implement the two changes in `protocol.js` and the fixer line**

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/protocol.js plugins/orchestra/skills/fixer/SKILL.md test/orchestra/protocol.test.js
git commit -m "feat(orchestra): prompts read project skills and guides by path (S86)"
```

---

### Task 5: A run stops when the checkout's project declaration differs from the base

**Files:**
- Modify: `plugins/orchestra/bin/drive.js` (`configDiffers`, `configReason` and their two callers)
- Test: `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: `PROJECT_DIR` from `check.js`.
- Produces in `drive.js`: `differs(project, root) -> string | null`: the first of `.orchestra/config.json` and `.orchestra/project/orchestra.json` whose parsed content (or absence) differs between the checkout and the worktree, else `null`. `configReason(base)` becomes `reason(file, base)`: `` `${file} in your checkout differs from the one on ${base}. Commit and push it, then run again.` ``. Both callers (`open` and the resume path) use it.

- [ ] **Step 1: Write the failing tests**

- `a start with a local project declaration that differs from origin fails and leaves no worktree`: after `project()`, write `.orchestra/project/orchestra.json` `{ slot: 'project', gates: [] }` in the checkout only (not committed) → `a.action` is `'failed'`, `a.reason` matches `/\.orchestra\/project\/orchestra\.json in your checkout differs from the one on origin\/main/`, one worktree in `git worktree list`.
- The two existing config tests keep passing with their old regexes.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/orchestra/drive.test.js`
Expected: the new test FAILS (the run starts).

- [ ] **Step 3: Implement `differs` and `reason`**

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/bin/drive.js test/orchestra/drive.test.js
git commit -m "feat(orchestra): stop a run whose project declaration is not on the base (S86)"
```

---

### Task 6: The `orchestra:project` skill, the contract text and the version

**Files:**
- Create: `plugins/orchestra/skills/project/SKILL.md`
- Modify: `plugins/orchestra/skills/init/SKILL.md` (the last list of step 5)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md`
- Modify: `test/packaging.test.js` (the contract-words test)
- Modify: all 14 `plugin.json` and `.claude-plugin/plugin.json` files
- Test: `test/packaging.test.js`

**Interfaces:**
- Consumes: every rule and key of Tasks 1–5.

`plugins/orchestra/skills/project/SKILL.md`, frontmatter `name: project` and a `description` that starts "Use when the user wants to customize orchestra for this project —" and names: override the build or a gate, add a project gate, add project rules for a stage. Body, in the style of `init`, with these sections and nothing more:
1. **Read and resolve.** No config → tell the user to run orchestra init, and stop. Resolve the slots as `orchestra:run` step 2 does.
2. **Show the run.** From `.orchestra/resolved.json` and the config: the build command, the gates per phase with their declarer, and the guides per role, with what the config already overrides or disables.
3. **Ask.** One topic at a time: the build; gate keys to override (only `max_rounds`, `run`, `files`, `grep`, `when`, `always`); gates to turn off; project gates to add; project rules per role. Say that a different gate means disable plus a project gate with another name.
4. **Write.** Overrides into `.orchestra/config.json`. Project gates and guides into `.orchestra/project/orchestra.json` and `.orchestra/project/guides/<role>.md`. Each project skill into `.agents/skills/<name>/SKILL.md`, with only `name` and `description` in its frontmatter. An agent gate's skill ends with the triage contract: it invokes the skill `orchestra:triage`. Add `!.orchestra/project/` to `.gitignore`.
5. **Check.** Run `resolve.js` as `init` step 5 does; show each failed line. When it passes, tell the user to commit and push `.orchestra/` and `.agents/skills/`, because a run reads them from `origin/<default>`.
6. **Permitted actions.** Change only those files. Do not commit, push or start a run.

`init` step 5, last list: add one item: "Customize the run for this project with orchestra project: the build, gate settings, project gates and project rules."

`writing-plugins`:
- In "The project config": `build` (`stack-skills` only, keys `run`, `guide`, `max_rounds`; `guide` names a project skill) and the override keys of `gates`.
- A new short section "A project's own gates and guides": the slot `project`, its folder, its keys `slot`, `gates`, `guides`; skills in `.agents/skills/` by path; project gates run last; a project gate name is new.

`test/packaging.test.js`, the contract-words test: add `...check.GATE_OVERRIDE_KEYS` and `...Object.keys(check.DECLARATION_KEYS)` to `words`.

- [ ] **Step 1: Extend the contract-words test**

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/packaging.test.js`
Expected: FAIL, "writing-plugins does not explain `project`" (or an override key).

- [ ] **Step 3: Write the `project` skill, the `init` line and the `writing-plugins` text; bump all 14 manifests to `0.22.0`**

- [ ] **Step 4: Run all tests and orchestra check**

Run: `npm test && node plugins/orchestra/bin/check.js plugins/*/`
Expected: PASS, and no check lines.

- [ ] **Step 5: Commit**

```bash
git add plugins test/packaging.test.js
git commit -m "feat(orchestra): orchestra:project and the Project Customization contract; 0.22.0 (S86)"
```

---

## After the plan

- Update `docs/guide.html` (the user asked for it after the implementation): the glossary entry, the config and declaration section, the gate order, the guides by role, and the rail and footer (version 0.22.0, last S86).
- O14 (the Curator writes project guides) stays open.
