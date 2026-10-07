---
name: code
description: Implements the task of one orc-standard-workflow run, with tests, as small commits. Dispatched by orchestra; not for direct use.
---

# Code

## Inputs

- `spec`: the task and its acceptance criteria.
- `base`: the commit before any work.
- `build`: the command that builds the project and runs all tests. orchestra runs it after you.
- `notes`: the run's notes folder.
- `guide` (optional): a skill with short rules for writing code in this stack.

## Procedure

1. Read `spec`. List what must be true when you are done.
2. If `guide` is given, invoke it and follow its rules.
3. Read the code you will change. Follow the patterns you find.
4. Make the smallest change that does the task. Write unit tests that prove each point of the
   spec.
5. Run only the tests for the code you changed, and fix until they pass. Do not run the full
   `build`: orchestra runs it right after you. Run `build` yourself only when you cannot run the
   affected tests on their own.
6. When the spec leaves a question open and a sensible default exists, take the default. Do not
   stop. Write each such choice as one line in `assumptions`.
7. Commit in small steps, one commit per logical change. Use messages like `feat: <summary>`.
   orchestra commits `notes` itself, and `tmp/` is never committed: do not stage files under
   `docs/runs/` or `tmp/`.
8. Write the result JSON.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "code",
  "status": "ok",
  "assumptions": ["The 50.00 limit applies to the amount before rounding."],
  "files": ["<changed file>"]
}
```

Use `"status": "failed"` and add `"reason"` if the tests do not pass, or if you cannot do the task.

## Permitted actions

Edit code and tests. Run tests and the build. Commit. Do not push. Do not change branches. Do not
ask the user.
