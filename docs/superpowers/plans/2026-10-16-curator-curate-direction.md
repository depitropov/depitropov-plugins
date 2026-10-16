# Curator: Curate and Direction (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `orc-curator` plugin with its declaration, templates, references, a minimal `setup`, the three guides (`spec-guide`, `plan-guide`, `code-guide`), the `direction` sweep and the `curate` skill, all ported from minions, and close the two points that plan 1 deferred to this plan.

**Architecture:** `orc-curator` fills the `curator` slot that plan 1 built. Its declaration names `curate`, `setup` (`done: docs/curator/.setup`) and a guide for each role. Every skill is a `SKILL.md` port from minions' long-term tier, rewritten for one mode, the fixed `docs/curator/` folder, no `STATE.md`, and orchestra's `inline` action. `setup` here is a minimal one that copies the templates; plan 3 replaces it with the `shape-project` port.

**Tech Stack:** Markdown skills; Node 22 `node:test` for the text and contract tests; no runtime code in the plugin.

**Spec:** `docs/superpowers/specs/2026-10-16-curator-design.md` (sections "The `orc-curator` plugin", "Curate in a run", "Plans" item 2). Decision: S76. Plan 1: `docs/superpowers/plans/2026-10-16-curator-contract.md`.

**Source:** `~/Projects-other/claude-minions`. Read `docs/PORTING.md` "Steps for every port" before Tasks 1–4. The section "minions" of `docs/PORTING.md` lists every part of each source file and its status. Port from the source files themselves, read in full, never from `PILLARS.md`, `DESIGN.md` or this plan.

## Global Constraints

- Plugin name `orc-curator`, folder `plugins/orc-curator/`, version `0.14.0`. In the final task all six plugins move to `0.14.0`, in both `plugin.json` and `.claude-plugin/plugin.json`.
- The docs folder in a project is fixed: `docs/curator/`, with `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`, `CONTEXT.md`, `TECH.md`, `research/`, and the setup flag `docs/curator/.setup`.
- One mode only (minions' `vibe`). No `config.yml`, no `STATE.md`, no `.minions/` roots, no `apply` setting, no `--light`, no journal, no knowledge ledger, no skills/rules/`CLAUDE.md` writes (the code-knowledge half waits for the PSK, S76).
- The ids are `Bn`, `Cn`, `Dn`, `Qn`: independent, the next id is the highest existing plus one, never reused.
- `curate` and `setup` run inline in the main session and may ask the user, one question at a time. The guides run inside stage subagents and never ask the user.
- Inside a run, `curate` is the only writer of the docs. The spec stage only reads them (the spec guide). No run moves a backlog row to Now.
- Research stays out of the spec and plan stages (S76): no guide invokes `orc-curator:research`. A guide may still say "a research-shaped gap" when it tells the stage to list one.
- Every `SKILL.md` frontmatter has only `name` and `description`; `name` equals the folder name. Skill text names actions, never harness tool names (`check.js` `HARNESS_WORDS`: `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p`).
- Skill text is ASD-STE-100 simple English and uses the names in `docs/CONTEXT.md`. Keep the substance of the source; rewrite its form.
- Each port task updates the "Where now" and status of the PORTING rows it ports, in the same commit (`docs/PORTING.md` step 5).
- Run all tests with `npm test` from the repo root. Every task ends with `npm test` green.

## Review Focus

1. **A project whose backlog row was dropped while the run was open** (`Serves: B7`, but B7 is not in Now or Next any more). Expected: curate asks the user — add it as shipped, or record the work with no row — and never silently adds a row or skips the work. Pinned in Task 4 (text test).
2. **A run with `Serves: new`.** Expected: curate adds one row straight to Shipped, with the next `Bn`, and moves no other row. Pinned in Task 4.
3. **A run whose brief has no `## Direction` section** (a workflow without the spec guide, or a disabled spec guide). Expected: curate does not fail; it asks the user which row the work served, or records it as new. Pinned in Task 4.
4. **The user stops the session in the middle of curate, then resumes.** Expected: the resume names the uncommitted files and says to discard them, so curate starts again from the committed docs. Pinned in Task 5 (drive test).
5. **A guide in a stage subagent tries to talk to the user or write a doc.** Expected: the guide text forbids both. Pinned in Task 2 (text test).

---

### Task 1: The plugin, its declaration, templates, references and a minimal setup

**Files:**
- Create: `plugins/orc-curator/plugin.json`, `plugins/orc-curator/.claude-plugin/plugin.json`
- Create: `plugins/orc-curator/orchestra.json`
- Create: `plugins/orc-curator/skills/manifest/SKILL.md`
- Create: `plugins/orc-curator/skills/setup/SKILL.md` (minimal; plan 3 replaces it)
- Create: `plugins/orc-curator/skills/spec-guide/SKILL.md`, `plan-guide/SKILL.md`, `code-guide/SKILL.md`, `curate/SKILL.md`, `direction/SKILL.md` — each a stub with frontmatter and one line "Ported in Task <n>." so the declaration checks pass; Tasks 2–4 replace them
- Create: `plugins/orc-curator/templates/BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`, `CONTEXT.md`, `TECH.md`
- Create: `plugins/orc-curator/references/recording-rules.md`, `plugins/orc-curator/references/glossary.md`
- Modify: `.claude-plugin/marketplace.json` (add the plugin)
- Modify: `docs/PORTING.md` (rows of the templates, `recording-rules`, `glossary`)
- Create: `test/orc-curator/plugin.test.js`

**Source:** `templates/BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`, `CONTEXT.md`, `TECH.md`, `references/recording-rules.md`, `references/glossary.md`.

**Ruling in the plan:** the spec puts `glossary` in plan 3, but `curate` edits CONTEXT in this plan and minions' curator cites `glossary.md`. It moves here.

**Interfaces:**
- Consumes: plan 1's `curator` slot contract (`check.js` `DECLARATION_KEYS.curator`, `SETUP_KEYS`).
- Produces:
  - The declaration, exactly:
    ```json
    {
      "slot": "curator",
      "config": {},
      "curate": "curate",
      "setup": { "skill": "setup", "done": "docs/curator/.setup" },
      "guides": { "spec": "spec-guide", "plan": "plan-guide", "code": "code-guide" }
    }
    ```
  - `<plugin>/templates/<FILE>.md` for the seven docs; `<plugin>/references/recording-rules.md` and `glossary.md`. Later skills cite them as "the template `templates/<FILE>.md` of this plugin" and "the reference `references/<name>.md` of this plugin", found two folders above the skill's own folder.

- [ ] **Step 1: Write the failing test**

Create `test/orc-curator/plugin.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkPlugin } = require('../../plugins/orchestra/lib/check');

const DIR = path.join(__dirname, '../../plugins/orc-curator');
const read = rel => fs.readFileSync(path.join(DIR, rel), 'utf8');
const DOCS = ['BACKLOG', 'PRODUCT', 'DIRECTION', 'DECISIONS', 'QUESTIONS', 'CONTEXT', 'TECH'];

test('orc-curator passes orchestra check and declares the curator slot', () => {
  assert.deepEqual(checkPlugin(DIR), []);
  assert.deepEqual(JSON.parse(read('orchestra.json')), {
    slot: 'curator',
    config: {},
    curate: 'curate',
    setup: { skill: 'setup', done: 'docs/curator/.setup' },
    guides: { spec: 'spec-guide', plan: 'plan-guide', code: 'code-guide' },
  });
});

test('the plugin ships a template for each doc and the two references', () => {
  for (const d of DOCS) assert.ok(fs.existsSync(path.join(DIR, 'templates', `${d}.md`)), d);
  assert.match(read('templates/BACKLOG.md'), /^## Vision$/m);
  for (const h of ['Now', 'Next', 'Later', 'Shipped']) assert.match(read('templates/BACKLOG.md'), new RegExp(`^## ${h}$`, 'm'));
  for (const h of ['Constraints', 'Size', 'Evaluated']) assert.match(read('templates/DIRECTION.md'), new RegExp(`^## ${h}$`, 'm'));
  assert.match(read('templates/DIRECTION.md'), /\| id \| from \| constraint \| status \|/);
  assert.match(read('templates/DIRECTION.md'), /\| Bn \| horizon at eval \| date \| outcome \|/);
  assert.match(read('references/recording-rules.md'), /hard:/);
  assert.match(read('references/recording-rules.md'), /soft:/);
  assert.match(read('references/glossary.md'), /_Avoid_/);
});

test('the templates and references name no minions paths, modes or state', () => {
  for (const f of [...DOCS.map(d => `templates/${d}.md`), 'references/recording-rules.md', 'references/glossary.md']) {
    const text = read(f);
    assert.doesNotMatch(text, /\/minions:|\.minions|docs\/minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b/, f);
  }
});

test('the minimal setup copies the templates into docs/curator and writes the flag last', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /docs\/curator\//);
  assert.match(text, /docs\/curator\/\.setup/);
  assert.match(text, /last/);
  assert.match(text, /never overwrite/i);
});

test('the marketplace lists orc-curator', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.claude-plugin/marketplace.json'), 'utf8'));
  assert.ok(m.plugins.some(p => p.name === 'orc-curator' && p.source === './plugins/orc-curator'));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/plugin.test.js`
Expected: FAIL (`ENOENT` on `plugins/orc-curator`).

- [ ] **Step 3: The manifests, the declaration and the manifest skill**

`plugins/orc-curator/plugin.json` and `plugins/orc-curator/.claude-plugin/plugin.json`, both:

```json
{
  "name": "orc-curator",
  "version": "0.14.0",
  "description": "The Curator: keeps a project's backlog, product, direction, decisions, questions and glossary current, by hand or at the end of every orchestra run."
}
```

`plugins/orc-curator/orchestra.json`: the declaration in "Produces" above.

`plugins/orc-curator/skills/manifest/SKILL.md`:

```markdown
---
name: manifest
description: Reports where the orc-curator plugin is installed. Invoked by orchestra run during resolution; not for direct use.
---

# Manifest

Find the folder that holds this `SKILL.md`. Go two folders up. That folder holds `orchestra.json`.
Check that the file exists.

Answer with exactly one line and nothing else:

PLUGIN_DIR=<absolute path of that folder>
```

The five stubs (`spec-guide`, `plan-guide`, `code-guide`, `curate`, `direction`), each:

```markdown
---
name: <folder name>
description: <one line; Tasks 2–4 write the real one>
---

Ported in Task <2, 3 or 4>.
```

In `.claude-plugin/marketplace.json`, add to `plugins`:
`{ "name": "orc-curator", "source": "./plugins/orc-curator", "description": "The Curator: the project's direction docs, by hand or after every run." }`

- [ ] **Step 4: Port the templates and the two references**

Read each source file in full (`~/Projects-other/claude-minions/templates/<FILE>.md`, `references/recording-rules.md`, `references/glossary.md`). For each, follow the PORTING rows of its block in `docs/PORTING.md` section "minions". Write the target under `plugins/orc-curator/templates/` or `references/`. Keep every heading and table of the source. Rewrite:
- every minions path to `docs/curator/<FILE>.md`; `CONTEXT.md` lives in `docs/curator/`, not at the repo root;
- every `/minions:<skill>` to `orc-curator:<skill>` (`setup` for `shape-project`); a skill not built yet keeps its name (`orc-curator:shape-product`, `shape-tech`, `research`, `backlog`);
- remove every `vibe`/`maintain` split (one mode), every `STATE.md`, `config.yml` and `--auto` mention;
- `DIRECTION.md` `## Evaluated`: the reason for "`horizon at eval` is information" becomes "a row moves between Now and Next by hand" (S76: no run moves a row to Now);
- `BACKLOG.md` `## Shipped`: "shipped as" is the run's branch or commit range;
- simple English (ASD-STE-100).

- [ ] **Step 5: The minimal setup**

`plugins/orc-curator/skills/setup/SKILL.md`:

```markdown
---
name: setup
description: Use when a project has no Curator docs yet — "set up the curator", or when orchestra run asks for the Curator's setup. Creates docs/curator/ from the templates. A minimal version; the interview comes later.
---

# Curator setup

You create the Curator's docs in the project. This version copies the templates; it does not
interview the user.

`<plugin>` is the folder two levels above this skill's folder. When orchestra runs you, work in the
worktree that the prompt names, and read `done` from the inputs (`docs/curator/.setup`).

1. For each of `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`,
   `CONTEXT.md` and `TECH.md`: when `docs/curator/<FILE>` does not exist, copy
   `<plugin>/templates/<FILE>` there. Never overwrite a file that exists.
2. Create `docs/curator/research/` with an empty `.gitkeep` when it does not exist.
3. Tell the user which files you created, and that they fill `PRODUCT.md` and the backlog rows, or
   run the setup interview when it exists.
4. Commit the new files: `docs(curator): setup`.
5. Write the empty file `docs/curator/.setup` last, and commit it: `docs(curator): setup done`.
   A setup that stops before this step runs again.
6. When orchestra runs you, write the result JSON `{ "status": "ok" }` to the path the prompt
   names. On an error, write `{ "status": "failed", "reason": "<what failed>" }`.

## Permitted actions

Create files under `docs/curator/` only. Do not change other files. Do not push.
```

- [ ] **Step 6: PORTING rows**

In `docs/PORTING.md` section "minions", set the rows of the blocks `templates/BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`, `CONTEXT.md`, `TECH.md`, `references/recording-rules.md` and `references/glossary.md` that this task ports from `planned (…)` to `ported` (or `ported (changed, S76)` where the row says changed), with "Where now" naming the target file. Leave rows that name a skill of Tasks 2–4 or of plans 3–4 as they are.

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS. The packaging test "orchestra check passes on every plugin" now covers `orc-curator`.

- [ ] **Step 8: Commit**

```bash
git add plugins/orc-curator .claude-plugin/marketplace.json docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): the plugin, its templates, references and a minimal setup (S76)"
```

---

### Task 2: The three guides

**Files:**
- Modify: `plugins/orc-curator/skills/spec-guide/SKILL.md`, `plan-guide/SKILL.md`, `code-guide/SKILL.md` (replace the stubs)
- Modify: `docs/PORTING.md` (the guide rows of the blocks `skills/specify/SKILL.md`, `skills/plan/SKILL.md`, `docs/CONTRACTS.md`)
- Create: `test/orc-curator/guides.test.js`

**Source:** `skills/specify/SKILL.md`, `skills/plan/SKILL.md`, `docs/CONTRACTS.md`, read in full. Port only the parts that PORTING maps to `orc-curator:spec-guide`, `plan-guide` or `code-guide`.

**Interfaces:**
- Consumes: Task 1's templates and references.
- Produces: the brief section that `curate` (Task 4) reads, exactly:
  ```markdown
  ## Direction
  - Serves: B<n> | new
  - Deferred: <a want this task leaves for later> — <why later>
  - Question: <a research-shaped or product gap, for a Qn>
  ```
  `Serves` appears once. `Deferred` and `Question` appear zero or more times.

- [ ] **Step 1: Write the failing test**

Create `test/orc-curator/guides.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills', name, 'SKILL.md'), 'utf8');

test('every guide reads the docs only and never talks to the user', () => {
  for (const g of ['spec-guide', 'plan-guide', 'code-guide']) {
    const text = read(g);
    assert.match(text, /docs\/curator\//, g);
    assert.match(text, /Do not ask the user/, g);
    assert.match(text, /Do not (change|write|edit) (any|a) file under `docs\/curator\/`/, g);
    assert.doesNotMatch(text, /orc-curator:research|research first/, `${g}: research stays out of spec and plan (S76)`);
  }
});

test('the spec guide asks for the Direction section of the brief', () => {
  const text = read('spec-guide');
  assert.match(text, /^## Direction$/m);
  assert.match(text, /- Serves: B<n> \| new/);
  assert.match(text, /- Deferred:/);
  assert.match(text, /- Question:/);
  assert.match(text, /never Later/i);
});

test('the plan guide makes DIRECTION binding and keeps the plan to this task', () => {
  const text = read('plan-guide');
  assert.match(text, /docs\/curator\/DIRECTION\.md/);
  assert.match(text, /binding where it applies/);
  assert.match(text, /context, never scope/);
  assert.match(text, /Never write a `Bn`, `Cn`, `Dn` or `Qn`/);
});

test('the code guide keeps CONTEXT names and cites only Dn in code', () => {
  const text = read('code-guide');
  assert.match(text, /docs\/curator\/CONTEXT\.md/);
  assert.match(text, /`Dn`/);
  for (const id of ['`Cn`', '`Bn`', '`Tn`', '`ACn`']) assert.ok(text.includes(id), id);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/guides.test.js`
Expected: FAIL (the stubs).

- [ ] **Step 3: Port the guides**

Each guide is short: 5–15 rules (R3), as an orchestra guide is. Frontmatter `description` starts with "A guide for the <role> stage of an orchestra run:" and says it is invoked by the stage, not by hand.

- `spec-guide` (role `spec`): the PORTING rows of `skills/specify/SKILL.md` that point at `orc-curator:spec-guide`. It tells the spec stage to read `docs/curator/BACKLOG.md` (Vision, Now, Next; never Later), `PRODUCT.md` (why it is shaped this way, deliberately not — not what it does), `TECH.md` and `CONTEXT.md` (write the brief in its words); to match the task to one backlog row by judgement, without stretching, else `new`; to list deferred wants as `Deferred` lines, not as non-goals; to list research-shaped or product gaps as `Question` lines, and a one-way tech choice as a `business fact:` line of the brief; to never derive cross-feature pressure (the direction sweep owns it); to record a word the task gives, never one it concluded; to write the `## Direction` section of "Produces" at the end of the brief. When `docs/curator/` does not exist, the guide does nothing.
- `plan-guide` (role `plan`): the rows of `skills/plan/SKILL.md` that point at `orc-curator:plan-guide`: DIRECTION is binding where it applies, a requirement, not context; for each `Cn` the plan touches, the plan says which task satisfies it and how; a row it cannot satisfy is a warning in the plan that names the `Cn`, never a silent skip; for a row `satisfied by <path>`, read that file; BACKLOG Vision, Now and Next are context, never scope, never Later; read PRODUCT and TECH; use the CONTEXT words in the approach and the task titles, a clash is a warning; the plan lists the `Cn` rows that apply, each with its task, under its approach; plan only this task; never write a `Bn`, `Cn`, `Dn` or `Qn`. The plan-check stage gets the same guide (role `plan`) and checks these points.
- `code-guide` (role `code`): name new things in the words of `docs/curator/CONTEXT.md`, and never use a word that its `_Avoid_` lists; a code comment may cite a `Dn` (a decision of `docs/curator/DECISIONS.md`), never a `Cn`, `Bn`, `Tn` or `ACn`, because those ids change or go away.

Each guide ends with "## Permitted actions": "Read the files under `docs/curator/`. Do not change any file under `docs/curator/`; the Curator updates them at the end of the run. Do not ask the user."

- [ ] **Step 4: PORTING rows**

Set the guide rows of the blocks `skills/specify/SKILL.md`, `skills/plan/SKILL.md` and `docs/CONTRACTS.md` to `ported` with "Where now" naming the guide.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): the spec, plan and code guides (S76)"
```

---

### Task 3: The direction sweep

**Files:**
- Modify: `plugins/orc-curator/skills/direction/SKILL.md` (replace the stub)
- Modify: `docs/PORTING.md` (block `skills/direction/SKILL.md`)
- Create: `test/orc-curator/direction.test.js`

**Source:** `skills/direction/SKILL.md` (296 lines), `templates/DIRECTION.md`, `references/recording-rules.md`, `references/interview-cadence.md`, `references/ask-vs-research.md` — read in full.

**Interfaces:**
- Consumes: `templates/DIRECTION.md`, `references/recording-rules.md` (Task 1).
- Produces: `orc-curator:direction`, invoked by `curate` (Task 4) with the line "Caller: curate" and, when it has one, the diff evidence (a shipped change that contradicts a live `Cn`, or a row recorded as owing no constraint that the diff undermines). Its return block, the last thing in its reply:
  ```
  Result: ok | blocked | needs-input
  Wrote: <files, or "nothing — every near-term row was already current">
  Coverage: <N near-term rows · M already current · K evaluated this run · J orphans retired>
  Summary: <one line per row evaluated, with its verdict>
  Escalated: <"shape-tech — <dimension>" | "setup — purpose change" | "none">
  Deviations/Warnings: <or "none">
  ```

- [ ] **Step 1: Write the failing test**

Create `test/orc-curator/direction.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills/direction/SKILL.md'), 'utf8');

test('the sweep computes what is owed from Now, Next and the Evaluated table', () => {
  assert.match(text, /docs\/curator\/DIRECTION\.md/);
  assert.match(text, /## Evaluated/);
  assert.match(text, /orphan/i);
  assert.match(text, /never read `## Later`|Never read `## Later`/);
  assert.match(text, /no constraint/);
});

test('it reaches one verdict per owed row, and asks only what changes a constraint', () => {
  for (const v of ['no constraint', 'write a `Cn`', 'research first', 'open a `Qn`', 'escalate', 'purpose change']) assert.ok(text.includes(v), v);
  assert.match(text, /one question at a time/i);
});

test('it writes only DIRECTION and QUESTIONS, never the backlog or a design', () => {
  assert.match(text, /never edit `docs\/curator\/BACKLOG\.md`|no `BACKLOG\.md` edits/i);
  assert.match(text, /never a schema|Never write a schema/i);
  assert.match(text, /from B/);
});

test('it names its callers and ends with the return block', () => {
  assert.match(text, /Caller: curate/);
  for (const line of ['Result:', 'Wrote:', 'Coverage:', 'Summary:', 'Escalated:', 'Deviations/Warnings:']) assert.ok(text.includes(line), line);
});

test('it carries no minions state or modes', () => {
  assert.doesNotMatch(text, /STATE\.md|config\.yml|\.minions|\/minions:|\bmaintain\b|\bvibe\b/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/direction.test.js`
Expected: FAIL (the stub).

- [ ] **Step 3: Port the direction skill**

Read `skills/direction/SKILL.md` in full and its block in PORTING. Port every `planned` part, in the source's order: callers (curate, backlog, setup, by hand), the investigation (BACKLOG Vision/Now/Next, never Later; DIRECTION; DECISIONS; open QUESTIONS; TECH; PRODUCT for a purpose change only; `docs/curator/research/` notes by their `For:` line; the real code), the owed set as arithmetic (the table of conditions), one verdict per owed row (the verdict table), the research step, the write rules (`Cn` rows with `from Bn`, forward pressure not design, no architecture doctrine, status checked in the file, the 50-row cap; one `## Evaluated` row per verdict, overwritten, not appended; retire orphans and their Evaluated rows; mark satisfied; a contradicted `Cn` gets a fresh verdict; `Qn` entries), the relay and the return block, and the hard gate.

Changes from the source (S76):
- No `STATE.md`, no guard on a workflow in flight, no `config.yml`, no modes; PRODUCT is always read for a purpose change.
- Questions go to the user one at a time (it runs in the main session, by hand or from `curate`).
- `research first` invokes `orc-curator:research`, and `escalate one dimension` invokes `orc-curator:shape-tech`. When that skill is not installed, ask the user the question it would settle, or open a `Qn`, and say so in the relay.
- `FLAG a purpose change` names `orc-curator:setup`, not shape-project.
- Commit: when invoked by hand, commit `docs/curator/` with `docs(direction): <n> constraints`. When `curate` invokes it ("Caller: curate"), do not commit; `curate` commits once.
- The template migration (an old DIRECTION.md without `## Evaluated`) is dropped (S76: new projects only).

- [ ] **Step 4: PORTING rows**

Set the ported rows of block `skills/direction/SKILL.md` to `ported` or `ported (changed, S76)`, "Where now" `orc-curator:direction`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): the direction sweep (S76)"
```

---

### Task 4: Curate

**Files:**
- Modify: `plugins/orc-curator/skills/curate/SKILL.md` (replace the stub)
- Modify: `docs/PORTING.md` (blocks `agents/curator.md`, `skills/curate/SKILL.md`, `templates/CURATE.md`)
- Create: `test/orc-curator/curate.test.js`

**Source:** `agents/curator.md` (342 lines) and `skills/curate/SKILL.md` (211 lines), read in full, plus `templates/CURATE.md`. Port only the direction-doc half; every row that PORTING marks `dropped (S76: waits for PSK)` stays out.

**Interfaces:**
- Consumes: the brief's `## Direction` section (Task 2), `orc-curator:direction` and its return block (Task 3), the templates and references (Task 1), orchestra's `inline` contract (inputs `base`, `brief`, `notes`; result JSON at the path the prompt names).
- Produces: `orc-curator:curate`, the skill that the declaration's `curate` names.

- [ ] **Step 1: Write the failing test**

Create `test/orc-curator/curate.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills/curate/SKILL.md'), 'utf8');

test('curate takes the inline inputs and runs by hand on a commit range', () => {
  for (const input of ['`base`', '`brief`', '`notes`']) assert.ok(text.includes(input), input);
  assert.match(text, /by hand/i);
  assert.match(text, /commit range/i);
});

test('it ships the served row, or adds a new one, and asks when the row was dropped', () => {
  assert.match(text, /## Direction/);
  assert.match(text, /Serves: B<n>|`Serves`/);
  assert.match(text, /`## Shipped`/);
  assert.match(text, /Serves: new|`new`/);
  assert.match(text, /dropped while the run was open|was dropped/);
  assert.match(text, /no `## Direction` section|has no Direction section/i);
});

test('it subtracts as well as adds: PRODUCT, Vision, QUESTIONS, CONTEXT and DIRECTION', () => {
  assert.match(text, /docs\/curator\/PRODUCT\.md/);
  assert.match(text, /## Vision/);
  assert.match(text, /answered → D/);
  assert.match(text, /docs\/curator\/CONTEXT\.md/);
  for (const check of ['satisfied by', 'orphan', 'retire']) assert.match(text, new RegExp(check, 'i'), check);
  assert.match(text, /orc-curator:direction/);
  assert.match(text, /Caller: curate/);
});

test('sure edits and answers are committed once; a judgement call is a question', () => {
  assert.match(text, /one question at a time/i);
  assert.match(text, /one commit/i);
  assert.match(text, /\{ "status": "ok" \}/);
  assert.match(text, /"status": "failed"/);
});

test('it never writes code knowledge and carries no minions state', () => {
  assert.doesNotMatch(text, /knowledge-ledger|promote_threshold|\.claude\/rules|STATE\.md|config\.yml|\.minions|\/minions:|journal/);
  assert.match(text, /Do not change files outside `docs\/curator\/`/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/curate.test.js`
Expected: FAIL (the stub).

- [ ] **Step 3: Port curate**

Read both source files in full and their PORTING blocks. Write one skill, `orc-curator:curate`, that merges the curate step and the curator agent (S76: curate is one skill, it runs inline). Its structure:

1. **Inputs.** From orchestra: `base`, `brief`, `notes`, and the result path in the prompt. By hand: the user names a commit range (`<base>..HEAD`); there is no brief, so the served row comes from the user.
2. **Read every input first.** The diff from `base` (`git diff <base>..HEAD`, excluding `docs/runs/` and `docs/curator/`); the brief and its `## Direction` section; `<notes>/decisions.md` when it exists (the product answers of the run); every doc under `docs/curator/`; `DECISIONS.md` for the next `Dn` and for contradictions. A missing `docs/curator/` → result `failed`, reason "the Curator is not set up; run orc-curator:setup".
3. **The served row.** `Serves: B<n>` in Now or Next → move it to `## Shipped` with the run's branch or commit range as "shipped as". `Serves: new` → add one row straight to `## Shipped` with the next `Bn`. The row was dropped while the run was open (not in Now, Next or Later) → ask the user: add it as shipped, or record the work with no row. The brief has no `## Direction` section → ask the user which row the work served, or `new`.
4. **Every candidate gets one verdict:** ADD, UPDATE, NOOP (with a reason) or a question to the user (the source's FLAG). Before a verdict: the 3-question filter (inferable? a choice? checkable?), the dedup check, verify against the code, the prune test.
5. **Route by the Step C table, direction-doc rows only:** the why → DECISIONS (next `Dn`, `Why` opens with `hard:` or `soft:` per `references/recording-rules.md`); what the product is → PRODUCT, only what is true now, never a feature inventory (the delete-a-row test); a settled rationale → PRODUCT "Why it's shaped this way", citing the `Dn`; Vision prose the diff made real → delete it (one clause may go to PRODUCT); an idea or a `Deferred` line → BACKLOG Next or Later (next `Bn`); a `Question` line → a new `Qn` `· open`; a question the code settled → `· answered → Dn` plus one sentence; a domain term → CONTEXT, edited in place, per `references/glossary.md`.
6. **Subtract.** PRODUCT: remove what the diff made false; unbuilt aspiration moves to Vision. Vision: rewrite prose that promised a row now dropped or in Later. CONTEXT: delete a term whose concept the diff retired. Removal is tiered: delete only on a plain contradiction; anything else is a question.
7. **DIRECTION.** The four checks: satisfied by `<path>`, retire satisfied rows whose `Bn` shipped, delete orphans, the 50-row cap. Then invoke `orc-curator:direction` with "Caller: curate" and the diff evidence when there is any (a shipped change contradicts a live `Cn`; a row recorded as owing no constraint is undermined). Fold its `Coverage:` line into the summary.
8. **Questions.** Ask the user each judgement call, one at a time, with the file, the sentence and the reason. Apply each answer.
9. **Commit once:** all sure edits and applied answers under `docs/curator/`, `docs(curator): curate <branch or range>`. Never push.
10. **Result.** When orchestra runs it, write `{ "status": "ok" }` to the result path. On an unreadable input or an error, `{ "status": "failed", "reason": "<what>" }`. Then tell the user the summary: the served row, verdict counts, the questions asked, the sweep's coverage.

End with "## Permitted actions": "Do not change files outside `docs/curator/`. Do not push. The only skill you invoke is `orc-curator:direction`."

- [ ] **Step 4: PORTING rows**

Set the ported rows of the blocks `agents/curator.md`, `skills/curate/SKILL.md` and `templates/CURATE.md` to `ported` or `ported (changed, S76)`, "Where now" `orc-curator:curate`. Where a row still says "questions → Decide" or "orchestra dispatches", change it to the inline mechanism (S76: curate runs inline and asks the user directly).

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): curate, the single writer at the end of a run (S76)"
```

---

### Task 5: The two points deferred from plan 1, the design and the version

**Files:**
- Modify: `plugins/orchestra/bin/drive.js` (the resume dirty-files reason)
- Modify: `test/orchestra/drive.test.js`
- Modify: `docs/DESIGN.md` (§2 plugins table, §9a)
- Modify: all twelve manifests `plugins/*/plugin.json`, `plugins/*/.claude-plugin/plugin.json` (`0.13.0` → `0.14.0`; `orc-curator` is already `0.14.0`)

**Interfaces:**
- Consumes: plan 1's `step()` resume branch in `drive.js`.
- Produces: nothing for later tasks.

Plan 1 deferred two points here. (1) The resume message after a stopped `inline` action said "commit them"; the spec says to discard them. (2) `commitLeftovers` after an `inline` action commits what the skill left uncommitted. Ruling for (2): keep it. `setup` writes its flag last and runs again; `curate` commits once at its end, so leftovers mean a finished skill that did not commit, and committing them is right.

- [ ] **Step 1: Write the failing test**

In `test/orchestra/drive.test.js`, add (it uses the `project({ curator: true })` helper and `wt` from plan 1):

```js
test('a resume after a stopped Curator skill says to discard its files', () => {
  const dir = project({ curator: true });
  const setup = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(setup.action, 'inline');
  fs.mkdirSync(path.join(wt(dir, setup), 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(wt(dir, setup), 'docs/curator/BACKLOG.md'), '# half done\n');
  const a = drive(dir, [], { resume: true });
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /docs\/curator\/BACKLOG\.md/);
  assert.match(a.reason, /If a stopped Curator skill \(setup or curate\) left them, discard them; it runs again\./);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orchestra/drive.test.js`
Expected: FAIL (the reason has no Curator sentence).

- [ ] **Step 3: Change the reason**

In `plugins/orchestra/bin/drive.js`, `step`, the resume branch's reason becomes:

```js
      return { action: 'failed', reason: `Files changed since the run stopped: ${files}. If a stopped subagent left them, commit them. If a stopped Curator skill (setup or curate) left them, discard them; it runs again. If they are yours, stash them. Then run again.` };
```

- [ ] **Step 4: DESIGN and the version**

- `docs/DESIGN.md` §2 plugins table: add the row ``| `orc-curator` | Curator | `curate`, `setup`, the `spec`, `plan` and `code` guides, the direction sweep, its templates, its `manifest` skill |``.
- §9a: add after the table: "`orc-curator` fills the slot. Its docs live in `docs/curator/`. Its setup is minimal until plan 3 ports `shape-project`."
- Version: run

```bash
for f in plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json; do sed -i '' 's/"version": "0.13.0"/"version": "0.14.0"/' "$f"; done
grep -h '"version"' plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json | sort | uniq -c
```

Expected: `12 "version": "0.14.0"`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins docs/DESIGN.md test/orchestra/drive.test.js
git commit -m "feat(orchestra): discard a stopped Curator skill's files on resume; orc-curator in the design; plugins 0.14.0 (S76)"
```

---

## After the plan

- Tell the user which sections of `docs/guide.html` are out of date (the `orc-curator` plugin in the plugin list and status, its docs folder in Files, the version 0.14.0) and offer to update them.
- Plan 3 (setup with shape-project, shape-product, shape-tech) starts from this plugin; its done test is the spec's success run on the sample repo.
