# Curator: Navigation and Curation (S79) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make orc-curator a curator only: exploring moves to mattpocock `/wayfinder` bursts. `setup` records the present once. `curate` becomes the one organizer, with three inputs: a diff, a map, a change in words.

**Architecture:** orc-curator keeps three skills: `setup` and `curate`, which the user types, and `manifest`, which orchestra calls by name. Guides of every slot plugin become files (`guides/*.md`) that a stage reads by path. `direction` and `backlog` stop being skills. They become **procedures**: plain `.md` files in `plugins/orc-curator/procedures/` that `curate` reads and follows inline, in the main session. The rules for a good `PRODUCT.md` and `TECH.md` become two references. `shape-product`, `shape-tech` and `research` are removed. The glossary is `GLOSSARY.md` at the repo root.

**Tech Stack:** Markdown skills and procedures; Node 22 `node:test` text tests.

**Spec:** the S79 entry in `docs/DECISIONS.md`, and `docs/research/R9-navigation-and-curation.md` ("Recommendation"). Both travel with this plan.

**Source:** this is a refactor of `plugins/orc-curator` at 0.17.0. It ports nothing new. It moves `skills/direction` and `skills/backlog` (themselves ports of minions) and drops minions content. Read `docs/PORTING.md` "Steps for every port" before Tasks 2 and 5. Each drop cites S79 in its PORTING row.

**Rulings in the plan:**
- **Guides are files; `manifest` stays a skill (S79 (7)).** No skill is hidden: S33 allows only `name` and `description` in a frontmatter. A guide is a file inside the plugin, and its declaration names the path. The manifest stays a skill, because orchestra finds a plugin's folder only through it. The stage and gate skills of the workflow and of the Stack Skills stay skills; moving them is a later decision.
- **A procedure is not a skill.** It has no frontmatter. Its first line is `# <Name> procedure`. It follows the skill writing rules: simple English, action names, no harness tool names. A procedure never commits: `curate` commits once. A procedure may ask the user, because `curate` runs it inline in the main session.
- **Procedures and references.** A procedure holds flow (`direction`, `backlog`, `landing`). A reference holds rules only (`product`, `tech`, `glossary`, `recording-rules`). `CONTRACTS.md` keeps its rule that a reference earns its place at two readers.
- **The nudge.** Every nudge to navigation uses one form: "To <purpose>, run `/wayfinder <topic>`." It is a suggestion, never a step that the skill takes. Only the user can start wayfinder.
- **Research.** `direction` invokes `mattpocock-skills:research` with three things: the topic, the path `docs/curator/research/<yyyy-mm-dd>-<topic>.md`, and the first line `For: B<n>`. The `RESEARCH` template goes.
- **The ADR signal.** At landing, an ADR in `docs/adr/` that no `Dn` links yet lands as its own `hard:` `Dn` that links it. A ticket answer that no such ADR covers lands as `soft:`. Curate shows each marker in its summary before the commit.
- **Setup and the sweep.** Setup leaves `BACKLOG.md` and `DIRECTION.md` empty, so it never runs `direction`. `direction` has one caller: `curate`.
- **A purpose change** is no longer "run setup to reshape". It becomes a nudge: "To set the new direction, run `/wayfinder …`".
- **What is dropped (S79 (5)):** `shape-product`, `shape-tech`, `research`; the references `interview-cadence`, `ask-vs-research` and `right-sizing`, and the template `RESEARCH`. Their only readers are the removed skills. The exploring discipline of `shape-*` (directions, comparable products, capability walk) is not kept. The file rules are kept in the two new references.

## Global Constraints

- All six plugins move to version `0.18.0` in the last task, in both `plugin.json` and `.claude-plugin/plugin.json`.
- The docs folder stays `docs/curator/`. The glossary is `GLOSSARY.md` at the repo root (or the files that `GLOSSARY-MAP.md` lists). Maps land in `docs/curator/maps/<effort>/`.
- Ids `Bn`, `Cn`, `Dn`, `Qn`: independent; the next is the highest plus one; never reused. `DECISIONS.md` is append-only, and each `Why` opens with `hard:` or `soft:`. Cite `references/recording-rules.md`; do not copy it.
- Every `SKILL.md` frontmatter has only `name` and `description`, and `name` equals the folder name. A guide file and a procedure file have no frontmatter, start with `# `, and name no harness tool.
- Skill and procedure text is ASD-STE-100 simple English, with the names in `docs/CONTEXT.md` (Navigation, Burst, Landing).
- `curate` and `direction` never explore. An unknown answer becomes a `Qn` plus a nudge.
- Each task that moves or drops content updates its `docs/PORTING.md` rows in the same commit.
- Every task ends with `npm test` green.

## Review Focus

1. **A map with one ADR and one plain answer.** Expected: two `Dn` rows, the ADR one `hard:` and linking `docs/adr/NNNN-*.md`, the other `soft:`. Both markers are in the summary. Pinned in Task 3.
2. **"We go email+password" with a live `Cn` from the old decision.** Expected: a new `Dn` that names the one it reverses, the TECH row changed, the `## Evaluated` rows of the dependent near-term rows retired, then one sweep that gives them fresh verdicts. Pinned in Task 3.
3. **A change in words whose answer is unknown.** Expected: one `Qn` and the nudge, no `Dn`, no TECH edit. Pinned in Task 3.
4. **Setup on a set-up project.** Expected: it adds only missing files, overwrites nothing, writes no `Dn`, and redirects to `curate` and `/wayfinder`. Pinned in Task 4.
5. **A research branch that is missing at landing.** Expected: curate names the note it could not copy, keeps the ticket pointer in the `Dn` refs, and does not fail. Pinned in Task 3.

---

### Task 0: Guides are files, for every slot plugin

**Files:** Modify `plugins/orchestra/lib/check.js` (the `guides` rule, the `disable` names), `plugins/orchestra/lib/protocol.js` (`guidesFor`, `withPrompt`), `plugins/orchestra/skills/writing-plugins/SKILL.md` (the `guides` row), `test/orchestra/check.test.js`, `test/orchestra/protocol.test.js`, `test/orchestra/drive.test.js`, `test/orc-standard-workflow/next.test.js` (only where it names a guide skill). Move `plugins/orc-curator/skills/{spec,plan,code}-guide/SKILL.md` → `plugins/orc-curator/guides/{spec,plan,code}.md` and `plugins/orc-java-stack/skills/code-guide/SKILL.md` → `plugins/orc-java-stack/guides/code.md`; update both `orchestra.json` files. Modify `test/orc-curator/guides.test.js`, `test/orc-curator/plugin.test.js`, and `docs/CONTEXT.md` (the **Guide** row).

**Interfaces:**
- Declaration: `"guides": { "<role>": "<path relative to the plugin folder>" }`, for example `{ "plan": "guides/plan.md" }`.
- Produces `guidesFor(role, resolved, config) -> string[]`: absolute paths, `path.join(resolved.slots[slot].dir, value)`, the Curator's first. A value listed in `config[slot].disable` is left out, as today.
- Produces the prompt lines `Before you start, read each guide below and follow it:` and one `- \`<absolute path>\`` per guide.

- [ ] Test (`check.test.js`): a guide value that is a path to an existing file inside the plugin passes; a missing file fails with a fix that names the path; a value with `..` or an absolute path fails; `disable` accepts a guide's declared path. The old "guide skill does not exist" case is replaced.
- [ ] Test (`protocol.test.js`, `drive.test.js`): the dispatch prompt of a `plan` role names the absolute file `<dir>/guides/plan.md` after "read each guide below and follow it", and no `orc-curator:plan-guide`; a disabled guide is left out.
- [ ] Test (`guides.test.js`, which also reads `plugins/orc-java-stack/guides/code.md`): the guide files exist, have no frontmatter, start with `# `, and keep today's rules; `skills/` has no `*-guide` folder.
- [ ] Run `npm test`: they fail.
- [ ] Change `check.js` (a `file(value, what)` helper next to `skill(name, what)`), `protocol.js`, the two declarations, and move the four guides (drop the frontmatter, keep the body). Update the `guides` row of `writing-plugins`: "a path to a guide file inside the plugin; orchestra tells the stage to read it". The **Guide** row of `docs/CONTEXT.md`: "A file with short write-time rules for one role …".
- [ ] PORTING: rows whose "Where now" names a moved guide skill point at the new file. Then `npm test` (the packaging test runs `checkPlugin` on every plugin), and commit `feat(orchestra): guides are files, not skills (S79)`.

### Task 1: The references `product` and `tech`, and the glossary rename

**Files:** Create `plugins/orc-curator/references/product.md`, `plugins/orc-curator/references/tech.md`. Rename `templates/CONTEXT.md` → `templates/GLOSSARY.md`. Modify `templates/TECH.md`, `references/glossary.md`, `skills/curate/SKILL.md`, `skills/setup/SKILL.md`, `guides/spec.md`, `guides/plan.md`, `guides/code.md`, `test/orc-curator/plugin.test.js`, `test/orc-curator/guides.test.js`, `test/orc-curator/curate.test.js`.

**Interfaces:** Produces `<plugin>/references/product.md` and `<plugin>/references/tech.md`, read by `setup` (Task 4) and `curate` (Task 3).

- [ ] Test (`plugin.test.js`): `references/product.md` has "would deleting one backlog row make it false", "Never list features", the section budgets, and "cite the `Dn`". `references/tech.md` lists the six capability rows (`runs as`, `deploys to`, `persists`, `integrates with`, `authenticates`, `hard constraints`), "50 lines", "never a path", "a transcription has no `Dn`", "one place", and an "architecture style" line in the spine that cites a `hard:` `Dn` (module boundaries are contexts in `GLOSSARY-MAP.md`, never paths). `templates/TECH.md` gets the same spine line. Neither file has a step list (no `## Step`).
- [ ] Test (`guides.test.js`, `curate.test.js`): every skill and guide file names `GLOSSARY.md` and no skill names `CONTEXT.md`. The code guide's test title becomes "the code guide keeps GLOSSARY names and cites only Dn in code". `glossary.md` names `GLOSSARY-MAP.md` and says to follow it.
- [ ] Run `npm test`: the new tests fail.
- [ ] Write `product.md` from the `PRODUCT.md` template guidance and the routing rows of `skills/shape-product/SKILL.md` ("Where each answer goes": only the present-tense rows). Write `tech.md` from `templates/TECH.md` and `skills/shape-tech/SKILL.md` ("The evidence gate", "Each dimension in exactly one place", the capability list). Both hold rules only.
- [ ] Rename the template. Change `CONTEXT.md` → `GLOSSARY.md` (at the repo root, not in `docs/curator/`) in the glossary reference, curate (Step 5 routing row and Step 6), setup (Step 2) and the three guide files. The glossary reference adds: when `GLOSSARY-MAP.md` exists, follow it to the right `GLOSSARY.md`; `domain-modeling` writes the same file during a burst.
- [ ] PORTING: the `templates/CONTEXT.md` row's "Where now" is `templates/GLOSSARY.md` (S79). Then `npm test`, and commit `refactor(orc-curator): the product and tech references; GLOSSARY.md at the root (S79)`.

### Task 2: `direction` and `backlog` become procedures

**Files:** Move `skills/direction/SKILL.md` → `procedures/direction.md` and `skills/backlog/SKILL.md` → `procedures/backlog.md`. Modify `test/orc-curator/direction.test.js`, `test/orc-curator/backlog.test.js`, `test/orc-curator/contracts.test.js`, `test/orc-curator/plugin.test.js`, `docs/PORTING.md` (minions blocks `skills/direction/SKILL.md`, `skills/backlog/SKILL.md`).

**Interfaces:** Produces `<plugin>/procedures/direction.md`, which ends with the return block `Result / Wrote / Coverage / Summary / Escalated / Deviations/Warnings`, and `<plugin>/procedures/backlog.md`, which ends with `Result / Wrote / Summary / Deviations/Warnings` and runs no sweep. Task 3 consumes both by path.

- [ ] Test (`plugin.test.js`): every file in `procedures/` starts with `# ` and has no `---` frontmatter, matches no harness word (`/Task tool|subagent_type|TodoWrite|Skill tool|claude -p/`), and never says "commit" except "`curate` commits".
- [ ] Test (`direction.test.js`, read from `procedures/direction.md`): its only caller is `curate`. It never names `shape-tech` or `orc-curator:research`. It invokes `mattpocock-skills:research` with `For: B<n>` and the `docs/curator/research/` path. A changed dimension whose answer the row states gives "known: <dimension> → <answer>" back to curate; one it does not state gives a `Qn` and a line that matches `/run `\/wayfinder/`. A purpose change gives the nudge, never "run setup".
- [ ] Test (`backlog.test.js`, read from `procedures/backlog.md`): its caller is `curate`. It runs no sweep ("`curate` runs the sweep"). It keeps the five operations and the consequence chain table.
- [ ] Test (`contracts.test.js`): the texts it checks are `skills/*/SKILL.md` **and** `procedures/*.md`, named by their base name (`direction`, `backlog`).
- [ ] Run `npm test`: they fail.
- [ ] Move both files. Remove the frontmatter and add the heading. Change in `direction`: the "Callers" table becomes `curate` only; the "escalate one dimension" verdict becomes "known → hand back to curate | unknown → `Qn` + nudge"; "research first" calls `mattpocock-skills:research` as the ruling says; "purpose change" becomes the nudge; Step 5 "Commit" is removed. Change in `backlog`: Step 6 (the sweep) becomes "give back to `curate`; it runs the sweep once"; "Commit" is removed; "`specify`" and "`/minions:feature`" wording becomes "the spec stage of a run".
- [ ] PORTING: "Where now" for both blocks is `procedures/direction.md` and `procedures/backlog.md`; the changed parts say "ported (changed, S79)". Then `npm test`, and commit `refactor(orc-curator): direction and backlog become procedures (S79)`.

### Task 3: `curate`, the one organizer, and the landing procedure

**Files:** Modify `skills/curate/SKILL.md`. Create `procedures/landing.md`. Modify `test/orc-curator/curate.test.js`.

**Interfaces:** Consumes `procedures/direction.md`, `procedures/backlog.md` (Task 2), `references/product.md`, `references/tech.md` (Task 1). Keeps orchestra's inline inputs (`base`, `brief`, `notes`, the result path) and its result JSON unchanged.

- [ ] Test, the three inputs: curate names "a diff", "a map" (`.scratch/<effort>/`) and "a change in words". With no input it asks which one.
- [ ] Test, a change in words: it sorts it as known, unknown or a bug. A known plan change follows `procedures/backlog.md`. A known decision or dimension change appends a `Dn` that names the one it reverses, edits TECH or PRODUCT by the references, and **retires the `## Evaluated` row of every near-term `Bn` whose row, `Cn` or outcome cites the old `Dn` or the dimension**. An unknown answer gives one `Qn` and the nudge, with no `Dn`. A bug gives a nudge to `diagnosing-bugs`. (Review Focus 2 and 3.)
- [ ] Test, the shared end: every input ends with `procedures/direction.md`, once, then one commit. "The only writer of `Dn` and `Qn`" appears in the text.
- [ ] Test (`landing.md`): an ADR in `docs/adr/` that no `Dn` links → a `hard:` `Dn` that links it; a ticket answer that no ADR covers → `soft:`; the markers are listed in the summary before the commit (Review Focus 1). "Out of scope" → `PRODUCT.md` "Deliberately not" with its `Dn`. "Not yet specified" → `QUESTIONS.md` entries. An `· open` `Qn` that a map answer settles → `· answered → Dn`, never deleted. Research: copy each note from its `research/*` branch into `docs/curator/research/`; a missing branch is named in the summary, and the ticket pointer stays in the `Dn` refs (Review Focus 5). The cut uses the tracer-bullet rules ("vertical", "demoable", "one run", "prefactoring first", "expand–contract") into `## Next`, with refs `map:`, the `Dn`, the research notes and `after B<n>`. The map moves to `docs/curator/maps/<effort>/`.
- [ ] Run `npm test`: they fail.
- [ ] Write curate: Step 1 inputs (three); the diff path keeps today's Steps 2–5 and the subtraction; the map path follows `procedures/landing.md`; the words path is the sort above; one shared end (sweep, questions, one commit, result, summary). "Permitted actions" adds `docs/curator/maps/` and the map move; the one skill it may invoke is `mattpocock-skills:research`, only through `direction`.
- [ ] Write `landing.md` by the test above. The tracer-bullet rules come from `to-tickets` of mattpocock-skills 1.3.1 (`engineering/to-tickets/SKILL.md`, "vertical-slice-rules"), rewritten in simple English.
- [ ] `npm test`, then commit `feat(orc-curator): curate takes a diff, a map or a change in words; the landing procedure (S79)`.

### Task 4: `setup` records the present

**Files:** Modify `skills/setup/SKILL.md`, `test/orc-curator/plugin.test.js`.

**Interfaces:** Consumes `references/product.md` and `references/tech.md`. Keeps orchestra's inputs (`done` = `docs/curator/.setup`, the result path) and the result JSON. The description says what setup records, not "interviews".

- [ ] Test, replacing the three setup tests: it copies the six templates and never overwrites; it creates `docs/curator/research/` and `docs/curator/maps/`; it adds `.scratch/` to `.gitignore`. On a project with no source files outside `docs/` it asks nothing. With code, it transcribes TECH by `references/tech.md` (no `Dn`) and asks only about the present by `references/product.md`: what it is, who it is for, why it exists, what it deliberately is not. It writes nothing to `BACKLOG.md`, `DIRECTION.md` or `DECISIONS.md`, and it never invokes `direction`. It writes the flag last. It ends with the nudge "To set the direction of the project, run `/wayfinder <your idea>`." (Review Focus 4:) when the flag exists, it adds only missing files, then redirects to `curate` and `/wayfinder`. It names no `shape-product`, `shape-tech` or `backlog`.
- [ ] Run `npm test`: they fail.
- [ ] Rewrite setup: Step 1 inputs, Step 2 bootstrap (with `maps/` and `.gitignore`), Step 3 "already set up" (missing files only, then redirect), Step 4 the present (no code: nothing; code: transcribe, then the present questions, one at a time), Step 5 commit and flag, Step 6 result and the nudge. The hard gate: the present only; no `Dn`; no row; no exploring.
- [ ] `npm test`, then commit `feat(orc-curator): setup records the present and nudges to a burst (S79)`.

### Task 5: Remove the exploring skills; README and the contract matrix

**Files:** Delete `skills/shape-product/`, `skills/shape-tech/`, `skills/research/`, `references/interview-cadence.md`, `references/ask-vs-research.md`, `references/right-sizing.md`, `templates/RESEARCH.md`, `test/orc-curator/shape.test.js`, `test/orc-curator/research.test.js`. Modify `README.md`, `CONTRACTS.md`, `test/orc-curator/plugin.test.js`, `test/orc-curator/contracts.test.js`, `docs/PORTING.md` (the minions blocks of `shape-product`, `shape-tech`, `research`, the three references and the template).

- [ ] Test: the plugin's `skills/` are exactly `curate`, `manifest`, `setup`; `guides/` is exactly `code.md`, `plan.md`, `spec.md`; `procedures/` is exactly `backlog.md`, `direction.md`, `landing.md`; no file in the plugin names `shape-product`, `shape-tech`, `orc-curator:research`, `interview-cadence`, `ask-vs-research`, `right-sizing` or `CONTEXT.md`. The README test asks for the two entries the user types, the guide files, the procedures, the three flows ("set up", "a burst and its landing", "a run"), "a change in words", and `/wayfinder`.
- [ ] Run `npm test`: it fails.
- [ ] Delete the files. Rewrite the README "Quickstart", "The skills, grouped…", "The three flows" and the verdict ladder for S79; keep "Fluid by design" and "Changing the Curator". Rewrite `CONTRACTS.md`: one row per doc with `GLOSSARY.md` and `maps/`, the procedures as writers, `curate` as the only writer of `Dn` and `Qn`; the references table (`recording-rules`, `glossary`, `product`, `tech`); the invariants without the shape-tech cadence line.
- [ ] PORTING: each dropped part is `dropped` with "S79". Then `npm test`, and commit `refactor(orc-curator): remove shape-product, shape-tech and research; README and contracts (S79)`.

### Task 6: The dependency, the design and the version

**Files:** Modify `plugins/orc-curator/plugin.json` and `.claude-plugin/plugin.json` (add `"dependencies": ["mattpocock-skills@claude-plugins-official"]`), `.claude-plugin/marketplace.json` (add `"allowCrossMarketplaceDependenciesOn": ["claude-plugins-official"]`), `docs/DESIGN.md` (§2 `orc-curator` row, §9a), `docs/superpowers/specs/2026-10-16-curator-design.md` (a header line that S79 replaces its skill table and setup), `docs/CONTEXT.md` (the Curator row), the twelve manifests, `test/orc-curator/plugin.test.js`.

- [ ] First check the live Claude Code docs pages `plugins/dependencies` and `plugins/manifest-reference` for the exact field names. If they differ from this plan, stop and tell the user.
- [ ] Test: both orc-curator manifests list the dependency; the marketplace has the allow list; `checkPlugin` still passes on every plugin.
- [ ] Run `npm test`: it fails.
- [ ] Edit the manifests and the marketplace. DESIGN §2 and §9a: setup records the present; curate takes three inputs; navigation is `/wayfinder`. The Curator row of `docs/CONTEXT.md`: the same. DESIGN §2 and §9a also say that guides are files.
- [ ] All twelve manifests `0.17.0` → `0.18.0`; `npm test`; commit `docs: the Curator after S79 in the design; plugins 0.18.0 (S79)`.

## After the plan

Run one burst and one landing on a sample project: chart a map with `/wayfinder`, resolve two tickets (one with an ADR), then "curate this map". Check Review Focus 1 and 5 on the real files.

Tell the user which sections of `docs/guide.html` are out of date (the Curator's skills and flows, the new terms burst and landing, "Built and not built", version 0.18.0), and offer to update them.
