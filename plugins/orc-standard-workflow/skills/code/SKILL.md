---
name: code
description: Implements the task of one orc-standard-workflow run, with tests, as small commits. Dispatched by orchestra; not for direct use.
---

# Code

## Inputs

- `spec`: the task and its acceptance criteria.
- `base`: the commit before any work.
- `build`: the command that builds the project and runs all tests.
- `guide` (optional): a skill with short rules for writing code in this stack.

## Procedure

1. Read `spec`. List what must be true when you are done.
2. If `guide` is given, invoke it and follow its rules.
3. Read the code you will change. Follow the patterns you find.
4. Make the smallest change that does the task. Write unit tests that prove each point of the
   spec.
5. Run `build`. Fix until it passes.
6. Commit in small steps, one commit per logical change. Use messages like `feat: <summary>`. Do not
   add files under `docs/runs/`.
7. Write the result JSON.

## Result

Write to the path given in the prompt:

```json
{ "stage": "code", "status": "ok", "files": ["<changed file>"] }
```

Use `"status": "failed"` and add `"reason"` if the build does not pass, or if you cannot do the
task.

## Permitted actions

Edit code and tests. Run the build. Commit. Do not push. Do not change branches. Do not ask the
user: when something is unclear, pick the simplest reading of the spec and write it in your commit
message as an assumption.
