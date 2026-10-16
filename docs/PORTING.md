# Porting

This file holds the rules for porting content from the source plugins into this repo, and the
inventory of what each source file holds and where it went.

## Why this file exists

The first rewrite went source → `docs/PILLARS.md` summary → `docs/DESIGN.md` → skills. Each step
summed up the one before, and no step went back to the source. So content was lost with no decision:
for example be-coding-agent's `triage.md` lost its axes, its bucket rules, the full Decide test, the
finding format, the examples and the hard gate. This file makes every part of every source file
visible, and makes each drop a decision.

## Sources

| Source | Path | Pillar |
|---|---|---|
| be-coding-agent | `~/Projects/claude-code-plugins/plugins/be-coding-agent` | Orchestration (the workflow) |
| java-stack | `~/Projects/claude-code-plugins/plugins/java-stack` | Stack knowledge (orc-java-stack) |
| minions | `~/Projects-other/claude-minions` | Project rails (the Curator, later phase) |
| sc-agent-plugins | `~/Projects/sc-agent-plugins` | Multi-harness delivery (packaging rules) |
| ai-marketplace-mentorano | `~/Projects-other/ai-marketplace-mentorano/plugins/clean-code` (MIT) | Clean code (the workflow gate, orc-ts-stack, the standalone `clean-code`) |

## Steps for every port

A port is any plan, skill or design text that takes content from a source file.

1. **Find the rows.** Find the source file in the inventory below. If it has no section yet, add one.
2. **Read the source.** Open the source file and read it in full, line by line. `docs/PILLARS.md`,
   `docs/DESIGN.md` and earlier plans are summaries: use them for direction, never as the content.
   Done when you have read every line of the source file.
3. **Decide every part.** Give each part of the source file one status (below). Done when no part is
   `lost`. A drop needs a reason: a row in `docs/TENSIONS.md`, or the user's word in the plan.
4. **Write the target.** Keep the substance. Rewrite the form: simple English (ASD-STE-100), action
   names instead of tool names, the names in `docs/CONTEXT.md`.
5. **Update the inventory.** Set the status and "where now" of each part you touched, in the same
   commit as the target.
6. **Review against the source.** The plan names each source file under "Source" in the task's file
   list. The review of that task compares the target with the source file, not with a summary.

## Status values

| Status | Meaning |
|---|---|
| `ported` | The substance is in the target. |
| `partial` | Some of it is in the target. The row says what is missing. |
| `dropped` | Left out on purpose. The row cites the decision (an `S` row, a DESIGN section, or the user in a plan). |
| `planned` | A later plan carries it. The row names the plan. |
| `lost` | Nobody decided, and no target carries it. To fix: decide it, or plan it. |
| `n/a` | Does not apply to this design. The row says why. |

## Inventory

The inventory is filled from a full read of each source file on 2026-10-08.

General notes:
- Plan 4 is `docs/superpowers/plans/2026-10-09-java-stack-port.md`, decided by S68. Rows that say
  RL, RO, RT, RC, RY or CG point at its skills (`review-logging`, `review-ops`, `review-testing`,
  `review-comments`, `review-layout`, `code-guide`); the number is the rule number.
- Plan 5a is `docs/superpowers/plans/2026-10-12-lost-rows.md`, decided by S69. It carries the rows
  that were `lost`.
- DESIGN §8.4 says every agent gate triages. be-coding-agent let its mechanical passes (structure,
  logging, comments, layout) only fix and record "Left" items, with no triage.

### be-coding-agent

Source: `~/Projects/claude-code-plugins/plugins/be-coding-agent`.

#### README.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Headless, never asks, stops only on Decide | S12; skills say "Do not ask the user" | ported | yes |
| One entry skill calls a deterministic script | `orchestra:run` + `drive.js` + `next.js` (S5, S51, S52) | ported (other mechanism) | yes |
| One general-purpose subagent per stage | run skill "dispatch a general-purpose subagent" (S57) | ported | yes |
| Two modes (workflow / skill) | — | dropped (S4, S52) | no |
| Requires java-stack, else blocked | resolution via `manifest` (S50) | ported (other mechanism) | yes |
| Top model for the session, a cheaper model for verify and text passes | — | dropped (Scope: one model; DESIGN §14) | no |
| Inputs: idea and acceptance criteria | task text or file (S13); spec derives the criteria | partial (no separate criteria input) | yes |
| Input: branch name | `task/<slug>` | dropped (S22) | no |
| Input: output folder | notes and run folders from the branch | dropped (S15, S58) | no |
| Input: constraints, respected word for word by every stage | the task text, copied into the brief | dropped (S69) | no |
| Input: tasks per coder | config key `tasks-per-coder` | ported (S62) | yes |
| Never push, PR or ticket | §8.3 (S17) | ported | yes |
| Group order: rewriting agents before verify, cosmetic after | phases §6.2 (S45) | ported | yes |
| Each reviewer fixes in its own session; nothing runs twice | S14, S46 | ported | yes |
| Finding triage summary (5 axes, 4 buckets) | `orchestra:triage`, §8.4 | ported (S64) | yes |
| Mechanical passes: Fixed/Left, no triage | §8.4 "every agent gate" | dropped (§8.4) | yes |
| No severity labels | buckets only | ported (no doc says it) | yes |
| Workspace files | notes folder (§7) | partial (`pass-*.md`, `fix-verify.md` have no equivalent) | yes |
| Workspace kept out of commits | notes committed, `tmp/` ignored | dropped (S54, S58) | no |
| Resume from cached results | result files, checkpoints (S32, S46) | ported | yes |
| Report block | `report.md` (S55, §8.5) | partial (see SKILL.md rows) | yes |

#### workflows/implement-task-pipeline.js

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Argument checks; bare slash command blocked | — | dropped (S4, S52) | no |
| Tasks per coder, fallback 2 | `next.js` `settings()` | ported (stricter) | yes |
| Dispatch prompt with parameters | `protocol.js` `withPrompt` | ported | yes |
| `-Dspotless.check.skip=true` on every Maven call | OJ `build.run` | ported (S69) | yes (stack) |
| Output schema per stage | result JSON in each skill; only bad JSON is caught | partial (no schema check of results) | yes |
| A stage with no result halts the run as blocked | `next.js` `stage()`, runner `agentStep` and the fixer: two dispatches, then `failed` | ported (S69) | yes |
| Spec escalation cross-repo: halt as escalated | brief Integration points; plan-check Decide unless the task names the repo | ported (S69) | yes |
| Peripheral escalation: report it, go on | report `## Integration points` | ported (S69) | yes |
| spec-check Decide halts before code | plan-check returns `decide` | ported | yes |
| Task total from the counts | `planTasks()` counts the `### T<n>` headings | ported (S62) | yes |
| Coder chunk loop | `code-<from>` with `from`/`to` | ported | yes |
| Blocked once: retry with the blocker context; twice: blocked | failed stops once, runs again on resume, reason not passed | partial (no blocker context) | yes |
| "Did not advance" checks | fixed ranges | dropped (S62) | no |
| logic-review Decide: record and go on to a green branch | the gate stops before it fixes | dropped (S46, S55) | no |
| Structure missing: deviation, go on | — | dropped (S43) | no |
| Verify on a cheaper model | — | dropped (one model) | no |
| Verify failed = build or test counts | exit code | ported (simpler) | yes |
| One fix-verify, then verify again | build fixer, `max_rounds` 3 | ported (S47, S48) | yes |
| Final verify red: deviation, run "completed" | red final build = `failed` | dropped (S45, S48) | no |
| Text passes, each failure a deviation | finish gates (S68); the deviations list is in the report (next row) | partial | yes |
| `deviations[]` in the result | `implementation-log.md` Deviations lines | dropped (S69) | no |
| `commits[]` | report `git log base..HEAD` | ported | yes |
| Summary text | report Status and Reason | partial | yes |

#### skills/implement-task/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| The entry checks, never does stage work | run skill "Subagents do the work" | ported | yes |
| Never switch modes; never run a degraded run | run skill: "If you cannot dispatch a subagent, stop the run" | ported (S65) | yes |
| Preflight: stack skills present | resolution (S50) | ported | yes |
| Preflight: harness tools | — | dropped (S4) | no |
| Preflight: clean tree | `prepare` (S23, S57) | ported | yes |
| Branch name rules | `task/<slug>` | dropped (S22) | no |
| A missing required input: blocked | — | n/a (S69: the task text is the only input) | no |
| Workspace path and git exclude | notes and run folders | dropped (S58) | no |
| Base = remote ref after fetch | default branch + `pull --rebase`, base = HEAD (§8.3) | ported (other mechanism) | yes |
| Absolute paths to the plugin | `resolved.json`, `{plugin}` (S50) | ported | yes |
| Arguments as an object | — | dropped (S4) | no |
| Report: files changed | report `git diff --stat` | ported (S69) | yes |
| Report: test counts, build | step status only | partial | yes |
| Report: assumptions | report Assumptions (S59) | ported | yes |
| Report: findings ledger with reasons and Left items | counts, Evaluate lines | partial (Patch findings and reasons not listed) | yes |
| Report: Decide with prose and options with trade-offs | one line `<question> — options: <a> \| <b>` | partial | yes |
| Report: deviations | report `## Deviations` from the implementation log | ported (S69) | yes |
| Report: escalation | report `## Integration points` | ported (S69) | yes |
| Report: artifacts, branch, commits | report | ported | yes |
| An unreached field stays empty | `list()` gives "- none" | ported | yes |
| Write and print the report | `report.js`, run skill (S55) | ported | yes |
| Statuses completed / needs-decision / blocked / escalated | done / decide / failed (S15) | partial (`escalated` dropped, S69) | yes |
| A spec-check Decide leaves no branch | `prepare` makes the branch first (S23) | dropped (S23) | no |
| The entry only relays, never classifies | orchestra reads result files only | ported | yes |

#### skills/implement-task/skill-mode.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Prose copy of the script | `next.js`, `drive.js` | dropped (S4, S5, S52) | no |
| Fixed dispatch prompt | `withPrompt` | ported | yes |
| A reply with no JSON = no result | bad JSON = failed; a missing file = dispatch again | partial (see the no-result loss) | yes |
| Model per stage | — | dropped (one model) | no |
| Progress file, no step runs twice | result files, `stages.json`, phase state (S46) | ported | yes |

#### stages/spec.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Headless; decide from context and log it | spec skill step 4 | ported | yes |
| Load the architecture skill | plan guide goes to plan and plan-check (S53) | ported (moved) | yes |
| Read the project's agent files | spec step 1 reads `AGENTS.md` (S8) | ported | yes |
| Ground everything in real code | spec step 2 | ported | yes |
| External facts: read at the source (sibling checkout, local Maven repo, OpenAPI, schema, proto, migration) | spec step 3 "read it at its source if you can reach it" | partial (S69: step 3 names the places to look; missing: the local Maven repo, `dropped` S69, and the source list of external-fact kinds: enum value, field or column name, queue or topic, event payload, constraint, library behaviour) | yes |
| Cite external facts; unreachable ones go to Assumptions with the cost of being wrong | spec step 3 | ported (S69: plan-check enforces the cost) | yes |
| Boring minimal default, logged | spec step 4 (+ S60) | ported | yes |
| Brief: goal, criteria, scope, affected files, patterns | spec brief template | ported | yes |
| Brief: integration points | spec brief `## Integration points` | ported (S69) | yes |
| Brief: risks | triage risk axis | dropped (S69) | no |
| Brief: assumptions log | Assumptions, `business fact:` (S60, S63) | ported | yes |
| Brief: escalation (none / cross-repo / peripheral) | brief Integration points | ported (S69) | yes |
| Plan format | plan skill | ported (S37) | yes |
| Plan rules | plan skill Rules | ported | yes |
| Every named test is a real class and method the coder creates | plan "with a named test" | partial | yes |
| Return counts | heading count (S62) | dropped (S62) | no |
| Return escalation | plan-check Decide | ported (S69) | yes |

#### stages/spec-check.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Fresh eyes, before any code | plan-check (S26, S38) | ported | yes |
| Read triage.md first | plan-check step 4 invokes `orchestra:triage` | ported (S64) | yes |
| Load the architecture skill | plan guide (S53) | ported | yes |
| Coverage, code facts, scope, over-building, size, no code | plan-check step 3 | ported | yes |
| External facts: grounded and cited, else to Assumptions | plan-check step 3 "External facts" | ported (S69) | yes |
| A new dependency is at least Evaluate; apply the Decide test | plan guide rule 8 | partial (no bucket rule) | yes |
| Patch in place, renumber, keep AC numbers | plan-check step 7 | ported | yes |
| Evaluate with its axes | `orchestra:triage` notes format | ported (S64) | yes |
| Decide: other Patches still land | stop before any fix | dropped (S46) | yes |
| Notes sections: tally, Patched, Skipped, Dropped, Awaiting decision | `orchestra:triage` notes format | ported (S64) | yes |
| Return verdict, counts, decisions | result JSON | ported | yes |

#### stages/implement.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| K tasks, then a fresh coder | `next.js` chunks | ported | yes |
| Load only the build and testing skills | code guide (S53) | ported | yes |
| Structure, logs, comments, layout belong to later agents | S7, finish gates | ported | yes |
| Never ask, never push | code skill | ported | yes |
| Never commit to the default branch | "Do not change branches" | partial | yes |
| Stage only source files | code skill | ported | yes |
| Honestly blocked: say so, never fake success | `failed` + reason | ported | yes |
| Never skip or disable a named test | code skill | ported | yes |
| Branch checkout | `prepare` (S23) | dropped (S23) | no |
| Read the task, its criteria, the log, the code | code steps 2, 3.1 | ported | yes |
| Blocker context: fix why the last coder stopped | `next.js` writes the reason into `implementation-log.md` | ported (S69) | yes |
| Tests check the criterion's behaviour | code 3.2 | ported | yes |
| Run the affected tests to a log file | code 3.3, code guide (S59) | ported | yes |
| One commit in the repo's message style | "like `feat: <summary>`" | partial (repo style dropped) | yes |
| No plan names in code, comments, commits | code 3.4 | ported | yes |
| Log entry with Files, Tests, Deviations, Blockers | code 3.5 | partial (no Blockers line) | yes |
| Deviate only where the plan is wrong; never add scope | code step 4 | ported | yes |
| Return completed / next / blocked | status, assumptions, files | dropped (S62) | no |

#### stages/triage.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Only judgement stages triage; mechanical passes do not | §8.4 "every agent gate" | dropped (§8.4) | yes |
| No severity; the bucket is the action; urgency in flags | `orchestra:triage` intro, Flags | ported (S64) | yes |
| Five axes: origin, risk, fix-risk, probability, impact | `orchestra:triage` "The five axes" | ported (S64; `implementer-miss` is renamed `coder-miss` to match the code stage) | yes |
| Fix-Risk scale (Low: one line; Mid; High: new flows, tables, libraries) | `orchestra:triage` axes table | ported (S64) | yes |
| `security` is never folded into `bug` | `orchestra:triage` Impact row | ported (S64) | yes |
| Bucket rules 1–4, first match wins | `orchestra:triage` "The bucket" | ported (S64) | yes |
| Decide = half A AND half B | `orchestra:triage` "The Decide test" | ported (S64) | yes |
| Half A: two or more options with different trade-offs, listed | `orchestra:triage` Half A; finding format | ported (S64) | yes |
| B1: a product answer you cannot read anywhere; never install a "safe" default | `orchestra:triage` B1, with the business fact as its sure case | ported (S64) | yes |
| B1 bound: an assumption counts only if not derivable and visible to users | `orchestra:triage` B1: technical choice vs business fact | dropped, replaced by S60 (S64) | yes |
| B2: a shape-setting choice with no recommendation | `orchestra:triage` B2 | ported (S64) | yes |
| Half A without B: make the call; handing it back is a failure | `orchestra:triage` "Half A without half B" | ported (S64) | yes |
| Flags 🔴 / 🟡 | `orchestra:triage` Flags | ported (S64) | yes |
| Action per bucket | `orchestra:triage` "The action per bucket", §8.4 short form | ported | yes |
| Decide lands after the stage's Patches | stop before any fix | dropped (S46, S55) | yes |
| Check each Patch is right before applying it; reject a wrong one with evidence | `orchestra:triage` action table, Patch | ported (S64) | yes |
| Finding format: title, prose, "In the code", fix | `orchestra:triage` "Finding format" | ported (S64) | yes |
| A Decide says why the call is not yours | `orchestra:triage` "Finding format" | ported (S64) | yes |
| Calibration: a real Decide and a near-miss Patch | `orchestra:triage` "Calibration" | ported (S64) | yes |
| Write for a reader new to the code; length by bucket | `orchestra:triage` "Finding format" | ported (S64) | yes |
| Notes sections ordered by bucket | `orchestra:triage` "The notes file" | ported (S64) | yes |
| Notes and result must match | `orchestra:triage` "The notes file" | ported (S64) | yes |
| Hard gate: both failure directions; size alone is not Decide | `orchestra:triage` "Hard gate" | ported (S64) | yes |

#### stages/logic-review.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Fresh eyes, once, fixes in its own session | logic-review gate (S14, S25, S55) | ported | yes |
| Loads review, testing, ops and build skills | stack-agnostic; ops and testing are stack gates: RO, RT | ported (S68) | yes |
| Read brief, plan, implementation log, diff, changed files in full | split (S66): `plan-conformance` reads the plan and the log; logic-review reads the brief, `decisions` and the diff | ported (S66, split on purpose) | yes |
| Criterion-to-test mapping | logic-review step 3 | ported | yes |
| Test quality: empty asserts, disabled tests, mocked unit under test, tests that pass without the change | logic-review step 3, plus "fails on a wrong version" (S66) | ported (S66) | yes |
| Completeness: every plan task done, nothing stubbed | `plan-conformance` "Tasks done" | ported (S66) | yes |
| Undeclared deviations from the plan | `plan-conformance` "Deviations", "Scope" | ported (S66) | yes |
| Correctness: bugs, edges, races, transaction and error boundaries | logic-review step 4 | ported | yes |
| Error handling and security | logic-review step 4 names security holes (partial); RO carries the error rules; the security list is dropped (S68) | partial | yes |
| Not yours: naming, structure, comments, logs, layout | logic-review "Not yours" | ported | yes |
| Patch: check it first, fix minimally | `orchestra:triage` action table | ported (S64) | yes |
| Evaluate / Noise / Decide actions | steps 5, 7 | ported | yes |
| Affected tests only; one commit | step 8 (S63) | ported | yes |
| Notes sections | `logic-review.md` in the `orchestra:triage` notes format | ported (S64) | yes |
| Return counts, decisions | result JSON | ported | yes |

#### stages/structure.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Structure reviewer | — | dropped (S68: no structure gate; clean-code comes later at workflow level) | no |
| Runs before the build that verifies, because it may rewrite code | — | dropped (S68: no structure gate; clean-code comes later at workflow level) | no |
| Scope = the diff | — | dropped (S68: no structure gate; clean-code comes later at workflow level) | no |
| Checklist: layering, SOLID, records, DI, immutability, DTO annotations, naming, null checks, member order | null checks RO 7, 8; `@UtilityClass` RY 8; member order, SOLID, DTO annotations, naming dropped (S68) | partial | yes (stack) |
| Leave cross-file moves and new or deleted classes | — | dropped (S68: no structure gate) | no |
| Notes: Fixed / Left | triage notes format | dropped (S68: each gate writes the triage notes format) | no |

#### stages/verify.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Measure only | runner build step (S48) | ported | yes |
| Wrapper, flags, settings file, log to file | `build.run`, code guide | partial (settings file only in DESIGN §4.2) | yes (stack) |
| Do not stop at the first failure | OJ `build.run` `-fae` | ported (S69) | yes (stack) |
| Pass/fail from the build line; test totals summed | exit code | partial (no test counts) | yes |
| Never change files; never skip tests | fix-build | ported | yes |
| Pass the last ~200 lines, compile errors first | raw log path to the fixer | dropped (S47) | no |
| JaCoCo coverage | §10 | planned (phase 2, CRAP gate, DESIGN §10) | yes |

#### stages/fix-verify.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Fix every failure after a red build | fixer + fix-build (S47, S48) | ported | yes |
| No push, not on the default branch, source files only | fixer | ported | yes |
| Honestly blocked; never delete or disable a test | fixer, fix-build | ported | yes |
| A test wrong about its criterion: fix it and write down why | fix-build "Decide which one is wrong" | partial (no write-down) | yes |
| Reproduce first | fix-build 2 | ported | yes |
| Root cause: read every caller, fix once where all paths meet | fix-build 1 | partial | yes |
| Fix, rerun, one commit | fixer 5 | ported | yes |
| Notes: failures, root cause, fixed, not fixed | fixer commit body | ported (S69) | yes |
| One attempt | `max_rounds` 3 (S47) | ported | yes |

#### stages/logging.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Logging pass, never changes behaviour | RL (finish "logging", §6.2) | ported (S68) | yes (stack) |
| Skip when no log line changed | §6.4 selection by `files` | partial (the gate runs for any changed `*.java`, not for a changed log line) | yes |
| Scope: declaration, level, format, exceptions, structured values, masking | RL 1–10 | ported | yes (stack) |
| Blank lines around logs belong to layout | RY 1–5 | ported | yes |
| Leave a fix that changes behaviour, or a message a test outside the diff asserts | triage buckets (Decide, Evaluate) keep a risky fix open; step 8 runs the tests of the changed files only | partial (a test outside the diff is not run, S68) | yes |
| Compile and test touched modules; one commit | final build, S14 | ported | yes |

#### stages/comments.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Comments pass, never changes code | RC (finish "comments") | ported (S68) | yes (stack) |
| Skip when no comment changed | §6.4 selection by `files` | partial (the gate runs for any changed `*.java`, not for a changed comment) | yes |
| A comment earns its place: constraint, reason, external fact, contract, expiry | RC 1 | ported | yes |
| Delete restating and narrating comments, plan names, invented reasons | RC 3, 4, 5, 6; code 3.4 | ported | yes |
| Run the skill's self-check greps | RC sweeps; `test/orc-java-stack/comments-grep.test.js` | ported | yes |
| Leave a comment only when its truth is unknown | RC 5 (delete a reason nothing backs, keep the fact) | ported | yes |
| Compile (Javadoc can break the build) | finish build | ported | yes |

#### stages/layout.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Runs last; formats once | finish: agents → tools → build (§6.2) | ported | yes |
| Skip when no Java file changed | §6.4 selection by `files` | partial (the gate runs for any changed `*.java`) | yes |
| Empty-line rules | RY 1–5 | ported | yes (stack) |
| Import rules | RY 6–7 | ported | yes (stack) |
| Spotless apply | Spotless gate (S68) | ported | yes |
| Run Spotless only where the repo has it, else record it | Spotless gate skips a pom with no plugin | ported (S68) | yes |
| No formatter: follow the code around it, and say so | guides "The project's own code wins" | partial | yes |
| Commit only the touched files | the runner commits the changes of a green tool gate (S68) | ported (S68) | yes |
| Compile after | finish build | ported | yes |

#### Top losses (be-coding-agent)

1. ~~**Triage depth.**~~ Fixed: `orchestra:triage` (S64).
2. ~~**Check a Patch before applying it.**~~ Fixed: `orchestra:triage` (S64).
3. ~~**A stage that writes no result is dispatched again with no limit.**~~ Fixed: two dispatches, then `failed` (S69).
4. ~~**Test-quality checks in logic-review.**~~ Fixed: logic-review step 3 (S66).
5. **The Decide hand-off lost its prose and the trade-offs per option.** The human decides from one line.
6. ~~**Escalation, integration points, risks, and the external-facts check.**~~ Fixed (S69): brief Integration points, plan-check Decide for an unnamed repo. One row stays `partial`: the places to look (local Maven repo dropped).
7. ~~**Deviations in the report.**~~ Fixed: `plan-conformance` checks them (S66); the report has `## Deviations` (S69).
8. ~~**Coder blocker context.**~~ Fixed: `next.js` writes the reason into the log before the rerun (S69).
9. **Spotless.** ~~No `-Dspotless.check.skip` in the build~~ (closed by S69), ~~Spotless runs where it is not set up~~ (closed by S68: the gate skips a pom with no plugin), and ~~the layout rules are not in §10~~ (closed by S68: RY 1–7).
10. **Report detail.** ~~Files changed~~ (closed by S69), test counts and Patch reasons are gone. (The degraded run is forbidden now, S65.)

### java-stack

Source: `~/Projects/claude-code-plugins/plugins/java-stack`. Target: `plugins/orc-java-stack`, ported by
plan 4 (S68). ship.cars-only content (`cars.ship.commons`, internal BOMs, JIRA hooks) is `dropped` by
S3 and DESIGN §2. The personal repo names depitropov-commons helpers where java-stack named
ship.cars ones (S68); `PORT-TO-SC.md` (git-ignored) says how to swap them back.
Short names: CG = `code-guide`, FB = `fix-build`, OJ = `orc-java-stack/orchestra.json`, RO =
`review-ops`, RT = `review-testing`, RC = `review-comments`, RL = `review-logging`, RY =
`review-layout`, FS = `fix-spotless`. Numbers are rule numbers in that skill.

#### README.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Skill and agent list | OJ `guides`, `gates` | dropped (S43, S53) | no |
| Install via the ship.cars marketplace | DESIGN §11 | dropped (S33) | no |
| Skills load on their own | — | dropped (S53, R3 §5.2) | no |
| Related plugins | — | dropped (S3) | no |

#### agents/java-code-reviewer.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Agent file (model, color, MCP tools) | — | dropped (S1, S33, DESIGN §11) | no |
| Read the project's agent file first | each gate: "The project's code wins" (procedure 3) | ported | yes |
| Conventions list | the six gates, DESIGN §10 (S68) | ported | yes |
| 8 review areas | gates ops, testing, comments, logging, layout; logic-review | partial: the 8-area list, the persona and "Maven and dependencies" and "performance" are dropped (S68) | yes |
| Output: Critical/Major/Minor/Positive | §8.4 buckets | dropped (S14, S44, §8.4) | no |
| Review the changed code | runner diff (§6.4); each gate "Get the change" | ported | yes |
| Check library facts at the source | spec step 3 | partial (spec only) | yes |

#### agents/sc-java-logging.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Logging fixer agent | gate "logging": RL | ported | yes |
| Fix directly by default | §6.1 (S14) | ported | yes |
| "Review only" mode | agent gates always fix (§6.1) | dropped (§6.1) | unsure (hand use, §9) |
| Build after fixing | finish build (§6.2) | ported | yes |
| Output: files, fixes, unfixable | result JSON, `evaluate` (§8.2, S57) | ported | yes |

#### skills/java/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Skill index | OJ | dropped (S53, S68) | no |
| Readability first | — | dropped (S68: clean-code comes later at workflow level) | yes |
| Match the codebase | each gate "The project's code wins"; CG intro | ported | yes |
| Business logic has tests | logic-review | ported | yes |
| SOLID | — | dropped (S68, R6: no gain from generic principles) | no |

#### skills/java-architecture/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Layers, dependencies point inward | — | dropped (S68: no structure gate; Clean Architecture left out) | no |
| Interfaces at layer boundaries | — | dropped (S68) | no |
| SOLID | — | dropped (S68) | no |
| Package by feature | — | dropped (S68) | no |
| Consistent modules, Maven layout | — | dropped (S68) | no |
| Microservice size | — | n/a (not a code rule) | no |
| Composition, program to interfaces, DI | — | dropped (S68) | no |
| Records for data holders | — | dropped (S68) | no |
| Builder, Factory, Strategy, Template | — | dropped (S68: the pattern list) | no |
| `ObjectUtils` line | — | dropped (S68) | no |
| Lombok `@UtilityClass` | RY 8 | ported | yes |
| REST DTO annotations | — | dropped (S68: DTOs gate) | no |
| DRY, encapsulate what varies | — | dropped (S68) | no |
| Side effects apart from pure logic | — | dropped (S68) | no |
| Immutability, `final` | — | dropped (S68) | no |
| Small classes and methods | — | dropped (S68: clean-code later) | no |
| Performance (7 points) | — | dropped (S68) | no |

#### skills/java-style/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Descriptive names, nouns and verbs | — | dropped (S68: clean-code later) | no |
| Case conventions, `DefaultX` names | — | dropped (S68: clean-code later) | no |
| Commons Lang `isBlank` / `isEmpty` | RO 8 | ported | yes |
| Member order | — | dropped (S68) | no |
| Methods under 30 lines, parameter objects | — | dropped (S68: clean-code later) | no |

#### skills/java-review/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Reviewer principles | — | dropped (S68) | no |
| Follows project patterns, reuse utilities | each gate "The project's code wins"; spec "Patterns to reuse" | ported | yes |
| Comment contract | RC 1–8 | ported | yes |
| Error handling, `isNotBlank` + trim | RO 1–8 | ported | yes |
| Security | — | dropped (S68: the security list) | no |
| Test coverage | logic-review | ported | yes |
| SOLID | — | dropped (S68) | no |
| WARN vs INFO | RL 7 | ported | yes |
| Assertion helpers | RT 2, 3, 6 | ported | yes |
| One `CREATE INDEX CONCURRENTLY` per file | RO 9 | ported | yes |
| No magic numbers | — | dropped (S68) | no |
| Static-import enums | RY 6 | ported | yes |
| Performance, scalability, smells, tech debt | — | dropped (S68) | no |
| Prefer changing files over new ones | — | dropped (S68) | no |

#### skills/java-comments/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Accuracy over volume | RC rules intro | ported | yes |
| Five kinds of comment that earn their place | RC 1 | ported | yes |
| Describe state, never change | RC 2 | ported | yes |
| No plan names in comments (Jira is fine) | RC 3, 4 | ported | yes |
| Never invent a reason | RC 5 | ported | yes |
| Examples | RC examples | partial (S68: the `retries++` restates-the-code example is dropped) | yes |
| Test comments | RC 7 | ported | yes |
| Delete-on-sight list | RC 6 | ported | yes |
| Match the code next to it | RC 8 | ported | yes |
| Common Mistakes table | — | dropped (S68: rules 6 and 8 cover it) | no |
| Self-check greps, tier 1 and tier 2 | RC "Sweeps"; `test/orc-java-stack/comments-grep.test.js` | ported | yes |

#### skills/java-comments/evals/

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Layer 1: `run.sh` grep eval | `test/orc-java-stack/comments-grep.test.js` | ported | yes |
| Fixtures | `test/orc-java-stack/fixtures/comments/` (the real ship.cars lines are in `PORT-TO-SC.md`) | ported | yes |
| Keep the pattern in sync with the skill | `comments-grep.test.js` | ported | yes |
| Layer 2: judgement cases C1–C10 | — | dropped (S68: judgment cases, run by hand; ship.cars text) | no |
| Backtest numbers and known limits | — | dropped (S68) | no |

No gate except comments has an eval or a regression test. `orchestra check` (§5.3) checks structure
only.

#### skills/java-formatting/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Google style, imports, indentation, line length | Spotless gate (OJ `spotless`) | ported | yes |
| Static imports, enum constants static | RY 6, 7 | ported | yes |
| Comments section | RC | ported | yes |
| Spotless commands | OJ `spotless.run` | ported | yes |
| Empty-line rules and 12 examples | RY 1–5 and its example | ported | yes |

#### skills/java-logging/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Lombok `@Slf4j` | RL 1 | ported | yes |
| Levels; WARN vs INFO by who controls the data | RL 7 (the WARN "deprecated usage, approaching limits" is dropped, S68) | partial | yes |
| Empty lines | RY 1–5 | ported (moved to the layout gate) | yes |
| Message format, content rules, labels | RL 3, 4 | ported | yes |
| Parameterized logging, debug guard | RL 2, 9 | ported | yes |
| Exceptions: cause last; never log and rethrow | RL 5, 6 | ported | yes |
| Sensitive fields | RL 8 | ported | yes |
| `hideString()` | RL 8 (depitropov-commons, S68) | ported | yes |
| `scValue()` | — | dropped (S3, S68: ship.cars port, `PORT-TO-SC.md`) | no |
| Quarkus `kv()`, detect Quarkus vs Spring | RL 10 | ported | yes |
| 16 anti-patterns | RL 1–10 | ported (ship.cars items dropped, S3) | yes |

#### skills/java-maven/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| "Invoke before any mvn" trigger | OJ `build` (S48), CG | dropped (S48, S53) | no |
| Wrapper, `-B` | CG 1, OJ `build` | ported | yes |
| `-s .mvn/settings.xml` | CG 1 (conditional) | ported; OJ `build.run` still lacks it (`PORT-TO-SC.md`) | yes |
| Check the module exists before `-pl`; check mvnw and settings exist | CG 1, 3 | ported | yes |
| Log to a file once; no pipes | code skill, fixer (S60) | ported | yes |
| Single class or method | CG 2, FB 2 | ported | yes |
| Several classes in `-Dtest`; `-Dsurefire.failIfNoSpecifiedTests=false` | CG 2, 3 | ported | yes |
| `-DskipTests` only to compile | FB 3 | partial | yes |
| Stale SNAPSHOT: always `-am` | CG 3 | ported | yes |
| An interrupted run leaves `target/` broken | CG 4 | ported | yes |
| Shell gotchas (noclobber, SIGPIPE) | S60 no-pipe rule | partial | unsure |
| Dependency management | — | dropped (S68) | no |
| JaCoCo in the build | — | dropped here; the CRAP gate comes in phase 2 (DESIGN §10) | yes |

#### skills/java-ops/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Error handling | RO 2–6 | ported | yes |
| Wrap exceptions with the cause | RO 1 | ported | yes |
| Strings: one trimming strategy | RO 7 | ported | yes |
| Flyway: one `CONCURRENTLY` per file, `IF NOT EXISTS` | RO 9 | ported (at review time, S68) | yes |
| Custom exception hierarchies | — | dropped (S68) | no |
| Security | — | dropped (S68: the security list) | no |
| Concurrency | — | dropped (S68: the concurrency list) | no |
| Javadoc with all params; README per module | — | dropped (S68: the documentation list; conflicts with RC) | no |

#### skills/java-testing/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Positive and negative cases; independent tests | logic-review | ported | yes |
| Integration and end-to-end for critical paths | — | dropped (S68) | no |
| Mocks for external dependencies | — | dropped (S68: the "Unit Testing" list) | no |
| Edges, names, AAA, AssertJ, JUnit 5 | RT 1, 8 | ported | yes |
| FAILURE vs ERROR in Surefire | CG 4 | ported | yes |
| Mirror the production structure; builders for setup; structure by behaviour | — | dropped (S68: the "Test Structure" bullets) | no |
| "A test class per service", coverage | — | dropped (S68: logic-review owns coverage) | no |
| JsonUnit, SoftAssertions rules, assertion helpers | RT 1, 4, 5, 6 | ported | yes |
| `assertBusinessRuleException`, `assertErrorDto` | RT 2, 3 (depitropov-commons, S68) | ported | yes |
| Static-import enums in tests | RY 6 | ported | yes |
| Parameterized sources (`@NullAndEmptySource`) | RT 7 | ported | yes |
| Builders and helpers | RT 6 | partial | yes |
| Overload the helper, nullable expected values | — | dropped (S68) | no |

#### skills/java-maven-upgrade/ (SKILL.md and 3 sub-files)

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| All parts: the upgrade procedure, internal BOMs, version rules, Maven wrapper steps, Quarkus migration lessons | — | dropped (S68: not part of a task run) | no |

#### skills/spotless-maven-setup/ (SKILL.md and assets)

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| `spotless:apply` works from root; `verify` runs `check` | OJ `spotless` gate | ported (skipped when the pom has no plugin) | yes |
| Add and check the plugin; `spotless-plugin-block.xml` | — | dropped (S68: the Spotless set-up) | no |
| Client hooks, `install_client_hooks.sh`, revalidation | — | dropped (S68) | no |
| Gotchas A–E | FS cases A–E | ported | yes |
| `pre-commit` hook | — | dropped (S68); its guard (re-stage only the files already staged) is ported in the runner: `commitKeeping` in `plugins/orchestra/lib/git.js`, called by `toolStep` | no |
| `commit-msg` hook (needs a JIRA key) | `PORT-TO-SC.md` | dropped (S3) | no |

#### Top losses (java-stack)

1. **Skill evals.** The comments evals now run (`test/orc-java-stack/comments-grep.test.js`). The
   other gates have none.
2. **Multi-module test-selection gotchas.** Closed by S68: CG 2–4.
3. **The build lacks the settings file and JaCoCo.** A repo with private settings fails; the CRAP gate will have no data.
4. **Flyway migration rules** are at review time by S68 (RO 9); R3 puts migrations at write time.
5. **The DTO shape rule.** Closed by S68: the DTO rule is dropped.
6. **The comments grep.** Closed by S68: RC "Sweeps".
7. **Spotless set-up and fix guide.** Closed by S68: the gate skips a pom with no plugin, and FS holds the fix guide.
8. **Empty-line and static-import rules.** Closed by S68: RY 1–7.
9. **Generic upgrade lessons have no slot,** and FB blocks dependency changes.
10. **Silent conflicts:** the ship.cars `commit-msg` hook against orchestra's commit messages (`PORT-TO-SC.md`). The Javadoc `@param` conflict is gone: S68 drops the documentation list.

### minions

Source: `~/Projects-other/claude-minions`. Not inventoried yet. It becomes the Curator in a later
phase (S2). Inventory it, by the steps above, before the Curator is planned.

### sc-agent-plugins

Source: `~/Projects/sc-agent-plugins`, read on 2026-10-14 at commit `de112a8`. Its packaging rules
became pillar 4 (S33, DESIGN §11). Plan 5 (Codex) is paused (S71); rows that say "plan 5" are its
input. R7 settles gaps 2 and 4 below from the Codex source, and makes gap 1 optional.

Scope: the files that carry the portability mechanism are read in full and inventoried part by part.
The six plugins hold ship.cars product and frontend content; only their harness passages have rows.
The rest is `n/a` as a group (last table).

#### README.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Skills are the unit of delivery; a harness-specific part is generated or absent | pillar 4 (S33, DESIGN §11) | ported | yes |
| Install commands for Claude Code and for Codex (`codex plugin marketplace add`) | — (this repo has no README) | planned (plan 5) | yes |
| Codex dispatches subagents only with `multi_agent = true` in `~/.codex/config.toml` | — | planned (plan 5): the install text must say it; orchestra stops without subagents (S65) | yes |
| Each orchestrator's README says what it does without subagents: inline, or stop | run skill stops (S65); no README says it | partial (no README) | yes |
| Rule 1: frontmatter has only `name` and `description` | `check.js` `checkSkills` (S33, S70) | ported | yes |
| Rule 2: a specialist is a skill, not an agent; context isolation comes from the dispatch | S1, S57; the run skill dispatches a subagent that invokes a skill | ported | yes |
| Rule 2: registration files (`agents/*.md`, `.codex/agents/*.toml`) are generated from the skill | — | n/a: orchestra ships no agents | no |
| Rule 3: bodies name actions, not tools | DESIGN §11; `check.js` `HARNESS_WORDS` | partial: the check misses `Agent tool`, `run_in_background`, `Claude Code`, `CLAUDE_PLUGIN_ROOT` | yes |
| Rule 4: a portable `plugin.json` and a `.claude-plugin/plugin.json`, same name and version | `check.js` `checkPlugin` | ported | yes |
| Rule 4: two catalogs, `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` | only `.claude-plugin/marketplace.json` exists, though DESIGN §11 names both | planned (plan 5) | yes |
| Rule 4: the manifests are generated | DESIGN §11 says a script generates them; none exists, `check.js` checks that they agree | partial (plan 5 decides: generate, or keep the check) | yes |
| Cost: tool allowlists cannot be enforced; a role states its limits under "Permitted actions" | run skill "Permitted actions"; the dispatch says what the subagent must be able to do | ported | yes |
| Cost: model pinning is not portable; say the tier | — | dropped (Scope: one model) | no |
| Cost: context isolation is the harness's call; never degrade silently | S65: the run stops | ported | yes |
| Cost: no `@`-mention; a specialist is reached by its description | the user calls `orchestra:run`; other skills are dispatched by name | n/a | no |

#### .agents/skills/multi-harness-support/SKILL.md

Claude Code reads it through the link `.claude/skills/multi-harness-support`.

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| The four rules (as in README) | rows above | as above | yes |
| Rule 1: a key beyond the two does nothing elsewhere; write the behavior into the body | `check.js` frontmatter rule | ported | yes |
| Rule 2: Claude Code's agent registry comes from a plugin; Codex's only from config layers (`<repo>/.codex/agents/`, `~/.codex/agents/`); Agent Plugins 1.0 has no agents | S57 (one general-purpose subagent) | ported (nothing depends on a registry) | yes |
| Rule 2: an agent is a skill plus a tool allowlist and a model pin; only those two are lost | rows above | ported | yes |
| Rule 2: a prompt only one orchestrator uses may be a plain file under `skills/<orchestrator>/roles/` | — | n/a: every stage is a skill (S1) | no |
| Rule 3: the word list, including `Agent tool`, `run_in_background`, "Claude Code" | `HARNESS_WORDS` | partial (as in README) | yes |
| Rule 4: four versions per plugin move together (two manifests, two catalogs) | two manifests checked; the catalog carries no version | ported for two; the second catalog is plan 5 | yes |
| Add a skill: the `name` matches the folder | `check.js` | ported | yes |
| Add a skill: write the description for triggering; on a harness with no skill tool it is the only thing that loads the skill | run and init descriptions; `writing-plugins` | ported | yes |
| Add a skill: long material goes in `references/` next to `SKILL.md` | — | n/a: no skill needs it yet | no |
| Add a plugin: `name` matches the folder in both manifests | `packaging.test.js`, `check.js` | ported | yes |
| Add a plugin: `.agents` catalog `source.path` starts with `./`; `policy.installation` and `policy.authentication` values (`ON_INSTALL`/`ON_USE`, not `ON_FIRST_USE`) | — | planned (plan 5, with the second catalog) | yes |
| Add a plugin: a README with what, how and structure | — | planned (plan 5) | yes |
| Add a plugin: MCP config as both `mcp.json` and `.mcp.json` | — | n/a: no MCP servers | no |
| Port a Claude-Code-only plugin: agents → skills, repoint the orchestrator, neutral words, decide what does not come | PORTING steps; S1, S4 | ported | yes |
| Before done: the four shell checks (frontmatter, words, manifests parse, role files exist) | `orchestra check` (S70) runs the same rules in code | ported | yes |
| Before done: run it on a second harness; a port is done when a skill triggers and completes there | S34 (phase 1 needs a Codex run) | planned (plan 5) | yes |

#### .agents/skills/multi-harness-support/references/adding-a-harness.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| No bootstrap: skills trigger by description; no session-start injection needed | orchestra has no bootstrap | ported | yes |
| Capabilities: skill discovery, file read/write, shell are required; subagents, MCP, todos degrade | S65: for orchestra subagents are required, not degradable | ported (stricter) | yes |
| Learn the mechanism: harness source first (`codex-rs/core-plugins/src/loader.rs`, `codex-rs/ext/skills/src/host_roots.rs`), then a real plugin, then docs, then ask the model for its tool names | — | planned (plan 5 research note) | yes |
| Prove a file is loaded with a unique marker in a fresh session | — | planned (plan 5) | yes |
| A fork does not inherit its parent's behavior | — | planned (plan 5) | yes |
| Never edit the user's config; `.codex/agents/*.toml` belongs in the project repo | orchestra writes only `.orchestra/` and `.gitignore` in the project (init) | ported | yes |
| The work: manifest, catalog, registrations only when useful, install docs, versions in lockstep | rows above | planned (plan 5) | yes |
| Done: install by the harness's own command; a skill triggers from a plain request in a clean session; an orchestrator completes or stops by its declared path; checks pass; README covers it | S34 | planned (plan 5) | yes |
| Gotchas: docs lie; an unknown component is silently ignored; an absent `hooks` key differs from `{}`; catalog paths are root-relative, `../` is rejected; do not port a command or workflow script; do not edit a body for one harness | — | planned (plan 5 research note) | yes |

#### .claude-plugin/marketplace.json, .agents/plugins/marketplace.json

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Claude Code catalog: `name`, `owner`, `plugins[].source` `./plugins/<name>` | `.claude-plugin/marketplace.json` | ported | yes |
| Agent Plugins catalog: `interface.displayName`; per plugin `source: {source: local, path}`, `policy`, `category` | — | planned (plan 5) | yes |

#### plugins/fe-coding-agent/plugin.json, .claude-plugin/plugin.json, mcp.json, .mcp.json

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Portable manifest with `$schema`, `author`, `repository`, `license`, `keywords` | orchestra's `plugin.json` has `name`, `version`, `description` | partial (plan 5 checks what Codex needs) | yes |
| `extensions.com.openai.interface` (`displayName`, `shortDescription`, `category`) | — | planned (plan 5) | yes |
| MCP files | — | n/a: no MCP servers | no |

#### Harness passages in the six plugins

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| validate-idea: if a subagent cannot invoke skills, give it the text of the skill's `SKILL.md` | `withPrompt` (`lib/protocol.js`) only says "Invoke the skill" | planned (plan 5: check that a Codex subagent can invoke a plugin skill) | yes |
| validate-idea: without subagents, run each specialist inline, in order, and say so once | S65 chose stop for orchestra | dropped (S65) | no |
| architect-feature `references/headless.md`: without subagents, the review is a separate pass by the main session; the result records which | S65 | dropped (S65) | no |
| review-requirements: some harnesses show `plugin:name`, others the bare name; match on the description | init and run look for `<plugin>:manifest`; every slot plugin has a skill named `manifest` | planned (plan 5: a bare name makes every manifest skill look the same) | yes |
| product-context: resolve paths from the skill's own folder; never guess from a plugin name or marketplace layout | manifest skill and run skill (`<orchestra>` = two folders up) | ported | yes |
| eval-anchor: a skill that reports its plugin root as one line | the manifest skill (`PLUGIN_DIR=`) | ported (same mechanism, S50) | yes |
| fe-coding-agent: subagents cannot start subagents; the main session dispatches all | R4, S57 | ported | yes |
| fe-coding-agent: headless prompt sent through `claude -p` or `codex exec`; final status line | — | n/a: orchestra runs in the user's session (S12) | no |

#### Not applicable as a group

| Files | Why |
|---|---|
| The six plugins' product, frontend and Jira content (`product-research`, `product-worker`, `feature-architect`, `fe-coding-agent` stages, `requirements-review`, `sc-shared-context`) | ship.cars domain content. This source's role is pillar 4 (Sources table). |
| `plugins/*/evals/`, `plugins/*/eval-support/` | `claude plugin eval` suites for those plugins |
| `scripts/` (knowledge sync, allow list, seed) | they build `sc-shared-context` |
| `docs/superpowers/` | the plan, spec and verification of the knowledge skills |

#### Top gaps (sc-agent-plugins), input for plan 5

1. **Second catalog.** `.agents/plugins/marketplace.json` is missing, though DESIGN §11 names it.
2. **Skill names on Codex.** init and run find `<plugin>:manifest`. If Codex shows bare names, every
   slot plugin's `manifest` skill has the same name.
3. **Skills in a subagent.** Every dispatch says "Invoke the skill". Check that a Codex subagent can
   invoke a plugin skill; if not, the fallback is to hand it the `SKILL.md` text.
4. **`multi_agent`.** Codex needs it to dispatch. orchestra stops without subagents (S65), so the
   install text must say it. orchestra never edits `~/.codex/config.toml`.
5. **Harness words.** `HARNESS_WORDS` misses `Agent tool`, `run_in_background`, `Claude Code`,
   `CLAUDE_PLUGIN_ROOT`.
6. **Generated manifests.** DESIGN §11 says a script generates them. None exists; `check.js` checks
   that they agree. Decide which one stays.
7. **README.** No install text for either harness.
8. **Proof.** A Codex run of the sample repo (S34), with the loader read from the Codex source.

### ai-marketplace-mentorano

Source: `~/Projects-other/ai-marketplace-mentorano/plugins/clean-code`, version 0.6.0, read in full on 2026-10-16. `plugins/clean-code` is a verbatim copy of every file below, so each part is at least `ported` there. The rows say where each part went in orchestra; decided by S75.

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

#### skills/clean-code-python/SKILL.md, skills/clean-code-logging/**, skills/architecture-fundamentals/**

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files | `plugins/clean-code/skills/` | dropped from orchestra (S75: no Python stack; logging and system architecture are not the clean-code gate's) | no |

#### tests/test_measure.py, test_revisions.py, test_boundaries.py, ts_package.py, fixtures/clean-code/*

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files, path constants changed | `test/clean-code/` | ported | yes |
| `test_skills.py` (marketplace frontmatter) | `test/packaging.test.js` checks every plugin | n/a (this repo has its own check) | no |

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
| Layer defaults: run the project's dependency checker | "Layers of a React app": the checker's result wins over this list; neither the gate nor the build runs it | partial (running it dropped, S75: the gate reviews, it does not run or add tooling) | yes |
| Measuring: the command | the stack's `measure` (S75) | ported (other mechanism) | yes |
| Measuring: the `typescript` package, TS 7, what counts as a function, test files | "Reading the measurement" | ported | yes |
| Measuring: the install command `npm install --no-save typescript@5` | "Reading the measurement" names `typescript@5`; the script's own error message prints the command | ported (other mechanism) | yes |
| Two greps | "Two searches", tied to TS rules 4 and 5 | ported | yes |
| A hit in an untouched file is context | "Two searches", last line | ported | yes |
| What not to do: no `helpers.ts`, one URL-state owner, create the hook, fix the dependency source, do not silence `exhaustive-deps` | TS rules 12, 13, 4, 6 | ported | yes |

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
