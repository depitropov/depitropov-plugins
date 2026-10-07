# Phase 1 design

This document defines the phase 1 slice: **Orchestrator → Workflow → Stack Skills**.
Every choice here comes from a settled row (`Sn`) in `docs/TENSIONS.md`. The names come from
`docs/CONTEXT.md`. The research behind the choices is in `docs/research/` (R1–R4).
This document sums up the source plugins. It is not the content to port: `docs/PORTING.md` says how
to port, and what each source file holds.

## 1. Goal

One command takes one task to reviewed, committed code on a task branch. The same plugin files run
on Claude Code and Codex. Stack knowledge is applied by gates after the code is written. The
workflow does not know the stack. It calls the stack plugin through a fixed contract.

## 2. Plugins

All three plugins live in this repo (S30).

| Plugin | Role | Holds |
|---|---|---|
| `orchestra` | Orchestrator | `orchestra:init`, `orchestra:run` (resolution and driver), the gate runner, the fixer, the select step, `orchestra check`, the schemas, the authoring skills |
| `orc-standard-workflow` | Workflow | `next.js`, one skill per stage, its own gates, its `manifest` skill |
| `orc-java-stack` | Stack Skills | `build`, its gates, fix guides, plan and code guides, its `manifest` skill |

`orc-java-stack` here is the personal, generic rewrite. The ship.cars version lives in a second repo. The `orc-` prefix marks every plugin made to work with orchestra and keeps it apart from plugins with the same base name, such as the ship.cars `java-stack` (S56).
Commits are copied between the two repos, and the ship.cars repo may diverge (S3).

## 3. Runtime flow

All orchestra skills run **inline in the main session**. Only stages, agent gates, the fixer and the
select step run as subagents. They are started from the main session, one level deep (S21, R4).
This is what makes the chain work on Codex, where a subagent cannot start another subagent by
default.

```
user → orchestra:run "<task or file path>"
         reads .orchestra/config.json
         resolves each slot (section 5.2) → .orchestra/resolved.json
         runs orchestra check on the config and resolved.json
         driver loop:
           node <workflow>/next.js                → prints the next action as JSON
             "dispatch"  → start a subagent that loads the named skill
             "phase"     → run the gate runner for that phase (section 6)
                             node <orchestra>/gates.js --phase <name> → prints its own actions
                             until it returns ok | decide | failed
             "done" | "decide" | "failed" → write report.md, return the status
```

`next.js` decides every workflow step from files on disk (S5, S10). The gate runner decides every
step inside a phase from files on disk. The skills never decide the order.

## 4. The config and the declarations

### 4.1 The project config

`.orchestra/config.json` is committed, so everyone on the project gets the same slots (S16).
`orchestra:init` writes it. It has one section per slot (S39).

```json
{
  "workflow": {
    "plugin": "orc-standard-workflow"
  },
  "stack-skills": {
    "plugin": "orc-java-stack",
    "disable": ["code-guide"],
    "gates": { "crap": { "max_rounds": 5 } }
  }
}
```

| Key | Defined by | Meaning |
|---|---|---|
| `<slot>.plugin` | orchestra | The plugin that fills the slot. |
| `<slot>.disable` | orchestra | Gates or guides the project turns off, by name. Empty or missing = all on (S40). |
| `<slot>.gates.<name>.max_rounds` | orchestra | Overrides the round limit of one gate. |

Every other key comes from the declaration of the plugin in that slot. A stack plugin can declare
a key for a project convention, for example the pattern that marks an entity, and the project sets
it here (S39). The config may grow large. `orchestra check` keeps it safe.

### 4.2 The plugin declaration

Each plugin that fills a slot ships `orchestra.json` at its root (S39). It is data. orchestra reads
it and acts on it. The plugin never runs its own gates or orders them.

```json
{
  "slot": "stack-skills",
  "params": [],
  "config": {
    "entity-pattern": { "type": "string", "default": "@Entity|@Embeddable|@MappedSuperclass" }
  },
  "build": {
    "run": "./mvnw -B -s .mvn/settings.xml verify",
    "guide": "fix-build",
    "max_rounds": 3
  },
  "guides": {
    "plan": "plan-guide",
    "code": "code-guide"
  },
  "gates": [
    { "name": "crap", "phase": "implementation-check", "kind": "tool", "files": "**/*.java",
      "run": "java -jar {plugin}/bin/crap4java.jar --changed", "fix": "fixer", "guide": "fix-crap",
      "max_rounds": 10 },
    { "name": "entities", "phase": "conventions-check", "kind": "agent", "skill": "review-entities",
      "files": "**/*.java", "grep": "{config.entity-pattern}" },
    { "name": "converters", "phase": "conventions-check", "kind": "agent", "skill": "review-converters",
      "files": "**/*.java", "grep": "@Mapper|Converter",
      "when": "Only classes that convert between a DTO and an entity" },
    { "name": "spotless", "phase": "finish", "kind": "tool",
      "run": "./mvnw -B spotless:apply", "fix": "self" }
  ]
}
```

A workflow's `orchestra.json` has `slot: workflow`, its `params`, its `config` keys and its own
`gates` in the same format. It has no `build` and no `guides`.

`{plugin}` is the plugin's folder and `{config.<key>}` is a config value. Both come from
`resolved.json`. Skill names in the declaration are names inside the same plugin.

## 5. `orchestra`

### 5.1 `orchestra:init`

1. Asks which workflow and which Stack Skills plugin to use. It offers the plugins that have a
   `manifest` skill.
2. Writes `.orchestra/config.json`.
3. Resolves the chosen plugins (5.2) and runs `orchestra check`. Shows the result.

It is the only interactive skill in phase 1.

### 5.2 `orchestra:run`

`orchestra:run` is the only entry (S51). The workflow is never called directly.

1. Reads the config. If it is missing, it tells the user to run `orchestra:init` and stops.
2. **Resolves the slots** (S50). For each slot it invokes `<plugin>:manifest` by name. The harness
   finds the plugin and tells the model the skill's folder. The skill copies its plugin's
   `orchestra.json` and the plugin's absolute folder and version. The result is
   `.orchestra/resolved.json`. Resolution runs before `prepare` creates the branch, so the file is
   not in the run folder. Git ignores it, and every run writes it again. `next.js` and the gate
   runner read only this file, never the plugins' install folders. `report.md` records the plugin
   versions.
3. Runs `orchestra check` on the config against `resolved.json`.
4. Runs the **driver loop** (section 3). The driver loop and the action protocol belong to orchestra,
   not to each workflow (S52).
5. Shows the status and the report path.

Arguments that the workflow declares are forwarded unread (S41). `orchestra:run --help` lists
them from the declaration. An argument that is not declared gets a warning and is still forwarded.

A stopped run resumes when the user calls `orchestra:run` again on the same task branch (S32). It
passes no task then. `next.js` and the gate runner find their state in the run folder. On a resume,
`drive.js --resume` stops when files outside `docs/runs` changed since the run stopped, and commits
nothing (S63).

### 5.3 `orchestra check`

A Node CLI, standard library only (S11, S28). It is the guarantee for every contract below. It
exits non-zero on the first failed rule and prints the rule and the fix. It validates each
declaration against the JSON Schema of its slot, in `orchestra/schemas/`. A project's `.gitignore` has `.orchestra/*`, `!.orchestra/config.json` and `tmp/`.

| Target | Rules |
|---|---|
| Config | Every section's plugin is in `resolved.json`. Every other key is declared by that plugin, with the right type. Every name in `disable` and `gates` exists. |
| Declaration | Valid against its slot schema. `slot` matches the slot it is used in. Every skill it names exists in the plugin. Every `phase` is one of the three standard phases. |
| Workflow plugin | Has `next.js` and a `manifest` skill. `next.js --dry-run` prints a valid action. |
| Stack Skills plugin | Has a `build` declaration and a `manifest` skill. Every tool gate with `fix: fixer` names a `guide`. |
| Every plugin | Pillar 4 greps: `SKILL.md` frontmatter has only `name` and `description`; no harness-specific words in shipped files; every manifest parses as JSON; the versions in both manifests match (S33). |

It has two uses. An author runs it on a plugin folder. `orchestra:run` runs it on the config and
`resolved.json` at the start of each run.

### 5.4 Authoring skills

`orchestra:writing-workflows` and `orchestra:writing-stack-skills` explain the two contracts
(sections 7 and 9), the gate schema and the phases. Each ends with "run `orchestra check` on the
plugin". The skill is the guide. The check is the guarantee.

## 6. Gates, phases and the gate runner

### 6.1 A gate

A gate is one check that runs after the code is written (S43). It is declared as data. Whoever
declares a gate owns everything about it: the command or skill, the selection rule, the fix guide
and the round limit (S47).

| Property | Values | Meaning |
|---|---|---|
| `phase` | `implementation-check`, `conventions-check`, `finish` | Where it runs |
| provider | workflow or stack | Which declaration it comes from |
| `kind` | `tool` or `agent` | A command, or a skill run by a subagent |
| `fix` | `self`, `fixer`, `none` | Who fixes the findings |
| selection | `files`, `grep`, `when`, `always` | When it runs |
| `max_rounds` | a number | Fixer rounds for a tool gate. Default 2 |
| `guide` | a skill name | The fix guide for `fix: fixer` |

An agent gate always fixes its own Patch findings, in one round, and never re-reviews its own fixes
(S14). A tool gate passes or fails by its exit code.

### 6.2 The phases

orchestra defines the three phases (S45). They are the same for every workflow. A workflow decides
when each one runs. A workflow that never runs a phase skips its gates, and `report.md` records the
skip (S27).

| Phase | Question | Order inside the phase |
|---|---|---|
| `implementation-check` | Is the code correct and sound? Architecture, clean code, CRAP, mutation, bugs, acceptance criteria. | **build** → tool gates → agent gates |
| `conventions-check` | Does it follow our conventions? DTOs, entities, converters. | tool gates → agent gates |
| `finish` | Is the final state clean and green? Comments, logging, formatting. | agent gates → tool gates → **build** |

Inside each step: workflow gates before stack gates, then the order of declaration.

Nothing runs after `finish`. A finish gate must not change behaviour. The final build is the proof.
A red build in `finish` ends the run with `failed`.

### 6.3 Build

`build` is not a gate (S48). It is a required top-level declaration of the Stack Skills plugin. It
runs the full build and the tests once, the way the stack does it, and it produces the coverage
data that tools like crap4java read. The gate runner calls it at the start of
`implementation-check` and at the end of `finish`. No gate list can remove or move it. The runner
records the commit of its last green build, and skips a build when `HEAD` is that commit and the
tree is clean (S57). The code
stage uses the same command for its own test runs. Later the PSK can override it.

### 6.4 Selection

For each phase the runner computes the diff from the base commit and selects gates (S49):

1. `files` (a glob on changed paths) and `grep` (a regex on changed files' content) are applied by
   code. A gate with neither and no `when` runs only if it has `always: true`.
2. If any gate left has a `when` rule, the runner dispatches **one** select subagent. It reads the
   diff once, judges every `when` rule and writes `<phase>.select.json`.
3. The chosen list is saved in the run folder, and `report.md` shows what was skipped and why.

Every agent gate starts with a safety net: if nothing in the diff concerns it, it reports
`skipped`.

### 6.5 Fixing tool findings

When a tool gate with `fix: fixer` fails:

1. The runner saves the raw output in the run folder. It does not parse or translate it.
2. It dispatches the **fixer** subagent. The fixer loads orchestra's fixer procedure and the gate's
   fix guide. The procedure is generic: fix only what the output reports, stay inside the diff,
   never delete a test to pass, one commit per round. The guide holds the stack rules for this tool.
3. The runner runs the tool again, up to `max_rounds`. The declarer sets it, the default is 2, and
   the project can override it (4.1). Violations left after the last round go to `report.md` as
   Evaluate. The run goes on.

`fix: self` means the tool fixes by itself (a formatter). The runner commits its changes.
`fix: none` means report only.

### 6.6 Results, stops and resume

Every gate writes `<phase>.<gate>.result.json` (format in 8.2). The runner writes a checkpoint
after each gate, so a stopped run resumes at the next gate. A gate that has finished never runs
again (S46).

The runner returns one phase result to `next.js`: `ok`, `decide` or `failed`.

An agent gate that has a Decide finding writes its findings and stops **before** it fixes. The
runner returns `decide`, and the run stops. An answer is a section `## <gate name>` in
`decisions.md`. On resume the runner starts that gate again only when a new section for it exists.
The gate reads `decisions.md` and then fixes. So a gate never re-reviews its own fixes (S55).

## 7. The workflow contract

| Part | Rule |
|---|---|
| Entry | None of its own. `orchestra:run` runs its `next.js` through the driver loop (S51, S52). |
| Declaration | `orchestra.json` with `slot: workflow`, its parameters, its config keys and its own gates. |
| Resolution | A `manifest` skill (5.2). |
| Order | `next.js` in Node, standard library only (S10, S11). It prints actions of the orchestra protocol, including `phase`. |
| Output | One status, `done`, `decide` or `failed`. orchestra writes `report.md` into the notes folder from the result files in the run folder, so no workflow repeats that logic (S55). |
| State | Two folders, both derived from the branch, never passed (S15, S22). The **run folder** `tmp/runs/<branch>/` holds everything the orchestration uses: results, checkpoints, logs, `run.json`, `stages.json` (the order of the stage dispatches, for the report). Git ignores it. The **notes folder** `docs/runs/<branch>/` holds what a human reads: `task.md`, `brief.md`, `plan.md`, `decisions.md`, review notes (`plan-check.md`, `code.md`, `implementation-log.md`, `logic-review.md`) and `report.md`. It is committed and goes to the default branch with the PR (S54, S58). The workflow writes `run.json` with `base`, `branch`, `spec` (`<notes>/brief.md`, the file that holds the acceptance criteria) and `docs` (the notes folder). The gate runner reads it (S55). A resume works on the same machine only, because the run folder is not committed. |
| Mode | Headless or interactive is fixed by the workflow's author when the workflow is built. It is not a runtime setting (S12). |

## 8. `orc-standard-workflow`

The rewrite of be-coding-agent (S19). It is stack-agnostic (S27) and headless (S12).

### 8.1 Stages

| # | Stage | Runs as | Reads | Writes | Notes |
|---|---|---|---|---|---|
| 0 | prepare | code in `next.js` | — | branch, run folder | Git policy, see 8.3 (S23) |
| 1 | spec | subagent | `task.md` | `brief.md` | Given-when-then acceptance criteria. An open business fact is a `business fact:` line |
| 2 | plan | subagent | `brief.md`, `decisions.md` | `plan.md`; answered business facts into `brief.md` | No code. Loads the stack's plan guide |
| 3 | plan-check | subagent | `brief.md`, `plan.md` | both patched, `plan-check.md` | Fresh agent (S26). Checks the brief and the plan together. Loads the stack's plan guide. Writes answers from `decisions` into the brief and the plan. Raises a business fact only when neither the brief nor `decisions` gives it (S63). `next.js` counts the plan's tasks `### T1`…`### Tn`; a plan with no tasks in order runs plan-check again |
| 4 | code | subagent per chunk of `tasks-per-coder` tasks | `brief.md`, `plan.md` | commits, `implementation-log.md`, `code.md` | One commit per task. Loads the stack's code guide |
| 5 | implementation-check | gate runner | — | commits, results | Phase, section 6 |
| 6 | conventions-check | gate runner | — | commits, results | Phase, section 6 |
| 7 | finish | gate runner | — | commits, results | Phase, section 6 |

`brief.md`, `plan.md` and the review notes are in the notes folder. The workflow declares the config key `tasks-per-coder` (default 2).

After the spec, `next.js` reads the brief. Each `business fact:` line stops the run with `decide` until `decisions.md` has a `## business-facts` section (S63).

A guide is on when the stack plugin declares it, unless `disable` lists it (S53, S40).

The workflow's own gates, in phase 1:

| Gate | Phase | Kind | Job |
|---|---|---|---|
| `logic-review` | `implementation-check` | agent | Correctness and the mapping from acceptance criteria to tests (S25). Reads `brief.md` as the answer key |

A generic bug hunter and a generic architecture reviewer are candidates for later.

### 8.2 Results

Every stage and every gate writes a result file in the run folder. `next.js` and the gate runner
read only these files.

```json
{
  "stage": "logic-review",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 3, "evaluate": 1, "noise": 2 },
  "evaluate": ["PriceCalculator.java:9 — a null amount now throws"],
  "files": ["logic-review.md"]
}
```

`status` is `ok`, `decide`, `failed` or `skipped`. `decide` lists each question as one line with
its options. `evaluate` lists each Evaluate finding as one line with `file:line` (S57).

### 8.3 Git policy (`prepare`)

This step is code in `next.js`, not prose (S17, S23).

1. If the working tree is dirty, stop with `failed` and say why.
2. Read the default branch from `origin/HEAD`. Check it out and run `git pull --rebase`.
3. Create `task/<slug>`. The slug comes from the task text.
4. Record the base commit (the HEAD before any work) in `tmp/runs/<branch>/run.json`, and write the task to `docs/runs/<branch>/task.md`.

Stages make one commit per plan task. Each gate's fixes are their own commit. The workflow never
pushes and never opens a PR.

### 8.4 Triage

Judgement stages (plan-check) and every agent gate put each finding into one bucket. The bucket
sets the action. The full contract (the five axes, the bucket rules, the Decide test, the finding
format, the notes format) is one skill, `orchestra:triage`, ported in full from be-coding-agent's
`triage.md` (S64). Every judging skill invokes it. This table is the short form:

| Bucket | Action |
|---|---|
| Decide | Stop for a human. Needs a real fork and a choice the agent cannot make. |
| Patch | Fix it now, in place, and commit (S14). |
| Evaluate | Do not fix. Record it in the report for a human. |
| Noise | Drop it. |

When a stage or a phase returns `decide`, `next.js` returns `decide`. The run writes `report.md`
and stops. The human writes the answers in `decisions.md` in the notes folder. On resume, the stage
or gate that raised the question runs again and reads `decisions.md`. Among the stages only plan-check returns `decide`; `next.js` itself stops after the spec on open business facts (S63). An answer is always a new section.

### 8.5 `report.md`

orchestra writes it (S55). Steps are in run order. An empty phase shows "ok (no gates)" (S57). Status, plugin versions, commits made, assumptions made, counts per bucket per stage and gate, Evaluate findings
(including tool violations left after the last round), skipped gates and why, skipped phases, the contents of
`decisions.md`, and the open Decide questions if any.

## 9. The Stack Skills contract

| Part | Required | Meaning |
|---|---|---|
| `build` | yes | The full build and tests, with coverage. Its fix guide and round limit (6.3). |
| `gates` | no | The stack's gates (6.1). |
| `guides.plan` | no | Short rules for the planner and the plan checker, 5–15 per area (R3). |
| `guides.code` | no | Short rules for the coder, 5–15 per area (R3). |
| `manifest` skill | yes | Resolution (5.2). |

The stack plugin declares what and where. It never declares an order or a loop. Every gate skill
can also be invoked by hand on any branch. Each finding cites `file:line` and the rule it breaks
(R3).

## 10. `orc-java-stack` in phase 1

It keeps the one-concern-per-skill shape of the current java-stack (pillar 2).

| Part | Built from |
|---|---|
| `build` | The current `java-maven` rules: the wrapper, `-B`, the settings file, output to a log file, run once. Plus JaCoCo coverage |
| `guides` | A short core drawn from the gate skills |
| Fix guides | `fix-build`, and one per tool gate |

Candidate gates, one skill each:

| Phase | Candidates |
|---|---|
| `implementation-check` | structure (layering and naming, from `java-architecture` and `java-style`, S25), ops |
| `conventions-check` | testing conventions, entities, DTOs, converters |
| `finish` | comments, logging, Spotless (tool, `fix: self`) |

crap4java and mutate4java come in phase 2 as tool gates in `implementation-check`. They are data
only and need no change in the workflow. The final list is decided in the build plan.

## 11. Packaging

Pillar 4 applies from the first commit (S33):

- `SKILL.md` frontmatter has only `name` and `description`.
- Skill text names actions ("dispatch a subagent", "invoke the X skill"), never tool names.
- Each plugin has a portable `plugin.json` and a `.claude-plugin/plugin.json`. The repo has two
  catalogs, `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`. A small
  script generates the manifests. The versions move together.
- A project that uses this system has `AGENTS.md` and no `CLAUDE.md` (S8).

## 12. Repo layout

```
plugins/
  orchestra/
    skills/{init,run,fixer,triage,select,writing-workflows,writing-stack-skills}/SKILL.md
    bin/{check.js,gates.js}
    schemas/{workflow.json,stack-skills.json}
  orc-standard-workflow/
    orchestra.json
    skills/{manifest,spec,plan,plan-check,code,logic-review}/SKILL.md
    bin/next.js
  orc-java-stack/
    orchestra.json
    skills/{manifest,plan-guide,code-guide,fix-build,<one per gate>,<one fix guide per tool gate>}/SKILL.md
scripts/gen-manifests.js
.claude-plugin/marketplace.json
.agents/plugins/marketplace.json
```

## 13. Done criteria

Phase 1 is done when all five pass (S34):

1. A small sample Java repo exists, with one real task.
2. `orchestra:init`, then one run end to end on Claude Code: a task branch with commits, a green
   final build, and `report.md`.
3. The same run on Codex. This run also tests that the `manifest` skill finds its folder on Codex.
4. One run stops on `decide`, gets an answer in `decisions.md`, and resumes to `done`.
5. `orchestra check` passes on `orc-standard-workflow` and `orc-java-stack`.

## 14. Out of scope

The Curator, the PSK and PSK-over-Stack-Skills precedence (O6), General Knowledge (O7), adapters for
external frameworks (O8), the crap4java and mutate4java gates, model per stage, push and PR,
parallel gates, more than one stack per project.

## 15. Open points for the build plan

- The exact action JSON of the protocol (`dispatch`, `phase`, `done`, `decide`, `failed`) and the
  `--dry-run` output.
- When run files are committed: with each stage, or once at the end and on every stop.
- The final `orc-java-stack` gate list.
- The sample Java repo and its task.
