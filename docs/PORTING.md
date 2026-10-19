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

Source: `~/Projects-other/claude-minions`, read on 2026-10-16. The Curator takes minions' long-term
tier: curate, direction, backlog, shape-project, shape-product, shape-tech and research, with their
templates and references. The decisions are S76, the Curator design, recorded with its spec.

General notes:
- `orc-curator` is the working name of the plugin. `docs/curator/` is the Curator's fixed docs folder
  in a project (S76).
- One mode: minions' `vibe`. A project without the Curator is minions' `maintain` (S76).
- The code-knowledge half (conventions into skills, rules and `CLAUDE.md`, the knowledge ledger) waits
  for the PSK (S76).
- `STATE.md`, the cursor, `config.yml` and the `.minions/` roots do not apply: orchestra owns run state.
- Files read in full: `agents/curator.md`, `skills/curate`, `skills/direction`, `skills/backlog`,
  `skills/shape-project`, `skills/shape-product`, `skills/shape-tech`, `skills/research`,
  `skills/specify`, `skills/plan`, `README.md`, `CLAUDE.md`, `docs/CONTRACTS.md`, the templates
  `CURATE`, `knowledge-ledger`, `journal`, `DIRECTION`, `BACKLOG`, `PRODUCT`, `TECH`, `DECISIONS`,
  `QUESTIONS`, `CONTEXT`, `RESEARCH`, and the references `recording-rules`, `glossary`,
  `interview-cadence`, `ask-vs-research`, `right-sizing`. The other files are read in part (opening and
  every line that names a direction doc) and are grouped at the end.

#### agents/curator.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Frontmatter: trigger after a feature ships, dispatched by the curate step | `orc-curator:curate` description; orchestra runs it inline on `done`, or by hand on a commit range (S76) | ported (changed, S76) | yes |
| Tools: Read, Grep, Glob, Bash, Write, Edit | the main session's normal actions | n/a (curate runs inline in the main session, S76) | no |
| Role: keep durable knowledge true to the shipped code; report and stage, no commit, no archive | `orc-curator:curate` intro; changed: curate commits its own edits once (S76) | ported (changed, S76) | yes |
| Hard gate: never commit, never archive | `orc-curator:curate` Step 8: one commit of the sure and answered edits; no feature folder to archive | ported (changed, S76) | yes |
| Hard gate: write list — skill files, CLAUDE.md files, rules | — | dropped (S76: waits for PSK) | no |
| Hard gate: write list — DECISIONS, PRODUCT, ledger | DECISIONS, PRODUCT: `orc-curator:curate` Step 5; ledger dropped | partial (ledger dropped, S76: waits for PSK) | yes |
| Hard gate: BACKLOG — idea rows into Next or Later, Vision prose rewritten, never a horizon move | `orc-curator:curate` Steps 3, 5, 6; the Shipped move is in curate (single writer); no run moves a row to Now (S76) | ported (changed, S76) | yes |
| Hard gate: DIRECTION — mark satisfied, retire, delete orphans, never author a `Cn` | `orc-curator:curate` Step 6; curate invokes `orc-curator:direction`, which writes the `Cn` (S76) | ported (changed, S76) | yes |
| Hard gate: QUESTIONS — close only, never open, never delete | `orc-curator:curate` Step 5; changed: curate opens a `Qn` for each `Question` line of the brief (S76: single writer); never deletes | ported (changed, S76) | yes |
| Hard gate: `<feature>/CURATE.md` report, none for `--light` | `orc-curator:curate` Step 9: the summary to the user; no report file | ported (changed, S76) | yes |
| Hard gate: re-append deferred rows to the live journal, never edit the snapshot | — | dropped (S76: the journal belongs to the dropped hooks) | no |
| Hard gate: Bash read-only (git, grep, dedup) | `orc-curator:curate` Step 8: read-only git before the one commit | ported | yes |
| Hard gate: root `CLAUDE.md` and orientation pointer always human-gated | — | dropped (S76: waits for PSK) | no |
| Hard gate: evidence before a rule, `promote_threshold` | — | dropped (S76: waits for PSK) | no |
| Hard gate: verify before trust — ground each claim in the code | `orc-curator:curate` Step 4 | ported | yes |
| Hard gate: prune test ("would removing this cause a mistake?") | `orc-curator:curate` Step 4, for the direction docs | ported | yes |
| Hard gate: dedup check before every write | `orc-curator:curate` Step 4 | ported | yes |
| Hard gate: a contradiction is a FLAG, not an overwrite | `orc-curator:curate` Steps 4 and 7: a contradiction is a question to the user, asked inline (S76) | ported (changed, S76) | yes |
| Hard gate: never blind-append, rewrite inside managed-block anchors | `orc-curator:curate` Step 4: edit the owning entry in place (the direction docs have no anchors) | ported (changed, S76) | yes |
| Hard gate: no STATE, no commit, no archive | orchestra owns run state and commits | n/a (orchestra owns run state, S76) | no |
| When invoked 1: dispatch prompt — flavor, folder, mode, apply, diff, spec, plan, ARCH | `orc-curator:curate` Step 1: inline inputs `base`, `brief`, `notes`, result path; by hand a commit range (S76) | ported (changed, S76) | yes |
| When invoked 1: knowledge root and the paths of every doc it may write | `orc-curator:curate`: fixed docs folder `docs/curator/`, named in the skill (S76) | ported (changed, S76) | yes |
| When invoked 1: live journal and snapshot paths | — | dropped (S76: the journal belongs to the dropped hooks) | no |
| When invoked 1: `config.curate` settings | — | dropped (S76: they serve the code-knowledge half) | no |
| When invoked 1: a missing path — say so, never guess | `orc-curator:curate` Step 1 | ported | yes |
| When invoked 2: read every input first; DECISIONS for the next `Dn` and for contradictions | `orc-curator:curate` Step 2 | ported | yes |
| When invoked 2: unreadable input → `blocked` | `orc-curator:curate` Step 2: result `failed` with the reason | ported (changed, S76) | yes |
| When invoked 3: map existing surfaces with `git ls-files` before routing | — | dropped (S76: the surfaces are the code-knowledge half) | no |
| Pipeline: every candidate gets one recorded verdict ADD, UPDATE, NOOP, FLAG | `orc-curator:curate` Step 4; verdicts listed in the Step 9 summary; FLAG becomes a question (S76) | ported (changed, S76) | yes |
| Pipeline: candidates from the diff and from the journal snapshot | `orc-curator:curate` Step 4: diff, brief, `<notes>/decisions.md`; journal dropped | partial (journal dropped, S76) | yes |
| Step A: 3-question filter — inferable, a choice, checkable | `orc-curator:curate` Step 4, for the direction docs | ported | yes |
| Step B: Mem0 gate ADD, UPDATE, NOOP, FLAG | `orc-curator:curate` Step 4; FLAG is a question (S76) | ported (changed, S76) | yes |
| Step C route: task or intent → skill | — | dropped (S76: waits for PSK) | no |
| Step C route: one directory → per-directory `CLAUDE.md` | — | dropped (S76: waits for PSK) | no |
| Step C route: glob → `.claude/rules/*` | — | dropped (S76: waits for PSK) | no |
| Step C route: every turn → root `CLAUDE.md` | — | dropped (S76: waits for PSK) | no |
| Step C route: the why → `DECISIONS.md`, next `Dn`, `hard:` or `soft:` | `orc-curator:curate` Step 5; also the run's answers in `<notes>/decisions.md` (S76) | ported (changed, S76) | yes |
| Step C route: what the product is → PRODUCT, never a feature inventory | `orc-curator:curate` Step 5 | ported | yes |
| Step C route: a settled rationale → PRODUCT "Why it's shaped this way", cite the `Dn` | `orc-curator:curate` Step 5 | ported | yes |
| Step C route: Vision prose made real → delete it, one clause may go to PRODUCT | `orc-curator:curate` Step 5 | ported | yes |
| Step C route: layers, where code goes → native surfaces, never TECH | — | dropped (S76: waits for PSK) | no |
| Step C route: an idea → BACKLOG Next or Later, next `Bn` | `orc-curator:curate` Step 5; also the brief's `Deferred` lines and out-of-scope items (S76) | ported (changed, S76) | yes |
| Step C route: a question settled in code → QUESTIONS `answered → Dn` plus one sentence | `orc-curator:curate` Step 5 | ported | yes |
| Step C route: a domain term → `CONTEXT.md`, only domain-specific, edited in place, `_Avoid_` | `orc-curator:curate` Step 5; the glossary is `docs/curator/CONTEXT.md` (S76) | ported (changed, S76) | yes |
| Step C: maintain column (propose-only, NOOP for PRODUCT) | — | dropped (S76: maintain is a project without the Curator) | no |
| CONTEXT is also deleted from; tiered: plain retirement deletes, else FLAG | `orc-curator:curate` Step 6; else a question | ported (changed, S76) | yes |
| Subtract: PRODUCT — remove what stopped being true; unbuilt aspiration moves to Vision | `orc-curator:curate` Step 6 | ported | yes |
| Subtract: Vision — both directions; rewrite prose for a dropped or demoted row | `orc-curator:curate` Step 6 | ported | yes |
| Removal tiered by confidence: plain contradiction deletes, else FLAG | `orc-curator:curate` Step 6; else a question to the user, asked inline (S76) | ported (changed, S76) | yes |
| DIRECTION check 1: satisfied by `<path>` | `orc-curator:curate` Step 6 | ported | yes |
| DIRECTION check 2: retire satisfied rows whose `Bn` shipped | `orc-curator:curate` Step 6 | ported | yes |
| DIRECTION check 3: delete orphans whose `Bn` left Now and Next | `orc-curator:curate` Step 6 | ported | yes |
| DIRECTION check 4: cap 50 rows, FLAG, never truncate | `orc-curator:curate` Step 6; the FLAG is a question to the user (S76) | ported (changed, S76) | yes |
| `Direction: holds or needs re-derive` verdict line | curate runs the sweep itself, so no hand-off line (S76) | dropped (S76: curate runs the sweep) | no |
| Report only diff evidence, not countable conditions | `orc-curator:curate` Step 6: the diff evidence passed to `orc-curator:direction` | ported (changed, S76) | yes |
| Reviewing is curate's job, re-deriving is the sweep's; never author a `Cn` | `orc-curator:curate` Step 6: curate invokes `orc-curator:direction` with `Caller: curate`; the sweep writes the `Cn` (S76) | ported (changed, S76) | yes |
| Skills are the dominant surface, root `CLAUDE.md` last | — | dropped (S76: waits for PSK) | no |
| Close a `Qn` only on evidence in the diff, never on intent; leave a sentence | `orc-curator:curate` Step 5 | ported | yes |
| Step D: factual — refresh from source, never into a skill | `orc-curator:curate` Step 5: PRODUCT and TECH facts from the code; skill part dropped | partial (skill part dropped, S76: waits for PSK) | yes |
| Step D: convention path — slug, predicate, ledger counts, promote, cap 3 per run | — | dropped (S76: waits for PSK) | no |
| Journal snapshot consumption, re-append deferred rows | — | dropped (S76: the journal belongs to the dropped hooks) | no |
| adhoc-edit mining | — | dropped (S76: the journal belongs to the dropped hooks) | no |
| Decay pass, `audit_every`, `last_audit` | — | dropped (S76: waits for PSK) | no |
| Seed skillset, `structural: []`, `architecture` as decision procedure | — | dropped (S76: waits for PSK) | no |
| First run: fuller codebase scan into ledger observations | — | dropped (S76: waits for PSK); a first run of the docs is `setup` | no |
| Skill authoring bar, `cap_lines` | — | dropped (S76: waits for PSK) | no |
| Propose a skill beyond the seed | — | dropped (S76: waits for PSK) | no |
| `--audit` deferred | — | dropped (S76: waits for PSK) | no |
| Mode vibe → establish | the Curator's only behaviour | ported (changed, S76: one mode) | yes |
| Mode maintain → comply | — | dropped (S76: maintain is a project without the Curator) | no |
| Apply staging 1: write edits to the tree, managed blocks | `orc-curator:curate` Steps 4 and 8: edits in place, one commit by curate | ported (changed, S76) | yes |
| Apply staging 2: update the ledger | — | dropped (S76: waits for PSK) | no |
| Apply staging 3: run report per `templates/CURATE.md`; inline for `--light` | `orc-curator:curate` Step 9: the summary to the user | ported (changed, S76) | yes |
| End of run: return block Result ok, blocked, needs-input | `orc-curator:curate` Step 9: result JSON `ok` or `failed`; questions are asked inline, not returned (S76) | ported (changed, S76) | yes |
| Return block: Wrote, Summary | `orc-curator:curate` Step 9: the summary to the user | ported (changed, S76) | yes |
| Return block: Direction line | — | dropped (S76: curate runs the sweep) | no |
| Return block: Deviations/Warnings | `orc-curator:curate` Step 7: asked inline as questions (S76) | ported (changed, S76) | yes |
| Return block: Next `/minions:curate` | — | n/a (the driver loop decides the next action) | no |
| `needs-input` on a contradiction | `orc-curator:curate` Step 7: the question is asked inline; the run does not stop (S76) | ported (changed, S76) | yes |
| `ok` with FLAGs is still a clean run | `orc-curator:curate` Step 9: `ok` after the questions are answered and committed (S76) | ported (changed, S76) | yes |

#### skills/curate/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Frontmatter: trigger after reconcile; runnable directly; `--auto`, `--light` | `orc-curator:curate`: run inline by orchestra on `done`, and by hand on a commit range (S76) | ported (changed, S76) | yes |
| Announce line | — | n/a (orchestra prompts carry no announce) | no |
| Step 1: resolve `.minions/` or `docs/minions/` roots, `.minions-root` | fixed docs folder `docs/curator/` (S76) | n/a (fixed folder, S76) | no |
| Step 1: no `config.yml` → run init | `orc-curator:curate` Step 2: no `docs/curator/` → `failed`, run `orc-curator:setup`; orchestra runs setup from the flag (S76) | ported (changed, S76) | yes |
| Step 1: read mode, auto, `docs.knowledge`, journal, curate settings | — | dropped (S76: no modes, no journal, no code-knowledge settings) | no |
| Step 1: effective apply; maintain forces review | `orc-curator:curate`: one behaviour; sure edits and answers committed once (S76) | ported (changed, S76) | yes |
| Step 1: `--light` flavor — journal-only consolidation | — | dropped (S76: its only input is the journal; curate by hand on a commit range replaces the need) | no |
| Step 1: knowledge gate `docs.knowledge: off` | — | n/a (no Curator slot = no curate, S76) | no |
| Step 2: find the active feature folder from STATE | the run's notes folder and brief from `run.json` | n/a (orchestra owns run state, S76) | no |
| Step 3: phase detection from STATE; re-entry on `staged` skips re-dispatch | `orc-curator:curate` Step 3: a row already shipped with this run is not added again; a stopped curate reruns from the committed docs (S76) | ported (changed, S76) | yes |
| Step 3: never infer approval from the working tree | the result file is the signal for orchestra; answers come from the user inline (S76) | ported (changed, S76) | yes |
| Step 4: STATE in progress | — | n/a (orchestra owns run state) | no |
| Step 4.5: journal snapshot, crash recovery, atomic rename | — | dropped (S76: the journal belongs to the dropped hooks) | no |
| Step 5: dispatch `minions:curator` with a self-contained prompt | orchestra runs `orc-curator:curate` inline with `base`, `brief`, `notes` (S76: curate is one skill) | ported (changed, S76) | yes |
| Step 5: every writable doc path named, no hunting | `orc-curator:curate`: fixed docs folder, named in the skill (S76) | ported (changed, S76) | yes |
| Step 5: `--light` writes no report file | — | dropped (S76: `--light` dropped) | no |
| Step 5: apply review — relay, STATE `staged`, pause for approval | `orc-curator:curate` Step 7: judgement calls asked inline, one at a time; no pause for sure edits (S76) | ported (changed, S76) | yes |
| Step 5: maintain — human PR flow | — | dropped (S76: maintain is a project without the Curator) | no |
| Step 5: apply auto falls through | `orc-curator:curate` Step 8: the default (S76) | ported (changed, S76) | yes |
| Step 6: vibe commit — `git add` exactly the staged files and the docs | `orc-curator:curate` Step 8: one commit of `docs/curator/` on the task branch | ported (changed, S76) | yes |
| Step 6: never `git add` root `CLAUDE.md` | — | dropped (S76: waits for PSK) | no |
| Step 6: maintain commits nothing | — | dropped (S76: maintain is a project without the Curator) | no |
| Step 6: archive the feature folder, clean-folder precondition | — | n/a (the notes folder stays; orchestra removes the worktree) | no |
| Step 6: ship the BACKLOG row Now → Shipped | `orc-curator:curate` Step 3, using the brief's `Serves: B<n> \| new`; `new` checks Now, Next and Later first (S76) | ported (changed, S76) | yes |
| Step 6: shipped-as reference (archive folder or commit range) | `orc-curator:curate` Step 3: the run's branch or commit range | ported (changed, S76) | yes |
| Step 6: epic phase closure, EPIC.md | — | n/a (orchestra has no epics) | no |
| Step 6: delete the journal snapshot | — | dropped (S76: the journal belongs to the dropped hooks) | no |
| Step 6: terminal STATE, gated `CLAUDE.md` as Open and Next | — | n/a (orchestra owns run state) | no |
| Step 6: direction sweep always, unconditional, idempotent; pass the diff evidence | `orc-curator:curate` Step 6: invokes `orc-curator:direction` with `Caller: curate`, folds its `Coverage:` line (S76) | ported (changed, S76) | yes |
| Step 6: no DIRECTION.md → skip the sweep | `setup` creates the docs, so the file always exists (S76) | n/a (setup flag, S76) | no |
| Step 6: relay the report and the return block; name the branch, nothing pushed | `report.md` by orchestra | n/a (orchestra writes the report, S55) | no |
| Hard gate: only agent `minions:curator`, only skill `minions:direction` | `orc-curator:curate` Permitted actions: invokes only `orc-curator:direction` | ported | yes |
| Hard gate: step writes only git and STATE; never authors skills, never writes `Cn` itself | `orc-curator:curate`: one skill; the `Cn` comes from the sweep (S76) | ported (changed, S76) | yes |

#### templates/CURATE.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: run summary, written last | `orc-curator:curate` Step 9: the summary to the user; no report file (S76) | ported (changed, S76) | yes |
| Updated line with apply mode | — | dropped (S76: one apply behaviour) | no |
| Verdicts: one line per candidate, NOOP recorded | `orc-curator:curate` Step 9: one line per candidate in the summary | ported (changed, S76) | yes |
| Promotions | — | dropped (S76: waits for PSK) | no |
| Refreshes | `orc-curator:curate` Step 9: what changed in PRODUCT and TECH, in the summary | ported (changed, S76) | yes |
| Flags | `orc-curator:curate` Step 7: questions asked inline; answers applied and listed in the summary (S76) | ported (changed, S76) | yes |
| Staged edits | `orc-curator:curate` Step 8: the one commit on the task branch | ported (changed, S76) | yes |
| Ledger deltas | — | dropped (S76: waits for PSK) | no |

#### templates/knowledge-ledger.md, templates/journal.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| knowledge-ledger.md whole file: convention candidates, slug, predicate, observations, decay | — | dropped (S76: waits for PSK) | no |
| journal.md whole file: capture inbox, append-only, row types | — | dropped (S76: the journal belongs to the dropped hooks) | no |

#### skills/direction/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Description: keeps DIRECTION true to Now and Next; one verdict per owed row; a sweep, not a design act | `orc-curator:direction` | ported | yes |
| "Normally invoked by another skill"; direct use rare and not advertised | `orc-curator:direction` callers: `curate`, `backlog`, `setup`, by hand; direct use allowed | ported (changed, S76) | yes |
| Runs inline, because Step 3 may ask the user | `orc-curator:direction`: runs in the main session, by hand or from `curate`, and asks the user | ported (changed, S76) | yes |
| "A sweep, not a designer"; nearest sibling is curate | `orc-curator:direction` | ported | yes |
| The gap it closes: planner gated to one feature, spec forbidden to design, so the first feature sets the shape | `orc-curator:direction` | ported | yes |
| Callers table: backlog, curate, shape-project, direct | `orc-curator:direction` callers: `curate` (`Caller: curate` + diff evidence), `backlog`, `setup`, by hand | ported (changed, S76) | yes |
| Callers: curate only routes here (HITL), not a mandate | — | dropped (S76: curate runs the sweep in every run; sure `Cn`s committed, the rest a Decide) | no |
| Step 1: resolve `.minions/` or `docs/minions/` roots, `.minions-root`, `disabled` | fixed docs folder `docs/curator/` | dropped (S76: fixed folder) | no |
| Step 1: stop when no `config.yml`, run init first | `orc-curator:direction` Step 1: no `docs/curator/` → tell the user to run `orc-curator:setup`, `Result: blocked` | ported (changed, S76) | yes |
| Step 1: read `mode`, `auto`, `questions` from `config.yml` | — | dropped (S76: one mode; no Curator config yet) | no |
| Step 1: never writes `STATE.md`; the caller owns the cursor | orchestra owns the run state (run folder) | n/a (S76: no STATE.md) | no |
| Step 1: pauses are in-turn questions, never a workflow pause | `orc-curator:direction`: questions to the user in the session, one at a time; no Decide | ported (changed, S76) | yes |
| Step 1: guard, stop on direct use while a workflow is in flight | — | n/a (S76: each run works in its own worktree from a base commit (S74), so a sweep on the checkout does not move a running plan; the merge brings them together) | no |
| Step 1: create DIRECTION.md from the template if absent | `orc-curator:direction` + template | ported | yes |
| Step 1: migrate an old DIRECTION.md that has no `## Evaluated` | — | n/a (new projects only; no old minions files to migrate) | no |
| Step 1: never write a row into a section that is not there; add missing template sections | `orc-curator:direction` | ported | yes |
| Step 2: read BACKLOG Vision, Now, Next; never Later | `orc-curator:direction` | ported | yes |
| Step 2: read DIRECTION (a re-derive), DECISIONS, open QUESTIONS | `orc-curator:direction` | ported | yes |
| Step 2: read TECH.md to see when a row flips a dimension | `orc-curator:direction` | ported | yes |
| Step 2: read PRODUCT.md only to spot a purpose change; vibe only, never in maintain | `orc-curator:direction`: PRODUCT always read, for a purpose change only | ported (changed, S76) | yes |
| Step 2: read research notes by their `For:` line; never research again | `orc-curator:direction` | ported | yes |
| Step 2: read the real code the Now rows touch; never assume structure; ignore docs and config | `orc-curator:direction` | ported | yes |
| Step 2: state back the agenda in 8 lines or fewer | `orc-curator:direction` | ported | yes |
| Step 3: what is owed is set arithmetic, four conditions (owed, current, orphan Cn, retire ledger row) | `orc-curator:direction` | ported | yes |
| Step 3: movement within Now/Next is not a trigger; Later → Next is caught as owed | `orc-curator:direction` | ported | yes |
| Step 3: `horizon at eval` is information, a second look is judgement | `orc-curator:direction` | ported | yes |
| Step 3: a quiet sweep is valid; do not make work | `orc-curator:direction` | ported | yes |
| Step 3: never take a re-derive cue from a note | `orc-curator:direction` | ported | yes |
| Step 3: exactly one verdict per owed row, say which and why | `orc-curator:direction` | ported | yes |
| Verdict: no constraint (most common, not a failure) | `orc-curator:direction` | ported | yes |
| Verdict: write a `Cn` | `orc-curator:direction` | ported | yes |
| Verdict: research first (arbiter `ask-vs-research.md`) | `orc-curator:direction` invokes `orc-curator:research`; when not installed, ask the user or open a `Qn`; the ask-vs-research split inline | ported (changed, S76) | yes |
| Verdict: open a `Qn` for a product gap, unless it constrains code now | `orc-curator:direction` | ported | yes |
| Verdict: escalate one capability dimension to shape-tech | `orc-curator:direction` invokes `orc-curator:shape-tech` (`Caller: direction`); when not installed, ask the user or open a `Qn` | ported (changed, S76) | yes |
| Verdict: FLAG a purpose change; vibe only | `orc-curator:direction`: verdict `purpose change`, names `orc-curator:setup`; always, no mode | ported (changed, S76) | yes |
| Escalate to shape-tech, never write TECH.md (one owner per file) | `orc-curator:direction` | ported | yes |
| Ask only what changes a constraint; one at a time; budget from `questions` (`interview-cadence.md`) | `orc-curator:direction`: one question at a time, as few as possible, the interview-cadence rules inline; no `questions` budget (no Curator config) | ported (changed, S76) | yes |
| A dead row: flag it, do not move it; tell the user to groom | `orc-curator:direction` | ported | yes |
| Step 4: research is optional; a reduction needs none | `orc-curator:direction` | ported | yes |
| Step 4: invoke research with topics, mode (`deep`/`wide`) and a breadth budget (`right-sizing.md`) | `orc-curator:direction` → `orc-curator:research`; the `deep`/`wide` and budget dials inline (no right-sizing reference) | ported (changed, S76) | yes |
| Step 4: read the return block; every row the evidence earns is yours to write | `orc-curator:direction` | ported | yes |
| Step 4: a research decline is an answer (preference, already settled, already covered); never re-invoke reworded | `orc-curator:direction` | ported | yes |
| Step 4: a `wide` ranking goes to the user when the constraint depends on the choice | `orc-curator:direction` | ported | yes |
| Step 5: ids and mutation per `recording-rules.md` | `plugins/orc-curator/references/recording-rules.md`, cited by `orc-curator:direction` Step 5 | ported | yes |
| Step 5: `from Bn` mandatory | `orc-curator:direction` + template | ported | yes |
| Step 5: forward pressure, never forward design | `orc-curator:direction` + template | ported | yes |
| Step 5: no architecture doctrine | `orc-curator:direction` | ported | yes |
| Step 5: status `unsatisfied` or `satisfied by <path>`; check the file | `orc-curator:direction` + template | ported | yes |
| Step 5: 50-row soft cap, name the likely cause, never truncate | `orc-curator:direction` + template | ported | yes |
| Step 5: an `## Evaluated` row for every verdict; overwrite, not append; write the `no constraint` rows | `orc-curator:direction` | ported | yes |
| Step 5: retire orphans with their ledger row; mark satisfied; a contradicted `Cn` gets a fresh verdict | `orc-curator:direction` | ported | yes |
| Step 5: `Qn` entries for product gaps and what research did not settle; close answered ones | `orc-curator:direction` | ported | yes |
| Step 5: commit, vibe only | `orc-curator:direction`: by hand commits `docs(direction): <n> constraints`; a caller (`curate`, `backlog`, `setup`) commits once | ported (changed, S76) | yes |
| Step 6: relay leads with the coverage line; every evaluated row and verdict; what was left to later | `orc-curator:direction` | ported | yes |
| Step 6: hand back to the caller; else stop unless `auto` | `orc-curator:direction`: hand back to the caller, else stop; `auto` dropped | ported (changed, S76) | yes |
| Hard gate: constraints only; writes DIRECTION and QUESTIONS only | `orc-curator:direction` | ported | yes |
| Hard gate: never STATE.md | — | n/a (S76: no STATE.md) | no |
| Hard gate: never TECH.md; no code, SPEC, PLAN, feature folders; no BACKLOG edits | `orc-curator:direction` (SPEC/PLAN become the brief and plan of a run) | ported (changed, S76) | yes |
| Hard gate: never read Later | `orc-curator:direction` | ported | yes |
| Hard gate: never a schema or interface for an unbuilt feature | `orc-curator:direction` | ported | yes |
| Hard gate: never edit or delete a `Dn`; challenge a thin call in the relay | `orc-curator:direction` | ported | yes |
| Return block: Result, Wrote, Coverage, Summary, Escalated, Deviations/Warnings, Next | `orc-curator:direction` return block, without `Next:`; `Escalated` names `setup — purpose change` | ported (changed, S76) | yes |
| Result values: `blocked` (workflow owns the cursor), `needs-input`, `ok`; `ok` with `Wrote: nothing` is normal | `orc-curator:direction`: `blocked` when `docs/curator/` does not exist; the cursor reason is n/a | ported (changed, S76) | yes |

#### skills/backlog/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Description: changes what is planned, walks the fallout, hands constraints to direction; never starts work | `orc-curator:backlog` (by hand only, not in the slot contract, S76) | planned (Curator plan, S76) | yes |
| Runs inline; confirms judgement calls with the user | `orc-curator:backlog`, by hand in the session | planned (Curator plan, S76) | yes |
| Owns every judgement change and its consequence chain; the front door for changing the plan | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Never decides what a change demands of code; reads no TECH and no code | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Interface: plain words, no flags; table of add, drop, move, groom, reconcile | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Several operations in one request; sweep once at the end | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 1: resolve minions roots, `config.yml`, read `mode` | fixed docs folder; `setup` marker | dropped (S76: fixed folder, one mode) | no |
| Step 1: never writes STATE.md | — | n/a (S76: no STATE.md) | no |
| Step 1: guard, stop when demoting or dropping the row of an in-flight feature | — | n/a (S76: no STATE; a run works from its base in a worktree). Open edge: `curate` at run end must handle a `Serves: Bn` row that was dropped meanwhile | no |
| Step 2: read BACKLOG (all), DIRECTION, DECISIONS, QUESTIONS | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 3 normal path: restate each change as `Bn: from → to`; confirm before touching; groom shows counts | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 3 reconcile path: detect hand edits by diffing against what other files assume; `git diff` | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hand-editing BACKLOG is legal | `orc-curator:backlog` + template | planned (Curator plan, S76) | yes |
| Step 4: next `Bn` = highest plus one; never reused; item is one line | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 4: refs empty, `specify` fills them | the brief's `Serves: Bn` line; `orc-curator:curate` sets the refs when it moves the row to Shipped | planned (other mechanism, S76: single writer, spec only reads) | yes |
| Step 4: horizon by confidence (Now, Next, Later table); say which was picked | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 4: a question is never a row, it goes to QUESTIONS | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 4: extend Vision when it does not cover the new row | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 4: a purpose-sized row: say so, do not act; direction reaches the verdict | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 5: check every chain row, say you checked | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: dropped (delete cited `Cn` + ledger row, rewrite Vision, `Dn` reversal, close moot `Qn`) | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: demoted to Later = dropped; say it to the user | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: added to Now/Next (owed, sweep; extend Vision) | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: added to Later (nothing) | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: promoted Later → Next (owed, sweep; extend Vision) | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: promoted Next → Now (nothing; specify does it) | `orc-curator:backlog`: a move to Now is the user's, by hand; a run moves no row to Now | planned (changed, S76: single writer; Now no longer means in progress) | yes |
| Chain: item text materially rewritten (retire the ledger row, leave `Cn`s) | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Chain: reordered inside a section (nothing) | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 5 verify: every `Cn` cites a live Now/Next row; no Vision for Later or gone rows; ids kept | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 6: invoke direction once at the end; idempotent; skip only for Later-only changes | `orc-curator:backlog` → `orc-curator:direction` | planned (Curator plan, S76) | yes |
| Step 6: fold the Coverage line; relay a purpose-change FLAG verbatim | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 7: report every change and its consequences, empty ones too; what was not done | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 7: commit vibe only; maintain commits nothing (root gitignored) | `orc-curator:backlog` commits | planned (S76: one mode; maintain dropped) | yes |
| Hard gate: arrangement only; the files and edits it may make | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hard gate: no code, SPEC, PLAN, PRODUCT, TECH, STATE | `orc-curator:backlog` (STATE n/a) | planned (Curator plan, S76) | yes |
| Hard gate: only skill invoked is direction | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hard gate: never read TECH or code | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hard gate: never author a `Cn`; only delete unlicensed ones | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hard gate: never edit or delete a `Dn`; a reversal opens with `hard:`/`soft:`, usually `soft:` | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hard gate: never start work; suggest `/minions:feature` | `orc-curator:backlog`: suggest `orchestra:run` | planned (Curator plan, S76) | yes |
| Hard gate: never drop silently; confirm every deletion | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Return block: Result, Wrote, Summary, Coverage, Escalated, Deviations/Warnings, Next | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Result `blocked` when a change strands an in-flight feature | — | n/a (S76: no in-flight state, see the Step 1 guard row) | no |

#### templates/DIRECTION.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: forward pressure, not forward design, with the example | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| Header: derived from Now and Next only; Later invisible | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| Header: who reads it (the planner, every plan); written by direction, kept by curate | `plugins/orc-curator/templates/DIRECTION.md`; the planner reads it through the Curator `plan` guide (S76) | ported | yes |
| Header: rows are not hand-authored; status edits are harmless | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| Header: `Cn` ids, highest plus one, never reused | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Constraints`: every row cites `from Bn`; an orphan is dead and deleted | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Constraints`: status values; point at the file, never restate it | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Constraints`: satisfied + shipped = retired; the why lives in DECISIONS | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Constraints` table (id, from, constraint, status) | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Size`: 50-row soft cap, the three causes, keep the unsatisfied half small | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Evaluated`: the coverage record; `no constraint` is the load-bearing outcome | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Evaluated`: maintained by direction; curate and backlog retire rows | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Evaluated`: `horizon at eval` is information; specify promotes Next → Now on every feature | `plugins/orc-curator/templates/DIRECTION.md`: information, not a trigger; the reason becomes "a row moves between Now and Next by hand" | ported (changed, S76: single writer, no run moves a row to Now) | yes |
| `## Evaluated`: not a flag anyone sets; derive it | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |
| `## Evaluated` table (Bn, horizon at eval, date, outcome) | `plugins/orc-curator/templates/DIRECTION.md` | ported | yes |

#### templates/BACKLOG.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: owns the future; PRODUCT holds what is real; the split stops duplication | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |
| Header: sections are confidence, not dates; rows move both ways | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |
| Header: hand edits are fine; run backlog afterwards; curate's orphan sweep catches the dangerous half | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |
| Header: `Bn` ids, independent of other ids and of feature `NNN`; highest plus one; kept across moves | `plugins/orc-curator/templates/BACKLOG.md` (no feature `NNN`; runs are branches) | ported | yes |
| `## Vision`: prose; written by shape-project/shape-product; thinned by curate as things ship | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |
| `## Now`: intent, not work in progress; STATE names the feature in flight; DIRECTION derives from here | `plugins/orc-curator/templates/BACKLOG.md` | partial (S76: the STATE clause is n/a; the open runs are the task branches) | yes |
| `## Next`: shaped, not started; DIRECTION derives from here too | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |
| `## Later`: bets; DIRECTION never reads it | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |
| `## Shipped`: link the archived feature folder (vibe) or the commit range (maintain); appended by curate | `plugins/orc-curator/templates/BACKLOG.md`: the run's branch or commit range | ported (other mechanism, S76) | yes |
| The four tables (id, item, why / refs; Shipped: shipped as) | `plugins/orc-curator/templates/BACKLOG.md` | ported | yes |

#### references/recording-rules.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Shared policy, cited by every skill that writes a docs file | `plugins/orc-curator/references/recording-rules.md` (one shared reference) | ported | yes |
| Ids: `Bn`, `Cn`, `Dn`, `Qn` independent; `ACn` and `Tn` feature-scoped | `plugins/orc-curator/references/recording-rules.md`; `ACn`/`Tn` map to the run's brief and plan | ported | yes |
| Next id = highest plus one; never reused; `Bn` kept across moves | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| Where a fact goes: six files by tense; no fact in two | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| Never one dimension in two files (TECH vs QUESTIONS) | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| A question is never a backlog row | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| PRODUCT holds only what is true today; the delete-a-row test | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| DECISIONS append-only; a reversal is a new row naming what it reverses | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| Every `Why` opens with `hard:` or `soft:`, a prefix, never a column; set at write time | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| A `soft:` row is invited to be challenged; challenge makes a new row | `plugins/orc-curator/references/recording-rules.md` | ported | yes |
| QUESTIONS never blocks; entries closed, never deleted | `plugins/orc-curator/references/recording-rules.md` | ported. Note: inside a run the Curator asks the user inline (S76); that is the Curator asking, not QUESTIONS.md blocking | yes |
| Removal tiered by confidence: delete only on plain contradiction, else flag | `plugins/orc-curator/references/recording-rules.md`; in a run the Curator asks the user inline (S76) | ported | yes |

#### skills/shape-project/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Purpose: capture what the project is for and built on; intent only, never code, spec or plan | `orc-curator:setup` intro | planned (Curator plan, S76) | yes |
| Re-runnable, unlike init; intent changes and must be revisable | `orc-curator:setup`; orchestra calls it when the Curator's setup flag is missing, the user can run it again by hand | planned (Curator plan, S76) | yes |
| Step 1: `.minions/` or `docs/minions/` roots, `.minions-root` override, `disabled` | the fixed docs folder | dropped (S76: one fixed folder, no roots) | no |
| Step 1: no `config.yml` → run `/minions:init` first; init hands off into this skill | `orchestra:init` and the setup flag; orchestra calls `setup` | dropped (S76: orchestra:init and the setup flag replace minions init) | no |
| Step 1: re-attach a missing STATE.md; read `mode` and `auto` from config, `--auto` override | — | dropped (S76: orchestra owns run state; no modes; no auto pause) | no |
| Step 1.5: stop in `maintain`, offer own docs or `mode: vibe` | — | dropped (S76: maintain is a project without the Curator) | no |
| Step 2: stop when another workflow owns the cursor | — | dropped (S76: orchestra owns run state; setup runs before the workflow's first stage) | no |
| Step 2: resume after the product half from STATE (`arch/tech next`) | — | dropped (S76: no STATE; fill-state routing below is the resume signal) | no |
| Step 2: route on fill state: template-shaped PRODUCT → bootstrap; PRODUCT real and TECH template-shaped → tech half; both real → reshape | `orc-curator:setup` step 1 | planned (Curator plan, S76) | yes |
| Step 2: what "template-shaped" means (bracket placeholders, `_none yet_`, commented example) | `orc-curator:setup` step 1 | planned (Curator plan, S76) | yes |
| Step 3: invoke shape-product with the idea; do not duplicate its questions or answer tech for it | `orc-curator:setup` → `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Step 3: stop after the product half unless `auto` | — | dropped (S76: no auto mode; setup runs both halves in one call, the user is present) | no |
| Step 4: tech is discussed only here, through three calls; each caller owns the cursor | `orc-curator:setup` step 4 (the cursor part is n/a) | planned (Curator plan, S76) | yes |
| Step 4a: shape-tech walks the dimensions, commits only the minimum spine with no code | `orc-curator:setup` → `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 4b: show the backlog (counts per horizon and rows), offer to arrange it, call backlog if wanted | `orc-curator:setup` → `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Step 4b: order matters: groom before the sweep, so the ledger matches the arrangement | `orc-curator:setup` step 4 | planned (Curator plan, S76) | yes |
| Step 4c: direction sweep, every near-term row owes a verdict | `orc-curator:setup` → `orc-curator:direction` | planned (Curator plan, S76) | yes |
| Why calls and not own interviews: one flow, several callers | `orc-curator:setup` note | planned (Curator plan, S76) | yes |
| Step 5.1: state back PRODUCT, TECH spine and backlog counts per horizon; count only live `Qn`; delete the example block | `orc-curator:setup` reshape | planned (Curator plan, S76) | yes |
| Step 5.2: walk every open `Qn` by id; settled → `Dn` first (`hard:`/`soft:`), flip to `answered → Dn`, keep the entry, add a `Bn` if work; tech dimension → shape-tech and direction write | `orc-curator:setup` reshape | planned (Curator plan, S76) | yes |
| Step 5.3: ask what else changed; new unknowns → new `Qn` (highest plus one, never reused) | `orc-curator:setup` reshape | planned (Curator plan, S76) | yes |
| Step 5.4: propose an edit list and diff, write only on approval | `orc-curator:setup` reshape | planned (Curator plan, S76) | yes |
| Step 5.5: reversals append a new `Dn`; the reopened `Qn` goes back to open | `orc-curator:setup` reshape | planned (Curator plan, S76) | yes |
| Step 5.6: always finish with the sweep, unconditionally; show the backlog first if rows moved | `orc-curator:setup` reshape | planned (Curator plan, S76) | yes |
| Step 6: STATE in-flight and complete forms, Step token enum, Workflow back to `none`, never overwrite another cursor | — | dropped (S76: orchestra owns run state) | no |
| Step 6: suggest `/minions:feature`; report the `Cn` count | `orc-curator:setup` result; next step is `orchestra:run` | planned (Curator plan, S76: other next step) | yes |
| Step 6: Stop-hook journal-pressure check depends on Workflow `none` | — | n/a (journal and hooks are in the dropped code-knowledge half, S76) | no |
| Return block: Result, Wrote, Summary, Open questions, Coverage, Worth reopening, Warnings, Next | `orc-curator:setup` result JSON and relay | planned (Curator plan, S76) | yes |
| Hard gate: intent only; writes PRODUCT, BACKLOG, DECISIONS, QUESTIONS; TECH is shape-tech's, DIRECTION is direction's | `orc-curator:setup` hard gate | planned (Curator plan, S76) | yes |
| Hard gate: vibe only, never create PRODUCT or TECH in maintain | — | dropped (S76: no modes) | no |
| Hard gate: four skills only; never research directly; never init | `orc-curator:setup` hard gate (init part n/a) | planned (Curator plan, S76) | yes |
| Hard gate: no loop; specify moves rows to Now, curate to Shipped; never run features | `orc-curator:setup` hard gate; in orchestra only curate writes rows during a run | planned (Curator plan, S76: spec only reads) | yes |
| Hard gate: horizons are confidence bands, not a roadmap; no order inside a section, no estimates; broad rows broken down carry `from Bn` | `orc-curator:setup` and `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Hard gate: a question is never a backlog row | `orc-curator:setup` hard gate | planned (Curator plan, S76) | yes |
| Hard gate: QUESTIONS never blocks | `orc-curator:setup` hard gate | planned (Curator plan, S76) | yes |
| Hard gate: no commits | `orc-curator:setup`: commits the docs and the setup flag (on the task branch when orchestra calls it) | planned (Curator plan, S76: changed, the flag needs a commit) | yes |

#### skills/shape-product/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Purpose: shape a rough idea into a functional product shape; explore wide, examine comparables, keep rejected directions | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Scope: functional only, redirect tech talk, and why | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Scope: at least 4 distinct directions before narrowing; what "distinct" means | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Scope: rejected directions are `Dn` rows; the user decides | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Output: resolve the knowledge root; no config → init | the fixed docs folder | dropped (S76: fixed folder; orchestra:init replaces init) | no |
| Output: stop in maintain | — | dropped (S76: no modes) | no |
| Output: destination table (What it is, Who, Why, existing vs not-built behaviours, shaped-this-way, Deliberately not, in scope, comparables, rejected direction, gray area) | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Rule: a question is not a feature | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Rule: PRODUCT holds only what is true today; vision goes to BACKLOG Vision; no feature inventory | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Resuming from real PRODUCT content, backlog rows and open questions | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Read DECISIONS first; honour `hard:`, put `soft:` discarded directions back on the table; reversal is a new `Dn` | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Coverage checklist (9 items) and the one-line coverage status each turn | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Choosing what to do next: restate first; gray-area buckets; pick 3–5 | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Ask vs research: cite the shared policy, never a copy; where research findings go | `orc-curator:shape-product` → the ported `ask-vs-research` reference | planned (Curator plan, S76) | yes |
| Going wide: 4–6 directions, kinds of distinctness; rejected → `Dn`; never skip it | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Comparable products: 2–4, what each does well, falls short, one pattern | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Capturing the shape and the wrap-up checklist (5 items, at least one Now row) | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| How to ask: batch cadence, explain why, `AskUserQuestion` for options, do not ask what you can infer | `orc-curator:shape-product`; cites the ported interview-cadence reference | planned (Curator plan, S76) | yes |
| Where the idea comes from (arguments, conversation, PRODUCT, ask) | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Where the shapes live: the plugin templates; copy a missing file | `orc-curator:shape-product` → the plugin's templates | planned (Curator plan, S76) | yes |
| Anti-patterns (8) | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |
| Tone | `orc-curator:shape-product` | planned (Curator plan, S76) | yes |

#### skills/shape-tech/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Purpose: settle the tech dimensions that outlive one feature; what in TECH, why in DECISIONS; altitude vs plan | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Callers: shape-project, all dimensions, no code | `orc-curator:setup` → `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Callers: specify, one ground-shaping call mid-interview | — | dropped (S76: orchestra's spec stage does not interview and calls no Curator skill; a one-way tech fork found in a run is already a plan-check Decide, and curate can raise it as a question that names shape-tech for a run by hand) | no |
| Callers: direction, exactly one named dimension | `orc-curator:direction` → `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Callers: direct, by focus argument | `orc-curator:shape-tech` by hand | planned (Curator plan, S76) | yes |
| Single-dimension invocation: walk only that one, never raise the caller's ceremony | `orc-curator:shape-tech`; cites the ported right-sizing reference | planned (Curator plan, S76) | yes |
| Step 1: roots, config, `mode`, `auto`, `questions`, `--auto` | the fixed docs folder | dropped (S76: fixed folder, no modes, no auto); `questions` budget: see interview-cadence | no |
| Step 1: never write STATE; caller owns the cursor | — | n/a (S76: orchestra owns run state) | no |
| Step 1: guard, stop on a live workflow when invoked directly | `orc-curator:shape-tech` by hand: stop when a run of this project is open on the branch | planned (Curator plan, S76: other mechanism, the plan decides how to detect an open run) | yes |
| Step 2: read PRODUCT, TECH, DECISIONS (`soft:` rows), open `Qn`, BACKLOG Vision/Now/Next (never Later), research notes, the real code; state back in 8 lines | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 3: one question at a time, budget, and why not batch | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 3: the six capability dimensions; say which are skipped | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 3: the ground-shaping calls; never ask what a later feature can change; say what each option forecloses; a deferral is a `Qn` | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 3: a dead backlog row is a FLAG, not a move | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 4: research only world questions, by the ask-vs-research policy; modes `wide`/`deep`, budget; it records nothing; a decline is an answer | `orc-curator:shape-tech` → `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 5: the user picks; show the full ranking of a wide run, not only the winner | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 5: the evidence gate (no code → minimum spine only; existing code → thin transcription, no `Dn`; a user call → TECH plus `Dn`) | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 5: never transcribe layers, paths or where conventions live | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 5: TECH absent in maintain | — | dropped (S76: no modes) | no |
| Step 5: each dimension in exactly one place (TECH + `Dn`, or `Qn`, or neither); hard gate on dual writes; thin index under 50 lines | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 5: `Dn` rows with `hard:`/`soft:`, `Qn` for what is open, close answered `Qn` | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 5: commit `docs(shape-tech)` | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 6 relay: rows written, skipped dimensions, ids, research; name what is left to a later feature | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 6: challenge at most one `soft:` decision when tech changes its cost | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 6: name owed constraints, never write a `Cn`; callers pass `Constraints owed` and `Worth reopening` through | `orc-curator:shape-tech` | planned (Curator plan, S76) | yes |
| Step 6: stop and suggest `/minions:feature` unless `auto` | `orc-curator:shape-tech`; next step is `orchestra:run` | planned (Curator plan, S76: other next step, no auto) | yes |
| Hard gate: calls only; writes TECH, DECISIONS, QUESTIONS; never DIRECTION, STATE, BACKLOG, code, spec, plan | `orc-curator:shape-tech` hard gate (STATE n/a) | planned (Curator plan, S76) | yes |
| Hard gate: never read Later; never a schema for unbuilt work; never edit a `Dn`; settled is not permanent; never raise ceremony | `orc-curator:shape-tech` hard gate | planned (Curator plan, S76) | yes |
| Return block (Result, Wrote, Summary, Constraints owed, Worth reopening, Warnings, Next) and the meaning of blocked / needs-input / ok | `orc-curator:shape-tech` relay | planned (Curator plan, S76) | yes |

#### templates/PRODUCT.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: true today; the deletion test; never inventory features; budget by section | `plugins/orc-curator/templates/PRODUCT.md` | ported | yes |
| Sections What it is, Who it's for, Why it exists | `plugins/orc-curator/templates/PRODUCT.md` | ported | yes |
| Core use cases: optional, 3–4 lines | `plugins/orc-curator/templates/PRODUCT.md` | ported | yes |
| Why it's shaped this way, citing `Dn`; "surface during `/minions:specify` interviews" | `plugins/orc-curator/templates/PRODUCT.md`; the source line changes to curate and shape-product (spec only reads, S76) | ported (changed, S76) | yes |
| Deliberately not, citing `Dn` | `plugins/orc-curator/templates/PRODUCT.md` | ported | yes |
| Comparable products, 2–4 | `plugins/orc-curator/templates/PRODUCT.md` | ported | yes |

#### templates/TECH.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: what it must do and is built on; conventions live on native surfaces; 50 lines | `plugins/orc-curator/templates/TECH.md` | ported | yes |
| Capabilities table: settled only, no `decided` column, delete rows that do not apply | `plugins/orc-curator/templates/TECH.md` | ported | yes |
| Spine (committed): greenfield vs existing code; decided cites `Dn`, transcribed does not | `plugins/orc-curator/templates/TECH.md` | ported | yes |
| Where conventions live: the tree is the registry, the `git ls-files` command | `plugins/orc-curator/templates/TECH.md` | ported | yes |
| Why behind the calls → DECISIONS | `plugins/orc-curator/templates/TECH.md` | ported | yes |

#### templates/DECISIONS.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: append-only, newest at the bottom, the why is the value | `plugins/orc-curator/templates/DECISIONS.md` | ported | yes |
| Who reads it (curator, shape-product, shape-tech `soft:` rows); an enforced rule belongs on a native surface | `plugins/orc-curator/templates/DECISIONS.md` | ported | yes |
| `hard:` / `soft:` prefix inside the Why cell, not a fifth column; definitions | `plugins/orc-curator/templates/DECISIONS.md` | ported | yes |
| Immutability of the record, not the conclusion; reversal is a new row | `plugins/orc-curator/templates/DECISIONS.md` | ported | yes |
| Ids `Dn`: highest plus one, never reused | `plugins/orc-curator/templates/DECISIONS.md` | ported | yes |
| Table and the two commented examples | `plugins/orc-curator/templates/DECISIONS.md` | ported | yes |
| File location: the knowledge root | `plugins/orc-curator/templates/DECISIONS.md`, in `docs/curator/`, not `docs/DECISIONS.md` (a project such as this repo can have its own file there) | ported | yes |

#### templates/QUESTIONS.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: prose not a table; one `##` per question, `· open` or `· answered → Dn`; `Refs:` line | `plugins/orc-curator/templates/QUESTIONS.md` | ported | yes |
| Answered entries stay | `plugins/orc-curator/templates/QUESTIONS.md` | ported | yes |
| Non-blocking by design | `plugins/orc-curator/templates/QUESTIONS.md` | ported | yes |
| Writers: shape-project (bootstrap, re-runs), the curator closes entries | `plugins/orc-curator/templates/QUESTIONS.md`; add shape-tech and direction, which also write `Qn` | ported (changed, S76: fixed list) | yes |
| Delete the example block on the first entry; the example block | `plugins/orc-curator/templates/QUESTIONS.md` | ported | yes |

#### templates/CONTEXT.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header: ubiquitous language, committed; "lives at the repo root in both modes" | `plugins/orc-curator/templates/CONTEXT.md`; the file goes in the docs folder, not the repo root and not `docs/CONTEXT.md` (in this repo that is orchestra's own glossary) | ported (changed, S76 location; no modes) | yes |
| A glossary and nothing else; only domain-specific terms; be opinionated with `_Avoid_` | `plugins/orc-curator/templates/CONTEXT.md` | ported | yes |
| Entries edited in place; delete when the concept leaves the code | `plugins/orc-curator/templates/CONTEXT.md` | ported | yes |
| Nothing blocks on it | `plugins/orc-curator/templates/CONTEXT.md` | ported | yes |
| Body: domain line, `## Language`, commented examples, `###` grouping note | `plugins/orc-curator/templates/CONTEXT.md` | ported | yes |

#### references/glossary.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Shared policy, cited by every skill that reads or writes CONTEXT | `plugins/orc-curator/references/glossary.md` | ported | yes |
| The file: repo root, same in both modes, committed | `plugins/orc-curator/references/glossary.md` names `docs/curator/CONTEXT.md` (see templates/CONTEXT.md) | ported (changed, S76 location; no modes) | yes |
| Created lazily, on the first term | `plugins/orc-curator/references/glossary.md` | ported | yes |
| A glossary and nothing else | `plugins/orc-curator/references/glossary.md` | ported | yes |
| Format: copy the template; bold name, 1–2 sentences, `_Avoid_` | `plugins/orc-curator/references/glossary.md` | ported | yes |
| What earns a term (domain-specific, could be got wrong, opinionated, define what it is) | `plugins/orc-curator/references/glossary.md` | ported | yes |
| Mutation: edit in place, retired word to `_Avoid_`, delete when the concept leaves | `plugins/orc-curator/references/glossary.md` | ported | yes |
| Never a gate; missing file is a no-op; drift is flagged | `plugins/orc-curator/references/glossary.md` | ported | yes |
| The four habits (challenge, sharpen, cross-check with the code, write at once) | `plugins/orc-curator/references/glossary.md` | ported | yes |

#### references/interview-cadence.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Shared policy: rhythm only, no questions | `plugins/orc-curator/references/interview-cadence.md` | ported | yes |
| Two cadences: batch of 3–5 (shape-product) vs one at a time (shape-tech, direction, specify); why the wrong one costs | `plugins/orc-curator/references/interview-cadence.md` | ported (changed, S76) | yes |
| Budget from `config.yml` `questions` (none/few/regular/many) and never exceed it | `plugins/orc-curator/references/interview-cadence.md` | ported (changed, S76) | yes |
| Rules in both cadences (real options and what they foreclose, multiple choice with a recommendation, deferral is an answer, do not ask what you can infer, say why, ask only what changes a write) | `plugins/orc-curator/references/interview-cadence.md` | ported | yes |
| Inside an orchestra run a question is a Decide | `plugins/orc-curator/references/interview-cadence.md` | ported (changed, S76) | yes |
| What an answer is for: it lands somewhere durable in the same run | `plugins/orc-curator/references/interview-cadence.md` | ported | yes |

#### skills/research/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| A tool, not a step: the caller gives the topic; never picks its own | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Never decides the answer: evidence and decision are separate | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 1: resolve the minions roots, `config.yml`, `mode` | fixed folder `docs/curator/` | dropped (S76: one fixed folder, no modes) | no |
| Step 1: never writes `STATE.md` | — | n/a (no `STATE.md`; orchestra keeps run state) | no |
| Step 2: inputs table (topics, mode, budget as a number, project context, axes) | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 2: default budgets (`wide` ≤ 4 candidates, `deep` ≤ 6 sources) | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 2: project context reads PRODUCT and TECH, "vibe only" | `orc-curator:research`, no mode gate | planned (Curator plan, S76: no modes) | yes |
| Step 2: several topics give several notes; never merge | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 2: do not go hunting (no QUESTIONS, STATE or SPEC scan) | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 3: check `research/` first; supersede or point at the note | `docs/curator/research/` | planned (Curator plan, S76) | yes |
| Step 3: decline table (preference, already settled `Dn`, already covered) | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 3: pick the mode (`wide` open space, `deep` choice made); depth is the caller's | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 4: `deep`: primary sources on the version in use, canonical shape, pitfalls, one worked reference, refute the load-bearing claims | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 5: `wide`: four beats in order (enumerate, fix the axes, one agent per candidate, rank in the coordinator) | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 5: one agent per candidate in one message | `orc-curator:research`; on Codex a subagent cannot start a subagent (R4), so research runs in the main session or the curate subagent does it inline | planned (Curator plan, S76; R4 limit to decide in the plan) | yes |
| Step 5: one or two candidates means it was a `deep` question; switch and say so | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 6: note path `research/<date>-<slug>.md`, `Mode:`, `For:`, `Supersedes:` | `docs/curator/research/` | planned (Curator plan, S76) | yes |
| Step 6: the note holds the complete research; confidence per finding | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 6: commit, vibe only | commit on the task branch in a run; by hand, the user commits | planned (Curator plan, S76: no modes) | yes |
| Step 7: return block carries recommendation, ranking, refuted, could not settle, note path | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 7: write no rows, not even a `Qn`; the caller records | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Step 7: invoked directly, nothing is recorded; say so | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Hard gate: touch no file outside `research/`; never choose a topic; never research a preference; no `wide` collapse; no unchecked claim | `orc-curator:research` | planned (Curator plan, S76) | yes |
| End of run: return block format and `ok`/`blocked`/`needs-input` | result format of `orc-curator:research` | planned (Curator plan, S76: format follows orchestra results when called in a run) | yes |

#### templates/RESEARCH.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Header note: one topic per note; evidence, not the decision; complete, not a summary | `orc-curator` templates | planned (Curator plan, S76) | yes |
| Header line: Date, Mode, Question, For, Method, Supersedes | `orc-curator` templates | planned (Curator plan, S76) | yes |
| Sections: Recommendation (runners-up in `wide`), Comparison (`wide` only, fixed axes, ranking), Findings with confidence, Refuted, Caveats, Open questions | `orc-curator` templates | planned (Curator plan, S76) | yes |
| Line: `/minions:shape-tech` and `/minions:direction` write the rows | `orc-curator:shape-tech`, `orc-curator:direction` | planned (Curator plan, S76) | yes |

#### references/ask-vs-research.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Shared policy, cited by five skills, no flow | `plugins/orc-curator/references/ask-vs-research.md` | ported | yes |
| Table: who can answer each type of question | `plugins/orc-curator/references/ask-vs-research.md` | ported | yes |
| The two failure modes | `plugins/orc-curator/references/ask-vs-research.md` | ported | yes |
| After the split: ask spends budget; research records nothing; a one-way door escalates | `plugins/orc-curator/references/ask-vs-research.md` | ported (changed, S76) | yes |

#### references/right-sizing.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Rule 1: ceremony is set by the caller, never raised by the callee | `orc-curator` references | planned (Curator plan, S76) | yes |
| Rule 2: offer the other tier once, then proceed | — | n/a (orchestra has one tier per workflow; tiers are minions' `quick`/`feature`) | no |
| "Too small" and "too big for one plan" signals (≈ 7 commits, several `Bn` constraints) | — | n/a (orc-standard-workflow has no epic or quick tier; note for the workflow, not the Curator) | no |
| "Too big for a light pass": a purpose change needs full ceremony and a human | `orc-curator:direction` Step 3 verdict "purpose change": stop and name it, escalate to `orc-curator:setup` | ported (changed, S76: no Decide; direction names it and the user decides) | yes |
| Research depth: mode and budget, both set by the caller | `orc-curator:research` | planned (Curator plan, S76) | yes |

#### skills/specify/SKILL.md

The parts that read the direction docs become `orc-curator:spec-guide`, pushed by orchestra to the `spec` role (S76). The Curator writes the docs at the end of the run (S76), so the writes of specify move to `orc-curator:curate`.

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Step 1.6: read DIRECTION to see if the request must satisfy `Cn`s of several `Bn` (epic signal) | — | n/a (orc-standard-workflow has no epic; plan-check judges size) | no |
| Step 2: BACKLOG bookkeeping: match the request to a `Bn` (judgement, do not stretch) | `orc-curator:spec-guide`: the brief names `Serves: Bn` or `Serves: new` | ported (S76, Curator plan 2) | yes |
| Step 2: move the matched row to Now, or add a new Now row | `orc-curator:curate` Step 3 (the served row, shipped at the end of the run) | ported (changed, S76: no run moves a row to Now; curate ships the served row, or adds it as shipped) | yes |
| Step 2: create BACKLOG from the template if missing | `orc-curator:setup` Step 1 (copies the template when the file is missing) | ported (S76, Curator plan 2) | yes |
| Step 2: a row keeps its `Bn` when it moves | `orc-curator` `references/recording-rules.md` "Ids"; `orc-curator:curate` Step 3 keeps the `Bn` when it ships a row | ported (S76, Curator plan 2) | yes |
| Step 2: epic phases touch no row | — | n/a (no epic) | no |
| Step 3: read BACKLOG Vision plus the row's section; skip Later | `orc-curator:spec-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: read PRODUCT for why, not what (`Why it's shaped this way`, `Deliberately not`) | `orc-curator:spec-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: read TECH | `orc-curator:spec-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: read CONTEXT; spec in its words | `orc-curator:spec-guide`, path `docs/curator/CONTEXT.md` | ported (S76, Curator plan 2) | yes |
| Step 4: split gaps: ask or research (ask-vs-research) | `orc-curator:spec-guide` rules 6 and 7 (a `Question` line, or a `business fact:` line); "ask" is the business-facts stop of orc-standard-workflow | ported (S76: the stop already exists; the guide adds the split only; no `ask-vs-research` reference, research is out of the spec stage) | yes |
| Step 4: a one-way door escalates to shape-tech inside the interview | `orc-curator:spec-guide` rule 7: a `business fact:` line, the run stops for a human; `orc-curator:curate` Step 5 routes the answer to DECISIONS and TECH | ported (changed, S76: the guide names the business fact; curate records the answer) | yes |
| Step 4: research at a tiny budget, three-part bar, `deep` only | — | dropped (S76: the spec stage stays headless and fast; the Curator researches in direction and shape-tech) | yes |
| Step 4: other research-shaped gaps become an open `Qn` | `orc-curator:spec-guide` rule 6 lists them as `Question` lines; `orc-curator:curate` Step 5 files the `Qn` | ported (changed, S76: the guide lists the gaps; curate files the `Qn`) | yes |
| Step 4: never derive cross-feature pressure; that is direction's | `orc-curator:spec-guide` | ported (S76, Curator plan 2) | yes |
| Step 5: an answer that settles a domain term goes to CONTEXT at once | `orc-curator:curate` Step 5 (CONTEXT row) writes the term at the end of the run; `orc-curator:spec-guide` rule 9 | ported (changed, S76: single writer at the end of the run) | yes |
| Step 5: record the word the user gave, never one you concluded | `orc-curator:spec-guide` rule 9; `orc-curator:curate` Step 4 (verify against the code) | ported (S76, Curator plan 2) | yes |
| Step 6: Out of scope list, explicit non-goals | orc-standard-workflow brief | n/a (the brief already has it) | no |
| Step 7.1: a product rationale goes to PRODUCT `Why it's shaped this way` plus a `Dn` (`soft:` usually) | `orc-curator:curate` Step 5 (rows "the why behind a choice" and "a product rationale") | ported (changed, S76: curate reads the brief and `decisions.md`) | yes |
| Step 7.2: deferred wants go to BACKLOG Next or Later; not non-goals | `orc-curator:spec-guide` rule 5 lists them as `Deferred` lines; `orc-curator:curate` Step 5 adds the rows | ported (S76, Curator plan 2) | yes |
| Step 7.2: a new Next row owes a sweep; set no flag, it is computable | `orc-curator:curate` Step 6 (DIRECTION) invokes `orc-curator:direction` with `Caller: curate`; `direction` Step 2 computes what is owed | ported (changed, S76: curate calls the sweep; no flag) | yes |
| Step 7.3: `Qn` format, next id is highest plus one, answered entries counted | `orc-curator` `references/recording-rules.md` "Ids"; `orc-curator:curate` Step 5 (QUESTIONS rows: `## Qn — <question> · open`, `· answered → Dn`) | ported (S76, Curator plan 2) | yes |
| Step 7.4: commit list of direction docs, vibe only | `orc-curator:curate` Step 8: one commit `docs(curator): curate <branch or range>` | ported (changed, S76: one commit at the end of the run) | yes |
| Step 7.6: return block lines Deferred wants, Researched, Open questions filed, Escalated, Constraints owed, Worth reopening | brief sections that `orc-curator:curate` reads | partial (S76: Researched dropped with spec research) | yes |
| Hard gate: never design; cross-feature invariants are shape-tech's | `orc-curator:spec-guide` | ported (S76, Curator plan 2) | yes |
| Hard gate: never record a research finding as if the user said it | `orc-curator:spec-guide` | ported (S76, Curator plan 2) | yes |
| Hard gate: never invent acceptance criteria the user did not confirm | — | n/a (orc-standard-workflow spec is headless and writes the criteria itself; the business-facts stop covers missing facts) | no |
| The rest: roots, STATE, feature folder, branch, right-size down, interview mechanics, EARS format, `mode` prose, epic scope-up, `auto` | — | n/a (orc-standard-workflow has its own spec stage) | no |

#### skills/plan/SKILL.md

The parts that read the direction docs become `orc-curator:plan-guide`, pushed by orchestra to the `plan` role, which covers `plan` and `plan-check` (S76).

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Step 3: DIRECTION is binding where it applies; a requirement, not context | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: for each row the task touches, say which task satisfies it and how | `orc-curator:plan-guide`; plan-check checks it | ported (S76, Curator plan 2) | yes |
| Step 3: a row it cannot satisfy is a warning naming the `Cn`, never a silent skip | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: a row `satisfied by <path>`: read that file | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: BACKLOG Vision, Now, Next: context, never scope; never Later | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: read PRODUCT and TECH | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: CONTEXT words in the approach and task titles; `_Avoid_` literal; a clash is a warning, never a silent rename | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Step 3: state back which `Cn` rows apply | `orc-curator:plan-guide` (the plan lists them) | ported (S76, Curator plan 2) | yes |
| Step 4b: research when the answer is about the world | — | dropped (S76: the plan stage stays headless; a world question becomes a `Qn` through the brief, or the plan-check stop) | yes |
| Step 4: a gap the spec left open is a warning with the choice made, not a blocker | — | n/a (orc-standard-workflow plan-check has its own fork rules) | no |
| Step 6: `## Approach` names which task satisfies each applicable `Cn` | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Epic escalation: touch no BACKLOG row, no DIRECTION row, no Evaluated entry | — | n/a (no epic) | no |
| Quick mode: no DIRECTION, BACKLOG, PRODUCT, TECH | — | n/a (no quick tier) | no |
| Hard gate: plan only this feature; BACKLOG and DIRECTION shape how, never add a task | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Hard gate: never write a `Cn`, `Dn`, `Qn` or `Bn` | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Hard gate: never invoke shape-tech or direction; a missing invariant is a warning | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| Return block line `Constraints: each Cn and the task that satisfies it` | `orc-curator:plan-guide` (a line in `plan.md`) | ported (S76, Curator plan 2) | yes |
| The rest: roots, STATE, skill pack, scouting real files, interview 4a/4c, epic check, task anatomy, goal-backward self-check, verifier loop, commit | — | n/a (orc-standard-workflow has its own plan and plan-check stages) | no |

#### README.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Why: tiers, plan one step deep, discipline without ceremony | — | n/a (workflow concerns; orc-standard-workflow owns them) | no |
| Fluid by design: five commitments (records immutable, conclusions not; nothing blocks; constraints are the least that survives falsification; movement both ways; something must subtract) | `orc-curator` README and skills | planned (Curator plan, S76) | yes |
| Under-committing is the bias | `orc-curator` README | planned (Curator plan, S76) | yes |
| Knowledge on native surfaces (`CLAUDE.md`, rules, skills) | — | dropped (S76: the code-knowledge half waits for PSK) | yes |
| The tiers: quick, feature | — | n/a (orchestra runs one workflow) | no |
| shape-project before work, re-runnable, vibe only | `orc-curator:setup`, called by orchestra when the setup marker is missing | planned (Curator plan, S76: no modes) | yes |
| Install, Quickstart | `orc-curator` README | planned (Curator plan, S76) | yes |
| Three layers: workflow, step, agent | — | n/a (orchestra has its own layers) | no |
| Skills grouped: long-term decide, short-term comply; no skill does both | `orc-curator` README; guides read, Curator skills write | planned (Curator plan, S76) | yes |
| Flow A: init → shape-project → shape-product → shape-tech → [backlog] → direction | `orc-curator:setup` | planned (Curator plan, S76) | yes |
| Flow B: feature … → curate → direction | orchestra run → `orc-curator:curate` (Step 6 runs the sweep through `orc-curator:direction`) | ported (changed, S76: curate runs inline at the end of the run) | yes |
| Flow C: backlog → repair → direction | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| What direction decides per row: the verdict ladder with examples | `orc-curator:direction` Step 3 (the verdict ladder); README not written yet | partial (S76: the ladder ships in direction; the README examples wait for the README) | yes |
| Modes: maintain vs vibe | — | dropped (S76: a project without a Curator is "maintain") | no |
| Four files, four tenses, no fact in two | `orc-curator` `references/recording-rules.md` "Where a fact goes" | ported (changed, S76: six files) | yes |
| CONTEXT is the dictionary, at the repo root, edited in place | `docs/curator/CONTEXT.md`; `orc-curator` `references/glossary.md`; `orc-curator:curate` Step 5 creates it on the first domain term | ported (changed, S76: subfolder, not the repo root; created lazily) | yes |
| The PRODUCT test: would deleting one backlog row make it false? | `orc-curator:curate` Step 5; `references/recording-rules.md` | ported (S76, Curator plan 2) | yes |
| Horizons are confidence, not dates; Later read by nobody | `orc-curator` references | planned (Curator plan, S76) | yes |
| Several rows in Now are intent; STATE names the one in flight | — | n/a (no STATE; a run's brief names its row) | no |
| Constraints: forward pressure, examples, `from Bn`, Evaluated ledger | `orc-curator:direction` Steps 2 to 4 | ported (S76, Curator plan 2) | yes |
| Two skills split by cadence: shape-tech rare, direction constant | `orc-curator` README | planned (Curator plan, S76) | yes |
| backlog: plain words, no flags; hand-editing is fine | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Two roots (state, knowledge), mode-dependent git rules | `docs/curator/` only | dropped (S76: one fixed folder; run state is orchestra's) | no |
| File tree: features folder, SPEC, PLAN, EPIC, CURATE, DEBUG | — | n/a (orchestra's notes folder holds the run's papers) | no |
| Steps own STATE; ACn and Tn are feature-scoped | — | n/a (orchestra run folder) | no |
| Configuration keys | — | n/a (see templates/config.yml block) | no |
| The hooks (guard, journal writer, session start, reconcile reminder) | — | dropped (S76: hooks and journal dropped) | no |
| The knowledge layer: curator routes to native surfaces, ledger | — | dropped (S76: waits for PSK) | yes |
| The knowledge layer: the subtract half (PRODUCT, Vision, DIRECTION) | `orc-curator:curate` Step 6 | ported (S76, Curator plan 2) | yes |
| Skills and agents list | — | n/a (lists minions' tiers and steps) | no |
| Learn more: design docs are dated records | — | n/a | no |

#### CLAUDE.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| What this is: skills, no build | — | n/a | no |
| Hooks have real tests | — | dropped (S76: no hooks) | no |
| `references/`: shared policy, cited by path, never invoked; two readers or more; never flow; must ship | `orc-curator/references/` | partial (S76: recording-rules and glossary ship; interview-cadence, ask-vs-research and right-sizing wait) | yes |
| Use update-minions before a change; CONTRACTS records who reads and writes | this repo's `CLAUDE.md` contract rule and this file | n/a (this repo has its own rules) | no |
| Fluid, not frozen; three failure modes (a new gate, a "never revisit" rule, a flag to remember) | `orc-curator` README; review rule for Curator skills | planned (Curator plan, S76) | yes |
| Artifact convention: knowledge root, state root; pre-existing artifacts are resumable state | `docs/curator/` | partial (S76: one folder; resume is orchestra's) | yes |
| CONTEXT outside both roots | `docs/curator/CONTEXT.md` | ported (changed, S76: subfolder) | yes |
| Testing with skill-creator, `*-workspace/` | — | n/a | no |

#### docs/CONTRACTS.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| A matrix of who adds, updates, removes and reads each artifact; checked, not trusted | the "owner" line in each `orc-curator` skill; `test/` checks it by grep | planned (Curator plan, S76) | yes |
| Verified-on dates and phase history | — | n/a (history) | no |
| Regenerate the reference list by grep | `test/orc-curator/` | planned (Curator plan, S76) | yes |
| Repo-root row: CONTEXT (adds specify and curator, edited in place, curator removes, never blocks) | `orc-curator:curate` writes, guides read | ported (changed, S76: curate writes, guides read; the file is created lazily on the first term) | yes |
| Knowledge-root rows: PRODUCT, BACKLOG, DIRECTION Constraints and Evaluated, DECISIONS, QUESTIONS, TECH, research | writers and readers in `orc-curator` skills and guides | planned (Curator plan, S76) | yes |
| Rows: knowledge-ledger, config.yml, DEBUG.md | — | dropped (S76: ledger waits for PSK; no config; DEBUG is minions' debugger's) | no |
| Plugin-shipped references table (five files, readers) | `orc-curator/references/` | planned (Curator plan, S76) | yes |
| State-root rows (STATE, journal, feedback) | — | dropped (S76: no hooks, no journal; orchestra keeps state) | no |
| Feature-folder rows (SPEC, PLAN, EPIC, CURATE) | — | n/a (orchestra notes folder) | no |
| Invariant: DIRECTION has three writers and one author | `orc-curator:direction`, `curate`; `backlog` is not written yet | partial (S76: two of the three writers ship; `backlog` is planned) | yes |
| Invariant: direction and shape-tech split by cadence | `orc-curator` README | planned (Curator plan, S76) | yes |
| Invariant: DIRECTION migration for old projects | — | n/a (no old orc-curator projects) | no |
| Invariant: a reshape run of shape-project ends with the sweep | `orc-curator:setup` | planned (Curator plan, S76) | yes |
| Invariant: init owns bootstrap and handoff | orchestra checks the setup marker and calls `setup` | planned (Curator plan, S76: other mechanism) | yes |
| Invariant: flat skills tree; README carries the flows | `orc-curator` README | planned (Curator plan, S76) | yes |
| Invariant: plan inline, no planner agent; epic gate in plan | — | n/a (orc-standard-workflow) | no |
| Invariant: `hard:`/`soft:` set at write time, read by name | `orc-curator` references (recording rules) | ported (S76, Curator plan 2) | yes |
| Invariant: specify may research at a tiny budget | — | dropped (S76: see specify Step 4) | yes |
| Invariant: research is a tool; `wide` anti-anchoring is structural; evidence is not authority | `orc-curator:research` | planned (Curator plan, S76) | yes |
| Invariant: discipline packs; comments hardwired | — | n/a (Stack Skills own comment review) | no |
| Invariant: `Dn` citable in code, `Tn`/`ACn`/`Cn`/`Bn` not | `orc-curator:code-guide` (role `code`) | ported (S76, Curator plan 2) | yes |
| Invariant: explainer reach; explainer vs research split | — | n/a (no explainer) | no |
| Invariant: direction coverage is derived, never flagged | `orc-curator:direction` | ported (S76, Curator plan 2) | yes |
| Invariant: movement inside Now/Next is no trigger | `orc-curator:direction` | ported (S76, Curator plan 2) | yes |
| Invariant: curator's Direction verdict carries diff evidence only | `orc-curator:curate` | ported (S76, Curator plan 2) | yes |
| Invariant: curate invokes direction unconditionally after a ship | `orc-curator:curate` | ported (S76, Curator plan 2) | yes |
| Invariant: backlog ends in a sweep, except Later-only changes; reads no TECH, no code | `orc-curator:backlog` | planned (Curator plan, S76) | yes |
| Invariant: shape-project calls four skills in a fixed order | `orc-curator:setup` | planned (Curator plan, S76) | yes |
| Invariant: one judgement owner per file | `orc-curator` README | planned (Curator plan, S76) | yes |
| Invariant: mode gating is not uniform | — | dropped (S76: no modes) | no |
| Invariant: agents never write STATE; workflow guard on `Workflow` | — | n/a (no STATE) | no |
| Invariant: ids never reused; next id is highest plus one; `Bn` keeps its id | `orc-curator` references | ported (S76, Curator plan 2) | yes |
| Invariant: hooks tests and STATE fields | — | dropped (S76: no hooks) | no |
| Invariant: `SPEC.md ## Unknowns` is gone | — | n/a | no |
| Invariant: Now/Next names in two files | — | n/a (no STATE.md) | no |

#### skills/feature/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Bare pick: list Now then Next with readiness (open `Qn` cited, owed `Cn`, "nothing blocking"); annotate, never decide | — | dropped (S76: `orchestra:run` needs a task; a bare pick is a later backlog item) | yes |
| The rest: tier routing, epic continuation, step sequence | — | n/a (orchestra and the workflow run the stages) | no |

#### skills/status/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Count constraints owed, satisfied, orphaned | `orc-curator:direction` return block (`Coverage:`); the curate summary | ported (changed, S76: other mechanism; the summary goes to the user, not to a file) | yes |
| Compute coverage owed (Now/Next row with no Evaluated row); never look for a flag | `orc-curator:direction` Step 3 "First: what is owed" | ported (S76, Curator plan 2) | yes |
| The rest: STATE report, next action | — | n/a (no STATE; orchestra reports runs) | no |

#### skills/init/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Copy the doc templates (PRODUCT, TECH, DECISIONS, DIRECTION, QUESTIONS, BACKLOG) | `orc-curator:setup` Step 1, into `docs/curator/` | ported (changed, S76: CONTEXT.md is created by curate on the first domain term, not copied) | yes |
| A one-paragraph product sketch into PRODUCT | `orc-curator:setup` (through shape-product) | planned (Curator plan, S76) | yes |
| DIRECTION empty until the backlog has a Now | `orc-curator:setup` | planned (Curator plan, S76) | yes |
| Do not pre-populate the backlog or plan anything | `orc-curator:setup` (copies templates, writes no row) | ported (S76, Curator plan 2) | yes |
| The rest: config interview, state root, ledger, journal, gitignore, maintain mode | — | dropped (S76: no config, no hooks, no modes; orchestra:init owns setup of orchestra) | no |

#### skills/reconcile/SKILL.md, skills/code/SKILL.md, skills/review/SKILL.md, skills/verify/SKILL.md, skills/plan-review/SKILL.md, skills/quick/SKILL.md, skills/quick-code/SKILL.md, skills/quick-plan/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Whole files: workflow stages (fold papers, code, review, verify, plan critique, quick tier) | — | n/a (orc-standard-workflow owns the stages); none of them writes a direction doc | no |

#### skills/triage-report/SKILL.md, skills/comments/SKILL.md, skills/tdd/SKILL.md, skills/debugger/SKILL.md, skills/explainer/SKILL.md, skills/do/SKILL.md, skills/feedback/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| triage-report | `orchestra:triage` (ported from be-coding-agent) | n/a (orchestra has its own) | no |
| comments: never cite `Cn`, `Tn`, `ACn` in code; `Dn` is fine | `orc-curator:code-guide` | ported (S76, Curator plan 2) | yes |
| comments: the rest of the comment bar | — | n/a (Stack Skills own comment review) | no |
| tdd, debugger, explainer, do, feedback | — | n/a (not Curator work; none writes a direction doc) | no |

#### agents/coder.md, agents/reviewer.md, agents/verifier.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| coder reads CONTEXT; names things in its words | `orc-curator:code-guide` | ported (S76, Curator plan 2) | yes |
| reviewer stage 2 "Domain language" check against CONTEXT; a comment citing `Tn`/`ACn`/`Cn` is a finding | — | n/a (orc-standard-workflow gates do not check the glossary; a candidate gate for later) | no |
| The rest: coding, review, verification | — | n/a (orc-standard-workflow stages and gates) | no |

#### templates/SPEC.md, templates/PLAN.md, templates/STATE.md, templates/EPIC.md, templates/feedback.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| PLAN: `Constraints:` line, one per applicable `Cn`, and the task that meets it | `orc-curator:plan-guide` | ported (S76, Curator plan 2) | yes |
| SPEC: research-shaped gaps go to `Qn` | `orc-curator:spec-guide` (the brief lists them) | ported (S76, Curator plan 2) | yes |
| The rest of SPEC, PLAN, EPIC; STATE; feedback | — | n/a (orchestra notes folder and run folder) | no |

#### templates/config.yml

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| `mode` | — | dropped (S76: no modes) | no |
| `questions` budget | — | dropped (S76: a Curator question in a run is asked inline; by hand the skills ask in their own cadence) | no |
| `auto`, `guard`, `branch`, `loops`, `tdd`, `skills.*`, `journal.*` | — | n/a (orchestra and the workflow own these; guard and journal dropped, S76) | no |
| `docs.knowledge`, `curate.*` | — | dropped (S76: the code-knowledge half waits for PSK; the slot is the on/off switch) | no |

#### hooks/hooks.json, scripts/*.sh

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Guard, journal writer, session start, reconcile reminder, shared lib, their tests | — | dropped (S76: hooks and journal dropped) | no |

#### .claude/skills/update-minions/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Discipline for changing minions: find every reader and the remover; mode gating | this repo's `CLAUDE.md` rules and this file | n/a (this repo has its own change rules) | no |
| Lesson: a file with writers that add and none that subtract fills with plans | `orc-curator` README (fluid by design) | planned (Curator plan, S76) | yes |

#### docs/design/*.md, docs/plans/*.md, docs/idea/general-outline.txt, docs/TODO.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Dated design records and build plans | — | n/a (history; skills are the truth, per minions' README) | no |
| `2026-08-03-knowledge-layer-design.md`: evidence behind forward pressure and against architecture doctrine | an R note in `docs/research/` if a Curator decision rests on it | n/a (evidence; read it when a decision needs it) | no |
| TODO: owed work on minions itself | — | n/a | no |

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
