---
name: code
description: Implements a range of plan tasks of one orc-standard-workflow run, with tests, one commit per task. Dispatched by orchestra; not for direct use.
---

# Code

## Inputs

- `spec`: the brief, with the acceptance criteria.
- `plan`: the plan, with tasks `T1`, `T2`, ….
- `from`, `to`: the plan tasks you implement, both included. Do no other task.
- `base`: the commit before any work.
- `build`: the command that builds the project and runs all tests. orchestra runs it after you.
- `notes`: the run's notes folder.
- `guide` (optional): a skill with short rules for writing code in this stack.

## Procedure

1. If `guide` is given, invoke it and follow its rules.
2. If `<notes>/implementation-log.md` exists, read it. It says what earlier coders did.
3. For each task from `T<from>` to `T<to>`, in order:
   1. Read the task in `plan`, and the acceptance criteria it covers in `spec`. Read the code it
      touches.
   2. Do the task where the plan says. Write every test the task's Tests line names. Each test
      checks the behaviour of its criterion.
   3. Run only the tests for the code you changed, and fix until they pass. Do not run the full
      `build`: orchestra runs it after you. Run `build` yourself only when you cannot run the
      affected tests on their own. Never pipe a test or build command through `tail`, `head` or
      `grep`: the pipe hides the exit code. Write the output to a file, check the exit code, then
      read the end of the file.
   4. Commit once, with a message like `feat: <summary>`. Plan names such as `T3` or `AC2` never
      go into code, comments or commit messages. orchestra commits `notes` itself, and `tmp/` is
      never committed: do not stage files under `docs/runs/` or `tmp/`.
   5. Add to `<notes>/implementation-log.md`:

      ```
      ## T<n> — <commit sha>
      - Files: …
      - Tests: …
      - Deviations: none, or what and why
      ```
4. Change the plan's design only where the plan is wrong about the code. Make the smallest correct
   change and write it under Deviations. Never add scope.
5. When a question is still open, do not stop. A **technical choice** has a sensible default:
   take it. A **business fact** (a rate, a price, a limit value, who qualifies) should be in the
   brief already. If it is not, use a clear placeholder value and start its line with
   `business fact:`, so the review asks the human. Write each choice as one line in `assumptions`,
   and add the same lines to `<notes>/code.md`.
6. Write the result JSON.

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

Use `"status": "failed"` and add `"reason"` if the tests do not pass, or if a task cannot be done
against the real code. Never delete or disable a test to get a pass.

## Permitted actions

Edit code and tests. Run tests and the build. Commit. Do not push. Do not change branches. Do not
ask the user.
