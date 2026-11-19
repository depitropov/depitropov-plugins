---
name: clean-code
description: Use when writing, modifying, or refactoring source code in any language, reviewing a diff or file for quality, auditing a codebase's code structure, or identifying where code quality should improve. Also use for "clean code", "refactor", "code smells", "is this clean", and Clean Architecture dependency audits. Measures function length, complexity, parameters, nesting, file size, and configured import boundaries before and after changes. System architecture selection, runtime/data boundaries and operational trade-offs belong to architecture-fundamentals.
---

# Clean Code

## Overview

Code that works and code that stays workable are different deliverables.
This skill is the second one. It has three parts: a process that measures
the code before and after the change with two scripts (`measure.py` for the
shape of functions and files, `boundaries.py` for the import graph), a
short set of rules that do not depend on the language, and three review
passes that run before the task is reported done.

The project's own `CLAUDE.md` outranks every rule here. When the two
disagree, follow the project and say so. This includes how the edit is
made: if the project's `CLAUDE.md` names an editing tool or forbids one,
that rule wins too.

**Core principle: the numbers come from `measure.py` and `boundaries.py`,
not from a feeling.** The scripts measure code shape and configured source
import rules. A clean result does not prove cohesion, data ownership,
runtime isolation, independent deployment, or system fitness.

## When to Use

- Any task that creates or edits source code, before the first edit.
- Any review of a diff, a file, or a module.
- The user says "clean", "refactor", "smell", "too long", "too complex",
  "Uncle Bob", "SOLID", or "Clean Architecture".

Load the language skill for the file being edited: `clean-code-python` for
`.py`, `clean-code-typescript` for `.ts` and `.tsx`, `clean-code-java` for
`.java`. `measure.py` measures all three; Java needs a JDK 17 or newer on
`PATH`. Read `architecture.md`
— it holds the four architecture review phases — when the change touches a
module boundary, adds an import between layers, or adds a module. The
language skills cite its phases by number. Read `rationalizations.md` when
tempted to skip a rule.

For system design, architecture-style selection, service/data ownership,
deployment boundaries, or operational trade-offs, use the sibling
[`architecture-fundamentals`](../architecture-fundamentals/SKILL.md) skill.
A local source edit or import review does not require its full workflow.

## Process

**1. Measure before.** From the repo root, on the files the task will touch:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/clean-code/measure.py" <paths> --all
```

`CLAUDE_PLUGIN_ROOT` is set by Claude Code to this plugin's directory. Use
it; a hard-coded path does not exist for a plugin install. If
`$CLAUDE_PLUGIN_ROOT` is empty the command looks for `/skills/...` and
fails. Check it first with `echo "$CLAUDE_PLUGIN_ROOT"`; if empty, use the
absolute path of the directory this `SKILL.md` sits in.

Run this before the first edit and keep the whole table, not only the
SUMMARY: the default output lists only offenders, and a clean function you
are about to touch would otherwise have no before-row. A SUMMARY with
`functions=0` measured nothing. Do not keep it as a result; fix the paths
and run again.

When the code is already written before you measure — a later agent, a
review phase, a check after the fact — the before is the merge-base, not
the working tree. Nothing needs to be kept on disk: `--compare` in step 3
reads the merge-base from git. Do not measure a "before" on code that
already holds the change.

When the task touches more than one file or adds an import, run the second
script too, on the package root, not on the touched files alone:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/clean-code/boundaries.py" <package root>
```

It reads every import and counts the edges that cross a boundary the wrong
way: `upward`, `cycles`, `core_outward`, `framework_in_domain`,
`sql_in_api`, `http_in_services` (rows in "Reading the numbers" below). It
needs the whole package because a cycle is not a property of one file, and
one package per run. A SUMMARY with every count at 0 next to a note on
stderr measured nothing: the package is missing an `__init__.py`.
Python only in this version; a TypeScript tree is a broken run that names
`dependency-cruiser`, a Java tree one that names ArchUnit. Keep its SUMMARY as a second before-line.

**2. Write.** Follow `rules.md` and the language skill.

**3. Measure after.** Measure the same paths against the before:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/clean-code/measure.py" <paths> --changed --base main --compare
```

`measurement.md` explains each option, the output lines and the verdicts. The last line is the
`VERDICT` line. Add `--legacy` when the project's `CLAUDE.md` asks for it, or when the user says
the code is legacy. Add `--at HEAD` when another session or agent may have uncommitted work in the
same tree.

When `boundaries.py` ran before, or the change touches more than one file,
run it with `--compare` over the whole package:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/clean-code/boundaries.py" <package root> --base main --compare
```

It prints the after report, a `BEFORE` line with the merge-base SUMMARY,
and `VERDICT up=none` or the counts that went up. Run it without
`--changed`: its counts are only comparable whole-tree, and rows narrowed
to the changed files would hide a cycle the task closed elsewhere.
Revalidate increased boundary counts against the source and the project's
documented dependency policy. Introduced violations of that policy block
completion. A heuristic hit that the policy permits is reported with its
evidence and reason; do not change thresholds or policy merely to pass.
Where no project-specific policy exists, use the Clean Architecture rules
in `architecture.md` as this plugin's default.

`measurement.md` lists the verdicts and what to do with each. In short:

- No function the task touched crosses a threshold it did not cross before.
- A function the task created is under every threshold.
- A function you edited that was already over a threshold either comes
  under it or is left with one sentence in the report saying why not.
  With `--legacy`, no sentence is needed.
- A file the task touched that was already over the file limit does not grow,
  or the report says why in one sentence.
- Suppressions did not go up, unless each new one carries its reason.

`measurement.md` says how a function is matched. A renamed function shows as a new row, so
judge a `new-over` row against the diff before calling it new.

If the code-shape verdict breaks the bullets above, the task is not done. Split the function,
extract the helper, flatten the nesting, then measure again. Not worse is
the floor; the Boy Scout Rule asks for a little cleaner. It applies to each
function you edited: you changed its body or its signature, not only code
in the same file. Leave each one better in at least one measure, or with
one fewer smell, when the step stays inside the task. A function you did
not edit is not yours to clean. This holds with `--legacy` too.

**4. Verify.** Run the project's format and lint gate and the tests that
cover the touched files. If the project's `CLAUDE.md` names a gate or a
test command, that is the gate. Name the commands and their results in the
report. A green measurement proves shape, not behaviour.

**5. Review.** Three passes, in this order, each producing findings:

| Pass | Question | Typical finding |
|---|---|---|
| Correctness | Does it do what the task says? Edge cases, error paths, concurrency. | missing branch, swallowed error, off-by-one |
| Design | One job per unit? Dependencies point inward? Nothing leaks across a boundary? | rule in the adapter, DTO across a boundary, hidden side effect |
| Readability | Names, length, nesting, comments. | name says how not what, comment restates the code, flag argument |

Findings apply to the lines the diff changed. Code the diff did not
change is context, not a finding, except in audit mode.

Every finding is revalidated against the source before it is fixed. A
finding that does not survive the second look is reported as rejected, with
the reason. Report the outcome of every finding, fixed or rejected, so the
review's coverage is visible.

The three passes and the revalidate-before-fix rule are this plugin's own
process. Robert C. Martin prescribes no review passes: for people his
answer is pairing (The Clean Coder ch. 12), and his `swarm-forge` reviewer
roles list the same concerns in the same order — correctness, then
architecture and dependency direction, then local code quality — but as one
review with his four architectural phases, not three passes.

**6. Report.** The report is what you write back to the user, unless the
project says where reports go. It has four parts: (1) the before and after
SUMMARY lines and the VERDICT line, per script that ran; (2) the
`--compare` rows for every function the task created or touched, before
and after, in one table, and every boundary row the task added or
removed; (3) for each function still over a threshold, the one sentence
saying why and what the follow-up split would be; (4) the review findings
with their outcomes, fixed or rejected. Tables, not a sentence about
tables.

## Audit mode: code structure and source boundaries

The process above is built around a change. When there is no change —
"audit this codebase", "where should code quality improve", "check the code
structure", "is this Clean Architecture", or "build a code-quality backlog"
— the tools have no diff to narrow to, so run them
over the whole tree. A broader system-architecture audit also needs the
runtime, data, and operational analysis in `architecture-fundamentals`:

1. `measure.py <roots>` for the shape, `boundaries.py <package root>` for
   the boundaries. Both, always; a backlog built from one script inherits
   that script's blind spot. `measure.py` cannot see an import, and
   `boundaries.py` cannot see a 400-line function.
2. The four phases of `architecture.md`, in order, over the import graph
   the script printed (`--all` lists every module, layer and module edge).
   The script counts the edges; the phases say which edge is the fix and
   which is the accident.
3. Two lists that stay separate in the report: **shape** (from
   `measure.py`: functions over a threshold, files over the file limit,
   suppressions) and **boundaries** (from `boundaries.py`: upward imports,
   cycles with their closing edges, core reaching out, framework in the
   domain, SQL in handlers, HTTP in services). A backlog built in audit
   mode has both sections, or it says why one is empty.

In audit mode every row is a review candidate, touched or not. Revalidate it
against the source and the project's intended boundaries before reporting
a confirmed defect. In task mode a row in a file the task did not touch is
context for the report, not a finding.
The audit measures; it does not enforce. When a count should become a
gate, the fix is the project's own checker (`import-linter` for Python,
`dependency-cruiser` or `eslint-plugin-import` for TypeScript), turned on
by the project, not a rule added to this skill.

## Rules that do not depend on the language

`rules.md` in this folder holds them, numbered 1 to 13, with the limits of the measurement in
rule 3. A finding cites `Rule <n>`.

## Reading the numbers

| Measure | Threshold | What crossing it usually means |
|---|---|---|
| lines | rule 3 | sections (declarations, setup, loop, output) are several jobs; each section is a function of its own |
| lines in a test | rule 3 | the test checks several behaviours, or builds data a fixture or a builder should give; split it, or extract the setup |
| cc | rule 3 | an `if` chain or `switch` doing N things; bury it once behind polymorphism, or extract each branch |
| params | rule 3 | arguments that travel together are a missing object; a flag argument is two functions |
| depth | rule 3 | nested blocks hide the normal flow; extract each block into a one-line call, or return early with a guard clause |
| file lines | rule 3 | more than one job in one file; split by responsibility, not by line count |
| suppressions | counted | each is a safety the code overrode on purpose; each needs a reason on the line |
| upward | 0 | a service, model or domain file imports `api`; the inner layer knows the handler, so the rule cannot be tested without HTTP; invert with a function the inner layer owns |
| cycles | 0 | two modules import each other; the printed closing edges are the rarer direction, the fix list; move the shared thing to a module both may import, or pass it in |
| cyclic_modules | 0 | modules inside any cycle, pairs or longer; a cycle through three modules has no pair and shows only here |
| core_outward | 0 | the framework module imports a feature; core cannot be reused and every feature change can break startup; the feature registers itself from the composition root (`main.py` is exempt) |
| framework_in_domain | 0 | `fastapi`, `sqlalchemy` or `starlette` under a domain or shared module; the rule cannot be tested without the framework; define a port there, implement it outside |
| sql_in_api | 0 | a handler builds a query (`select(`, `.execute(`, `.where(`, `func.`; text match, sites per file); the handler redoes the data-access job; move each query into a service or model function |
| http_in_services | 0 | a service imports `fastapi` or `starlette`; the service knows a status code or a request type; raise a domain error and translate it in the handler |
| ports | counted | `Protocol` or `ABC` under services or domain; informational, the pattern the other services should follow |

Thresholds change with `--max-lines`, `--max-test-lines`, `--max-cc`, `--max-params`,
`--max-depth`, `--max-file-lines`; the boundary names with `--layers`,
`--core`, `--domain`. Changing them for a project is a decision that goes
into that project's `CLAUDE.md`, not into a command line that nobody sees
again.

## Rules that keep the report honest

- The whole repository does not need to be green. The task's files must
  not get worse.
- Never edit a threshold to make a number pass.
- Never add a suppression to make a linter pass; fix the finding or write
  the reason on the line.
- A finding you rejected is reported as rejected. A finding you did not
  check is not reported as checked.
