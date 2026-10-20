# Curator: Backlog and Research (Plan 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two by-hand entries of the Curator, `orc-curator:backlog` and `orc-curator:research`, with the `right-sizing` reference and the `RESEARCH` template; then remove the fallbacks that the skills of plans 2 and 3 use while these two are missing.

**Architecture:** `backlog` changes the arrangement of `docs/curator/BACKLOG.md` (add, drop, move, groom, reconcile), walks the consequence chain into DIRECTION, Vision, DECISIONS and QUESTIONS, then runs the direction sweep once. `research` is a tool that `shape-tech`, `shape-product` and `direction` invoke with a topic; it writes one note per topic in `docs/curator/research/` and records nothing else. Both run in the main session. Neither is in the slot contract (spec decision 12), so `check.js` and `writing-plugins` do not change.

**Tech Stack:** Markdown skills; Node 22 `node:test` text tests.

**Spec:** `docs/superpowers/specs/2026-10-16-curator-design.md` ("Skills" table, "Plans" item 4). Decision: S76. Plan 3: `docs/superpowers/plans/2026-10-19-curator-setup.md`.

**Source:** `~/Projects-other/claude-minions`: `skills/backlog/SKILL.md` (213 lines), `skills/research/SKILL.md` (228), `references/right-sizing.md` (51), `templates/RESEARCH.md` (82). Read `docs/PORTING.md` "Steps for every port" before Tasks 1–3. The section "minions" of `docs/PORTING.md` lists every part and its status. Port from the source files, read in full.

**Rulings in the plan:**
- **Wide research and nesting (R4).** Every caller of `research` runs in the main session (`shape-tech`, `shape-product`, `direction`, and `curate` → `direction`), so its fan-out is one level deep and works on Claude Code and on Codex. When the harness cannot start agents, `research` researches each candidate in turn against the fixed axes, ranks only after the last one, and names the weaker anchoring guard in `Deviations/Warnings`.
- **Who commits.** `research` and `backlog` commit only by hand. When a caller invokes them (`Caller: <name>`), the caller commits `docs/curator/` once, as `direction` already does (plan 2 ruling).
- **Rows to `## Now`.** `backlog` moves a row to `## Now` when the user says so: that is intent, not a run (S76). A run never moves a row. "Promoting into Now is specify's" does not apply.
- **The `refs` of a new row.** `backlog` writes the why; the brief's `Serves: Bn` line links the run, and `curate` writes the shipped-as cell. The spec stage only reads (S76).
- **The in-flight guard** of minions' `backlog` is n/a: there is no run state to read. A run that is open on a dropped row is `curate`'s case: it asks at the end (plan 2).
- **The fallbacks go.** The lines "when `orc-curator:research` is not installed" (ask-vs-research, shape-tech, shape-product, direction) and "`orc-curator:backlog` is not built yet" (setup) are removed: both skills ship in the same plugin.
- `right-sizing` keeps rule 1 and "Research depth". Rule 2 and the tier signals stay n/a (PORTING, S76); "too big for a light pass" stays in `direction`'s purpose-change verdict.

## Global Constraints

- Plugin `orc-curator`; all six plugins move to version `0.17.0` in the last task, in both `plugin.json` and `.claude-plugin/plugin.json`.
- The docs folder is fixed: `docs/curator/`. One mode only. No `config.yml`, no `STATE.md`, no `.minions/` roots, no `--auto`, no `/minions:*` names.
- Ids `Bn`, `Cn`, `Dn`, `Qn`: independent, next is highest plus one, never reused; an id in an HTML comment does not count. `DECISIONS.md` is append-only; every `Why` opens with `hard:` or `soft:`. All of it is in `references/recording-rules.md`: cite it, do not copy it.
- Every `SKILL.md` frontmatter has only `name` and `description`; `name` equals the folder name. Skill text names actions, never harness tool names.
- Skill text is ASD-STE-100 simple English and uses the names in `docs/CONTEXT.md`.
- Each port task updates the "Where now" and status of the PORTING rows it ports, in the same commit.
- Run all tests with `npm test`. Every task ends with `npm test` green.

## Review Focus

1. **A drop by hand of a row with constraints.** Expected: confirm first; delete each `Cn` with that `from Bn` and its `## Evaluated` row; rewrite the Vision; a `soft:` reversal `Dn` when a `Dn` assumed the row; close moot `Qn`; one sweep; every empty check reported. Pinned in Task 3.
2. **A hand edit, then "reconcile".** Expected: detect, not propose; `git diff` first. Pinned in Task 3.
3. **A wide research run.** Expected: enumerate, fix the axes, one agent per candidate, rank last; the full ranking reaches the user through the caller. Pinned in Task 2.
4. **Research on a preference.** Expected: decline with `blocked` and the ground, no note. Pinned in Task 2.

---

### Task 1: The `right-sizing` reference and the `RESEARCH` template

**Files:** Create `plugins/orc-curator/references/right-sizing.md`, `plugins/orc-curator/templates/RESEARCH.md`. Modify `docs/PORTING.md` (blocks `templates/RESEARCH.md`, `references/right-sizing.md`), `test/orc-curator/plugin.test.js`.

- [ ] Test: both files exist; right-sizing has "set by the caller" and "Research depth" and no tier rule; RESEARCH has `**For:**`, `**Supersedes:**`, `## Recommendation`, `## Comparison`, `## Refuted`, `## Open questions`; neither names minions.
- [ ] Port both, every part. RESEARCH: the writers are `orc-curator:shape-tech` and `orc-curator:direction` (and `shape-product` for a product fact).
- [ ] PORTING rows; `npm test`; commit `feat(orc-curator): the right-sizing reference and the research template (S76)`.

### Task 2: `research`

**Files:** Create `plugins/orc-curator/skills/research/SKILL.md`, `test/orc-curator/research.test.js`. Modify `docs/PORTING.md` (block `skills/research/SKILL.md`).

- [ ] Test: never picks its own topic; never decides; decline table (preference, settled `Dn`, covered note); `wide` four beats in order and one agent per candidate; the sequential fallback; writes only `docs/curator/research/`; "Could not settle" and "Recorded" lines; no minions names.
- [ ] Port every part in source order with the rulings above. Return block as the source, `Recorded:` names `orc-curator:shape-tech` or `orc-curator:direction`.
- [ ] PORTING rows; `npm test`; commit `feat(orc-curator): research, evidence for the caller (S76)`.

### Task 3: `backlog`

**Files:** Create `plugins/orc-curator/skills/backlog/SKILL.md`, `test/orc-curator/backlog.test.js`. Modify `docs/PORTING.md` (block `skills/backlog/SKILL.md`).

- [ ] Test: the five operations; the chain table rows (dropped, demoted, added, promoted, rewritten, reordered); one sweep at the end with `Caller: backlog`, skipped for Later-only; never reads `TECH.md` or code; never writes a `Cn`; never edits a `Dn`; confirms each deletion; `Coverage:` and `Escalated:` lines; no minions names.
- [ ] Port every part in source order with the rulings above.
- [ ] PORTING rows; `npm test`; commit `feat(orc-curator): backlog, the arrangement and its fallout (S76)`.

### Task 4: Wire the callers

**Files:** Modify `skills/setup/SKILL.md` (Step 4b invokes `orc-curator:backlog` with `Caller: setup`; the hard gate drops "when it is built"), `skills/shape-tech/SKILL.md`, `skills/shape-product/SKILL.md`, `skills/direction/SKILL.md`, `references/ask-vs-research.md` (drop the "not installed" lines). Update the setup test.

- [ ] Test: no skill or reference says "not installed" or "not built yet"; setup invokes `orc-curator:backlog` with `Caller: setup`.
- [ ] Edit; `npm test`; commit `feat(orc-curator): setup, shape and direction call backlog and research (S76)`.

### Task 5: Design and the version

- [ ] DESIGN §2 `orc-curator` row adds `backlog` and `research`; §9a drops "come later" and says both are by-hand entries outside the slot contract.
- [ ] Twelve manifests `0.16.0` → `0.17.0`; `npm test`; commit `docs: the Curator backlog and research in the design; plugins 0.17.0 (S76)`.

## After the plan

Tell the user which sections of `docs/guide.html` are out of date (the Curator's skill list, "Built and not built", version 0.17.0) and offer to update them.
