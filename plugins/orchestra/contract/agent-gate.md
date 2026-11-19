# Agent gate

Read `dispatch.md` and `judging.md` first. This file adds what a gate does with code.

## Inputs

- `gate`: your name. It names your notes file and your commit.
- `phase`: the phase the gate runs in: `implementation-check`, `conventions-check` or `finish`.
- `spec`: read it only for the scope of the task, unless your skill says more.
- `base`: the commit your change starts from.
- `notes`: the folder for your notes file.
- `decisions`: answers to earlier Decide findings. Optional.
- `config.<key>`: a setting of the project.
- `shared-role.<role>`: a skill to use for that role.

## The change

When a step of your skill says it comes before the change, do that step first.

Get the change with `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude).orchestra' ':(exclude)tmp'`.

Read each changed file that your `## Scope` names, in full. When nothing is in scope, write the result `skipped` with the reason, and stop.

Then do your `## Steps`. Then check the lines that the change adds or edits against each of your `## Rules`. Untouched code is not in scope.

## Findings

Read the project's `AGENTS.md` and `CLAUDE.md` files: at the root, and in each folder that the change touches. When they do it another way than a rule, follow them: that rule is not a finding.

The project's code wins. When the untouched code of the same kind does it another way, follow the project. The last paragraph of your `## Scope` may say where this does not apply.

Write each finding with this title and a `file:line`: `▸ Rule <n>: <title>`. Your skill may give its own title form.

A file `references/<name>.md` of your skill numbers its rules from 1. Cite such a rule as `<gate>:<name>:<n>`, for example `▸ Rule general:quarkus:1: <title>`.

## Fixing

Fix every Fix finding with the smallest fix.

A fix that changes behaviour must not contradict the spec or `decisions`. When it does, the finding is Report. A fix that changes behaviour also needs a test that fails without it.

A gate in the `finish` phase (the `phase` input) never changes behaviour.

Run only the tests of the files you changed.

When a test fails after your fix, undo that fix and record the finding as Report.

When a pre-commit hook blocks the commit, fix what it reports and commit again.

Commit once, with this message: `fix(<gate>): <summary>`. When you fixed nothing, do not commit.

Do not review your own fixes again. Your `## Fixing` section adds limits.

## Permitted actions

You may edit code and tests, run tests and commit.
