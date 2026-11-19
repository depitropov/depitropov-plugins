---
name: writing-plugins
description: Use when writing or changing a plugin that fills an orchestra slot — a workflow plugin, a Stack Skills plugin, a Curator plugin or a core plugin — its orchestra.json, its gates or its next.js.
---

# Writing an orchestra plugin

A plugin fills one slot: `workflow`, `stack-skills`, `curator` or `core`. A project must fill the first two; `curator` and `core` are optional. orchestra reads the plugin's declaration
and runs it. The plugin never runs or orders its own gates. This page is the reference. orchestra
check is the guarantee: run it when you finish (last section).

A `core` plugin holds rules that every workflow gets. Its gates read only the inputs every workflow gives (`spec`, `base`, `notes`, `decisions`, and its plugin's `config` values), never a workflow's own files such as its plan; a gate that reads them belongs in the workflow. Its `shared-roles` maps each shared role it fills to one of its skills (see "Shared roles"). A gate may use another plugin through that plugin's skills when its `plugin.json` lists it under `dependencies`: it invokes the other plugin's `manifest` skill to find its folder. orchestra does not resolve it. `orc-core` uses `clean-code` this way.

`<orchestra>` is the folder two levels above this skill's folder.

## Words

Each word has one meaning in orchestra and in its plugins.

- **slot**: a section of `.orchestra/config.json` that names one plugin: `workflow`, `stack-skills`, `core` or `curator`. A project fills a fifth slot, `project`, with `.orchestra/project/`.
- **stage**: the tag `spec`, `plan` or `code` on a dispatch. orchestra gives the dispatch the guides of that stage.
- **step**: one unit that a workflow dispatches, with its own result file. A step can have a stage tag.
- **gate**: one check in a phase: a `tool` command or an `agent` skill.
- **phase**: `implementation-check`, `conventions-check` or `finish`. orchestra runs the gates of a phase.
- **guide**: short rules that a dispatch reads with its skill: a stage guide (`guides`), the fix guide of a gate (its `guide`), or a project guide keyed by a shared role.
- **shared role**: a skill that the `core` plugin or the project fills for every workflow.
- **spec**: the document with the acceptance criteria, `<notes>/spec.md`. `run.json` names it, and each gate gets it as the input `spec`.
- **run folder**: `tmp/runs/<branch>/`. It holds the state of a run and is git-ignored.
- **notes folder**: `docs/runs/<branch>/`. It holds what a person reads.
- **decisions**: `<notes>/decisions.md`, the answers of a person. For each `decide` stop, the person adds a new section `## <name>`: the name of the step or the gate that asks.

## Every plugin

- `plugin.json` and `.claude-plugin/plugin.json`, with the same `name` and `version`.
- A `manifest` skill. It finds its own folder, goes two folders up, and answers with one line:
  `PLUGIN_DIR=<that folder>`. Copy the one of `orc-standard-workflow`.
- `orchestra.json` at the plugin root.
- Each `SKILL.md` has only `name` and `description` in its frontmatter. Skill text names actions
  ("dispatch a subagent", "invoke the skill"), never a harness's tool names.

## orchestra.json

| Key | Slot | Meaning |
|---|---|---|
| `slot` | all | `workflow`, `stack-skills`, `curator` or `core`. |
| `config` | all | Keys a project may set in its config section. Each is `{ "type": …, "default": … }`, with type `string`, `number` or `boolean`, and a default of that type. Each `agent` gate of the plugin gets every value as the input `config.<key>`. |
| `gates` | `workflow`, `core`, `stack-skills` | The checks after the code. See "A gate". |
| `shared-roles` | `core`, project | Maps each shared role the plugin fills to one of its skills: `{ "triage": "triage" }`. |
| `build` | `stack-skills`, required | `run`: the full build and the tests. `guide`: its fix guide skill. `max_rounds`: fixer rounds, default 2. |
| `guides` | `stack-skills`, `curator` | `{ "<stage>": "<path>" }`: a guide, a path to a guide file inside the plugin (for example `guides/code.md`: no frontmatter, short write-time rules), for one stage. The stages are `spec`, `plan` and `code`. orchestra tells each dispatch with that stage tag to read its guides. A project turns one off with `disable`. |
| `curate` | `curator`, required | The skill that brings the project's direction docs up to date at the end of a run. orchestra runs it in the main session, not in a subagent, when the workflow is done. |
| `setup` | `curator`, required | `skill`: the skill that sets the Curator up in a project; it may interview the user. `done`: a file path relative to the project root. The skill writes this file as its last step. orchestra checks the file on the default branch when a run starts. When it is missing, no task branch is made, and the user chooses to set up first or to go on without it. |
| `stages` | `workflow` | The stages it has, each once: `spec`, `plan`, `code`. orchestra check fails when a slot plugin declares a guide for a stage that is not here. |

In a command, `{plugin}` is the plugin's folder. In a gate's `run` or `grep`, `{config.<key>}` is
a config value; the key must be declared under `config`. The `build` command takes only `{plugin}`.

## A gate

| Key | Meaning |
|---|---|
| `name` | Unique in the plugin. Not `build`. |
| `phase` | `implementation-check` (is the code correct?), `conventions-check` (does it follow our conventions?) or `finish` (is the final state clean? nothing here may change behaviour). |
| `kind` | `tool`: a command; exit code 0 passes. `agent`: a skill run by a subagent. |
| `skill` | An `agent` gate's review skill. It fixes its own Fix findings. |
| `run` | A `tool` gate's command. |
| `fix` | For a `tool` gate: `self` (the tool fixes, orchestra commits), `fixer` (orchestra's fixer, with `guide`) or `none` (report only). |
| `guide` | The fix guide skill for `fix: fixer`. |
| `max_rounds` | Fixer rounds. Default 2. |
| `files` | A glob, or a list of globs, on the changed paths. |
| `grep` | A regular expression on the content of the changed files. |
| `when` | A rule in words, judged on the diff. |
| `always` | `true`: the gate runs on every run. |

A gate needs at least one of `files`, `grep`, `when` or `always`. Inside a phase, orchestra orders by kind, then workflow gates, then core gates, then stack gates;
inside one plugin, gates of the same phase and kind run in the order of the `gates` list. You do not order them across plugins. A gate name is unique across the slots of a project; orchestra check fails on a name two slots declare.

## A gate skill

orchestra gives every `agent` gate three contract files: `contract/dispatch.md` (the rules of every dispatch: commands, commits, the result, permitted actions), `contract/judging.md` (how to sort findings and write the result) and `contract/agent-gate.md` (how to run, fix and commit). The gate skill does not repeat them. It holds only:

- `## Scope`, required: what is in scope, and when to skip. Its last paragraph may turn off "The project's code wins" of `agent-gate.md` for this gate.
- `## Steps`: extra check steps. `## Rules`: numbered rules. It needs at least one of the two.
- `## Fixing`, optional: extra fix limits.
- `references/<name>.md` files that its Steps name, directly or through a file of the plugin. Each file numbers its own rules from 1. A finding cites one as `<gate>:<name>:<n>`, so adding a rule to the skill never changes a reference number.

A rule may name its usual bucket. `orchestra check` fails on any other `##` section.

## A Curator

A Curator keeps a project's direction docs current. orchestra knows only its declaration: `curate`,
`setup` and `guides`. Both skills run in the main session, so they may ask the user questions.

- `setup` never runs inside a feature run. When a run starts and the `done` file is missing on the
  default branch, orchestra makes no task branch and the user chooses: set up on the default branch
  (the skill runs by hand, with no inputs), set up on its own branch `curator/setup` (an `inline`
  action with the input `done`), or go on without setup. The skill commits its files and writes
  `done` last, so a setup that stops half-way runs again.
- `curate` is skipped when the `done` file is missing in the run, and the report says so.
- `curate` runs when the workflow is done, before the report. Its inputs are `base`, `spec` and
  `notes`. It commits its edits.
- Each writes the result JSON `{ "status": "ok" }`, or `{ "status": "failed", "reason": "…" }`.
- orchestra asks for each skill with an `inline` action, which the `orchestra:run` skill carries out in the main session. Only orchestra prints `inline`; a workflow's `next.js` never does.
- Every skill of a Curator should also work by hand, with no run.

## The project config

A project's `.orchestra/config.json` has one section per slot. orchestra owns four keys in it:
`plugin`, `disable` (gate names or guide paths to turn off), `gates` and `build`. Every other key must
be one your `config` declares. `.gitignore` must ignore `.orchestra/*` except `.orchestra/config.json`:
each run works in a worktree under `.orchestra/worktrees/`. orchestra check fails otherwise.

`gates` overrides keys of your gates: `{ "<gate>": { "<key>": <value> } }`, with the keys
`max_rounds`, `run`, `files`, `grep`, `when` and `always`. A gate keeps its `phase`, `kind`, `fix`,
`skill` and `guide`; your fix guide may then meet a changed command. `build`, in the `stack-skills`
section only, overrides `run`, `guide` and `max_rounds` of the build; its `guide` is a project skill.

## Shared roles

The shared roles are `triage`, `writing-style`, `pr-review` and `pr-description`. Only the `core` plugin and the project fill them. Every dispatch gets the input `shared-role.<role>` (the skill) for each role that is filled, and `shared-role.<role>.guide` when the project amends it. A project may also key one of its `guides` by a shared role: that guide amends the role with short rules.

- A gate or a judging step gets the triage rule from `judging.md`; it does not say it again. A skill that writes for people says: "If the input `shared-role.writing-style` is given, follow that skill for every text a person reads."
- A workflow author asks whether the workflow ends with a PR. If it does, the PR step invokes `shared-role.pr-review` and `shared-role.pr-description` when they are given.
- The result contract is in `judging.md`: `status`, `decide` (the run stops), `fix` (the gate fixed it), `report` (the report shows it), `noise` and `notes`. A red `tool` gate has the status `report`. The triage method is optional.

## A project's own gates and guides

A project fills the slot `project` itself, with no plugin: `.orchestra/project/orchestra.json` holds
only `slot`, `gates`, `guides` and `shared-roles`, in the formats above. A project skill (an `agent` gate's `skill`,
a fix `guide`) is `.agents/skills/<name>/SKILL.md` in the project; orchestra gives it to the subagent
by its path. Project gates run after your gates of the same kind, and project guides come after yours. A project gate
name is never one of your gate names. The skill `orchestra:project` writes all of it.

## A workflow: bin/next.js

Node, standard library only, and the engine module. orchestra calls
`node bin/next.js --project <dir> --orchestra <orchestra dir>`, with `--task-file <file>` on the
first call of a run. Load `<orchestra dir>/lib/workflow.js`. `next.js` reads no file under
`.orchestra/` itself. The module gives:

- `settings(project)`: `build`, the build command that orchestra runs (with the project's
  override), and `config`, your config values with their defaults.
- `readResult`, `reportOnce`, `noResult`: read a result file, stop once on a failed step, and send a
  step that wrote no result once more.
- `countAnswers`, `newAnswer`: the `## <step>` sections in `decisions.md`, and whether a `decide`
  result has a new answer.
- `phaseDone`: whether orchestra finished a phase. Each call
decides from the files on disk and prints one action as JSON on its last line:

- `dispatch`: `skill`, `inputs`, `result` (the file the subagent writes) and `runDir`. Every dispatch gets `contract/dispatch.md`, so a skill does not repeat its rules. Optional `"judging": true`: the step sorts findings, and orchestra gives it `contract/judging.md`. Never set `gate`: orchestra sets it on its own gate dispatches. Optional `stage`: the stage this dispatch is, one of your `stages`. orchestra adds that stage's guides to the prompt; a stage you did not declare fails the run.
- `phase`: `name` (one of the three phases) and `runDir`. orchestra runs that phase's gates.
- `done`, `decide` (with `step`, the step that asks, and `questions`; optional `result`, its result
  file) or `failed` (with `reason`). orchestra writes the report.

Any action may carry `sections`: an object with a section title as key and a list of lines as value.
The report prints each section between Results and Report, and `- none` for an empty list. orchestra
also writes the report when a phase fails, so put the sections into every action.

Every run starts in its own git worktree, on a detached HEAD at the base. On the first call, create
the task branch `task/<name>` from HEAD and record HEAD as `base`. orchestra finds an open run by
this prefix. Never check out another ref, pull or switch
branches: the worktree is the run's, and the user's checkout is never touched.

The run folder `tmp/runs/<branch>/` holds the state and is git-ignored. The notes folder
`docs/runs/<branch>/` holds what a human reads. Write `run.json` in the run folder with `base`,
`branch`, `spec` (the file that holds the acceptance criteria, as `<notes>/spec.md`) and `docs`
(the notes folder). The gate runner reads it. Detail: `docs/DESIGN.md` §7 in the orchestra repo.

## Check

Run `node <orchestra>/bin/check.js <your plugin folder>`. It lists every failed rule with its fix.
For a workflow, it also runs your `next.js` with a task in a throwaway git repo and checks the first
action.
