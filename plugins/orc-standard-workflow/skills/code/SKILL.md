---
name: code
description: Implements a range of plan tasks of one orc-standard-workflow run, with tests, one commit per task. Dispatched by orchestra; not for direct use.
---

# Code

You implement the plan tasks from `from` to `to`, in order, each with its tests and one commit.

## Inputs

- `spec`: the spec document, with the acceptance criteria.
- `plan`: the plan, with tasks `T1`, `T2`, ….
- `from`, `to`: the plan tasks you implement, both included. Do no other task.
- `base`: the commit before any work.
- `build`: for reference only: the command that builds the project and runs all tests. orchestra runs it after you.
- `notes`: the run's notes folder.
- `spec-format`: the format of the spec document.
- `decisions` (optional): the human's answers. The spec already holds them; read this only when
  the spec and the plan leave a value open.

## Procedure

1. If `<notes>/implementation-log.md` exists, read it. It says what earlier coders did.
2. For each task from `T<from>` to `T<to>`, in order:
   1. Read the task in `plan`, and the acceptance criteria it covers in `spec`. Read the code it
      touches.
   2. Do the task where the plan says. Write every test the task's Tests line names. Each test
      checks the behaviour of its criterion.
   3. Run only the tests for the code you changed, and fix until they pass. Run `build` yourself
      only when you cannot run the affected tests on their own.
   4. Commit once, with a message like `feat: <summary>`. Plan names such as `T3` or `AC2` never
      go into code, comments or commit messages.
   5. Add to `<notes>/implementation-log.md`:

      ```
      ## T<n> — <commit sha>
      - Files: …
      - Tests: …
      - Deviations: none, or what and why
      ```
3. Change the plan's design only where the plan is wrong about the code. Make the smallest correct
   change and write it under Deviations. Never add scope.
4. When a question is still open, do not stop. A technical choice gets a default: take it. A
   business fact, as the `spec-format` file defines it, should be in the spec already. If it is not, use a clear placeholder value and start its line with
   `business fact:`, so the review asks the human. Write each choice as one line in `assumptions`,
   and add the same lines to `<notes>/code.md`.
5. Write the result JSON.

## Result

```json
{
  "status": "ok",
  "assumptions": [
    "The loan limit counts loans that are not yet returned.",
    "business fact: the daily late fee is a placeholder of 0.50."
  ]
}
```

Use `"status": "failed"` and add `"reason"` if the tests do not pass, or if a task cannot be done
against the real code. Never delete or disable a test to get a pass.

## Permitted actions

Edit code and tests. Run tests and the build. Commit.
