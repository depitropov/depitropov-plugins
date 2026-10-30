# Shared Roles and the Core Slot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orchestra knows a fixed list of shared roles (`triage`, `writing-style`, `pr-review`, `pr-description`). The optional core slot (`orc-core`, formerly `orc-global-gates`) fills them. A project may override or amend a shared role. Every dispatch gets the filled roles as inputs, and each skill uses a role only when it is given. Role becomes Stage everywhere.

**Architecture:** `protocol.js` holds the fixed lists `STAGES` and `SHARED_ROLES` and a new `sharedRoles(resolved, config)` that turns the core and project declarations into `shared-role.<name>` inputs. `drive.js` merges those inputs into every dispatch and inline action in `answer()`, so workflow stages, gates and the fixer all get them. `check.js` validates the new `shared-roles` declaration key, which only the `core` and `project` slots may carry. The triage skill and the `clean-code` gate move into `orc-core`.

**Tech Stack:** Node standard library only (`node:test`, `node:assert/strict`). Run all tests with `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-29-shared-roles-design.md`.

## Global Constraints

- Shared roles, in this order: `['triage', 'writing-style', 'pr-review', 'pr-description']`.
- Stages: `['spec', 'plan', 'code']`. The constant is `STAGES`; the workflow declaration key is `stages`; the dispatch key is `stage`.
- Slot `core`, filled by plugin `orc-core`. `SLOTS` = `['workflow', 'stack-skills', 'core', 'curator']`. `PROVIDERS` = `['workflow', 'core', 'stack-skills', 'project']`.
- Declaration keys: `core: ['slot', 'config', 'gates', 'shared-roles']`; `project: ['slot', 'gates', 'guides', 'shared-roles']`; `workflow: ['slot', 'config', 'stages', 'gates']`.
- Input names: `shared-role.<role>` (the skill: `<plugin>:<skill>`, or `.agents/skills/<name>/SKILL.md` for a project skill) and `shared-role.<role>.guide` (the project guide path, `.orchestra/project/<file>`).
- Old names fail with a fix message; no alias.
- All plugin versions go to `0.23.0`, in both `plugin.json` and `.claude-plugin/plugin.json`.
- Every word `check.js` adds to a key list is explained in `plugins/orchestra/skills/writing-plugins/SKILL.md` (the packaging test checks it).
- Prose in skills and docs: short sentences, active voice, terms from `docs/CONTEXT.md`.
- Work on branch `feat/shared-roles`. Leave the user's uncommitted `docs/guide.html` alone.

## Review Focus

- A project config still has a `global-gates` section. Expected: `orchestra check` fails with "rename the section to `core` and choose `orc-core`". Test in Task 2.
- A workflow `next.js` still sends `role` in a dispatch, or its `orchestra.json` still has `roles`. Expected: a run-time failure "rename `role` to `stage`", and a check failure "rename it to `stages`". Tests in Task 1.
- A project overrides `triage` with its own skill. Expected: the dispatch input `shared-role.triage` is `.agents/skills/<name>/SKILL.md`, not `orc-core:triage`. Test in Task 3.
- A project guide for a shared role that neither the core plugin nor the project fills. Expected: check fails and names the guide. Test in Task 3.
- A project with no `core` section. Expected: no `shared-role.*` input and no shared-role prompt line; gates run as before. Test in Task 3.

---

### Task 1: Role becomes Stage, with S87 recorded

**Files:**
- Modify: `plugins/orchestra/lib/protocol.js` (`ROLES` → `STAGES`, `roleError` → `stageError`, `a.role` → `a.stage`, `guidesFor(stage, …)`)
- Modify: `plugins/orchestra/lib/check.js:6,19,88-95,323-336,363,380-386,496` (`roles` → `stages`, messages say "stage")
- Modify: `plugins/orchestra/bin/drive.js:7,152,192` (the renamed functions and key)
- Modify: `plugins/orc-standard-workflow/bin/next.js:119,141,176,192,205` (option and dispatch key `stage`)
- Modify: `plugins/orc-standard-workflow/orchestra.json` (`"stages"`)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md:33,36,104`, `plugins/orchestra/skills/project/SKILL.md:27,40,47`
- Modify: `docs/TENSIONS.md` (row S87), `docs/DECISIONS.md` (entry `## S87`)
- Test: `test/orchestra/protocol.test.js`, `test/orchestra/check.test.js`, `test/orc-standard-workflow/next.test.js`, `test/packaging.test.js:64`

**Interfaces:**
- Produces: `protocol.STAGES`, `protocol.stageError(a, workflowDeclaration)`, `protocol.guidesFor(stage, resolved, config)`, dispatch key `stage`; `check.STAGES` re-exported in place of `check.ROLES`.

- [ ] **Step 1: Change the tests first**

Rename `role`/`roles`/`ROLES`/`roleError` to `stage`/`stages`/`STAGES`/`stageError` in the four test files, and in the expected messages ("unknown guide stage", `"stages" is […]`, "does not declare in \"stages\""). In `packaging.test.js:64` use `check.STAGES`. Add:

```js
// protocol.test.js
test('a dispatch with the old key role fails with the rename', () => {
  assert.throws(() => validateAction({ ...dispatch, role: 'code' }), /dispatch key "role" is now "stage"\. Rename it in next\.js/);
});
// check.test.js
test('a workflow declaration with the old key roles fails with the rename', () => {
  assert.match(errors({ slot: 'workflow', roles: ['code'] }).join('\n'), /unknown key "roles" for slot workflow\. Fix: rename it to "stages"/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL on the renamed names and the two new tests.

- [ ] **Step 3: Rename in the code**

Rename as in Files. In `validateAction`, before the stage check: a dispatch with a `role` key throws `dispatch key "role" is now "stage". Rename it in next.js.` In `checkDeclaration`'s unknown-key loop, add one map `RENAMED = { roles: 'stages' }`: a renamed key gets the fix `rename it to "<new>"` instead of the generic one. Comments say "stage" (S76 stays the source; add S87).

- [ ] **Step 4: Rename in the two skills**

`writing-plugins`: the `guides` row (`{ "<stage>": "<path>" }`), the `stages` row, and the `dispatch` line (`Optional `stage``). `project`: "the guides per stage", "project rules for the stages, per stage", `guides/<stage>.md`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Record S87**

`docs/TENSIONS.md`, a new row after S86, source "User decision 2026-10-29":
> S87 | Shared roles and the core slot. (1) Orchestra knows a fixed list of shared roles: `triage`, `writing-style`, `pr-review`, `pr-description`. (2) Only the optional `core` slot fills them, by a `shared-roles` map in its declaration; `orc-core` replaces `orc-global-gates`, and the slot `global-gates` becomes `core`. This changes S80. (3) A project overrides a shared role with a project skill, or amends it with a guide keyed by the shared role. This extends S86. (4) Every dispatch gets the filled roles as `shared-role.<role>` inputs; a skill uses a role only when it is given. (5) The triage method moves to `orc-core:triage` and becomes optional; orchestra keeps only the result contract (`decide`, `evaluate`, the status) and one rule on answers. (6) PR roles belong to the workflow: a workflow that ends with a PR invokes them when given. (7) Role becomes Stage everywhere. This changes S76. (8) Old names fail with a fix message; no alias. The `sc-*` copies follow with the porting work. Full record: `docs/DECISIONS.md`.

`docs/DECISIONS.md`, `## S87: Shared roles and the core slot`, in the file's entry format. Question: company rules (triage, writing style, PR review and description) are hard-coded or have no place; a company with another ranking must fork every gate. Options: (a) only the core slot fills shared roles, project may override or amend (chosen); (b) any slot fills them, and a conflict fails check; (c) any slot, a fixed order wins (rejected: a silent winner). Also: triage as a plain convention (rejected: a stack plugin would carry one company's ranking); writing style as a stage guide (rejected: guides reach only `spec`, `plan`, `code`); keep the stop-and-ask rules in orchestra (only the minimum: the result JSON already carries `decide`). Evidence: the brainstorming of 2026-10-29 and the spec. Cost and risk: every gate skill changes; the `sc-*` copies break until ported; a run with no core plugin escalates by the model's own judgement. Where it lives: the files of this plan.

- [ ] **Step 7: Commit**

```bash
git branch --show-current | grep -qx master && git switch -c feat/shared-roles
git add plugins test docs/TENSIONS.md docs/DECISIONS.md
git commit -m "refactor(orchestra): Role becomes Stage (S87)"
```

---

### Task 2: The core slot and the `orc-core` plugin

**Files:**
- Modify: `plugins/orchestra/lib/check.js:12-19` (`SLOTS`, comment, `DECLARATION_KEYS`), `checkDeclaration` (the `shared-roles` rule), `checkProject` (the old `global-gates` section), exports (`SHARED_ROLES`)
- Modify: `plugins/orchestra/lib/protocol.js` (`SHARED_ROLES`)
- Modify: `plugins/orchestra/lib/gates.js:8` (`PROVIDERS`)
- Move: `plugins/orc-global-gates/` → `plugins/orc-core/` (`git mv`); `plugins/orchestra/skills/triage/` → `plugins/orc-core/skills/triage/` (`git mv`)
- Modify: `plugins/orc-core/plugin.json`, `.claude-plugin/plugin.json`, `orchestra.json`, `skills/manifest/SKILL.md`, `skills/clean-code/SKILL.md:15` (section `core`), `skills/triage/SKILL.md` (frontmatter description)
- Modify: `.claude-plugin/marketplace.json`
- Modify: `plugins/orchestra/skills/init/SKILL.md:3,24,27,37,52,70`, `plugins/orchestra/skills/writing-plugins/SKILL.md:3,8,12,29,31`
- Test: `test/orchestra/check.test.js`, `test/orchestra/gates.test.js`, `test/orchestra/drive.test.js:23-24,51`, `test/packaging.test.js:13-15,35-45,73-80`

**Interfaces:**
- Consumes: `STAGES` from Task 1.
- Produces: `protocol.SHARED_ROLES` (re-exported by `check.js`); slot `core`; declaration key `shared-roles` (`{ "<shared role>": "<skill name>" }`); skill `orc-core:triage`; `orc-core/orchestra.json` = `{ "slot": "core", "config": { "legacy": … unchanged }, "gates": [ clean-code unchanged ], "shared-roles": { "triage": "triage" } }`.

- [ ] **Step 1: Change the tests first**

- `check.test.js`: rename `'global-gates'`/`gg` to `'core'`/`core` in the helper map (line 95) and the two S80 tests; the allowed-keys test now reads "a core declaration takes only slot, config, gates and shared-roles". Add:

```js
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
```

- `test/helpers.js` `writePlugin`: also create the skills named in `d['shared-roles']`.
- `gates.test.js`: the S80 test uses `core` and expects provider `'core'`.
- `drive.test.js`: `config.core = { plugin: 'orc-core' }`, `dirs.core = path.join(PLUGINS, 'orc-core')`; `cc.skill` is `'orc-core:clean-code'`.
- `packaging.test.js`: `REFERENCED` has `'orc-core/triage'`, `'orc-core/clean-code'`, `'orc-core/manifest'` instead of the three old ones; the judging list and the clean-code test read `orc-core`. Leave the triage-wording assertion for Task 4 but point it at `orc-core:triage` for now.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL: no slot `core`, no folder `orc-core`.

- [ ] **Step 3: Implement in orchestra**

- `protocol.js`: `const SHARED_ROLES = ['triage', 'writing-style', 'pr-review', 'pr-description'];` with a comment (S87); export it.
- `check.js`: the constants of Global Constraints. In `checkDeclaration`: `shared-roles` must be an object; each key is in `SHARED_ROLES` (else the test's line); each value passes the existing `skill(name, \`shared role "<role>"\`)` helper. In `checkProject`'s section loop, before the unknown-section rule: a `global-gates` section gives the exact line of the test. Comment: the curator and core slots may be empty.
- `gates.js`: `PROVIDERS` of Global Constraints.

- [ ] **Step 4: Move and rename the plugin**

- `git mv plugins/orc-global-gates plugins/orc-core`, then `git mv plugins/orchestra/skills/triage plugins/orc-core/skills/triage`.
- Both manifests: name `orc-core`, keep `dependencies`, description "A person's or company's rules for every orchestra workflow: the triage method and the clean-code gate."
- `orchestra.json`: the Produces value above.
- `manifest/SKILL.md`: plugin name `orc-core`. `clean-code/SKILL.md:15`: the `core` section. `triage/SKILL.md` description: "…Invoked by a judging stage or an agent gate when an orchestra run gives it as the triage shared role."
- `marketplace.json`: replace the `orc-global-gates` entry with `orc-core`, same description as the manifests.

- [ ] **Step 5: Update `init` and `writing-plugins`**

- `init`: every `global-gates` becomes `core`; offer `orc-core`. The optional-slot paragraph: the core slot holds a person's or company's rules for every workflow: gates such as `clean-code`, and shared roles such as `triage`. Without it, no `clean-code` gate runs and no shared role is filled.
- `writing-plugins`: the slot list and table rows say `core`. Replace the global-gates paragraph: a `core` plugin holds rules that every workflow gets. Its gates follow the S80 rule (they read only `spec`, `base`, `notes`, `decisions` and their `config`). Its `shared-roles` maps each shared role it fills to one of its skills; the shared roles are `triage`, `writing-style`, `pr-review`, `pr-description`. Add the `shared-roles` row to the declaration table (`core`, project).

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS, including `checkPlugin` on `orc-core` and the "explains every word" test.

- [ ] **Step 7: Commit**

```bash
git add -A plugins test .claude-plugin/marketplace.json
git commit -m "feat(orchestra): the core slot and orc-core, with triage moved in (S87)"
```

---

### Task 3: Shared roles reach every dispatch; project override and amend

**Files:**
- Modify: `plugins/orchestra/lib/protocol.js` (`sharedRoles`, `withPrompt`, `inlinePrompt`)
- Modify: `plugins/orchestra/bin/drive.js:59-69` (`missingProjectFile`), `:150-155` (`answer`)
- Modify: `plugins/orchestra/lib/check.js` (`checkDeclaration` guide keys; `checkProjectSlot`)
- Test: `test/orchestra/protocol.test.js`, `test/orchestra/check.test.js`, `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: `SHARED_ROLES`, slot `core`, key `shared-roles` (Task 2).
- Produces: `protocol.sharedRoles(resolved, config) → { [input name]: string }`, empty when no role is filled.

- [ ] **Step 1: Write the failing tests**

```js
// protocol.test.js
const core = { plugin: 'orc-core', dir: '/p/core', declaration: { slot: 'core', 'shared-roles': { triage: 'triage', 'writing-style': 'style' } } };
test('sharedRoles maps the core roles, and a project skill or guide overrides or amends one', () => {
  assert.deepEqual(sharedRoles({ slots: {} }, {}), {});
  assert.deepEqual(sharedRoles({ slots: { core } }, { core: { plugin: 'orc-core' } }),
    { 'shared-role.triage': 'orc-core:triage', 'shared-role.writing-style': 'orc-core:style' });
  const project = { plugin: 'project', dir: '.orchestra/project', declaration: { slot: 'project', 'shared-roles': { triage: 'our-triage' }, guides: { 'writing-style': 'guides/writing-style.md', code: 'guides/code.md' } } };
  assert.deepEqual(sharedRoles({ slots: { core, project } }, { core: { plugin: 'orc-core' } }), {
    'shared-role.triage': '.agents/skills/our-triage/SKILL.md',
    'shared-role.writing-style': 'orc-core:style',
    'shared-role.writing-style.guide': '.orchestra/project/guides/writing-style.md',
  });
});
test('withPrompt states the result rule always, and how to load a shared role only when one is given', () => {
  assert.match(withPrompt(dispatch, '/r').prompt, /Put a question in `decide` only when a person must answer it\. An answer in `decisions` is a requirement; act on it\./);
  assert.doesNotMatch(withPrompt(dispatch, '/r').prompt, /shared-role/);
  const a = withPrompt({ ...dispatch, inputs: { ...dispatch.inputs, 'shared-role.triage': 'orc-core:triage' } }, '/r');
  assert.match(a.prompt, /A `shared-role\.<role>` input names a skill.*invoke it by name, or read it when it is a SKILL\.md path.*`\.guide` input/s);
});
// check.test.js
test('a project guide may be keyed by a shared role that the core plugin or the project fills', () => {
  const amend = { slot: 'project', guides: { triage: 'guides/triage.md' } };
  assert.deepEqual(checkProject(addProject(both(), amend)), ['.orchestra/project/orchestra.json: the project declares a "triage" guide, but no core plugin or project skill fills the shared role triage. Fix: add a core plugin that fills it, add "triage" under "shared-roles" with a project skill, or remove the guide.']);
  assert.deepEqual(checkProject(addProject(both(), { ...amend, 'shared-roles': { triage: 'our-triage' } }, { skills: ['our-triage'] })), []);
  const withCore = project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, core: { plugin: 'core' } }, { workflow: wf, 'stack-skills': st, core: { slot: 'core', 'shared-roles': { triage: 'triage' } } });
  assert.deepEqual(checkProject(addProject(withCore, amend)), []);
  assert.match(checkProject(addProject(both(), { slot: 'project', guides: { review: 'guides/review.md' } })).join('\n'), /unknown guide stage "review"/);
});
```

`drive.test.js`: in `project()`, the real `orc-core` fills `triage`. Assert that the spec dispatch and the logic-review dispatch carry `inputs['shared-role.triage'] === 'orc-core:triage'`. Add one run with no `core` section (a `project({ core: false })` option) where no input key starts with `shared-role.`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orchestra/protocol.test.js test/orchestra/check.test.js test/orchestra/drive.test.js`
Expected: FAIL: `sharedRoles` is not a function; no result-rule line.

- [ ] **Step 3: Implement**

- `sharedRoles(resolved, config)`: from `resolved.slots.core` when `config.core.plugin` names it, each `shared-roles` entry gives `<plugin>:<skill>`. Then from `resolved.slots.project`: each `shared-roles` entry gives `.agents/skills/<name>/SKILL.md` (reuse `skillRef` from `gates.js` if it adds no require cycle; otherwise the same template), and each `guides` key in `SHARED_ROLES` gives `shared-role.<role>.guide` = `path.join(dir, file)`. Keys in `SHARED_ROLES` order.
- `withPrompt` and `inlinePrompt`: before `Inputs:`, the result-rule line of the test (in `withPrompt` only; inline actions are the Curator's), and, when any input starts with `shared-role.`, one line: "A `shared-role.<role>` input names a skill for that shared role: invoke it by name, or read it when it is a SKILL.md path, when your skill asks for that role. Also read its `.guide` input when there is one."
- `drive.js` `answer()`: merge `sharedRoles(load(root), readJson(path.join(root, CONFIG)))` into `inputs` of a `dispatch` or `inline` action before the prompt is built.
- `drive.js` `missingProjectFile`: add each project `shared-roles` skill path (guides are already covered).
- `check.js` `checkDeclaration`: a guide key is valid when it is in `STAGES`, or, for the `project` slot, in `SHARED_ROLES`. `checkProjectSlot`: a guide keyed by a shared role that no core `shared-roles` and no project `shared-roles` fills gives the test's line; check each project `shared-roles` skill file with `checkSkillFile`, like gate skills. The stage-guide rule skips shared-role keys.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra test
git commit -m "feat(orchestra): shared roles reach every dispatch; project override and amend (S87)"
```

---

### Task 4: Skills use a shared role only when it is given

**Files:**
- Modify: the ten judging skills: `plugins/orc-core/skills/clean-code/SKILL.md:62-67`, `plugins/orc-java-stack/skills/review-{comments,layout,logging,ops,testing}/SKILL.md` (steps 5-6), `plugins/orc-standard-workflow/skills/{logic-review,plan-check,plan-conformance}/SKILL.md` (the triage steps; `logic-review:47` and `plan-check:41` lose "(triage, B1)")
- Modify: `plugins/orchestra/skills/project/SKILL.md:40,47-51`, `plugins/orchestra/skills/writing-plugins/SKILL.md`
- Test: `test/packaging.test.js:35-45`

- [ ] **Step 1: Change the packaging test first**

The judging-skill test becomes "every judging skill uses the triage shared role only when it is given": each text matches `/If the input `shared-role\.triage` is given, follow that skill/` and does not match `/orchestra:triage|orc-core:triage|\(triage, B1\)/`. Keep the "no own bucket list" assertion. Add: `writing-plugins` matches `/ends with a PR/` and `/shared-role\.pr-review/`.

- [ ] **Step 2: Run the test to see it fail**

Run: `node --test test/packaging.test.js`
Expected: FAIL on every judging skill.

- [ ] **Step 3: Rewrite the triage steps, the same text in every skill**

Replace "Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket." with:
> If the input `shared-role.triage` is given, follow that skill: give every finding its axes and one bucket. Otherwise sort each finding by your own judgement: Decide (a person must answer it), Patch (you fix it), Evaluate (a person should look at it later) or Noise (not a real problem).

Replace "in the triage notes format" with "one line per finding with its bucket, in the triage notes format when a triage skill is given". Keep the Decide/Patch steps and the `counts` examples. Where a skill cites "(triage, B1)", keep the rule and drop the citation.

- [ ] **Step 4: Update `project` and `writing-plugins`**

- `project` step 3: a sixth topic, shared roles: replace one with a project skill (override) or add short rules to it (amend). Step 4: override goes under `shared-roles` in `.orchestra/project/orchestra.json`; amend is `.orchestra/project/guides/<shared role>.md` under `guides`. Replace the `orchestra:triage` sentence: a review skill uses the triage shared role only when it is given.
- `writing-plugins`, a section "Shared roles": the four roles; only `core` and the project fill them; each dispatch gets `shared-role.<role>` and maybe `shared-role.<role>.guide`. For a gate or a judging stage: "If the input `shared-role.triage` is given, follow that skill", and the same for `writing-style` where the skill writes for people. For a workflow author: ask whether the workflow ends with a PR; if so, its PR step invokes `shared-role.pr-review` and `shared-role.pr-description` when they are given. The result contract: `status`, `decide` (the run stops), `evaluate` (the report shows it); the triage method is optional.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins test
git commit -m "feat: skills use the triage shared role only when it is given (S87)"
```

---

### Task 5: The glossary, the design and the versions

**Files:**
- Modify: `docs/CONTEXT.md:14,22,28,29,30` (Global gates → **Core**; new row **Shared role**; Gate, Triage, Role → **Stage**, Guide)
- Modify: `docs/DESIGN.md:19,25-26,126-128,144,164,172,180,191,206-208,374,385-388,397,406,448,474,545,555`
- Modify: `plugins/*/plugin.json`, `plugins/*/.claude-plugin/plugin.json` (`0.22.0` → `0.23.0`)

- [ ] **Step 1: Update the glossary**

- **Core**: the plugin in the optional `core` slot (`orc-core`, S87, formerly global gates, S80). A person's or company's rules for every workflow: gates such as `clean-code`, and the shared roles it fills.
- **Shared role**: a company rule that orchestra passes to every dispatch, from a fixed list: `triage`, `writing-style`, `pr-review`, `pr-description`. Only the core slot fills one; a project overrides or amends it (S87).
- **Stage** (formerly Role): what a workflow stage does, from `spec`, `plan`, `code`.
- **Triage**: the optional method in `orc-core:triage`; the result contract is orchestra's.
- **Guide**: keyed by a stage, or, in the project, by a shared role.

- [ ] **Step 2: Update `DESIGN.md`**

At the listed lines: `orc-global-gates` → `orc-core`, `global-gates` → `core`, role → stage, `orchestra:triage` → `orc-core:triage` (optional), and one short section on shared roles after the gate section: the list, who fills them, the inputs, override and amend. The table header "Plugin | Role | Holds" (line 19) is a plain word; leave it.

- [ ] **Step 3: Bump the versions**

Set `"version": "0.23.0"` in both manifests of every plugin under `plugins/`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/CONTEXT.md docs/DESIGN.md plugins
git commit -m "docs: shared roles and the core slot in the design and the glossary; plugins 0.23.0 (S87)"
```

After the last task, tell the user which sections of `docs/guide.html` are now out of date (the slots, global gates, triage, roles/stages, guides, the plugin list), and offer to update them with version `0.23.0` and the last `S` number, S87.
