---
name: process-feedback
description: Use when the user has feedback notes from log-feedback to turn into changes — "process this feedback". Runs in a plugins repo; changes its plugins, and a project's Project Customization at the note's path.
---

# Process feedback

You turn feedback notes into rules. You run in a plugins repo and write where you run. A rule for one
project goes into that project, at the path the note gives. You prefer to extend what exists over
adding something new: every new line is read by every run.

## 1. Read

Take the notes, as pasted text or as file paths. Read this repo's own instructions (`CLAUDE.md` and
the docs it names), and follow them for every change below.

## 2. Decide the level

For each note, decide its level. The note's proposed level is a hint; check it against the rule.

| Level | Target |
|---|---|
| `project` | The Project Customization of the project at the note's path: `.orchestra/project/`, `.agents/skills/`, `.orchestra/config.json`, written as the skill `orchestra:project` writes them. |
| `stack` | The Stack Skills plugin of this repo for the note's stack: its gates, guides and `references/` files. |
| `workflow` | The workflow plugin of this repo: its skills, and its `formats/` files for the spec and the plan. |
| `core` | The core plugin of this repo. A clean-code rule goes to `rules.md` of the `clean-code` plugin: the core gate has no rules of its own. |
| `process` | orchestra itself: a rule for every agent gate or every dispatch goes to its `contract/` files. |

The plugin names in the note are a hint, not a requirement. When the note names no plugin, take the
stack from the code in the evidence, or from the project's `.orchestra/config.json`. Skip a note
whose level has no matching plugin in this repo, and say what it needs. Never edit an installed
copy of a plugin; edit only this repo and the project at the note's path.

When the note needs the project (a `project` note, or the stack from its config), check it now:
- When the project path does not exist on this machine, skip the note.
- A `project` note for a project with no `.orchestra/config.json` is skipped too: say that the
  project needs orchestra init first.

## 3. Find the home

For each note, find the gate, guide, skill or rule file that should have caught the problem: first the one the
note's origin names, then the others of the target. Read it. When the rule is already there, say so
and propose nothing new, or only a sharper wording when the existing rule is unclear. The note is
then "already covered": it still goes to `evals/pending/` (step 6), with the line
"existing rule, not followed", because it is the best red/green case. Otherwise pick the
closest one to extend. Propose a new gate or guide only when nothing fits, and say why.

## 4. Propose

Show one short proposal per note: the level, the target file, the change in a few lines, and the eval
material (step 6). Stop for the user's approval. The user approves, changes or drops each one.

## 5. Implement

Write the approved changes, following this repo's rules. Before you write in a project: when the
project is not on its default branch, or the files to change have uncommitted changes,
stop and ask the user. After you write a Project Customization, check it as `orchestra:project` does: run
`node <orchestra>/bin/resolve.js` with the resolved slots, where `<orchestra>` is the folder two
levels above this skill's folder. Show each failing line.

Commit nothing unless this repo's rules or the user say so.

## 6. Eval material

- When a command can check part of the rule (a pattern, a config fact), add a `node --test` test with
  fixtures from the note's evidence. In a project, only when it has a test setup for it.
- Copy the note, with a first line that names the change it produced, to
  `plugins/<plugin>/evals/pending/<slug>.md` in the plugin that changed or already covers the rule.
  For a project change, copy it to `.orchestra/project/evals/pending/<slug>.md` in the project.

## 7. Report

Per note, one line: done (the files changed), already covered (the rule's file), skipped (the
reason, and what it needs), or dropped by the user.
