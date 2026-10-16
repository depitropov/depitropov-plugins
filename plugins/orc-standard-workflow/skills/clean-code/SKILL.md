---
name: clean-code
description: Reviews the shape of the changed code and the clean-code rules — the stack's measurement against the base, names, one job, flags, side effects, duplication, errors, comments, dead code, tests and boundaries — then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Clean-code review

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.
- `measure` (optional): the Stack Skills command that measures the changed code against `base`.
- `rules` (optional): a skill with the stack's own clean-code rules.

## Procedure

1. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`. Read each
   changed source and test file in full. If the change has no source code and no tests, write the
   result with `"status": "skipped"` and stop.
2. **Measure.**
   - With `measure`: run it once, from the run root. Keep the whole output. Exit code 0 means it
     measured, also when it says it found no files to measure. Any other exit code is a
     broken measurement: record one Evaluate finding with the line that says what went wrong. That
     is the first error line of the output. For a Python traceback it is the last line. Then go on
     with the rules.
   - Without `measure`: record one Evaluate finding with this text:
     `No shape measurement: the Stack Skills plugin declares no measure. The review used the rules only.`
     Go on with the rules, and judge rule 3 by reading.
3. Each measured row with one of these verdicts is a finding against rule 3:

   | Verdict | Meaning |
   |---|---|
   | `new-over` | A function or a file that the task created is over a threshold. |
   | `crossed` | A function that the task touched crossed a threshold it was under, or a file crossed 500 lines. |
   | `grew` | Over before and after, and a measure that is over went up. For a file: over 500 lines, and longer. |
   | `suppressions-up` | A file has more suppressions than before. Each new one without its reason on its line is a finding. |

   `fixed`, `still-over` and `new` are not findings. A row matches by file and name, so a renamed
   function shows as `new-over`: read the diff before you call it new, and judge it against the old
   function. One exception: a flat `switch` or `match` whose arms answer one question can be over
   complexity 10. List it under Checked with that reason; it is not a finding. Never split it into
   helpers that take a flag the caller already knows.
4. Check the lines this change adds or edits against each rule below. When `rules` is given, invoke
   that skill and check its rules too. Code the change does not touch is not in scope: the whole
   repository does not need to be clean, but the task's code must not get worse.
5. The project wins. The project's `AGENTS.md` or `CLAUDE.md` overrides every rule and threshold
   here. Existing long or complex code is not a project rule: it does not excuse a new finding.
6. The title of each finding starts with its rule, as in `▸ Rule 3: <title>` or
   `▸ TS rule 4: <title>`, and its "In the code" line gives `file:line`. A finding against rule 3
   gives the before and after numbers of its row.
7. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
8. Write `<notes>/clean-code.md` in the triage notes format. Under Checked, give the `SUMMARY`,
   `BEFORE` and `VERDICT` lines of the measurement, or the reason there is none.
9. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
10. Otherwise fix every Patch finding and every answered Decide. A fix changes the shape, never the
    behaviour: extract, rename, flatten, delete dead code. Never change a threshold or add a
    suppression to make a row pass. Run only the tests of the files you changed. Never pipe a test
    command: the pipe hides the exit code. With `measure`, run it once more and give its `VERDICT`
    line under Patched; undo a fix that makes a row worse. Commit once:
    `refactor(clean-code): <summary>`. orchestra commits `notes` itself: do not stage files under
    `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: whether the behaviour is right (logic-review), whether the plan was followed
(plan-conformance), log statements, formatting.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "clean-code",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 1, "noise": 0 },
  "evaluate": ["No shape measurement: the Stack Skills plugin declares no measure. The review used the rules only."],
  "files": ["<notes>/clean-code.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line, with `file:line` when it has one.

## Permitted actions

Edit code and tests. Run tests and the `measure` command. Commit. Do not push. Do not change
branches. Do not ask the user; a question goes into `decide`.

## Rules

1. **Names say what, not how.** `remainingBudget`, not `calc`. A name that needs a comment is the
   wrong name.
2. **One job per function.** A function is a paragraph. When it has sections with heading comments,
   each section is a function.
3. **Small.** A function has at most 20 lines (blank lines and doc comments count), complexity at
   most 10, at most 3 parameters, and nesting at most 2. A file has at most 500 lines. Each
   suppression of a check carries its reason on its line. The measured rows are the evidence. What
   crossing a threshold usually means:
   - lines: the sections (declarations, setup, loop, output) are several jobs; extract each one;
   - complexity: an `if` chain or a `switch` that does several things; put it once behind
     polymorphism, or extract each branch;
   - parameters: arguments that travel together are a missing object; a flag argument is two
     functions (rule 4);
   - nesting: nested blocks hide the normal flow; return early with a guard clause, or extract each
     block into a one-line call;
   - file lines: more than one job in one file; split by job, not by line count.
   Bring a touched function that was already over a threshold under it when the change is small.
   When it stays over, the finding says why, and what the split would be.
4. **No flag arguments.** A boolean parameter that picks a path means two functions.
5. **No hidden side effects.** A function named like a query does not write.
6. **No duplication inside one responsibility.** Extract at the second copy, not the third, when
   both copies change for the same reason. Only true duplication counts: every change to one copy
   forces the same change to the other. Two similar views, queries or data shapes that serve
   different use cases, or different domain contexts, stay apart.
7. **Errors are types.** A domain error is a class in the domain: not a string, not a status code,
   not a null with a comment.
8. **Comments explain why.** Intent, a warning, a consequence the reader would not expect. A comment
   that repeats the next line is deleted, and its reason goes into a better name. Code you cannot
   rename (a regular expression, an obscure library argument) is the one place where a comment may
   say what the code does.
9. **Dead code is deleted.** Not commented out, not kept "in case".
10. **Tests are code.** The same rules apply. One behaviour per test, not one assertion; a name that
    reads as a sentence; no logic in a test that needs its own test.
11. **The core works without the UI and the IO.** A handler, a component or a template asks a domain
    function for each decision and translates the answer into HTML, JSON or text. It does not
    compute the rule itself. Formatting is the adapter's job (dates, currency, labels, a greyed
    button); the decision behind the formatting is not. A correct import direction does not excuse a
    copy: an adapter that computes what a domain function already gives is wrong, and so is a
    domain function that only the tests call while the adapter keeps its own copy.
12. **Dependencies point inward.** A domain module does not import the ORM, the HTTP framework or a
    client library, does not take the framework's request object, and does not read an environment
    variable. It defines an interface; the adapter implements it, and the caller injects it. A
    stable platform facility, such as the standard library, is not a finding. Judge by the imports,
    not by the folder name.
13. **A simple typed value crosses a boundary.** No ORM row or entity, no request schema, no free
    map whose keys the receiver must know. The adapter translates. An error crosses in the form the
    inner module defines: the adapter turns an outside failure into a domain error, and a domain
    error into a transport error. A domain module never names a transport or framework error type.
