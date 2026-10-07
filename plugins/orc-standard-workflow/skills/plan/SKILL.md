---
name: plan
description: Writes the task plan of one orc-standard-workflow run from its brief, with no code. Dispatched by orchestra; not for direct use.
---

# Plan

You split the brief into small, ordered tasks for the coder. You do not write code and you do not
ask the user.

## Inputs

- `spec`: the brief, with the acceptance criteria.
- `notes`: the run's notes folder. You write `plan.md` here.
- `guide` (optional): a skill with short rules for planning in this stack.
- `decisions` (optional): the human's answers to open business facts and earlier questions.

## Procedure

1. Read `spec`. If `guide` is given, invoke it and follow its rules.
2. If `decisions` is given, read it. For each answered business fact, change the brief: remove the
   `business fact:` line from Assumptions and write the value into the acceptance criterion it
   belongs to, as a fact. Plan with these values. Never plan around a value that the brief or
   `decisions` does not give.
3. Read the files the brief names under "Affected files" and "Patterns to reuse". Check that they
   exist as the brief says.
4. Write `<notes>/plan.md` in the format below.
5. Write the result JSON.

## `plan.md`

```markdown
# Plan

## Approach
<one paragraph: how the change fits this code, which patterns it reuses, what it does not do>

## Tasks

### T1 — <title>
- Files: create `<path>`; modify `<path>`
- Does: <the task's job, in prose>
- Tests: `<TestClass#method>` covers AC1; `<TestClass#method>` covers AC2
- Notes: <optional: a signature, a class to copy, at most ten lines of pseudo-code>

### T2 — …
```

Rules:
- Order the tasks so each one builds on the one before.
- One task is about four files at most and has one job. Split a bigger one.
- Every acceptance criterion is in at least one Tests line, with a named test.
- Decide here where the code lives. The coder follows the plan.
- No code: no class bodies, no method bodies, no build commands. A signature or ten lines of
  pseudo-code under Notes is the limit.
- Plan only what the brief has in scope. Do not reopen its assumptions.
- A `business fact:` line that `decisions` does not answer stays open. Name it in Notes; do not
  pick a value.

## Result

Write to the path given in the prompt:

```json
{ "stage": "plan", "status": "ok", "files": ["<notes>/plan.md"] }
```

Use `"status": "failed"` and add `"reason"` only if the brief cannot be planned.

## Permitted actions

Read the project. Write `<notes>/plan.md`, and edit `<notes>/brief.md` only to record answered
business facts. Do not change code. Do not commit. Do not ask the user.
