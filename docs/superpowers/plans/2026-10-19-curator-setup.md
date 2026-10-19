# Curator: Setup (Plan 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal `orc-curator:setup` with the port of minions' `shape-project` interview, add the `shape-product` and `shape-tech` skills it runs, and the `interview-cadence` and `ask-vs-research` references they cite; then prove the whole Curator on a real run in the sample repo.

**Architecture:** `setup` is the entry for a new project and for a reshape. It bootstraps `docs/curator/` from the templates, runs `shape-product` (the product interview), then `shape-tech` (the tech interview), shows the backlog, runs `direction`, commits, and writes the flag last. All three run in the main session and ask the user. `shape-tech` is also the skill that `direction` escalates one capability dimension to. Every skill is a `SKILL.md` port from minions.

**Tech Stack:** Markdown skills; Node 22 `node:test` text tests; one manual run in `~/Projects-other/orchestra-sample-java`.

**Spec:** `docs/superpowers/specs/2026-10-16-curator-design.md` ("The `orc-curator` plugin", "Plans" item 3, and the "Success" list). Decision: S76. Plan 2: `docs/superpowers/plans/2026-10-16-curator-curate-direction.md`.

**Source:** `~/Projects-other/claude-minions`: `skills/shape-project/SKILL.md` (257 lines), `skills/shape-product/SKILL.md` (210), `skills/shape-tech/SKILL.md` (255), `references/interview-cadence.md` (48), `references/ask-vs-research.md` (36). Read `docs/PORTING.md` "Steps for every port" before Tasks 1–4. The section "minions" of `docs/PORTING.md` lists every part and its status. Port from the source files, read in full.

**Rulings in the plan:**
- `ask-vs-research` moves from plan 4 to here: both shape skills cite it now. `right-sizing` stays in plan 4 with `research`.
- `backlog` does not exist until plan 4. Where `setup` would invoke it (Step 4b, "arrange the backlog"), it tells the user to edit `docs/curator/BACKLOG.md` by hand and goes on.
- `research` does not exist until plan 4. Where `shape-tech` or `shape-product` would invoke it, it asks the user the question it would settle, or opens a `Qn`, and says so — the same fallback `direction` already uses.
- `setup` commits `docs/curator/` once after its last call (`direction` does not commit when a caller invokes it — plan 2 ruling), then writes and commits the flag last.

## Global Constraints

- Plugin `orc-curator`; all six plugins move to version `0.15.0` in the last code task, in both `plugin.json` and `.claude-plugin/plugin.json`.
- The docs folder is fixed: `docs/curator/`, with `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`, `TECH.md`, `research/`, the flag `docs/curator/.setup`; `CONTEXT.md` is created lazily on the first domain term. An id inside an HTML comment does not count.
- One mode only (minions' `vibe`). No `config.yml`, no `STATE.md`, no `.minions/` roots, no `--auto`, no `questions` budget key, no `/minions:init`.
- The ids are `Bn`, `Cn`, `Dn`, `Qn`: independent, the next id is the highest existing plus one, never reused. `DECISIONS.md` is append-only: a reversal is a new `Dn` that names what it reverses. Every `Why` opens with `hard:` or `soft:`.
- `setup`, `shape-product` and `shape-tech` run in the main session and ask the user. `shape-product` asks in batches of 3–5; `shape-tech` and `direction` ask one question at a time (`interview-cadence`).
- One owner per file: `shape-product` writes PRODUCT, BACKLOG Vision and rows, DECISIONS, QUESTIONS; `shape-tech` writes TECH, DECISIONS, QUESTIONS; `direction` writes DIRECTION and QUESTIONS; `setup` writes only through those calls, plus the bootstrap copy and the flag.
- No run moves a backlog row to Now (S76). `setup` and `shape-product` may put rows in Now when the user says so: that is intent, not a run.
- Every `SKILL.md` frontmatter has only `name` and `description`; `name` equals the folder name. Skill text names actions, never harness tool names (`Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p`; say "ask the user", "offer options").
- Skill text is ASD-STE-100 simple English and uses the names in `docs/CONTEXT.md`.
- Each port task updates the "Where now" and status of the PORTING rows it ports, in the same commit.
- Run all tests with `npm test` from the repo root. Every code task ends with `npm test` green.

## Review Focus

1. **`setup` on a project that already has code** (the sample repo). Expected: `shape-tech` transcribes what is in use (a thin TECH, no invented `Dn`), never designs; `shape-product` asks about the product, not the code. Pinned in Task 3 (text test: the evidence gate) and Task 6 (the run).
2. **`setup` stopped half-way, then run again.** Expected: it detects what is filled (template-shaped vs real) and resumes at the missing half; the flag is still missing, so orchestra runs it again. Pinned in Task 4 (text test: route on fill state; flag last).
3. **A reshape by hand on a project that is set up.** Expected: `setup` states back what is there, walks the open `Qn`, proposes an edit list and writes only on approval, and always ends with the sweep. Pinned in Task 4.
4. **`direction` escalates one dimension to `shape-tech`.** Expected: `shape-tech` walks only that dimension and asks only what it needs. Pinned in Task 3.
5. **A user who answers "I don't know" to a product question.** Expected: an open `Qn`, never a guessed row; nothing blocks. Pinned in Task 2.

---

### Task 1: The `interview-cadence` and `ask-vs-research` references

**Files:**
- Create: `plugins/orc-curator/references/interview-cadence.md`, `plugins/orc-curator/references/ask-vs-research.md`
- Modify: `docs/PORTING.md` (blocks `references/interview-cadence.md`, `references/ask-vs-research.md`)
- Modify: `test/orc-curator/plugin.test.js`

**Source:** `references/interview-cadence.md`, `references/ask-vs-research.md`.

**Interfaces:**
- Produces: two reference files that Tasks 2–4 cite as "the reference `references/<name>.md` of this plugin".

- [ ] **Step 1: Write the failing test**

In `test/orc-curator/plugin.test.js`, add:

```js
test('the interview and research references are shipped', () => {
  const cadence = read('references/interview-cadence.md');
  assert.match(cadence, /3–5/);
  assert.match(cadence, /one at a time/i);
  assert.doesNotMatch(cadence, /config\.yml|questions: |Decide/);
  const ask = read('references/ask-vs-research.md');
  assert.match(ask, /ask the user/i);
  assert.match(ask, /research/i);
  for (const f of ['references/interview-cadence.md', 'references/ask-vs-research.md']) {
    assert.doesNotMatch(read(f), /\/minions:|\.minions|STATE\.md|\bmaintain\b|\bvibe\b/, f);
  }
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/plugin.test.js`
Expected: FAIL (`ENOENT` on `references/interview-cadence.md`).

- [ ] **Step 3: Port both references**

Read both sources in full and their PORTING blocks. Keep every rule. Changes (S76):
- `interview-cadence`: no `questions` budget from `config.yml` — "ask as few as the request needs; a crisp request needs fewer". Drop "inside an orchestra run a question is a Decide": every Curator skill that asks runs in the main session and asks the user directly. Keep the two cadences (a batch of 3–5 for `shape-product`; one at a time for `shape-tech` and `direction`) and why, the rules for both (real options and what each forecloses, multiple choice with a recommended option, defer what a later feature can pick, never ask what you can read), and "an answer lands in a durable file in the same session".
- `ask-vs-research`: the table of what to ask the user (preference, product purpose, a business fact) and what to research (how the world works, what the category expects by default — research, then check with the user); "never web-search around a preference"; research records nothing, its caller writes the rows. Name `orc-curator:research` for research, and add: "When `orc-curator:research` is not installed, ask the user the question, or open a `Qn`."

- [ ] **Step 4: PORTING rows**

Set the rows of both blocks to `ported` or `ported (changed, S76)`, "Where now" the reference file.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): the interview-cadence and ask-vs-research references (S76)"
```

---

### Task 2: `shape-product`

**Files:**
- Create: `plugins/orc-curator/skills/shape-product/SKILL.md`
- Modify: `docs/PORTING.md` (block `skills/shape-product/SKILL.md`)
- Create: `test/orc-curator/shape.test.js`

**Source:** `skills/shape-product/SKILL.md` (210 lines), read in full; `templates/PRODUCT.md`, `BACKLOG.md`, `DECISIONS.md`, `QUESTIONS.md` as shipped in `plugins/orc-curator/templates/`.

**Interfaces:**
- Consumes: Task 1's references; the templates.
- Produces: `orc-curator:shape-product`, invoked by `setup` with the idea (or none), and runnable by hand. It ends with a return block, the last thing in its reply:
  ```
  Result: ok | needs-input
  Wrote: <files>
  Summary: <what the product is now, in 3 lines; rows added per horizon; Dn and Qn ids>
  Open questions: <Qn ids, or "none">
  ```

- [ ] **Step 1: Write the failing test**

Create `test/orc-curator/shape.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '../../plugins/orc-curator/skills', name, 'SKILL.md'), 'utf8');
const NO_MINIONS = /\/minions:|\.minions|docs\/minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b|--auto/;

test('shape-product stays functional, goes wide, and keeps rejected directions', () => {
  const t = read('shape-product');
  assert.match(t, /Functional only/i);
  assert.match(t, /at least 4/i);
  assert.match(t, /docs\/curator\/DECISIONS\.md/);
  assert.match(t, /Comparable products/);
  assert.match(t, /3–5/);
  assert.doesNotMatch(t, NO_MINIONS);
});

test('shape-product routes each answer to one file and never turns a question into a row', () => {
  const t = read('shape-product');
  for (const f of ['PRODUCT', 'BACKLOG', 'DECISIONS', 'QUESTIONS']) assert.match(t, new RegExp(`docs/curator/${f}\\.md`), f);
  assert.match(t, /A question is not a feature/);
  assert.match(t, /· open/);
  assert.match(t, /Open questions:/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/shape.test.js`
Expected: FAIL (`ENOENT`).

- [ ] **Step 3: Port shape-product**

Read the source in full and its PORTING block. Port every `planned` part in the source's order: the scope constraints (functional only and why; wide before deep, at least 4 distinct directions; rejected directions are `Dn` rows; the user decides), the output table (each kind of answer → its file and section), the two rules (a question is not a feature; PRODUCT holds only what is true today, the vision goes to BACKLOG Vision, no feature inventory), resuming from real content, reading DECISIONS first (`hard:` honoured, `soft:` discarded directions back on the table, a reversal is a new `Dn`), the coverage checklist and the one-line status, choosing what to ask next, ask vs research (cite `references/ask-vs-research.md`), going wide, comparable products, capturing the shape and the wrap-up checklist (at least one Now row), how to ask (cite `references/interview-cadence.md`: batches of 3–5), where the idea comes from, where the shapes live (the plugin's templates; copy a missing file), the anti-patterns, the tone. End with the return block in "Produces".

Changes (S76): one mode — drop the `maintain` stop; no `config.yml`; the knowledge root is `docs/curator/`; skill names are `orc-curator:*`; it never commits (its caller `setup` commits; by hand it tells the user to commit or to run `setup`).

- [ ] **Step 4: PORTING rows**

Set the ported rows of block `skills/shape-product/SKILL.md` to `ported` or `ported (changed, S76)`, "Where now" `orc-curator:shape-product`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): shape-product, the product interview (S76)"
```

---

### Task 3: `shape-tech`

**Files:**
- Create: `plugins/orc-curator/skills/shape-tech/SKILL.md`
- Modify: `docs/PORTING.md` (block `skills/shape-tech/SKILL.md`)
- Modify: `test/orc-curator/shape.test.js`

**Source:** `skills/shape-tech/SKILL.md` (255 lines), read in full; `templates/TECH.md` as shipped.

**Interfaces:**
- Consumes: Task 1's references; `orc-curator:direction` calls it with "Caller: direction" and exactly one named dimension (plan 2).
- Produces: `orc-curator:shape-tech`, invoked by `setup` (all dimensions) and by `direction` (one dimension), and runnable by hand with a focus. Its return block:
  ```
  Result: ok | blocked | needs-input
  Wrote: <files>
  Summary: <TECH rows written; dimensions skipped and why; Dn and Qn ids>
  Constraints owed: <what the near-term rows now demand, for direction; never a Cn>
  Worth reopening: <at most one soft: Dn whose cost changed, or "none">
  Warnings: <or "none">
  ```

- [ ] **Step 1: Write the failing test**

Add to `test/orc-curator/shape.test.js`:

```js
test('shape-tech walks the capability dimensions, one question at a time', () => {
  const t = read('shape-tech');
  for (const d of ['runs as', 'deploys to', 'persists', 'integrates with', 'authenticates', 'hard constraints']) assert.ok(t.toLowerCase().includes(d), d);
  assert.match(t, /one question at a time/i);
  assert.match(t, /exactly one named dimension|one named dimension/i);
  assert.doesNotMatch(t, NO_MINIONS);
});

test('shape-tech keeps the evidence gate and writes each dimension in one place', () => {
  const t = read('shape-tech');
  assert.match(t, /existing code/i);
  assert.match(t, /no `Dn`|without a `Dn`/i);
  assert.match(t, /docs\/curator\/TECH\.md/);
  assert.match(t, /never .*`docs\/curator\/DIRECTION\.md`|Never `DIRECTION\.md`|never write a `Cn`/i);
  for (const line of ['Result:', 'Constraints owed:', 'Worth reopening:']) assert.ok(t.includes(line), line);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/shape.test.js`
Expected: FAIL (`ENOENT` on shape-tech).

- [ ] **Step 3: Port shape-tech**

Read the source in full and its PORTING block. Port every `planned` part in order: purpose and altitude (what every feature is built on, vs `plan`'s one feature), the callers table (setup: all dimensions, no code assumed; direction: exactly one named dimension; by hand: the focus), single-dimension invocation, the investigation (PRODUCT, TECH, DECISIONS `soft:` rows, open `Qn`, BACKLOG Vision/Now/Next never Later, research notes by `For:`, the real code), the interview (one question at a time, the six capability dimensions, the ground-shaping calls, never ask what a later feature can change, say what each option forecloses, a dead backlog row is a question to the user, not a move), research (cite `references/ask-vs-research.md`; the fallback when `orc-curator:research` is missing), decide with the user (show the full ranking of a wide research run), the evidence gate (no code → only the minimum spine; existing code → a thin transcription of what is in use, no `Dn`; never transcribe layers, paths or where conventions live), each dimension in exactly one place (TECH plus a `Dn`, or a `Qn`, or neither), `Dn` rows with `hard:`/`soft:`, closing answered `Qn`, the relay (rows written, skipped dimensions, ids; at most one `soft:` decision to challenge; name owed constraints, never write a `Cn`), the hard gate, the return block in "Produces".

Changes (S76): no guard on a live workflow, no `STATE.md`, no modes, no `--auto`; it does not commit when a caller invokes it ("Caller: setup" or "Caller: direction"); by hand it commits `docs/curator/` with `docs(shape-tech): <dimensions>`.

- [ ] **Step 4: PORTING rows**

Set the ported rows of block `skills/shape-tech/SKILL.md` to `ported` or `ported (changed, S76)`, "Where now" `orc-curator:shape-tech`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): shape-tech, the tech interview (S76)"
```

---

### Task 4: `setup`, the port of `shape-project`

**Files:**
- Modify: `plugins/orc-curator/skills/setup/SKILL.md` (replace the minimal setup)
- Modify: `docs/PORTING.md` (block `skills/shape-project/SKILL.md`; and the dropped `skills/direction/SKILL.md` row "Callers" that still says "a Decide" — say the Curator asks the user)
- Modify: `test/orc-curator/plugin.test.js` (the setup test)

**Source:** `skills/shape-project/SKILL.md` (257 lines), read in full.

**Interfaces:**
- Consumes: `orc-curator:shape-product` (Task 2), `orc-curator:shape-tech` (Task 3), `orc-curator:direction` (plan 2; it takes "Caller: setup" and does not commit), the templates; orchestra's `inline` contract: input `done` (`docs/curator/.setup`), the result JSON at the path the prompt names.
- Produces: `orc-curator:setup`, the skill the declaration's `setup` names.

- [ ] **Step 1: Write the failing test**

In `test/orc-curator/plugin.test.js`, replace the test "the minimal setup copies the templates into docs/curator and writes the flag last" with:

```js
test('setup bootstraps from the templates, runs the interviews and the sweep, and writes the flag last', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /docs\/curator\//);
  assert.match(text, /Do not copy `CONTEXT\.md`/);
  assert.match(text, /never overwrite/i);
  for (const s of ['orc-curator:shape-product', 'orc-curator:shape-tech', 'orc-curator:direction']) assert.ok(text.includes(s), s);
  assert.match(text, /Caller: setup/);
  assert.match(text, /template-shaped/);
  assert.match(text, /docs\/curator\/\.setup/);
  assert.match(text, /last/);
  assert.match(text, /\{ "status": "ok" \}/);
  assert.match(text, /except the result file/);
  assert.doesNotMatch(text, /\/minions:|\.minions|STATE\.md|config\.yml|\bmaintain\b|\bvibe\b|--auto/);
});

test('setup reshapes a set-up project on approval and always ends with the sweep', () => {
  const text = read('skills/setup/SKILL.md');
  assert.match(text, /reshape/i);
  assert.match(text, /approv/i);
  assert.match(text, /every open `Qn`/);
  assert.match(text, /edit `docs\/curator\/BACKLOG\.md` by hand/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-curator/plugin.test.js`
Expected: FAIL (the minimal setup lacks the interviews).

- [ ] **Step 3: Port shape-project as setup**

Read the source in full and its PORTING block. Write `setup` in this order:

1. **Inputs.** From orchestra: `done` and the result path; the user is in the session. By hand: an idea, or nothing.
2. **Bootstrap.** For each of `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`, `TECH.md`: copy the plugin's template to `docs/curator/` when the file does not exist; never overwrite. Create `docs/curator/research/.gitkeep`. Do not copy `CONTEXT.md`: curate creates it on the first domain term.
3. **Route on fill state** (the source's Step 2, with what "template-shaped" means: bracket placeholders, `_none yet_`, only the commented example). PRODUCT template-shaped → the product half. PRODUCT real, TECH template-shaped → the tech half. Both real → reshape.
4. **The product half.** Invoke `orc-curator:shape-product` with the idea. Do not repeat its questions or answer tech for it.
5. **The tech half — three calls in order.** (a) `orc-curator:shape-tech` with "Caller: setup" (all dimensions; with existing code, the evidence gate transcribes). (b) Show the backlog: the counts per horizon and the rows; offer to arrange it. `orc-curator:backlog` is not built yet: tell the user to edit `docs/curator/BACKLOG.md` by hand now, and wait until they say it is done. Groom before the sweep. (c) `orc-curator:direction` with "Caller: setup": every near-term row owes a verdict.
6. **Reshape** (the re-run path, the source's Step 5): state back PRODUCT, the TECH spine and the backlog counts per horizon; walk every open `Qn` by id (settled → a `Dn` first, then flip to `· answered → Dn`; a tech dimension goes to `shape-tech`); ask what else changed (new unknowns → new `Qn`); propose an edit list and write only on the user's approval; reversals append a new `Dn`; always end with the sweep.
7. **Commit once**: `docs/curator/` with `docs(curator): setup` (nothing to commit is not an error). Then write the empty flag `docs/curator/.setup` and commit it: `docs(curator): setup done`. A setup that stops before the flag runs again.
8. **Result and relay.** When orchestra runs it: `{ "status": "ok" }` to the result path; on an error `{ "status": "failed", "reason": "…" }`. Tell the user what was written, the open `Qn`, the sweep's coverage, the `Cn` count; in a run, that the docs are on the task branch until it is merged.

Hard gate (ported): intent only; the files are written through their owners; the four skills it invokes are `shape-product`, `shape-tech`, `backlog` (when built) and `direction`, never `research` directly; horizons are confidence bands, not a roadmap (no order inside a section, no estimates); a question is never a backlog row; QUESTIONS never blocks.

"## Permitted actions": "Write files under `docs/curator/` only, except the result file that the prompt names. Do not push."

Changes (S76): no `/minions:init`, no `.minions/` roots, no `STATE.md`, no modes, no `--auto`; it commits (S76 ruling: the caller of `direction` owns the commit); "suggest `/minions:feature`" becomes "start a run with orchestra run, or curate by hand".

- [ ] **Step 4: PORTING rows**

Set the ported rows of block `skills/shape-project/SKILL.md` to `ported` or `ported (changed, S76)`, "Where now" `orc-curator:setup`. In block `skills/direction/SKILL.md`, fix the dropped "Callers" row's text that still says "a Decide": the Curator asks the user.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-curator docs/PORTING.md test/orc-curator
git commit -m "feat(orc-curator): setup, the shape-project interview (S76)"
```

---

### Task 5: Design, glossary and the version

**Files:**
- Modify: `docs/DESIGN.md` (§2 `orc-curator` row, §9a)
- Modify: all twelve manifests (`0.14.0` → `0.15.0`)

- [ ] **Step 1: DESIGN**

- §2, the `orc-curator` row: ``| `orc-curator` | Curator | `curate`, `setup` (the product and tech interviews: `shape-product`, `shape-tech`), the `spec`, `plan` and `code` guides, the direction sweep, its templates and references, its `manifest` skill |``.
- §9a: replace "Its setup is minimal until plan 3 ports `shape-project`." with "Its setup interviews the user about the product and the tech, then runs the direction sweep. `backlog` and `research` come later; until then setup asks the user to edit the backlog by hand, and a research question goes to the user or to an open `Qn`."

- [ ] **Step 2: The version**

```bash
for f in plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json; do sed -i '' 's/"version": "0.14.0"/"version": "0.15.0"/' "$f"; done
grep -h '"version"' plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json | sort | uniq -c
```

Expected: `12 "version": "0.15.0"`.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add plugins docs/DESIGN.md
git commit -m "docs: the Curator setup in the design; plugins 0.15.0 (S76)"
```

---

### Task 6: The done test — a real run in the sample repo (with the user)

This task is not for a subagent. The controller and the user do it together in the user's session, because `setup` interviews the user and `orchestra:run` drives from the main session.

**Repo:** `~/Projects-other/orchestra-sample-java`. Before any commit there, guard the branch in the same command: `test "$(git branch --show-current)" = main && …` (a finished run can leave the repo on a `task/…` branch).

- [ ] **Step 1: Install the new plugins.** The user updates the marketplace `depitropov-plugins` in Claude Code and installs `orc-curator` 0.15.0 next to `orchestra`, `orc-standard-workflow` and `orc-java-stack` (all 0.15.0). Check: the skill list shows `orc-curator:manifest`.
- [ ] **Step 2: Add the Curator to the config.** In the sample repo, on `main`, run orchestra init (or edit `.orchestra/config.json` to add `"curator": { "plugin": "orc-curator" }`). `node <orchestra>/bin/resolve.js workflow=… stack-skills=… curator=…` must pass. Commit and push `.orchestra/config.json` (the user pushes).
- [ ] **Step 3: Run a small task.** For example: "Add a minimum order value to PriceCalculator". Expect, in order:
  1. An `inline` setup action: the product interview, the tech interview (it transcribes the existing Java and Maven), the backlog shown, the sweep. The user answers. Setup commits and writes `docs/curator/.setup`.
  2. The spec stage: the brief ends with `## Direction` and a `Serves:` line.
  3. The plan prompt lists `orc-curator:plan-guide` before `orc-java-stack`'s guides (if any).
  4. The run goes through code and the three phases as before.
  5. An `inline` curate action: the served row moves to Shipped, PRODUCT and DIRECTION are updated, the user is asked each judgement call, one commit `docs(curator): curate …`.
  6. `done`, with `setup`, `spec`, …, `phase-finish`, `curate` in the report's Results table.
- [ ] **Step 4: A second run.** Start a second small task after merging the first branch (or on the same base, to see O10's known cost). Expect: no `inline` setup this time (the flag is on `main`).
- [ ] **Step 5: Record the result.** Add a row to `docs/TENSIONS.md` (the next `S` number) with the outcome: which success items of the spec passed, what failed and its fix. When a step fails, fix it with a small plan of its own before calling plan 3 done.

---

## After the plan

- Tell the user which sections of `docs/guide.html` are out of date (setup's interview, `shape-product` and `shape-tech` in the plugin's skills and in "Built and not built", version 0.15.0) and offer to update them.
- Plan 4 (`backlog`, `research`, `right-sizing`) starts from this plugin.
