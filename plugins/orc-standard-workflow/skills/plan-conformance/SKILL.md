---
name: plan-conformance
description: Checks that the code of one orchestra run does what its plan promised — every task done, every named test present, no undeclared or out-of-scope change — and fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Plan conformance

You check the change against the plan. You give no verdict on whether the code is correct: logic-review
does that, from the brief alone. You check only that the plan was carried out.

## Inputs

- `spec`: the brief.
- `base`: the commit before any work.
- `notes`: the run's notes folder. It holds `plan.md` and `implementation-log.md`. Your findings file
  goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Read `<notes>/plan.md`, `<notes>/implementation-log.md` and `decisions` if given.
2. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`. Read the
   changed files in full. If nothing in the change concerns code or tests, write the result with
   `"status": "skipped"` and stop.
3. Check, and write down each check you made:
   - **Tasks done:** every task in the plan is in the code, complete. Nothing is stubbed, left as a
     placeholder, or skipped.
   - **Named tests:** every test that a task's Tests line names exists, with that class and method,
     and is not disabled. Whether it proves its criterion is logic-review's job, not yours.
   - **Deviations:** every change in the diff that departs from the plan is declared, with its
     reason, under Deviations in the implementation log. An undeclared deviation is a finding.
   - **Scope:** every changed file belongs to a task. A change outside every task is a finding.

   Commits that orchestra or its fixer made (`fix(<gate>): …`, `orchestra: …`) belong to no task and
   are not deviations: leave them out of these checks.
4. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
5. Write `<notes>/plan-conformance.md` in the triage notes format, with the checks of step 3 under
   **Checked**.
6. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
7. Otherwise fix every Patch finding: add a missing named test, finish a stubbed task, or add a
   missing Deviations entry to the implementation log when the deviation is right. Run only the tests
   you touched, with no pipe that hides the exit code. Never run the full build: orchestra runs it.
   Commit once: `fix(plan-conformance): <summary>`. Do not stage files under `docs/runs/` or `tmp/`:
   orchestra commits the notes, including the implementation log.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "plan-conformance",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 1, "evaluate": 0, "noise": 0 },
  "evaluate": [],
  "files": ["<notes>/plan-conformance.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`.

## Permitted actions

Read the project. Edit code, tests and the implementation log. Run tests. Commit. Do not push. Do not
change branches. Do not ask the user; a question goes into `decide`.
