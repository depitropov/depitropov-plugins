---
name: logic-review
description: Reviews the code of one run for correctness and for a test behind every acceptance criterion, then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Logic review

## Inputs

- `spec`: the brief, with the acceptance criteria. This is your answer key.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers to your earlier questions.

## Procedure

1. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`.
2. If nothing in the change concerns code or tests, write the result with `"status": "skipped"` and
   stop.
3. For each point in `spec`, find the code that does it and the test that proves it. A point with
   no code or no test is a finding.
4. Look for correctness bugs in the changed code: wrong conditions, off-by-one, null handling,
   rounding, wrong error handling.
5. Read `<notes>/code.md`: it lists the choices the coder already recorded. Then invoke the skill
   `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/logic-review.md` in the triage notes format. Each finding names the point of the
   spec it concerns.
7. If there is a Decide finding and no `decisions` input, stop here. Do not fix anything. Write the
   result with `"status": "decide"`.
8. Otherwise, read `decisions` if given, and fix every Patch finding (and the answered Decide
   findings). orchestra built and tested this commit just before you: do not run the full build.
   Run only the tests you touched, with no pipe that hides the exit code. Commit once:
   `fix(logic-review): <summary>`. orchestra commits `notes` itself: do not stage files under
   `docs/runs/` or `tmp/`. Do not review your own fixes again.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "logic-review",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 1, "noise": 0 },
  "evaluate": ["PriceCalculator.java:9 — a null amount now throws; before it returned null"],
  "files": ["<notes>/logic-review.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`. The report shows these lines to the human.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user;
a question goes into `decide`.
