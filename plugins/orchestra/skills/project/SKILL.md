---
name: project
description: Use when the user wants to customize orchestra for this project — "orchestra project", override the build or a gate, add a project gate, or add project rules for a stage.
---

# orchestra project

You write the Project Customization: what this project changes in its orchestra run. You show the
run as it is, ask what is different here, write the files, and check them. You commit nothing.

`<orchestra>` is the folder two levels above this skill's folder. Run every command from the
project root.

## 1. Read and resolve

Read `.orchestra/config.json`. If it does not exist, tell the user to run orchestra init, and stop.

Resolve the slots as the skill `orchestra:run` does in its step 2: invoke `<plugin>:manifest` for
each section, then run `node <orchestra>/bin/resolve.js <slot>=<folder> …`. If it fails, show the
error and stop.

## 2. Show the run

From `.orchestra/resolved.json` and the config, show:
- The build command.
- The gates per phase, with the plugin that declares each one.
- The guides per stage.
- What the config already overrides or turns off, and what `.orchestra/project/` already adds.

## 3. Ask

Ask one topic at a time:
1. The build: does this project build in another way?
2. Gate settings: which gate keys change? Only `max_rounds`, `run`, `files`, `grep`, `when` and
   `always` can change. A different phase, kind, fix or skill is a different gate: turn the plugin's
   gate off and add a project gate with another name.
3. Gates to turn off.
4. Project gates to add: what each one checks, in which phase, on which files, and whether it is a
   command or a review by a subagent.
5. Project rules, per stage: `spec`, `plan`, `code`.
6. Shared roles (`triage`, `writing-style`, `pr-review`, `pr-description`): replace one with a project
   skill (override), or add short rules to it (amend). A shared role has an effect only when a skill
   of the chosen workflow or gates reads it. The shipped plugins read only `triage` today.

## 4. Write

- Overrides go into `.orchestra/config.json`: `<slot>.gates.<gate>.<key>`, `<slot>.disable`, and
  `stack-skills.build`. A build fix guide of the project is a project skill.
- Project gates and guides go into `.orchestra/project/orchestra.json` (only `slot: "project"`,
  `gates`, `guides` and `shared-roles`) and `.orchestra/project/guides/<stage>.md`. A guide has no
  frontmatter and holds short rules. An override goes under `shared-roles` in that file. An amend is
  `.orchestra/project/guides/<shared role>.md`, listed under `guides`.
- Each project skill goes into `.agents/skills/<name>/SKILL.md`, with only `name` and `description`
  in its frontmatter. A review skill of an agent gate uses the triage shared role only when it is
  given: it says "If the input `shared-role.triage` is given, follow that skill."
- Add the line `!.orchestra/project/` to `.gitignore` when it is missing.

## 5. Check

Run `resolve.js` again, as in step 1. If it fails, show each line: every line names the rule and
its fix. Leave the files in place, so the user can fix them.

When it passes, tell the user to commit and push `.orchestra/config.json`, `.orchestra/project/`,
`.agents/skills/` and `.gitignore`. A run reads them from `origin/<default>`.

## Permitted actions

- Change only `.orchestra/config.json`, `.orchestra/project/`, `.agents/skills/` and `.gitignore`.
  The check also writes `.orchestra/resolved.json`, which git ignores.
- Do not commit, push or start a run.
