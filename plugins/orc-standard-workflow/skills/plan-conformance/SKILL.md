---
name: plan-conformance
description: Checks that the code of one orchestra run does what its plan promised — every task done, every named test present, no undeclared change of direction, nothing outside the spec's scope — and fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Plan conformance

You check the change against the plan. You give no verdict on whether the code is correct: logic-review
does that, from the spec alone. You check only that the plan was carried out. The plan sets the
tasks and the direction, not every line: detail that the coder adds inside a task is not yours to
flag.

## Scope

Changed code and tests are in scope. When nothing in the change concerns code or tests, skip.

The project's code does not excuse a gap against the plan.

## Steps

1. Read `<notes>/plan.md`, `<notes>/implementation-log.md`, `<notes>/code.md` if it exists, and
   `decisions` if given.
2. Check, and write down each check you made under `## Checked`:
   - **Tasks done:** every task in the plan is in the code, complete. Nothing is stubbed, left as a
     placeholder, or skipped.
   - **Named tests:** every test that a task's Tests line names exists, with that class and method,
     and is not disabled. Whether it proves its criterion is logic-review's job, not yours.
   - **Direction:** a task done another way than the plan says (another approach, another class, a
     part of the task dropped) is declared, with its reason, under Deviations in the implementation
     log. An undeclared change of direction is a finding. Detail inside a task is not a deviation:
     an extra argument check, a helper method, a private name, a choice recorded in `<notes>/code.md`.
   - **Scope:** every change is inside the spec's scope. A change that the spec does not ask for
     (a new feature, a change to an unrelated class) is a finding. A small change that a task needs,
     such as a test helper or an import, is in scope.

   Commits that orchestra or its fixer made (`fix(<gate>): …`, `orchestra: …`) belong to no task and
   are not deviations: leave them out of these checks.

## Fixing

A fix adds a missing named test, finishes a stubbed task, or adds a missing Deviations entry to the
implementation log when the deviation is right. You may edit the implementation log for this.
Orchestra commits the implementation log with the notes.
