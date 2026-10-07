# Tensions

The forks in the design. `docs/PILLARS.md` describes the four source projects. `docs/CONTEXT.md`
defines the module names. The research notes are in `docs/research/` (R1 file loading, R2
orchestration, R3 write vs review time).

## Scope

- **Phase 1 (vertical slice):** Orchestrator → Workflow → SSK.
- **Later:** Curator, PSK, General Knowledge, adapters for external frameworks (O8).
- minions and be-coding-agent are not reused as they are. They are rewritten to fit this design.
- One model for everything. Model per stage is out of scope.

## Settled

| # | Settled point | From |
|---|---|---|
| S1 | Reviewers are subagents that load a skill body. | T2 |
| S2 | minions is valuable only for project knowledge. It becomes the Curator, rewritten, in a later phase. | T6, O4 |
| S3 | Two repos, personal and ship.cars. Commits are copied between them. ship.cars can diverge and rebases often. | T7 |
| S4 | Portability wins over harness workflow scripts and a visual workflow. | T3 |
| S5 | Stage order and retries live in code or files, not in prose — a `next` CLI that reads state files and prints the next step. | P1 |
| S6 | Discovery = naming convention plus the per-project config. The SSK exposes `<ssk>:review`. The config names which skill fills each slot. | P3 |
| S7 | Stack knowledge reaches the code through reviewers at the end, not through the coder's context. No generated folder `AGENTS.md` files, no area map in the config. | P4–P8 |
| S8 | A repo that uses this system has `AGENTS.md`, not `CLAUDE.md`. One `CLAUDE.md` turns off every `AGENTS.md` in Claude Code. | P4 |
| S9 | Runtime Orchestrator: the user always calls the Orchestrator. It reads the config and calls the skill in the workflow slot. | Grill Q1 |
| S10 | Each workflow ships its own `next` CLI. The Orchestrator does not know the stages. A generic engine comes only after a second workflow exists. | Grill Q2 |
| S11 | The CLI is Node, standard library only. | Grill Q3 |
| S12 | Headless or interactive is the workflow's choice. The first workflow is headless and stops only on a Decide finding. | Grill Q4 |
| S13 | The input to one run is free text or a file path. | Grill Q5 |
| S14 | Reviewers fix their Patch findings in place and report the rest. One fix round, then build and tests again. A reviewer never re-reviews its own fixes. | Grill Q6 |
| S15 | Workflow entry: the Orchestrator calls `<workflow>:run` with the task and the config path. The workflow returns a status (`done`, `decide`, `failed`) and a report path. The run folder is derived from the branch name, not passed. | Grill Q7 |
| S16 | The Orchestrator plugin is called `orchestra`. The config is `.orchestra/config.json`, committed. | Grill Q8 |
| S17 | Git policy: on a clean tree, go to the default branch, `git pull --rebase`, create a task branch, one commit per task, reviewer fixes as their own commits. Never push, never open a PR. | Grill Q9 |
| S18 | `<ssk>:review` gets the base commit, the brief path and the run folder. It returns a findings file and JSON: a count per bucket and the Decide list. | Grill Q10 |
| S19 | The first workflow is a rewrite of be-coding-agent. Its Java-specific stages become the SSK review slot. | Grill Q11 |
| S20 | Phase 1 builds only the internal executor. | Grill Q12 |
| S21 | The SSK review runs its reviewers one at a time, each one fixing and committing before the next starts. All dispatch happens from the main session, one level deep. | Grill Q13, R4 |
| S22 | Run files are committed, in `docs/runs/<branch>/`. Task branches are `task/<slug>`. | Grill Q14 |
| S23 | The git policy is a `prepare` code step in the workflow's `next` CLI. A dirty tree stops the run with `failed`. The default branch comes from `origin/HEAD`. | Grill Q15 |
| S24 | The SSK may expose `<ssk>:guide`, with one short section per role (plan, code). The config switches it on per role, default off. Reviewers stay the guarantee. | Grill Q16 |
| S25 | logic-review (correctness and criteria-to-test mapping) stays a workflow stage. structure (layering, naming) becomes a Java SSK reviewer. | Grill Q18 |
| S26 | spec-check stays. | Grill Q19 |
| S27 | The workflow is stack-agnostic. Stack tools are SSK capabilities with fixed names and stack-agnostic input and output. Required: `review`, `verify`. Optional: `guide`, `mutate`, `crap`. A missing optional capability skips its stage, and the report records the skip. `mutate` and `crap` are phase 2. | Grill Q20 |
| S28 | Contracts are guaranteed by an `orchestra check` CLI that validates workflow and SSK plugins. Authoring skills explain the contracts and end with the check. | Grill Q21 |
| S29 | The config names only the SSK plugin. Capability names follow the `<ssk>:<capability>` convention. | Grill Q22 |
| S30 | Phase 1 plugins, all in this repo: `orchestra`, `standard-workflow` (the first workflow, a rewrite of be-coding-agent), `java-stack` (the personal, generic rewrite). | Grill Q23 |
| S31 | `orchestra:init` asks for the workflow and the SSK, writes `.orchestra/config.json` with the keys `workflow`, `ssk`, `guide`, `executor` (`null` = internal), then runs `orchestra check`. | Grill Q24 |
| S32 | A stopped run (`decide` or `failed`) resumes when the Orchestrator is called again on the same branch. Decide answers go into `decisions.md` in the run folder. | Grill Q25 |
| S33 | Pillar 4 packaging from the first commit. `orchestra check` also runs the pillar 4 greps. | Grill Q26 |
| S34 | Phase 1 is done when: a sample Java repo gets one run end to end on Claude Code and on Codex; one run stops on `decide` and resumes; `orchestra check` passes on both plugins. | Grill Q27 |
| S35 | SSK is renamed Stack Skills; the config key is `stack-skills`. Earlier rows keep the old name. | Design review |
| S36 | No `guide` config key. The Stack Skills plugin may expose `plan-guide` and `code-guide`; a guide is on when its skill exists. The plan checker also gets `plan-guide`. This replaces S24. | Design review |
| S37 | Stage order: spec → plan → spec-check (checks the brief and the plan together) → code. | Design review |
| S38 | spec-check is renamed plan-check. It checks the brief and the plan together, with the focus on the plan. | Design review |
| S39 | Each plugin ships `orchestra.json`: its slot, parameters and config keys. The config has one section per slot; orchestra knows only `plugin`. `orchestra check` validates the config against the declarations. This replaces the flat config of S31. | Design review |
| S40 | The Stack Skills contract has `disable`: optional capabilities a project turns off. | Design review |
| S41 | `orchestra:run` forwards all arguments unread and shows help from the declaration. The workflow can also be called directly; it reads the config itself. | Design review |
| S42 | No Executor layer. The workflow does its own plan and code stages. External frameworks come later as adapters (O8). This replaces S20 and the `executor` key of S31. | Design pressure test |
| S43 | Every check after the code is a gate, declared as data in `orchestra.json`. The Stack Skills no longer runs or orders its reviewers. This replaces the inline `review` capability of S18 and the reviewer picking of S21. | Design pressure test |
| S44 | A gate has four properties: phase, provider (workflow or stack), kind (`tool` or `agent`), fix (`self`, `fixer`, `none`). Plus a selection rule, a round limit and a fix guide. | Design pressure test |
| S45 | orchestra defines three standard phases: `implementation-check`, `conventions-check`, `finish`. Order inside a phase: implementation-check = build, tools, agents; conventions-check = tools, agents; finish = agents, tools, build. Then workflow gates before stack gates, then declaration order. Nothing runs after `finish`; its gates must not change behaviour. | Design pressure test |
| S46 | The gate runner lives in orchestra. `next.js` prints a `phase` action; the runner returns `ok`, `decide` or `failed`. It saves a checkpoint after each gate and resumes at the next one. An agent gate with a Decide finding stops before it fixes and fixes on resume. | Design pressure test |
| S47 | Whoever declares a gate owns it: command or skill, selection, fix guide, `max_rounds` (default 2, the project can override). orchestra owns the generic fixer procedure. Tool output is passed raw to the fixer. Violations left after the last round go to Evaluate. | Design pressure test |
| S48 | Build is not a gate. It is a required top-level declaration of the Stack Skills, with coverage. The gate runner runs it first in `implementation-check` and last in `finish`. A red final build gives `failed`. The PSK may override it later. The stack capability `verify` is renamed `build`. | Design pressure test |
| S49 | Gate selection: `files` and `grep` by code, then one select subagent (in orchestra) judges all `when` rules from one read of the diff, or `always`. Each agent gate reports `skipped` when nothing concerns it. A project's own naming pattern is a config key the stack declares and the project sets. | Design pressure test |
| S50 | Resolution: `orchestra:run` invokes `<plugin>:manifest` for each slot. The skill reports its folder; orchestra writes the declarations, folders and versions to `.orchestra/resolved.json`, ignored by git and rewritten each run. Nothing reads plugin install folders. The Codex side is tested later. | Design pressure test |
| S51 | `orchestra:run` is the only entry. The workflow is not called directly. This replaces the direct call of S41; forwarding declared arguments unread stays. | Design pressure test |
| S52 | orchestra owns the driver loop and the action protocol. Every workflow ships `next.js`; it has no `run` skill. `orchestra check` keeps `--dry-run`. | Design pressure test |
| S53 | Guides are declared in `orchestra.json` (`guides.plan`, `guides.code`), not found by fixed skill names. This replaces the fixed names of S36. `disable` takes gate and guide names. | Design pressure test |
| S54 | Run files are committed and go to the default branch with the PR. | Design pressure test |
| S55 | orchestra writes `report.md`. The workflow writes `run.json` (`base`, `branch`, `spec`), which the gate runner reads. A Decide answer is a `## <gate name>` section in `decisions.md`; a gate runs again only when a new section for it appears. | Build plan |
| S56 | Plugins made to work with orchestra carry the prefix `orc-`: `orc-standard-workflow`, `orc-java-stack`. The prefix keeps them apart from plugins with the same base name (the ship.cars `java-stack`). `orchestra` keeps its name. This renames the plugins of S30. | User decision |
| S57 | From the first real run: the dirty-tree failure names the files; `orchestra:run` resolves on every call and asks for a general-purpose subagent that can edit files and run commands; the runner skips a build on the commit of its last green build when the tree is clean; result files carry an `evaluate` list that the report shows; the report is in run order and marks an empty phase "ok (no gates)"; logic-review never calls an unasked behaviour change Noise. | First run feedback |
| S58 | Run state moves to the git-ignored run folder `tmp/runs/<branch>/` (results, checkpoints, logs, `run.json`). Only the notes folder `docs/runs/<branch>/` is committed (`task.md`, `decisions.md`, review notes, `report.md`). What exactly is committed gets tuned later. A resume works on the same machine only. This narrows S22 and S54. | User decision, second run feedback |
| S59 | From the second run: every action names the `branch`; `orchestra:run` announces the pull and the new branch before it starts; result files carry an `assumptions` list that the report shows; a choice on a question the spec leaves open is Evaluate, never Noise, and Decide only when no sensible default exists; the coder runs only the affected tests and leaves the full build to the runner. Resolution keeps its skill calls (S50). | Second run feedback |
| S60 | From the VIP run: a technical choice (rounding, null handling, limit before or after rounding) takes a sensible default and is recorded; a business fact (a rate, a price, a limit value, who qualifies) never has a default: the coder uses a placeholder marked `business fact:` and logic-review raises it as Decide. The coder also writes its assumptions to `<notes>/code.md`, and logic-review does not repeat recorded technical choices. No skill pipes a test or build command, so the exit code stays visible. | Third run feedback |
| S61 | Build order after the walking skeleton: plan 3 (spec, plan, plan-check, guides, Decide for stages), then plan 4 (java-stack gates, fix guides, `select` step), then plan 2 (`orchestra check`, schemas, `orchestra:init`), then plan 5 (Codex). The runs failed on missing knowledge, which plans 3 and 4 fix. Plan 4 adds a small declaration check to resolution until plan 2 replaces it. Build `orchestra:init` earlier if a real project needs set-up first. | User decision |
| S62 | Plan 3: a missing business fact stops the run at plan-check, before any code. spec writes it as a `business fact:` line in the brief; plan-check raises it as Decide; S60 stays as a safety net during the code. Among the stages only plan-check returns `decide`; its answer is a `## plan-check` section, and plan-check then applies the answers with no new review. One code subagent gets `tasks-per-coder` plan tasks, a config key the workflow declares (default 2). `run.json` `spec` points to `<notes>/brief.md`. `brief.md`, `plan.md`, `plan-check.md` and `code.md` are in the notes folder. `next.js` counts the plan tasks from the `### T<n>` headings, not from a number a model writes. | User decision, final review |
| S63 | From the order-pricing run. A `business fact:` line in the brief stops the run right after the spec (a check in `next.js`); the answer is a `## business-facts` section, and the planner reads it, so no stage plans around a guessed value. Every stage gets `decisions` once the file exists. plan-check always reviews in full; its answer-only mode of S62 is removed. `drive.js --resume` stops on files changed outside `docs/runs`, and never commits them. The driver runs `drive.js` in the background or with the longest timeout. logic-review and the fixer never run the full build. An answer is a new section; the driver may write the user's chat answers into it word for word. `report.md` copies `decisions.md`. S60 stays: a limit before or after rounding is a technical choice. Rejected: finding plugin folders without the manifest skills (S50, S33). | Run feedback, user decision |

## Open (phase 1)

| # | Tension | Type |
|---|---|---|

## Later

| # | Tension | Note |
|---|---|---|
| O3 | Who calls the Curator's curate step after a feature. Candidate: the workflow, through a Curator contract. | With the Curator |
| O6 | Precedence between PSK and SSK. Direction: resolution (S50) merges the PSK declaration over the Stack Skills declaration: gates, guides and build. The PSK wins. | With the PSK |
| O7 | Does General Knowledge use the same contract as an SSK? | Next phase |
| O8 | Adapters for external frameworks (Superpowers, minions, Matt Pocock's skills). Replaces the Executor idea. See "Backlog: adapters" below. | Paused, after phase 1 |
| O9 | Run in a git worktree instead of the user's checkout, so a run never moves the user's branch or touches their files. | From the first real run |

## Backlog: adapters (O8)

**The problem.** We want to use the spec, plan and code skills of an external framework, for
example Superpowers or minions. We do not want to translate their artifacts. We do not want to
repeat workflow logic for each framework.

**Why the Executor idea is paused.** A plain mapping of stages to external skills ("plan = X,
code = Y") does not hold:

- Some external skills call the next skill by themselves. Superpowers `brainstorming` invokes
  `writing-plans`, which points to `subagent-driven-development`, which ends with
  `finishing-a-development-branch` (merge or PR). The framework and our `next.js` then fight over
  the order.
- Other skills do not chain. Then something must drive them. That is workflow logic, not a mapping.
- Some skills ask the user (Superpowers `brainstorming` waits for spec approval). They cannot run in
  a headless workflow.
- Some skills start their own subagents (`subagent-driven-development`). On Codex a subagent cannot
  start another subagent by default (R4), so these must run in the main session.

**The adapter.** An adapter is a workflow plugin that wraps one external framework. It knows what
the mapping cannot know:

- the framework's skill order, and which skills chain by themselves;
- where the framework writes its artifacts (for Superpowers: `docs/superpowers/specs/`,
  `docs/superpowers/plans/`);
- which skills ask the user, so the adapter is headless or interactive (S12);
- which tail steps to stop before (push, merge, PR), because our git policy never pushes (S17).

Its own `next.js` drives the external skills one at a time. Then it prints the three `phase`
actions, like any workflow.

**Against repeated logic.** The gauntlet exists once: the phases and the gate runner live in
orchestra (S45, S46), so an adapter reuses them with no copy. The handoff is the base commit, the
commits on the task branch, and the path of the spec that holds the acceptance criteria. The spec is
passed as a path and read as it is, not translated. An adapter that wants `logic-review` declares it
as its own gate, or reuses the skill.

**Open questions.**

- Does each external framework have a headless path at all?
- Superpowers reviews each task itself. Do we accept the double review cost, or skip part of ours?
- Tail steps are stopped only by prose in the dispatch prompt. Is that enough?
