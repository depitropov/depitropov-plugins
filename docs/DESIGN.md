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

All plugins live in this repo (S30).

| Plugin | Role | Holds |
|---|---|---|
| `orchestra` | Orchestrator | `orchestra:init`, `orchestra:project`, `orchestra:run` (resolution and driver), the gate runner, the fixer, the select step, `orchestra check`, the authoring skill `writing-plugins`, the contract files `contract/dispatch.md`, `judging.md` and `agent-gate.md` (S90, S92), the engine module `lib/workflow.js` that `next.js` loads (S91) |
| `orc-standard-workflow` | Workflow | `next.js`, one skill per step, the format files `formats/spec.md` and `formats/plan.md` (S92), its own gates, its `manifest` skill |
| `orc-java-stack` | Stack Skills | `build`, its gates, fix guides, its code guide as a file, `references/stack-reference.md` (S93), its `manifest` skill |
| `orc-ts-stack` | Stack Skills | build, its fix guide, its manifest skill |
| `orc-core` | Core | The gates every workflow gets, such as `clean-code`, the shared roles (S87), the skill `triage` (the sorting method only, S90) and its `manifest` skill (S80). The slot is optional |
| `clean-code` | Standalone, and a dependency of `orc-core` | Based on mentorano's clean-code (S75). The only copy of `measure.py`, of the clean-code rules (`skills/clean-code/rules.md`), of how to measure (`skills/clean-code/measurement.md`) and of the rules skills for Python, TypeScript and Java. The clean-code gate reads them by path, and fails when the plugin is not installed (S85, S92). Not a slot plugin |
| `orc-curator` | Curator | `curate` (takes a diff, a map or a change in words), `setup` (records the present), the `spec`, `plan` and `code` guides as files in `guides/`, the procedures `direction`, `backlog` and `landing`, its templates and references, its `manifest` skill. It depends on `mattpocock-skills` (S79) |

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
         runs orchestra check on the config and resolved.json (inside resolve.js)
         driver loop:
           node <workflow>/next.js --orchestra <orchestra dir>
                                                  → prints the next action as JSON, with the report sections
             "dispatch"  → start a subagent that loads the named skill
             "phase"     → run the gate runner for that phase (section 6)
                             node <orchestra>/gates.js --phase <name> → prints its own actions
                             until it returns ok | decide | failed
             "done" | "decide" | "failed" → write report.md, return the status
```

`next.js` decides every workflow step from files on disk (S5, S10). It loads the engine module
`lib/workflow.js` from the folder that `--orchestra` names: the build with the project's override,
the workflow's config values, the reading of result files and the rule for a new answer (S91). The gate runner decides every
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
    "disable": ["guides/code.md"],
    "gates": { "crap": { "max_rounds": 5 } }
  }
}
```

| Key | Defined by | Meaning |
|---|---|---|
| `<slot>.plugin` | orchestra | The plugin that fills the slot. |
| `<slot>.disable` | orchestra | Gates the project turns off by name, or a guide by its path. Empty or missing = all on (S40). |
| `<slot>.gates.<name>.max_rounds` | orchestra | Overrides the round limit of one gate. |
| `<slot>.gates.<name>.<key>` | orchestra | Overrides one key of one gate of that slot: `max_rounds`, `run`, `files`, `grep`, `when` or `always` (S86). |
| `stack-skills.build.<key>` | orchestra | Overrides one key of the build: `run`, `guide` or `max_rounds` (S86). |

S79 changed a guide's entry from its name to its path. An old config with `"disable": ["code-guide"]`
fails `orchestra check`, and the fix names the new path (`guides/code.md`).

Every other key comes from the declaration of the plugin in that slot. A stack plugin can declare
a key for a project convention, for example the pattern that marks an entity, and the project sets
it here (S39). The config may grow large. `orchestra check` keeps it safe.

### 4.2 The plugin declaration

Each plugin that fills a slot ships `orchestra.json` at its root (S39). It is data. orchestra reads
it and acts on it. The plugin never runs its own gates or orders them.

```json
{
  "slot": "stack-skills",
  "config": {
    "entity-pattern": { "type": "string", "default": "@Entity|@Embeddable|@MappedSuperclass" }
  },
  "build": {
    "run": "./mvnw -B -s .mvn/settings.xml verify",
    "guide": "fix-build",
    "max_rounds": 3
  },
  "guides": {
    "plan": "guides/plan.md",
    "code": "guides/code.md"
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

A Stack Skills declaration has no `measure` since S85: the clean-code gate measures with the `clean-code` plugin. `guides` maps a stage (`spec`, `plan` or `code`) to a file path inside the plugin (S76, S79).

A workflow's `orchestra.json` has `slot: workflow`, its `config` keys, its `stages` (`spec`, `plan`, `code`) and its own `gates` in the same format. It has no `build` and
no `guides`.

`{plugin}` is the plugin's folder and `{config.<key>}` is a config value. Both come from
`resolved.json`. Skill names in the declaration are names inside the same plugin. Every `config`
key has a `type` (`string`, `number` or `boolean`) and a `default` of that type (S70).

### 4.3 The Project Customization

The Project Customization is what one project changes in its run (S86). It has three verbs.

| Verb | Where | What |
|---|---|---|
| Override | `.orchestra/config.json` | A key of the build or of a slot plugin's gate (4.1). A gate keeps its `phase`, `kind`, `fix`, `skill` and `guide`; to change those, the project disables the gate and adds its own. |
| Amend | `.orchestra/project/orchestra.json` | Project gates, in the format of 6.1. |
| Guide | `.orchestra/project/orchestra.json` | Project guides by stage or shared role, as `guides` in 4.2. |

```json
{
  "slot": "project",
  "guides": { "code": "guides/code.md" },
  "gates": [
    { "name": "money", "phase": "conventions-check", "kind": "agent", "skill": "check-money",
      "files": "**/*.java", "grep": "BigDecimal" },
    { "name": "archunit", "phase": "implementation-check", "kind": "tool",
      "run": "./mvnw -B -q test -Dtest=ArchitectureTest", "fix": "fixer", "guide": "fix-archunit" }
  ]
}
```

The project files:

```
.orchestra/config.json              overrides (4.1)
.orchestra/project/orchestra.json   slot "project": gates and guides only
.orchestra/project/guides/<name>.md project guides (a stage or a shared role)
.agents/skills/<name>/SKILL.md      project skills: agent gates and fix guides
.gitignore                          adds !.orchestra/project/
```

Rules:
- The folder is the slot. When `.orchestra/project/orchestra.json` exists, `resolve.js` adds the slot
  `project` to `resolved.json`. It has no plugin, no `manifest` skill, no config section, no
  `config`, no `build` and no `stages`.
- A project skill is a normal `SKILL.md` in `.agents/skills/<name>/`. orchestra gives it by path,
  never by name: the prompt says to read `<run root>/.agents/skills/<name>/SKILL.md` and follow it.
  Guides already work this way (S76, S79). The skill then works the same on every harness and comes
  from the run's worktree. A person can still invoke it by hand where the harness finds it.
- `{plugin}` in a project gate's `run` is `.orchestra/project/` in the run root.
- A project gate name must differ from every gate name of the other slots. A project never shadows a
  gate by name; it overrides a key or disables the gate.
- Project gates run last in each step of a phase (6.2). Project guides come last for their stage,
  after the Curator's and the Stack Skills' guides, so the most specific rule comes last.
- A project cannot change the stage order, the phases, the place of the build or the triage contract.
  That needs another workflow plugin.

## 5. `orchestra`

### 5.1 `orchestra:init`

1. Finds the plugins from the `<plugin>:manifest` skills in its skill list. It asks the user when
   it finds none (S70).
2. Asks which plugin fills each slot. The `curator` and `core` slots are optional (S76, S80, S87).
3. Writes `.orchestra/config.json` with only `plugin` per section, and adds the three `.gitignore`
   lines.
4. Runs `resolve.js`, which resolves the plugins and runs `orchestra check --project`. Shows the
   result. It commits nothing.

It is the only interactive skill in phase 1.

### 5.1a `orchestra:project`

The skill that writes the Project Customization (4.3, S86). It runs after `orchestra:init`, and again
whenever the project wants a change. `orchestra:init` ends with one line that points to it.

1. Reads the config and resolves the slots, as `orchestra:run` does.
2. Shows what the run does now: the build, the gates per phase with their declarer, and the guides
   per stage.
3. Asks what is different in this project: the build, gate keys to override, gates to turn off,
   project gates to add, and project rules per stage and per shared role.
4. Writes the overrides into `.orchestra/config.json`, and the declaration, guides and project
   skills into `.orchestra/project/` and `.agents/skills/`. Adds `!.orchestra/project/` to
   `.gitignore`.
5. Runs `resolve.js`, which runs `orchestra check --project`. It commits nothing.

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
3. Runs `orchestra check` on the config against `resolved.json`, inside `resolve.js` (S70).
4. Runs the **driver loop** (section 3). The driver loop and the action protocol belong to orchestra,
   not to each workflow (S52). The driver loop also prints `inline` for the Curator's `curate` when
   the workflow is done. `orchestra:run` carries out an `inline` action in the main session (S76).
   Setup never runs inside a run (S77): when the Curator's `done` file is missing on
   `origin/<default>`, the start creates no branch and returns `setup`. The user sets up on the
   default branch, on its own branch `curator/setup` (`drive.js --setup`, an `inline` action), or
   goes on without it (`--skip-setup`; curate is then skipped).
5. Shows the status and the report path.

Arguments that the workflow declares are forwarded unread (S41). `orchestra:run --help` lists
them from the declaration. An argument that is not declared gets a warning and is still forwarded.

A stopped run resumes when the user calls `orchestra:run` again on the same task branch (S32). It
passes no task then. `next.js` and the gate runner find their state in the run folder. On a resume,
`drive.js --resume` stops when files outside `docs/runs` changed since the run stopped, and commits
nothing (S63).

### 5.3 `orchestra check`

A Node command, standard library only (S11, S28, S70). It is the guarantee for every contract
below. `bin/check.js <plugin-folder>…` runs every rule. `bin/check.js --project <dir>` runs the
config rules and the declaration rules of each resolved plugin. The rules are plain code in
`lib/check.js`; there are no schema files. It lists every failure as
`<where>: <problem>. Fix: <fix>.`, then exits non-zero. A project's `.gitignore` has `.orchestra/*`, `!.orchestra/config.json` and `tmp/`.

| Target | Rules |
|---|---|
| Config | Every slot has a section, and every section's plugin is in `resolved.json`. Every other key is declared by that plugin, with the right type. Every name in `disable` and `gates` exists. |
| Project | Only `slot`, `gates`, `guides` and `shared-roles`. Every guide file exists. Every project skill exists as `.agents/skills/<name>/SKILL.md` with only `name` and `description` in its frontmatter. No gate name repeats a gate of another slot. Every guide is keyed by a stage the workflow declared or by a shared role. Every override key in the config is one of 4.1 (S86). |
| Declaration | Only the keys of its slot; the gate keys and values of 6.1; every `{config.<key>}` declared; every config key typed with a default. `slot` matches the slot it is used in. Every skill it names exists in the plugin. Every `phase` is one of the three standard phases. |
| Workflow plugin | Has `next.js` and a `manifest` skill. The dry run: `next.js` with a task, in a throwaway git repo with a bare remote, prints a valid action that is not `failed`. |
| Stack Skills plugin | Has a `build` with `run` and `guide`, and a `manifest` skill. Every tool gate with `fix: fixer` names a `guide`. |
| Gate skill | The skill of every `agent` gate has only the sections `## Scope`, `## Steps`, `## Rules` and `## Fixing`. `## Scope` is required, and `## Steps` or `## Rules`. The procedure is orchestra's contract files (S90). |
| Every plugin | Pillar 4 greps: `SKILL.md` frontmatter has only `name` and `description`; no harness-specific words in shipped files; every manifest parses as JSON; the versions in both manifests match (S33). |

It has two uses. An author runs it on a plugin folder. `resolve.js` runs the `--project` rules at
the start of each run and in init.

### 5.4 Authoring skills

`orchestra:writing-plugins` is a short reference card: the words, each with one meaning (S89), the slots, the `manifest` skill, the
declaration and gate keys, the phases, the shape of a gate skill (S90), the `next.js` actions. It ends with "run `orchestra check` on
the plugin". The skill is the guide. The check is the guarantee. A test fails when a word of the key
lists in `check.js` is missing from the skill (S70).

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

An agent gate always fixes its own Fix findings, in one round, and never re-reviews its own fixes
(S14, S90). A tool gate passes or fails by its exit code.

orchestra gives every agent gate three contract files: `contract/dispatch.md` (the rules of every
dispatch), `contract/judging.md` (the buckets, the Decide stop, the notes and the result) and
`contract/agent-gate.md` (how to read the change, fix and commit). The gate skill holds only its
scope, its steps or rules, and its own fix limits (S90).

### 6.2 The phases

orchestra defines the three phases (S45). They are the same for every workflow. A workflow decides
when each one runs. A workflow that never runs a phase skips its gates, and `report.md` records the
skip (S27).

| Phase | Question | Order inside the phase |
|---|---|---|
| `implementation-check` | Is the code correct and sound? Architecture, clean code, CRAP, mutation, bugs, acceptance criteria. | **build** → tool gates → agent gates |
| `conventions-check` | Does it follow our conventions? DTOs, entities, converters. | tool gates → agent gates |
| `finish` | Is the final state clean and green? Comments, logging, formatting. | agent gates → tool gates → **build** |

Inside each step: workflow gates, then core gates, then stack gates (S80), then project gates (S86), then the order of declaration.

Nothing runs after `finish`. A finish gate must not change behaviour. The final build is the proof.
A red build in `finish` ends the run with `failed`.

### 6.3 Build

`build` is not a gate (S48). It is a required top-level declaration of the Stack Skills plugin. It
runs the full build and the tests once, the way the stack does it, and it produces the coverage
data that tools like crap4java read. The gate runner calls it at the start of
`implementation-check` and at the end of `finish`. No gate list can remove or move it. The runner
records the commit of its last green build, and skips a build when `HEAD` is that commit and the
tree is clean (S57). The code
stage uses the same command for its own test runs. The project can override it in the config (4.3, S86).

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
   the project can override it (4.1). Violations left after the last round give the gate the status `report`,
   and they go to the Report section of `report.md` (S90). The run goes on.

`fix: self` means the tool fixes by itself (a formatter). The runner commits its changes.
`fix: none` means report only.

### 6.6 Results, stops and resume

Every gate writes `<phase>.<gate>.result.json` (format in 8.2). The runner writes a checkpoint
after each gate, so a stopped run resumes at the next gate. A gate that has finished never runs
again (S46). A stopped run keeps its worktree; a call without a task finds it with `git worktree list` (S74).

The runner returns one phase result to `next.js`: `ok`, `decide` or `failed`.

An agent gate that has a Decide finding writes its findings and stops **before** it fixes. The
runner returns `decide`, and the run stops. The `decide` action names who asks in the key `step` (S89). An answer
is a section `## <gate name>` in `decisions.md`. The first read of a `decide` result records in that
result file how many answers exist (`seen`); only a later section is new (S91). On resume the runner starts that gate again only when a new section for it exists.
The gate reads `decisions.md` and then fixes. So a gate never re-reviews its own fixes (S55).
Every agent gate gets `decisions` once the file exists; only a new section for that gate restarts
it (S66).

## 7. The workflow contract

| Part | Rule |
|---|---|
| Entry | None of its own. `orchestra:run` runs its `next.js` through the driver loop (S51, S52). |
| Declaration | `orchestra.json` with `slot: workflow`, its config keys, its `stages` and its own gates. |
| Resolution | A `manifest` skill (5.2). |
| Order | `next.js` in Node, standard library only (S10, S11). It prints actions of the orchestra protocol, including `phase`. orchestra calls it with `--orchestra <engine dir>`, and it loads `lib/workflow.js` from there. Every action carries `sections` (Assumptions, Deviations, Integration points), which orchestra writes into the report (S91). |
| Contract files | Every dispatch reads `contract/dispatch.md`. A dispatch with `judging: true` also reads `contract/judging.md`. An agent gate also reads `contract/agent-gate.md` (S90, S92). |
| Output | One status, `done`, `decide` or `failed`. orchestra writes `report.md` into the notes folder from the result files in the run folder, so no workflow repeats that logic (S55). |
| State | Two folders, both derived from the branch, never passed (S15, S22). The **run folder** `tmp/runs/<branch>/` holds everything the orchestration uses: results, checkpoints, logs, `run.json`, `stages.json` (the order of the stage dispatches, for the report). Git ignores it. The **notes folder** `docs/runs/<branch>/` holds what a human reads: `task.md`, `spec.md`, `plan.md`, `decisions.md`, review notes (`plan-check.md`, `code.md`, `implementation-log.md`, `logic-review.md`) and `report.md`. It is committed and goes to the default branch with the PR (S54, S58). The workflow writes `run.json` with `base`, `branch`, `spec` (`<notes>/spec.md`, the file that holds the acceptance criteria, S89) and `docs` (the notes folder). The gate runner reads it (S55). A resume works on the same machine only, because the run folder is not committed. Both folders are inside the run's worktree (S74). At `done`, before the worktree is removed, orchestra copies the run folder to `tmp/runs/<branch>/` in the checkout, so the logs stay for local debugging. |
| Worktree | orchestra starts every run in `.orchestra/worktrees/<branch>`, detached at the base. The workflow creates its branch there and never checks out, pulls or switches (S74). |
| Mode | Headless or interactive is fixed by the workflow's author when the workflow is built. It is not a runtime setting (S12). |
| Stages | `stages` in `orchestra.json`; a dispatched step carries the tag `stage` (S89). orchestra adds the guides of that stage to the prompt, in the order Curator, Stack Skills, project, and fails a stage the workflow did not declare (S76, S86, S87). |

## 8. `orc-standard-workflow`

The rewrite of be-coding-agent (S19). It is stack-agnostic (S27) and headless (S12).

### 8.1 Stages

| # | Stage | Runs as | Reads | Writes | Notes |
|---|---|---|---|---|---|
| 0 | prepare | code in `next.js` | — | branch, run folder | Git policy, see 8.3 (S23) |
| 1 | spec | subagent | `task.md` | `spec.md` | Given-when-then acceptance criteria. An open business fact is a `business fact:` line. Stage `spec` |
| 2 | plan | subagent | `spec.md`, `decisions.md` | `plan.md`; answered business facts into `spec.md` | No code. Stage `plan`: gets the plan guides |
| 3 | plan-check | subagent | `spec.md`, `plan.md` | both fixed, `plan-check.md` | Fresh agent (S26). Checks the spec and the plan together. Stage `plan`: gets the plan guides. Writes answers from `decisions` into the spec and the plan. Raises a business fact only when neither the spec nor `decisions` gives it (S63). `next.js` counts the plan's tasks `### T1`…`### Tn`; a plan with no tasks in order runs plan-check again |
| 4 | code | subagent per chunk of `tasks-per-coder` tasks | `spec.md`, `plan.md` | commits, `implementation-log.md`, `code.md` | One commit per task. Stage `code`: gets the code guides |
| 5 | implementation-check | gate runner | — | commits, results | Phase, section 6 |
| 6 | conventions-check | gate runner | — | commits, results | Phase, section 6 |
| 7 | finish | gate runner | — | commits, results | Phase, section 6 |

`spec.md`, `plan.md` and the review notes are in the notes folder. The workflow declares the config key `tasks-per-coder` (default 2).

A dispatched unit is a step. `stage` is only its tag `spec`, `plan` or `code` (S89). Each step that
writes or checks the spec or the plan gets the inputs `spec-format` and `plan-format`: the files in
`formats/` hold the template and the rules of each document (S92).

After the spec step, `next.js` reads the spec. Each `business fact:` line stops the run with `decide` until `decisions.md` has a `## business-facts` section (S63).

A guide is on when a slot plugin declares it for the stage, unless `disable` lists it (S53, S40, S76).

The workflow's own gates, in phase 1:

| Gate | Phase | Kind | Job |
|---|---|---|---|
| `plan-conformance` | `implementation-check` | agent | Every plan task done, every named test present, no undeclared change of direction, nothing outside the spec's scope; detail inside a task is not a deviation (S67). Reads the plan and the implementation log. No correctness verdict (S66) |
| `logic-review` | `implementation-check` | agent | Correctness, and a test for every criterion and behavioural assumption that fails on a wrong version (S25, S66). Reads the spec and `decisions` only, never the plan |

The `orc-core` plugin declares `clean-code`, not the workflow (S80, S87):

| Gate | Phase | Kind | Job |
|---|---|---|---|
| `clean-code` | `implementation-check` | agent | The shape of the changed code (`measure.py` of the `clean-code` plugin), the clean-code rules 1–13 (`rules.md`) and the language rules of `clean-code`. It reads `rules.md` and `measurement.md` of the `clean-code` plugin by path, measures with `--at HEAD`, and fails when `clean-code` is not installed (S75, S85, S92) |

A generic bug hunter is a candidate for later.

#### Shared roles (S87)

A shared role is a company rule that orchestra passes to every dispatch and inline action. The fixed list: `triage`, `writing-style`, `pr-review`, `pr-description`.

- Only the `core` slot and the project declare `shared-roles`, as `{ "<role>": "<skill>" }`. `orc-core` fills `triage` with its own skill. A workflow or a Stack Skills plugin that declares `shared-roles` fails the check.
- Every dispatch and inline action gets the input `shared-role.<role>`: a `<plugin>:<skill>`, or `.agents/skills/<name>/SKILL.md` for a project skill. When a project guide exists (`guides.<role>` in the project), it also gets `shared-role.<role>.guide`.
- The project overrides a shared role by declaring a skill for it. It amends one with a guide, which the stage reads after the skill.
- A judging step sorts with `shared-role.triage` when it is given; otherwise the bucket lines of `contract/judging.md` are the rule (S90).

### 8.2 Results

Every stage and every gate writes a result file in the run folder. `next.js` and the gate runner
read only these files.

```json
{
  "status": "ok",
  "decide": [],
  "fix": ["PriceCalculator.java:12 — rounds with HALF_EVEN"],
  "report": ["PriceCalculator.java:9 — a null amount now throws"],
  "noise": [],
  "notes": "<notes>/logic-review.md"
}
```

`status` is `ok`, `decide`, `failed` or `skipped`; a red tool gate gets `report`. `decide` lists each
question as one line with its options. `fix`, `report` and `noise` list one line per finding, with
`file:line` when it has one (S57). `contract/judging.md` defines the format (S90). There is no
`counts`: the report counts the lines.

### 8.3 Git policy (`prepare`)

This step is code in `next.js`, not prose (S17, S23).

1. orchestra has already created the run's worktree, detached at `origin/<default>` (S74).
2. Create `task/<slug>` from HEAD. The slug comes from the task text. Never check out, pull or switch.
3. Record the base commit (the HEAD before any work) in `tmp/runs/<branch>/run.json`, and write the task to `docs/runs/<branch>/task.md`.

Stages make one commit per plan task. Each gate's fixes are their own commit. The workflow never
pushes and never opens a PR.

### 8.4 Triage

Judging steps (plan-check) and every agent gate put each finding into one bucket. The bucket sets
the action. orchestra owns the buckets, the Decide stop, the notes format and the result, in
`contract/judging.md` (S90). The optional skill `orc-core:triage` is the sorting method only: the
five axes, the bucket rules, the Decide test and the finding format, ported from be-coding-agent's
`triage.md` (S64, S87). A judging step uses it when `shared-role.triage` is given; otherwise the
bucket lines of `judging.md` are the rule. This table is the short form:

| Bucket | Action |
|---|---|
| Decide | Stop for a human. Needs a real fork and a choice the agent cannot make. |
| Fix | Fix it now, in place, and commit (S14, S90). |
| Report | Do not fix. Record it in the report for a human (S90). |
| Noise | Drop it. |

When a step or a phase returns `decide`, `next.js` returns `decide`. The run writes `report.md`
and stops. The human writes the answers in `decisions.md` in the notes folder. On resume, the step
or gate that raised the question runs again and reads `decisions.md`. Among the steps only plan-check returns `decide`; `next.js` itself stops after the spec on open business facts (S63). An answer is always a new section.

### 8.5 `report.md`

orchestra writes it (S55). Steps are in run order. An empty phase shows "ok (no gates)" (S57). Status, plugin versions, commits made, the number of findings per bucket per step and gate, the workflow's `sections` (Assumptions, Deviations, Integration points, S91), Report findings
(including tool violations left after the last round), skipped gates and why, skipped phases, the contents of
`decisions.md`, and the open Decide questions if any.

## 9. The Stack Skills contract

| Part | Required | Meaning |
|---|---|---|
| `build` | yes | The full build and tests, with coverage. Its fix guide and round limit (6.3). |
| `gates` | no | The stack's gates (6.1). |
| `guides` | no | `{ "<stage>": "<path>" }`, a file in the plugin, for example `guides/code.md`: short rules for the stage it is keyed by, 5–15 per area (R3, S76, S79). A guide says what it needs in its own words, never the workflow's words; the workflow's skill knows how to write it (S92). A guide holds no short forms of gate rules (S7, S68). |
| `references/stack-reference.md` | no | One file that a gate with a `references/` folder reads first. It says which `references/<stack>.md` of the gate to read (S92, S93). |
| `manifest` skill | yes | Resolution (5.2). |

The stack plugin declares what and where. It never declares an order or a loop. Every gate skill
can also be invoked by hand on any branch. Each finding cites `file:line` and the rule it breaks
(R3).

## 9a. The Curator contract

| Part | Required | Meaning |
|---|---|---|
| `curate` | yes | The skill that updates the direction docs when the workflow is done. Runs inline in the main session; inputs `base`, `spec`, `notes` (S89); it commits its edits. |
| `setup` | yes | `{ skill, done }`. A run start with no `done` file on the default branch offers the skill, apart from the run: by hand on the default branch, or inline on its own branch (S77). It writes `done` last. |
| `guides` | no | As for Stack Skills; listed before the Stack Skills guides. |
| `manifest` skill | yes | Resolution (5.2). |

`orc-curator` fills the slot. Its docs live in `docs/curator/`; its glossary is `GLOSSARY.md` at the repo root. Its `setup` records the present (the product and the tech as they stand, one commit) and leaves `BACKLOG.md` and `DIRECTION.md` empty; it then nudges to `/wayfinder`. `curate` is the one organizer, with three inputs: a diff (a finished run), a map (a landing) and a change in words; it commits once. The procedures `direction` (the sweep of Now and Next), `backlog` (changes to the arrangement) and `landing` (a map into the docs) are files that `curate` follows, not skills. Its guides are files in `guides/`, declared by path. Navigation (exploring, researching, deciding) is done with `/wayfinder` from `mattpocock-skills`, never by the Curator (S79). `orc-curator` declares that plugin in `dependencies` in its `plugin.json`, and the root `marketplace.json` lists `claude-plugins-official` in `allowCrossMarketplaceDependenciesOn`.

The `curator` section of the config is optional. The design of the Curator plugin itself is in
`docs/superpowers/specs/2026-10-16-curator-design.md` (S76).

## 10. `orc-java-stack` in phase 1

It keeps the one-concern-per-skill shape of the current java-stack (pillar 2).

| Part | Built from |
|---|---|
| `build` | The current `java-maven` rules: the wrapper, `-B`, the settings file, output to a log file, run once. Plus JaCoCo coverage |
| `guides` | `guides/code.md` only: test-command facts (S68, S79). No plan guide. |
| Fix guides | `fix-build`, and one per tool gate |

Gates, one skill each (S68):

| Phase | Gates |
|---|---|
| `implementation-check` | persistence (migrations, locking DDL, transactions), general (exceptions, argument checks, money) (S93) |
| `conventions-check` | testing (test style) |
| `finish` | comments, logging, layout (agents); Spotless (tool, skipped when the pom has no plugin) |

Every project is Quarkus. `references/stack-reference.md` says so, with no stack detection, and a
gate with a `references/quarkus.md` always reads it (S93). There is no security gate: its tenancy
rules are not generic (S93).

crap4java and mutate4java come in phase 2 as tool gates in `implementation-check`. They are data
only and need no change in the workflow.

### 10.1 `orc-ts-stack`

Empty at the start (S75): `build` is `npm ci && npm test` with the fix guide `fix-build`; no gates,
no guides. In a project with `pnpm-lock.yaml`, the build is `pnpm install --frozen-lockfile &&
pnpm test` (S94). The measure and the TypeScript rules moved to the `clean-code` plugin (S85). The measure
needs Python 3.11 or later and the project's own `typescript@5`.

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
    skills/{init,project,run,fixer,select,writing-plugins}/SKILL.md
    bin/{check.js,resolve.js,drive.js}
    lib/{check.js,resolved.js,gates.js,runner.js,protocol.js,report.js,git.js,workflow.js}
    contract/{dispatch.md,judging.md,agent-gate.md}
  orc-standard-workflow/
    orchestra.json
    skills/{manifest,spec,plan,plan-check,plan-conformance,code,logic-review}/SKILL.md
    formats/{spec.md,plan.md}
    bin/next.js
  orc-core/
    orchestra.json            (plugin.json: dependencies clean-code)
    skills/{manifest,clean-code,triage}/SKILL.md
  orc-java-stack/
    orchestra.json
    guides/code.md
    references/stack-reference.md
    skills/{manifest,fix-build,<one per gate>,<one fix guide per tool gate>}/SKILL.md
  orc-ts-stack/
    orchestra.json
    skills/{manifest,fix-build}/SKILL.md
  clean-code/            the measure and the clean-code rules; standalone, and used by orc-core (S85)
    skills/clean-code/{SKILL.md,rules.md,measurement.md,measure.py,measure-ts.mjs,measure-java.java,…}
    skills/{manifest,clean-code-python,clean-code-typescript,clean-code-java,…}/SKILL.md
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
   Paused with plan 5 (S71).
4. One run stops on `decide`, gets an answer in `decisions.md`, and resumes to `done`.
5. `orchestra check` passes on `orc-standard-workflow` and `orc-java-stack`.

Criteria 1, 2, 4 and 5 pass with version 0.10.0 (S72). Phase 1 is closed (S73); criterion 3 is
now the done test of plan 5.

## 14. Out of scope

The Curator, the Project Customization (S86), General Knowledge (O7), adapters for
external frameworks (O8), the crap4java and mutate4java gates, model per stage, push and PR,
parallel gates, more than one stack per project.

## 15. Open points for the build plan

- The exact action JSON of the protocol (`dispatch`, `phase`, `done`, `decide`, `failed`).
- When run files are committed: with each stage, or once at the end and on every stop.
- The final `orc-java-stack` gate list.
- The sample Java repo and its task.
