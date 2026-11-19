# Plan format

The plan of one run is `<notes>/plan.md`. The `plan` step writes it, and `plan-check` fixes it.

## Template

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

## Rules

- Order the tasks so each one builds on the one before.
- One task is about four files at most and has one job. Split a bigger one.
- Every acceptance criterion is in at least one Tests line, with a named test.
- Decide here where the code lives. The coder follows the plan.
- No code: no class bodies, no method bodies, no build commands. A signature or ten lines of
  pseudo-code under Notes is the limit.
- Plan only what the spec has in scope. Do not reopen its assumptions.
- A `business fact:` line that `decisions` does not answer stays open. Name it in Notes; do not
  pick a value.
- The tasks are headed `### T1`, `### T2`, … in order, with no gap. The workflow reads these
  headings to start the coders.
