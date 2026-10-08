---
name: logic-review
description: Reviews the code of one orchestra run against the brief alone — correctness, and a test for every criterion and behavioural assumption that fails on a wrong version — then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Logic review

## Inputs

- `spec`: the brief. This is your answer key.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers. They are part of the requirements.

Read only the brief, `decisions`, the diff and the code. The plan, the implementation log and the
other review notes describe how the author saw the code; they would steer your judgement, so leave
them unread. `<notes>/code.md` is the one exception, and only in step 6.

## Procedure

1. **Requirements first, before any code.** From the brief and `decisions`, write a list:
   - each acceptance criterion, and each assumption in the brief that sets behaviour (null handling,
     where rounding happens, which limit is checked first);
   - for each one, the behaviour it requires, with one concrete input and its expected output;
   - for each one, one likely wrong version of the code: the wrong rounding mode, rounding at the
     wrong step, `<` for `<=`, a missing null check, the wrong order of two steps.
2. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`. Read the
   changed files in full. If nothing in the change concerns code or tests, write the result with
   `"status": "skipped"` and stop.
3. **Each point has a test, and the test can fail.** For each point of step 1, find the code that does
   it and the test that proves it. A test must fail on the wrong version from step 1: check its input
   and its expected value against that version. Findings:
   - a point with no code, or no test;
   - a test that passes on the wrong version (its input cannot tell them apart);
   - a test with an empty or self-confirming assert, a disabled test, a mock of the unit under test,
     or a test that passes without the change.
4. **Correctness.** Look for bugs in the changed code: wrong conditions, off-by-one, null handling,
   rounding, races, wrong transaction or error boundaries, security holes.
5. To check a claim, you may run a single test, or a small scratch check of a calculation. Never run
   the full build: orchestra built and tested this commit and builds again later. Never pipe a test
   command: the pipe hides the exit code.
6. Read `<notes>/code.md` now, and only to drop findings that repeat a recorded choice. A recorded
   choice that breaks a point of step 1 or causes a bug stays a finding. A `business fact:` line in
   `code.md` is not a repeat: it is a placeholder for a value nobody gave, so it is a Decide finding
   (triage, B1).
7. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
8. Write `<notes>/logic-review.md` in the triage notes format. Under **Checked**, put the list from
   step 1, and for each point the test you found and whether it fails on the wrong version.
9. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
10. Otherwise fix every Patch finding and every answered Decide. A weak test gets an input that tells
    the right and the wrong version apart. Run only the tests you touched. Commit once:
    `fix(logic-review): <summary>`. orchestra commits `notes` itself: do not stage files under
    `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: naming, structure, comments, log statements, layout, and plan conformance. Other gates own
them.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "logic-review",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 1, "noise": 0 },
  "evaluate": ["LoanService.java:42 — a missing return date now throws; before it was ignored"],
  "files": ["<notes>/logic-review.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`. The report shows these lines to the human.

## Permitted actions

Edit code and tests. Run tests and small scratch checks. Commit. Do not push. Do not change branches.
Do not ask the user; a question goes into `decide`.
