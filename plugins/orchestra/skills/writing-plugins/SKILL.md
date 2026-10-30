---
name: writing-plugins
description: Use when writing or changing a plugin that fills an orchestra slot — a workflow plugin, a Stack Skills plugin, a Curator plugin or a core plugin — its orchestra.json, its gates or its next.js.
---

# Writing an orchestra plugin

A plugin fills one slot: `workflow`, `stack-skills`, `curator` or `core`. A project must fill the first two; `curator` and `core` are optional. orchestra reads the plugin's declaration
and runs it. The plugin never runs or orders its own gates. This page is the reference. orchestra
check is the guarantee: run it when you finish (last section).

A `core` plugin holds rules that every workflow gets. Its gates read only the inputs every workflow gives (`spec`, `base`, `notes`, `decisions`, and its plugin's `config` values), never a workflow's own files such as its plan; a gate that reads them belongs in the workflow. Its `shared-roles` maps each shared role it fills to one of its skills. The shared roles are `triage`, `writing-style`, `pr-review` and `pr-description`. A gate may use another plugin through that plugin's skills when its `plugin.json` lists it under `dependencies`: it invokes the other plugin's `manifest` skill to find its folder. orchestra does not resolve it. `orc-core` uses `clean-code` this way.

`<orchestra>` is the folder two levels above this skill's folder.

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
| `guides` | `stack-skills`, `curator` | `{ "<stage>": "<path>" }`: a guide, a path to a guide file inside the plugin (for example `guides/code.md`: no frontmatter, short write-time rules), for one stage. The stages are `spec`, `plan` and `code`. orchestra tells the stage to read its guides. A project turns one off with `disable`. |
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
| `skill` | An `agent` gate's review skill. It fixes its own Patch findings. |
| `run` | A `tool` gate's command. |
| `fix` | For a `tool` gate: `self` (the tool fixes, orchestra commits), `fixer` (orchestra's fixer, with `guide`) or `none` (report only). |
| `guide` | The fix guide skill for `fix: fixer`. |
| `max_rounds` | Fixer rounds. Default 2. |
| `files` | A glob, or a list of globs, on the changed paths. |
| `grep` | A regular expression on the content of the changed files. |
| `when` | A rule in words, judged on the diff. |
| `always` | `true`: the gate runs on every run. |

A gate needs at least one of `files`, `grep`, `when` or `always`. Inside a phase, orchestra orders by kind, then workflow gates, then core gates, then stack gates;
you do not order them. A gate name is unique across the slots of a project; orchestra check fails on a name two slots declare.

## A Curator

A Curator keeps a project's direction docs current. orchestra knows only its declaration: `curate`,
`setup` and `guides`. Both skills run in the main session, so they may ask the user questions.

- `setup` never runs inside a feature run. When a run starts and the `done` file is missing on the
  default branch, orchestra makes no task branch and the user chooses: set up on the default branch
  (the skill runs by hand, with no inputs), set up on its own branch `curator/setup` (an `inline`
  action with the input `done`), or go on without setup. The skill commits its files and writes
  `done` last, so a setup that stops half-way runs again.
- `curate` is skipped when the `done` file is missing in the run, and the report says so.
- `curate` runs when the workflow is done, before the report. Its inputs are `base`, `brief` and
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

- A gate or a judging stage says: "If the input `shared-role.triage` is given, follow that skill." Without it, the skill sorts by its own judgement. A skill that writes for people says the same for `writing-style`: "If the input `shared-role.writing-style` is given, follow that skill for every text a person reads."
- A workflow author asks whether the workflow ends with a PR. If it does, the PR step invokes `shared-role.pr-review` and `shared-role.pr-description` when they are given.
- The result contract does not change: `status`, `decide` (the run stops) and `evaluate` (the report shows it). The triage method is optional.

## A project's own gates and guides

A project fills the slot `project` itself, with no plugin: `.orchestra/project/orchestra.json` holds
only `slot`, `gates`, `guides` and `shared-roles`, in the formats above. A project skill (an `agent` gate's `skill`,
a fix `guide`) is `.agents/skills/<name>/SKILL.md` in the project; orchestra gives it to the subagent
by its path. Project gates run after your gates of the same kind, and project guides come after yours. A project gate
name is never one of your gate names. The skill `orchestra:project` writes all of it.

## A workflow: bin/next.js

Node, standard library only. orchestra calls `node bin/next.js --project <dir>`, with
`--task-file <file>` on the first call of a run. Each call decides from the files on disk and prints
one action as JSON on its last line:

- `dispatch`: `skill`, `inputs`, `result` (the file the subagent writes) and `runDir`. Optional `stage`: the stage this dispatch is, one of your `stages`. orchestra adds that stage's guides to the prompt; a stage you did not declare fails the run.
- `phase`: `name` (one of the three phases) and `runDir`. orchestra runs that phase's gates.
- `done`, `decide` (with `gate`, the step that asks, and `questions`; optional `result`, its result
  file) or `failed` (with `reason`). orchestra writes the report.

Every run starts in its own git worktree, on a detached HEAD at the base. On the first call, create
the task branch from HEAD and record HEAD as `base`. Never check out another ref, pull or switch
branches: the worktree is the run's, and the user's checkout is never touched.

The run folder `tmp/runs/<branch>/` holds the state and is git-ignored. The notes folder
`docs/runs/<branch>/` holds what a human reads. Write `run.json` in the run folder with `base`,
`branch`, `spec` and `docs`. Detail: `docs/DESIGN.md` §7 in the orchestra repo.

## Check

Run `node <orchestra>/bin/check.js <your plugin folder>`. It lists every failed rule with its fix.
For a workflow, it also runs your `next.js` with a task in a throwaway git repo and checks the first
action.
