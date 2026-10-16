---
name: writing-plugins
description: Use when writing or changing a plugin that fills an orchestra slot — a workflow plugin, a Stack Skills plugin or a Curator plugin — its orchestra.json, its gates or its next.js.
---

# Writing an orchestra plugin

A plugin fills one slot: `workflow`, `stack-skills` or `curator`. A project must fill the first two; `curator` is optional. orchestra reads the plugin's declaration
and runs it. The plugin never runs or orders its own gates. This page is the reference. orchestra
check is the guarantee: run it when you finish (last section).

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
| `slot` | all | `workflow`, `stack-skills` or `curator`. |
| `config` | all | Keys a project may set in its config section. Each is `{ "type": …, "default": … }`, with type `string`, `number` or `boolean`, and a default of that type. |
| `gates` | `workflow`, `stack-skills` | The checks after the code. See "A gate". |
| `build` | `stack-skills`, required | `run`: the full build and the tests. `guide`: its fix guide skill. `max_rounds`: fixer rounds, default 2. |
| `measure` | `stack-skills` | The shape measurement for a gate that asks for it. `run`: a command that measures the changed code against `{base}`, the run's base commit, and prints its verdict. `rules`: optional, a skill with the stack's clean-code rules. A stack with no `measure` gives the gate no measurement. |
| `guides` | `stack-skills`, `curator` | `{ "<role>": "<skill>" }`: a guide, a skill with short write-time rules, for the stages of one role. The roles are `spec`, `plan` and `code`. orchestra lists the guides of a stage's role in its prompt. A project turns one off with `disable`. |
| `curate` | `curator`, required | The skill that brings the project's direction docs up to date at the end of a run. orchestra runs it in the main session, not in a subagent, when the workflow is done. |
| `setup` | `curator`, required | `skill`: the skill that sets the Curator up in a project; it may interview the user. `done`: a file path relative to the project root. The skill writes this file as its last step. orchestra checks the file on every run and runs the skill when it is missing. |
| `roles` | `workflow` | The roles of its stages, each once: `spec`, `plan`, `code`. orchestra check fails when a slot plugin declares a guide for a role that is not here. |

In a command, `{plugin}` is the plugin's folder. In a gate's `run` or `grep`, `{config.<key>}` is
a config value; the key must be declared under `config`. The `build` command takes only `{plugin}`.
The `measure` command takes only `{plugin}` and `{base}`.

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
| `measure` | `true`: an `agent` gate gets the stack's `measure` command and its `rules` skill as the inputs `measure` and `rules`. |

A gate needs at least one of `files`, `grep`, `when` or `always`. Inside a phase, the order is
fixed by orchestra, not by you.

## A Curator

A Curator keeps a project's direction docs current. orchestra knows only its declaration: `curate`,
`setup` and `guides`. Both skills run in the main session, so they may ask the user questions.

- `setup` runs before the first stage when the `done` file is missing. It commits its files and
  writes `done` last, so a setup that stops half-way runs again.
- `curate` runs when the workflow is done, before the report. Its inputs are `base`, `brief` and
  `notes`. It commits its edits.
- Each writes the result JSON `{ "status": "ok" }`, or `{ "status": "failed", "reason": "…" }`.
- orchestra asks for each skill with an `inline` action, which the `orchestra:run` skill carries out in the main session. Only orchestra prints `inline`; a workflow's `next.js` never does.
- Every skill of a Curator should also work by hand, with no run.

## The project config

A project's `.orchestra/config.json` has one section per slot. orchestra owns three keys in it:
`plugin`, `disable` (gate or guide names to turn off) and `gates`
(`{ "<gate>": { "max_rounds": <n> } }`). Every other key must be one your `config` declares.
`.gitignore` must ignore `.orchestra/*` except `.orchestra/config.json`: each run works in a worktree
under `.orchestra/worktrees/`. orchestra check fails otherwise.

## A workflow: bin/next.js

Node, standard library only. orchestra calls `node bin/next.js --project <dir>`, with
`--task-file <file>` on the first call of a run. Each call decides from the files on disk and prints
one action as JSON on its last line:

- `dispatch`: `skill`, `inputs`, `result` (the file the subagent writes) and `runDir`. Optional `role`: the stage's role, one of your `roles`. orchestra adds that role's guides to the prompt; a role you did not declare fails the run.
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
