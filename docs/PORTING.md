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
- No plan 4 document exists yet. `planned (plan 4)` rests on DESIGN §10 and S61. §10 names the
  gates, not what is inside them. Plan 4 must port their content from the source files below.
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
| Input: constraints, respected word for word by every stage | — | lost | unsure (can ride in the task text) |
| Input: tasks per coder | config key `tasks-per-coder` | ported (S62) | yes |
| Never push, PR or ticket | §8.3 (S17) | ported | yes |
| Group order: rewriting agents before verify, cosmetic after | phases §6.2 (S45) | ported | yes |
| Each reviewer fixes in its own session; nothing runs twice | S14, S46 | ported | yes |
| Finding triage summary (5 axes, 4 buckets) | §8.4, buckets only | partial (see triage.md) | yes |
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
| `-Dspotless.check.skip=true` on every Maven call | — | lost | yes (stack) |
| Output schema per stage | result JSON in each skill; only bad JSON is caught | partial (no schema check of results) | yes |
| A stage with no result halts the run as blocked | `next.js` `stage()` and runner `agentStep` dispatch again, with no limit | lost (loop risk) | yes |
| Spec escalation cross-repo: halt as escalated | — | lost | yes |
| Peripheral escalation: report it, go on | — | lost | yes |
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
| Text passes, each failure a deviation | finish gates | planned (plan 4) | yes |
| `deviations[]` in the result | — | lost | yes |
| `commits[]` | report `git log base..HEAD` | ported | yes |
| Summary text | report Status and Reason | partial | yes |

#### skills/implement-task/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| The entry checks, never does stage work | run skill "Subagents do the work" | ported | yes |
| Never switch modes; never run a degraded run | run skill line 70 says the opposite: "invoke the skill yourself" | lost (reversed, no decision) | yes |
| Preflight: stack skills present | resolution (S50) | ported | yes |
| Preflight: harness tools | — | dropped (S4) | no |
| Preflight: clean tree | `prepare` (S23, S57) | ported | yes |
| Branch name rules | `task/<slug>` | dropped (S22) | no |
| A missing required input: blocked | — | lost (minor) | unsure |
| Workspace path and git exclude | notes and run folders | dropped (S58) | no |
| Base = remote ref after fetch | default branch + `pull --rebase`, base = HEAD (§8.3) | ported (other mechanism) | yes |
| Absolute paths to the plugin | `resolved.json`, `{plugin}` (S50) | ported | yes |
| Arguments as an object | — | dropped (S4) | no |
| Report: files changed | — (commits only) | lost | yes |
| Report: test counts, build | step status only | partial | yes |
| Report: assumptions | report Assumptions (S59) | ported | yes |
| Report: findings ledger with reasons and Left items | counts, Evaluate lines | partial (Patch findings and reasons not listed) | yes |
| Report: Decide with prose and options with trade-offs | one line `<question> — options: <a> \| <b>` | partial | yes |
| Report: deviations | — | lost | yes |
| Report: escalation | — | lost | yes |
| Report: artifacts, branch, commits | report | ported | yes |
| An unreached field stays empty | `list()` gives "- none" | ported | yes |
| Write and print the report | `report.js`, run skill (S55) | ported | yes |
| Statuses completed / needs-decision / blocked / escalated | done / decide / failed (S15) | partial (`escalated` lost) | yes |
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
| External facts: read at the source (sibling checkout, local Maven repo, OpenAPI, schema, proto, migration) | spec step 3 "read it at its source if you can reach it" | partial (the places to look are lost) | yes |
| Cite external facts; unreachable ones go to Assumptions with the cost of being wrong | spec step 3 | partial (no citation, no cost) | yes |
| Boring minimal default, logged | spec step 4 (+ S60) | ported | yes |
| Brief: goal, criteria, scope, affected files, patterns | spec brief template | ported | yes |
| Brief: integration points | — | lost | yes |
| Brief: risks | — | lost | yes |
| Brief: assumptions log | Assumptions, `business fact:` (S60, S63) | ported | yes |
| Brief: escalation (none / cross-repo / peripheral) | — | lost | yes |
| Plan format | plan skill | ported (S37) | yes |
| Plan rules | plan skill Rules | ported | yes |
| Every named test is a real class and method the coder creates | plan "with a named test" | partial | yes |
| Return counts | heading count (S62) | dropped (S62) | no |
| Return escalation | — | lost | yes |

#### stages/spec-check.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Fresh eyes, before any code | plan-check (S26, S38) | ported | yes |
| Read triage.md first | short inline buckets | partial (see triage.md) | yes |
| Load the architecture skill | plan guide (S53) | ported | yes |
| Coverage, code facts, scope, over-building, size, no code | plan-check step 3 | ported | yes |
| External facts: grounded and cited, else to Assumptions | — | lost | yes |
| A new dependency is at least Evaluate; apply the Decide test | plan guide rule 8 | partial (no bucket rule) | yes |
| Patch in place, renumber, keep AC numbers | plan-check step 7 | ported | yes |
| Evaluate with its axes | `evaluate` lines | partial (no axes) | yes |
| Decide: other Patches still land | stop before any fix | dropped (S46) | yes |
| Notes sections: tally, Patched, Skipped, Dropped, Awaiting decision | "by bucket" | partial | yes |
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
| Blocker context: fix why the last coder stopped | — | lost | yes |
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
| No severity; the bucket is the action; urgency in flags | buckets only | partial (no flags) | yes |
| Five axes: origin, risk, fix-risk, probability, impact | — | lost | yes |
| Fix-Risk scale (Low: one line; Mid; High: new flows, tables, libraries) | — | lost | yes |
| `security` is never folded into `bug` | — | lost | yes |
| Bucket rules 1–4, first match wins | — | lost | yes |
| Decide = half A AND half B | plan-check and logic-review, short form | partial | yes |
| Half A: two or more options with different trade-offs, listed | `options: <a> \| <b>` | partial (no trade-offs) | yes |
| B1: a product answer you cannot read anywhere; never install a "safe" default | business fact = Decide (S60, S62, S63) | partial (narrowed to rate, price, limit, who qualifies) | yes |
| B1 bound: an assumption counts only if not derivable and visible to users | technical choice vs business fact (S60) | dropped (S60) | yes |
| B2: a shape-setting choice with no recommendation | — | lost | yes |
| Half A without B: make the call; handing it back is a failure | S59, short form | partial | yes |
| Flags 🔴 / 🟡 | — | lost | unsure |
| Action per bucket | §8.4 | ported | yes |
| Decide lands after the stage's Patches | stop before any fix | dropped (S46, S55) | yes |
| Check each Patch is right before applying it; reject a wrong one with evidence | — | lost | yes |
| Finding format: title, prose, "In the code", fix | `file:line` + spec point | partial | yes |
| A Decide says why the call is not yours | — | lost | yes |
| Calibration: a real Decide and a near-miss Patch | — | lost | yes |
| Write for a reader new to the code; length by bucket | — | lost | yes |
| Notes sections ordered by bucket | "by bucket" | partial | yes |
| Notes and result must match | — | lost (minor) | yes |
| Hard gate: both failure directions; size alone is not Decide | S57, S59, Noise side only | partial | yes |

#### stages/logic-review.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Fresh eyes, once, fixes in its own session | logic-review gate (S14, S25, S55) | ported | yes |
| Loads review, testing, ops and build skills | stack-agnostic; ops and testing become stack gates | planned (plan 4) | yes |
| Read brief, plan, implementation log, diff, changed files in full | spec, `code.md`, diff | partial (no plan, no log) | yes |
| Criterion-to-test mapping | logic-review step 3 | ported | yes |
| Test quality: empty asserts, disabled tests, mocked unit under test, tests that pass without the change | — | lost | yes |
| Completeness: every plan task done, nothing stubbed | criteria, not tasks | partial | yes |
| Undeclared deviations from the plan | — | lost | yes |
| Correctness: bugs, edges, races, transaction and error boundaries | step 4 (no races, no transactions) | partial | yes |
| Error handling and security | ops gate | planned (plan 4) | yes |
| Not yours: naming, structure, comments, logs, layout | — | lost (minor) | yes |
| Patch: check it first, fix minimally | "fix every Patch finding" | partial (no check first) | yes |
| Evaluate / Noise / Decide actions | steps 5, 7 | ported | yes |
| Affected tests only; one commit | step 8 (S63) | ported | yes |
| Notes sections | `logic-review.md` | partial | yes |
| Return counts, decisions | result JSON | ported | yes |

#### stages/structure.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Structure reviewer | §10 implementation-check "structure" (S25) | planned (plan 4) | yes |
| Runs before the build that verifies, because it may rewrite code | implementation-check (§6.2) | planned | yes |
| Scope = the diff | §6.4 | planned | yes |
| Checklist: layering, SOLID, records, DI, immutability, DTO annotations, naming, null checks, member order | parts in the plan and code guides | partial / planned (plan 4) | yes (stack) |
| Leave cross-file moves and new or deleted classes | buckets (§8.4) | lost (the "leave cross-file" rule) | yes |
| Notes: Fixed / Left | gate result | planned (format not set) | yes |

#### stages/verify.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Measure only | runner build step (S48) | ported | yes |
| Wrapper, flags, settings file, log to file | `build.run`, code guide | partial (settings file only in DESIGN §4.2) | yes (stack) |
| Do not stop at the first failure | — | lost | yes (stack) |
| Pass/fail from the build line; test totals summed | exit code | partial (no test counts) | yes |
| Never change files; never skip tests | fix-build | ported | yes |
| Pass the last ~200 lines, compile errors first | raw log path to the fixer | dropped (S47) | no |
| JaCoCo coverage | §10 | planned (plan 4) | yes |

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
| Notes: failures, root cause, fixed, not fixed | — (result JSON only) | lost | yes |
| One attempt | `max_rounds` 3 (S47) | ported | yes |

#### stages/logging.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Logging pass, never changes behaviour | §10 finish "logging", §6.2 | planned (plan 4) | yes (stack) |
| Skip when no log line changed | §6.4 selection | planned | yes |
| Scope: declaration, level, format, exceptions, structured values, masking | — | planned (plan 4, content not set) | yes (stack) |
| Blank lines around logs belong to layout | — | lost (layout is not in §10) | yes |
| Leave a fix that changes behaviour, or a message a test outside the diff asserts | — | lost | yes |
| Compile and test touched modules; one commit | final build, S14 | ported | yes |

#### stages/comments.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Comments pass, never changes code | §10 finish "comments" | planned (plan 4) | yes (stack) |
| Skip when no comment changed | §6.4 | planned | yes |
| A comment earns its place: constraint, reason, external fact, contract, expiry | — | planned (plan 4, content not set) | yes |
| Delete restating and narrating comments, plan names, invented reasons | code 3.4 bans plan names | partial | yes |
| Run the skill's self-check greps | — | planned (plan 4) | yes |
| Leave a comment only when its truth is unknown | — | lost | yes |
| Compile (Javadoc can break the build) | finish build | ported | yes |

#### stages/layout.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Runs last; formats once | finish: agents → tools → build (§6.2) | ported | yes |
| Skip when no Java file changed | §6.4 | planned | yes |
| Empty-line rules | — (§10 lists only Spotless) | lost | yes (stack) |
| Import rules | — | lost | yes (stack) |
| Spotless apply | §10 Spotless, `fix: self` | planned (plan 4) | yes |
| Run Spotless only where the repo has it, else record it | — | lost | yes |
| No formatter: follow the code around it, and say so | guides "The project's own code wins" | partial | yes |
| Commit only the touched files | `fix: self` commits all outside `docs/runs` | partial | yes |
| Compile after | finish build | ported | yes |

#### Top losses (be-coding-agent)

1. **Triage depth:** axes, Fix-Risk scale, bucket rules, Decide halves A/B1/B2, "make the call", calibration, hard gate. Without them the buckets drift from run to run.
2. **Check a Patch before applying it.** A wrong finding now becomes a wrong commit.
3. **A stage that writes no result is dispatched again with no limit.** A loop risk in code, not only lost text.
4. **Test-quality checks in logic-review.** Fake tests can satisfy the criterion-to-test mapping.
5. **The Decide hand-off lost its prose and the trade-offs per option.** The human decides from one line.
6. **Escalation, integration points, risks, and the external-facts check.** Cross-service work is not caught.
7. **Deviations.** logic-review does not read the plan or the implementation log, and the report shows no deviations.
8. **Coder blocker context.** A failed chunk runs again without knowing why it failed.
9. **Spotless.** No `-Dspotless.check.skip` in the build, Spotless runs where it is not set up, and the layout rules are not in §10.
10. **Report detail and the degraded-run rule.** Files changed, test counts and Patch reasons are gone. The run skill allows a degraded run with no decision behind it.

### java-stack

Source: `~/Projects/claude-code-plugins/plugins/java-stack`. Target: `plugins/orc-java-stack`, the
generic rewrite. ship.cars-only content (Lombok and Commons Lang house rules, `cars.ship.commons`,
internal BOMs, JIRA hooks) is `dropped` by S3 and DESIGN §2: it belongs to the ship.cars version.
Short names: PG = plan-guide, CG = code-guide, FB = fix-build, OJ = `orc-java-stack/orchestra.json`.

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
| Read the project's agent file first | spec step 1 reads `AGENTS.md` | partial (gates are not told to read it) | yes |
| Conventions list | DESIGN §10 gates | planned (plan 4) | yes |
| 8 review areas | logic-review + planned gates | partial ("Maven and dependencies" and "performance" have no gate) | yes |
| Output: Critical/Major/Minor/Positive | §8.4 buckets | dropped (S14, S44, §8.4) | no |
| Review the changed code | runner diff (§6.4) | ported | yes |
| Check library facts at the source | spec step 3 | partial (spec only) | yes |

#### agents/sc-java-logging.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Logging fixer agent | gate "logging" (§10) | planned (plan 4) | yes |
| Fix directly by default | §6.1 (S14) | ported | yes |
| "Review only" mode | agent gates always fix (§6.1) | dropped (§6.1) | unsure (hand use, §9) |
| Build after fixing | finish build (§6.2) | ported | yes |
| Output: files, fixes, unfixable | result JSON, `evaluate` (§8.2, S57) | ported | yes |

#### skills/java/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Skill index | OJ | dropped (S53) | no |
| Readability first | CG 5–6, loosely | lost | yes |
| Match the codebase | PG, CG intro "The project's own code wins" | ported | yes |
| Business logic has tests | PG 9, logic-review | ported | yes |
| SOLID | CG 6 | partial / planned (structure gate) | yes |

#### skills/java-architecture/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Layers, dependencies point inward | PG 2 | partial ("point inward" missing) | yes |
| Interfaces at layer boundaries | PG 5 says the opposite: "No interface with one implementation" | lost (reversed in plan 3, no decision) | unsure: conflict to settle |
| SOLID | CG 6 (one job only) | partial / planned (structure) | yes |
| Package by feature | PG 1 | ported | yes |
| Consistent modules, Maven layout | PG 11 + "project wins" | partial | yes |
| Microservice size | — | n/a (not a code rule) | no |
| Composition, program to interfaces, DI | — | planned (structure) | yes |
| Records for data holders | PG 6, CG 9 | ported | yes |
| Builder, Factory, Strategy, Template | PG 5 limits them | partial / planned (structure) | unsure |
| `ObjectUtils`, Lombok `@UtilityClass` | — | dropped (S3, ship.cars) | no |
| REST DTO annotations | — | planned (DTOs gate); R3 §5.2 calls DTO shape a write-time rule | partial (Jackson part generic) |
| DRY, encapsulate what varies | — | planned (structure) | yes |
| Side effects apart from pure logic | PG 3 | ported | yes |
| Immutability, `final` | CG 9 (fields only) | partial | yes |
| Small classes and methods | CG 6 | ported | yes |
| Performance (7 points) | — | lost (no gate in §10) | unsure |

#### skills/java-style/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Descriptive names, nouns and verbs | CG 5 | ported | yes |
| Case conventions, `DefaultX` names | — | planned (structure: "naming") | yes |
| Commons Lang `isBlank` / `isEmpty` | — | dropped (S3); the generic "blank is not empty" point is lost | partial |
| Member order | — | planned (weak: §10 names only layering and naming) | yes |
| Methods under 30 lines, parameter objects | CG 6 | partial (the number is gone) | yes |

#### skills/java-review/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Reviewer principles | guides intro, §9 | partial | yes |
| Follows project patterns, reuse utilities | spec "Patterns to reuse", PG 4 | ported | yes |
| Comment contract | code skill bans plan names; comments gate | partial / planned | yes |
| Error handling, security, `isNotBlank` + trim | CG 8; ops gate | partial / planned | yes |
| Test coverage | logic-review; JaCoCo planned | partial | yes |
| SOLID, WARN vs INFO, assertion helpers | structure, logging, testing gates | planned (plan 4) | yes |
| One `CREATE INDEX CONCURRENTLY` per file | ops gate; R3 says migrations are write-time | planned (not in PG/CG) | yes |
| No magic numbers | — | lost | yes |
| Static-import enums | — | lost | unsure (house style) |
| Performance, scalability, smells, tech debt | — | lost (DESIGN §8.1 "later candidate") | unsure |
| Prefer changing files over new ones | PG 1 | partial | yes |

#### skills/java-comments/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Accuracy over volume | — | planned (comments gate) | yes |
| Five kinds of comment that earn their place | — | planned (comments) | yes |
| Describe state, never change | — | planned (comments) | yes |
| No plan names in comments (Jira is fine) | code skill 3.4 | partial (Jira nuance missing) | yes |
| Never invent a reason | — | planned (comments) | yes |
| Examples, test comments, delete-on-sight list, common mistakes | — | planned (comments) | yes |
| Self-check greps, tier 1 and tier 2 | — | partial: §10 plans an agent gate only; R3 §5.1 says tool checks first | yes (a tool gate fits) |

#### skills/java-comments/evals/

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Layer 1: `run.sh` grep eval | — | lost | yes, if the grep becomes a tool gate |
| Fixtures | — | lost | unsure: they hold real ship.cars code lines; check before copying |
| Keep the pattern in sync with the skill | — | lost | yes |
| Layer 2: judgement cases C1–C10 | — | lost | yes (a test set for the comments gate) |
| Backtest numbers and known limits | — | lost | yes |

No DESIGN or TENSIONS row gives skills or gates an eval or regression test. `orchestra check`
(§5.3) checks structure only.

#### skills/java-formatting/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Google style, imports | Spotless gate (§10) | planned (plan 4) | yes |
| Static imports, enum constants static | — | lost (google-java-format does not enforce it) | unsure (house style) |
| Comments section | comments gate | planned | yes |
| Spotless commands | §4.2 example | planned | yes |
| Empty-line rules and 12 examples | — | lost (no gate; google-java-format adds no blank lines) | no for generic; yes for ship.cars |

#### skills/java-logging/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Lombok `@Slf4j` | — | dropped (S3) | no (the generic "one SLF4J logger" goes to the logging gate) |
| Levels; WARN vs INFO by who controls the data | logging gate | planned (plan 4) | yes |
| Empty lines | — | lost (see formatting) | no for generic |
| Message format, content rules, labels | logging gate | planned | yes |
| Parameterized logging, debug guard | logging gate | planned | yes |
| Exceptions: cause last; never log and rethrow | logging gate | planned | yes |
| Sensitive fields | logging gate | planned | yes |
| `hideString()`, `scValue()` | — | dropped (S3, ship.cars libraries) | no |
| Quarkus `kv()`, detect Quarkus vs Spring | — | planned / unsure | unsure |
| 16 anti-patterns | logging gate | planned (ship.cars items dropped) | yes |

#### skills/java-maven/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| "Invoke before any mvn" trigger | OJ `build` (S48), CG | dropped (S48, S53) | no |
| Wrapper, `-B` | CG 1, OJ | ported | yes |
| `-s .mvn/settings.xml` | CG 1 (conditional); OJ `build.run` lacks it | partial / planned (§10) | yes |
| Check the module exists before `-pl`; check mvnw and settings exist | CG 1–2 | partial | yes |
| Log to a file once; no pipes | CG 3, code skill, fixer (S60) | ported | yes |
| Single class or method | CG 2, FB 2 | ported | yes |
| Several classes in `-Dtest`; `-Dsurefire.failIfNoSpecifiedTests=false` | — | lost | yes (multi-module repos) |
| `-DskipTests` only to compile | FB 3 | partial | yes |
| Stale SNAPSHOT: always `-am`; suspect the classpath before your diff | CG 2 (`-am`) | partial (the diagnosis rule belongs in FB) | yes |
| An interrupted run leaves `target/` broken | — | lost (belongs in FB) | yes |
| Shell gotchas (noclobber, SIGPIPE) | S60 no-pipe rule | partial | unsure |
| Dependency management | PG 8 | partial | unsure |
| JaCoCo in the build | OJ has none | planned (§10) | yes |

#### skills/java-ops/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Error handling | CG 8 | partial / planned (ops gate) | yes |
| Wrap exceptions with the cause | — | planned (ops) | yes |
| Strings: one trimming strategy | CG 8 | partial / planned (ops) | yes |
| Flyway: one `CONCURRENTLY` per file, `IF NOT EXISTS` | — | planned (ops); R3 §5.2 says migrations are write-time | yes |
| Security, concurrency | — | planned (ops) | yes |
| Javadoc with all params; README per module | — | planned (comments); conflicts with java-comments | unsure: conflict in the source |

#### skills/java-testing/SKILL.md

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| Positive and negative cases; independent tests | PG 10, logic-review | partial | yes |
| Integration and end-to-end for critical paths | — | planned (testing gate) | unsure |
| Mocks for external dependencies | PG 3 | partial | yes |
| Edges, names, AAA, AssertJ, JUnit 5, FAILURE vs ERROR, mirror structure | PG 9–11, CG 4, 10–11 | ported | yes |
| JsonUnit, SoftAssertions rules, assertion helpers | — | planned (testing gate) | yes |
| `assertBusinessRuleException`, `assertErrorDto` | — | dropped (S3) | no |
| Static-import enums in tests | — | lost | unsure |
| Parameterized sources (`@NullAndEmptySource`) | CG 12 | partial | yes |
| Builders and helpers | CG 11 | partial | yes |

#### skills/java-maven-upgrade/ (SKILL.md and 3 sub-files)

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| An upgrade task procedure | — | lost (no design slot for task-type procedures; guides are plan and code only) | unsure |
| Internal deps, BOMs, release process, sibling repos, JIRA PR flow | — | dropped (S3, S17, §14) | no |
| Comments in the POM are version ceilings | — | lost | yes |
| Stable versions only; stay on Maven 3.9 | — | lost | yes |
| BOM-managed versions win | — | lost | yes |
| Check before done; compare with the pre-upgrade log | — | lost (belongs in FB) | yes |
| "`[ERROR]` lines can be test noise; trust BUILD SUCCESS" | — | lost (belongs in FB) | yes |
| Version discovery on Central (`maven-metadata.xml`), wrapper upgrade steps | — | lost | yes (upgrade tasks only) |
| Parent-less BOM duplication gotcha | — | lost | yes |
| Quarkus migration lessons (jpamodelgen, Testcontainers mode B, Flyway CONCURRENTLY hang) | — | lost | yes (generic Quarkus) |
| Other Quarkus traps, native build, property migrations | — | lost | unsure |

Note: FB's "do not change dependencies" rule blocks a dependency-bump task.

#### skills/spotless-maven-setup/ (SKILL.md and assets)

| Part | Where now | Status | Applicable? |
|---|---|---|---|
| `spotless:apply` works from root; `verify` runs `check` | Spotless gate (§4.2) | partial (the gate assumes the plugin is set up) | yes |
| Add and check the plugin; `spotless-plugin-block.xml` | — | lost (`orchestra:init` does no repo set-up) | yes |
| Client hooks, `install_client_hooks.sh`, revalidation | — | lost | no for runs |
| Gotchas A–E | — | lost (a `fix: self` gate has no fix guide) | yes (as a fix guide) |
| `pre-commit` hook | — | lost | unsure (would run Maven on every orchestra commit) |
| `commit-msg` hook (needs a JIRA key) | — | dropped (S3) | no. In ship.cars repos it rejects orchestra's `feat:` commits |

#### Top losses (java-stack)

1. **Skill evals have no home.** The java-comments evals are not carried, and no gate has a regression test.
2. **Multi-module test-selection gotchas** are missing from CG and FB. The coder and the fixer burn rounds on them.
3. **The build lacks the settings file and JaCoCo.** A repo with private settings fails; the CRAP gate will have no data.
4. **Flyway migration rules are only planned at review time.** R3 says migrations belong in the write-time guides.
5. **The DTO shape rule is missing at write time,** though R3 uses it as its own example.
6. **The comments grep is not a tool gate.** Its tuned patterns are not carried.
7. **Spotless has no set-up and no fix guide.** The finish phase fails on a repo without the plugin.
8. **Empty-line and static-import rules have no gate.** This matters most for the ship.cars version.
9. **Generic upgrade lessons have no slot,** and FB blocks dependency changes.
10. **Silent conflicts:** PG 5 against "interfaces at layer boundaries"; Javadoc `@param` in the source itself; the ship.cars `commit-msg` hook against orchestra's commit messages.

### minions

Source: `~/Projects-other/claude-minions`. Not inventoried yet. It becomes the Curator in a later
phase (S2). Inventory it, by the steps above, before the Curator is planned.

### sc-agent-plugins

Source: `~/Projects/sc-agent-plugins`. Not inventoried yet. Its packaging rules became pillar 4
(S33, DESIGN §11). Inventory it before plan 5 (Codex).
