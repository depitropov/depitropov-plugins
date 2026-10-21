# Global Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new optional slot, `global-gates`, holds the gates that every workflow gets. `clean-code` moves into it, so a second workflow (Superpowers) keeps it with no copy.

**Architecture:** `global-gates` is a third gate provider, next to `workflow` and `stack-skills`. Its declaration holds only `slot`, `config` and `gates`. The gate runner already treats every provider the same way. A new plugin, `orc-global-gates`, fills the slot with the `clean-code` gate and skill, which move out of `orc-standard-workflow`. `logic-review` and `plan-conformance` stay in the workflow, because they read the workflow's own brief and plan.

**Tech Stack:** Node standard library only (`node:test`, `node:assert/strict`). Run all tests with `npm test`.

**Spec:** the design agreed in this conversation (2026-10-21). It is recorded as S80 in Task 1. In short:
- the slot is optional and named `global-gates`; it holds gates only (no guides, no build, no `measure`);
- only `clean-code` moves; `logic-review` and `plan-conformance` stay in `orc-standard-workflow`;
- with Superpowers, its own per-task reviews replace `logic-review`, so nothing is reviewed twice;
- provider order: `workflow`, then `global-gates`, then `stack-skills` (a change to S45);
- `measure` keeps working: `measureInputs` reads the Stack Skills from `resolved.json`, whatever slot the gate comes from;
- `orchestra:init` offers the slot; a project with no `global-gates` section has no `clean-code`.

## Global Constraints

- Slot name: `global-gates`. Plugin name: `orc-global-gates`.
- Declaration keys of the slot: exactly `['slot', 'config', 'gates']`.
- `PROVIDERS` order: `['workflow', 'global-gates', 'stack-skills']`.
- The `clean-code` gate declaration does not change: `{ "name": "clean-code", "phase": "implementation-check", "kind": "agent", "skill": "clean-code", "always": true, "measure": true }`.
- All plugin versions go to `0.18.0`, in both `plugin.json` and `.claude-plugin/plugin.json`.
- Every word that `check.js` adds to a key list is explained in `plugins/orchestra/skills/writing-plugins/SKILL.md` (the packaging test checks it).
- Prose in skills and docs follows the house style: short sentences, active voice, terms from `docs/CONTEXT.md`.

## Review Focus

- Two slots declare a gate with the same name (for example a workflow that still declares `clean-code`, and `orc-global-gates`). The runner keys result files and state by gate name, so the two gates share one result. Expected: `orchestra check --project` fails and names both plugins. Test in Task 1.
- A project config turns the gate off with `"global-gates": { "plugin": "orc-global-gates", "disable": ["clean-code"] }`. Expected: no `clean-code` in the phase. The test in Task 1 covers this through `collect`.
- A project with no `global-gates` section. Expected: the check passes (the slot is optional), and the phase runs without `clean-code`. Test in Task 1.
- A `global-gates` declaration with `guides`, `build` or `measure`. Expected: an "unknown key" line for each. Test in Task 1.
- A full run on the real `orc-standard-workflow` with `orc-global-gates` in the config. Expected: `clean-code` is dispatched as `orc-global-gates:clean-code`, after `logic-review`. Test in Task 2.

---

### Task 1: The `global-gates` slot in orchestra, with S80

**Files:**
- Modify: `plugins/orchestra/lib/check.js:12-18` (`SLOTS`, `DECLARATION_KEYS`), `checkProject` (new rule after the section loop)
- Modify: `plugins/orchestra/lib/gates.js:8` (`PROVIDERS`)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` (slot list, the `orchestra.json` table)
- Modify: `plugins/orchestra/skills/init/SKILL.md` (steps 2, 3, 4, 5)
- Modify: `docs/TENSIONS.md` (new row S80 after S79), `docs/DECISIONS.md` (new entry `## S80` at the end)
- Test: `test/orchestra/check.test.js`, `test/orchestra/gates.test.js`

**Interfaces:**
- Produces: `check.SLOTS` includes `'global-gates'`; `check.DECLARATION_KEYS['global-gates']` is `['slot', 'config', 'gates']`; `REQUIRED_SLOTS` is unchanged. `gates.collect(resolved, config, phase)` reads `resolved.slots['global-gates']` and `config['global-gates']`. `resolve.js` needs no change: it takes any `<slot>=<folder>`.

- [ ] **Step 1: Write the failing tests**

In `test/orchestra/check.test.js`:

```js
test('a global-gates declaration takes only slot, config and gates', () => {
  const gate = { name: 'shape', phase: 'implementation-check', kind: 'agent', skill: 'review-shape', always: true, measure: true };
  assert.deepEqual(errors({ slot: 'global-gates', config: {}, gates: [gate] }), []);
  for (const key of ['guides', 'build', 'measure']) {
    assert.match(errors({ slot: 'global-gates', gates: [], [key]: {} }).join('\n'), new RegExp(`unknown key "${key}" for slot global-gates`));
  }
});

test('a gate name declared by two slots fails, unless one section disables it', () => {
  const shape = { name: 'shape', phase: 'implementation-check', kind: 'agent', skill: 'review-shape', always: true };
  const wf2 = { slot: 'workflow', roles: ['code'], gates: [shape] };
  const gg = { slot: 'global-gates', gates: [shape] };
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, 'global-gates': { plugin: 'gg' } };
  assert.deepEqual(checkProject(project(config, { workflow: wf2, 'stack-skills': st, 'global-gates': gg })),
    ['.orchestra/config.json: gate "shape" is declared by both wf and gg. Fix: add "shape" to the "disable" list of one of the two sections, or rename it in one plugin.']);
  config['global-gates'].disable = ['shape'];
  assert.deepEqual(checkProject(project(config, { workflow: wf2, 'stack-skills': st, 'global-gates': gg })), []);
});
```

The existing test `'a valid project config passes'` already covers a project with no `global-gates` section, so it needs no new test. The helper `project(config, declarations)` (line 90) maps each slot to a plugin name: add `'global-gates': 'gg'` to that map.

In `test/orchestra/gates.test.js`:

```js
test('collect orders the providers workflow, global-gates, stack-skills, and honours disable', () => {
  const withGlobal = { slots: { ...resolved.slots, 'global-gates': { plugin: 'gg', dir: '/p/gg', declaration: { gates: [
    { name: 'clean-code', phase: 'implementation-check', kind: 'agent', skill: 'clean-code', always: true, measure: true },
  ] } } } };
  const gates = collect(withGlobal, {}, 'implementation-check');
  assert.deepEqual(gates.map(g => g.name), ['logic-review', 'clean-code', 'crap', 'arch']);
  assert.equal(gates[1].provider, 'global-gates');
  assert.equal(gates[1].plugin, 'gg');
  const off = collect(withGlobal, { 'global-gates': { disable: ['clean-code'] } }, 'implementation-check');
  assert.deepEqual(off.map(g => g.name), ['logic-review', 'crap', 'arch']);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orchestra/check.test.js test/orchestra/gates.test.js`
Expected: FAIL. The check gives `"slot" is "global-gates"`; `collect` returns no `clean-code`.

- [ ] **Step 3: Implement in `check.js` and `gates.js`**

- `check.js`: add `'global-gates'` to `SLOTS` (after `'stack-skills'`), and `'global-gates': ['slot', 'config', 'gates']` to `DECLARATION_KEYS`. Change the comment above `REQUIRED_SLOTS`: the curator and global-gates slots may be empty.
- `check.js`, `checkProject`: after the section loop, add the rule "a gate name is declared by one slot only". Look at each slot whose section names the resolved plugin and whose declaration is an object. Skip gate names in that section's `disable`. For each name seen in two slots, push the exact line of the test, with the two plugin names in `SLOTS` order. Keep the rule inside `checkProject`, next to the guide-role rule, with a one-line comment: the runner keys result files by gate name.
- `gates.js`: `PROVIDERS = ['workflow', 'global-gates', 'stack-skills']`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test test/orchestra/check.test.js test/orchestra/gates.test.js`
Expected: PASS.

- [ ] **Step 5: Update `writing-plugins`**

- Frontmatter description and first paragraph: a plugin fills one slot, `workflow`, `stack-skills`, `curator` or `global-gates`; the project must fill the first two; `curator` and `global-gates` are optional.
- Add one paragraph after the first: a `global-gates` plugin holds the gates that every workflow gets. Such a gate reads only the inputs every workflow gives (`spec`, `base`, `notes`, `decisions`, and the measure when it asks for it), never a workflow's own files such as its plan. A gate that reads them belongs in the workflow.
- Table: the `slot` row lists the four slots; the `gates` row reads `workflow`, `global-gates`, `stack-skills`.
- The order sentence after the gate table: inside a phase, orchestra orders by kind, then workflow gates, then global gates, then stack gates. A gate name is unique across the slots of a project; orchestra check fails on a name two slots declare.

- [ ] **Step 6: Update `init`**

- Description: "…which workflow, Stack Skills, Curator or global-gates plugin…".
- Step 2: the slot is `workflow`, `stack-skills`, `curator` or `global-gates`. Add `orc-global-gates` to the offered defaults.
- Step 3: one paragraph like the curator one. The `global-gates` slot is optional. When a global-gates plugin is in the list, ask the user if the project wants it: it holds the gates that every workflow runs, such as `clean-code`. Say that without it the project runs no `clean-code` gate.
- Step 4: add `"global-gates": { "plugin": "<global-gates plugin>" }` only when the user chose one.
- Step 5: add `global-gates=<folder>` to the `resolve.js` command when the config has the section.

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS. The packaging test `writing-plugins explains every word` passes with `global-gates` in the skill.

- [ ] **Step 8: Record S80**

`docs/TENSIONS.md`, a new row after S79, source "User decision 2026-10-21":
> S80 | Gates that every workflow gets live in a new optional slot, `global-gates`, filled by `orc-global-gates`. (1) Its declaration holds `slot`, `config` and `gates` only. (2) A global gate reads only what every workflow gives: `spec`, `base`, `notes`, `decisions`, and the measure. (3) `clean-code` moves there from `orc-standard-workflow`; `logic-review` and `plan-conformance` stay, because they read the workflow's own brief and plan. A Superpowers workflow relies on its own per-task reviews instead, so nothing is reviewed twice. (4) Provider order: workflow, global-gates, stack-skills. This changes S45. (5) A gate name is unique across a project's slots; orchestra check fails otherwise. (6) A project with no `global-gates` section runs no `clean-code`; `orchestra:init` offers the slot. This changes S75 (1). Full record: `docs/DECISIONS.md`.

`docs/DECISIONS.md`, `## S80: Gates that every workflow gets, in their own slot`, in the file's entry format. Options: (a) a new slot (chosen); (b) let a gate name a skill of another plugin, `plugin:skill` (smaller, but both workflows must be installed and each declares the gate again); (c) gates in the Curator slot (O13; wrong owner); (d) move `logic-review` too (rejected: it needs the given-when-then brief of `orc-standard-workflow:spec`). Evidence: the conversation of 2026-10-21 and the adapter backlog (O8) in `docs/TENSIONS.md`. Cost and risk: existing projects lose `clean-code` without the new section; the Superpowers review must cover what `logic-review` covered. O7 (General Knowledge) stays open. Where it lives: the files of Tasks 1 and 2.

- [ ] **Step 9: Commit**

```bash
git branch --show-current | grep -qx master && git switch -c feat/global-gates
git add plugins/orchestra test/orchestra docs/TENSIONS.md docs/DECISIONS.md
git commit -m "feat(orchestra): the optional global-gates slot (S80)"
```

---

### Task 2: The `orc-global-gates` plugin, with `clean-code` moved in

**Files:**
- Create: `plugins/orc-global-gates/plugin.json`, `plugins/orc-global-gates/.claude-plugin/plugin.json`, `plugins/orc-global-gates/orchestra.json`, `plugins/orc-global-gates/skills/manifest/SKILL.md`, `plugins/orc-global-gates/LICENSE`
- Move: `plugins/orc-standard-workflow/skills/clean-code/` → `plugins/orc-global-gates/skills/clean-code/` (`git mv`)
- Modify: `plugins/orc-standard-workflow/orchestra.json` (drop the `clean-code` gate)
- Modify: `plugins/orc-global-gates/skills/clean-code/SKILL.md` (the "Not yours" line)
- Modify: `.claude-plugin/marketplace.json`
- Test: `test/packaging.test.js`, `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: the `global-gates` slot of Task 1.
- Produces: the skill `orc-global-gates:clean-code`, dispatched with the inputs of today's gate.

- [ ] **Step 1: Change the tests first**

- `test/packaging.test.js`: in `REFERENCED`, replace `'orc-standard-workflow/clean-code'` with `'orc-global-gates/clean-code'` and add `'orc-global-gates/manifest'`. In the judging-skill test, take `clean-code` from `orc-global-gates`. In the clean-code gate test, read `plugins/orc-global-gates/orchestra.json` and `plugins/orc-global-gates/skills/clean-code/SKILL.md`; also assert that `orc-standard-workflow/orchestra.json` declares no `clean-code` gate.
- `test/orchestra/drive.test.js`, `project()`: add `config['global-gates'] = { plugin: 'orc-global-gates' }` and `dirs['global-gates'] = path.join(PLUGINS, 'orc-global-gates')`. In `afterReview`, expect `cc.skill` to be `'orc-global-gates:clean-code'`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/packaging.test.js test/orchestra/drive.test.js`
Expected: FAIL: the plugin folder `orc-global-gates` is missing.

- [ ] **Step 3: Make the plugin and move the skill**

- Both manifests: `{ "name": "orc-global-gates", "version": "0.18.0", "description": "Gates that every orchestra workflow runs: clean-code." }`.
- `orchestra.json`: `{ "slot": "global-gates", "config": {}, "gates": [ <the clean-code gate of Global Constraints> ] }`.
- `skills/manifest/SKILL.md`: copy the one of `orc-ts-stack`, with the plugin name changed.
- `LICENSE`: copy the one of `orc-ts-stack`.
- `git mv plugins/orc-standard-workflow/skills/clean-code plugins/orc-global-gates/skills/clean-code`.
- Remove the `clean-code` entry from the `gates` list of `plugins/orc-standard-workflow/orchestra.json`.
- In the moved `SKILL.md`, the last line before `## Result` names gates of one workflow. Replace it with: `Not yours: whether the behaviour is right and whether the plan was followed (the workflow's own reviews), log statements, formatting.`
- `.claude-plugin/marketplace.json`: add `{ "name": "orc-global-gates", "source": "./plugins/orc-global-gates", "description": "Gates that every orchestra workflow runs: clean-code." }` after `orc-standard-workflow`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS. `checkPlugin` passes on `orc-global-gates`, and the drive test reaches `orc-global-gates:clean-code` after `logic-review`.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-global-gates plugins/orc-standard-workflow .claude-plugin/marketplace.json test
git commit -m "feat(orc-global-gates): clean-code moves out of the workflow (S80)"
```

---

### Task 3: The design docs and the versions

**Files:**
- Modify: `docs/CONTEXT.md` (the Gate and Slot rows; a new row **Global gates**)
- Modify: `docs/DESIGN.md:25,335,400,470` and the plugin list near line 470
- Modify: `plugins/*/plugin.json` and `plugins/*/.claude-plugin/plugin.json` (`0.17.0` → `0.18.0`, all plugins)

- [ ] **Step 1: Update the glossary**

- New row after **Stack Skills**: `**Global gates** | The plugin in the optional `global-gates` slot (`orc-global-gates`, S80). It declares the gates that every workflow gets, such as `clean-code`. Such a gate reads only what every workflow gives, never a workflow's own files.`
- Gate row: "The workflow, the global-gates plugin or the Stack Skills declares it."

- [ ] **Step 2: Update `DESIGN.md`**

- The plugin table (line 25 area): add `orc-global-gates` with its job.
- The gate table (line 335 area): `clean-code` is declared by `orc-global-gates`, not the workflow.
- Line 400 area: the measure goes to a gate that asks for it, in any slot.
- The file tree (line 470 area): drop `clean-code` from the `orc-standard-workflow` skills; add `orc-global-gates/` with `orchestra.json` and `skills/{manifest,clean-code}/SKILL.md`.
- Where the design states the provider order of S45, add `global-gates` between workflow and stack.

- [ ] **Step 3: Bump the versions**

Set `"version": "0.18.0"` in both manifests of every plugin under `plugins/`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS (the packaging test checks that both manifests agree).

- [ ] **Step 5: Commit**

```bash
git add docs/CONTEXT.md docs/DESIGN.md plugins
git commit -m "docs: global gates in the design and the glossary; plugins 0.18.0 (S80)"
```

After the last task, tell the user which sections of `docs/guide.html` are now out of date (the slots, the gates and phases, the plugin list), and offer to update them with the version `0.18.0` and the last `S` number, S80.
