---
name: clean-code
description: Reviews the shape of the changed code and the clean-code rules — the measurement against the base from the clean-code plugin, names, one job, flags, side effects, duplication, errors, comments, dead code, tests and boundaries — then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Clean-code review

## Scope

Changed source and test files are in scope. When the change has no source code and no tests, skip.
The whole repository does not need to be clean, but the task's code must not get worse.

`config.legacy` is `true` when the project marks its code as legacy. The project sets it in the
`core` section of its `.orchestra/config.json`. The default is `false`.

Untouched code that breaks a rule of `rules.md` or of a language skill, also long or complex code,
does not excuse a new break.

## Steps

1. Invoke the skill `clean-code:manifest`. It answers `PLUGIN_DIR=<folder>`. When the skill does
   not exist, write the result `failed` with the reason "the clean-code plugin is not installed",
   and stop.
2. Read `skills/clean-code/measurement.md` and `skills/clean-code/rules.md` in that folder. The
   rules of `rules.md` are your rules.
3. **Measure.** Run the command of `measurement.md` once, with `PLUGIN_DIR` as the folder of the plugin, from the run root, on the path `.`, with
   `--changed --base <base> --compare --at HEAD`, and with `--legacy` when `config.legacy` is
   `true`. Keep the whole output. A broken measurement, as `measurement.md` defines it, is one
   Report finding with its message; then go on with the rules.
4. Each measured row with the verdict `new-over`, `crossed` or `grew`, and each `suppressions-up`
   row with a new suppression without its reason on its line, is a finding against rule 3. A rule
   may say that such a row is not a finding: the flat `switch` of rule 3, or TS rule 7. Read the
   diff before you call a row new.
5. For each language of the changed files, invoke its rules skill from the `clean-code` plugin and
   check those rules too: `clean-code:clean-code-python` for `.py`,
   `clean-code:clean-code-typescript` for `.ts` and `.tsx`, `clean-code:clean-code-java` for
   `.java`. Take only their rules, layers and searches, not their process. Check the lines that the
   change adds or edits against each rule of `rules.md` and of the language skills.
6. The title of each finding starts with its rule: `▸ Rule <n>: <title>` for `rules.md`, and the
   language skill's form for one of its rules, for example `▸ TS rule <n>: <title>`. A finding
   against rule 3 gives the before and after numbers of its row.
7. Under Checked, give the `SUMMARY`, `BEFORE` and `VERDICT` lines of the measurement, or the
   reason there is none.

## Fixing

A fix changes the shape, never the behaviour: extract, rename, flatten, delete dead code. Never
change a threshold or add a suppression to make a row pass. When step 3 measured, check your fixes.
Before you commit, run the command once more without `--at HEAD`, so it measures the files you
changed, and give its `VERDICT` line under Fix. Undo a fix that makes a row worse.
