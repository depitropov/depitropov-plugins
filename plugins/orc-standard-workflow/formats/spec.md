# Spec format

The spec document of one run is `<notes>/spec.md`. The `spec` step writes it. The `plan` and
`plan-check` steps write answered business facts into it. Every later step reads it.

## Template

```markdown
# Spec

## Goal
<the task as a concrete outcome that a test can check>

## Acceptance criteria
- AC1: Given <state>, when <action>, then <observable result>
- AC2: …

## Scope
In: <…>
Out: <…>

## Affected files
- `<path>` — <why>

## Patterns to reuse
- `<path>` — <the pattern the plan must follow>

## Integration points
- <service, API, schema or topic outside this change> — <what this change needs from it> — <source: path or URL, or "assumption">

## Assumptions
- <question> — <the default you took, and why>
- business fact: <what is missing> — options: <a> | <b>
```

## Rules

- Restate criteria the task gives in the given-when-then form. When the task gives none, derive
  them from the goal. A criterion describes behaviour a test can see, never the implementation.
- An acceptance criterion that depends on a missing business fact names the fact, for example
  "then the late fee is the daily fee times the days late".
- A repo the task names is read only. List the changes it needs under Integration points; the run
  does not make them.
- Keep the spec short. No code.

## Technical choices and business facts

An open question is one of two kinds:

- A **technical choice** has a sensible default: rounding mode, null handling, the order of two
  steps. Take the boring, minimal default, and record it where your skill says.
- A **business fact** never has a default: a rate, a price, a limit value, who qualifies. Never
  invent one. Write it under Assumptions as one line in this form, and the run stops after the
  spec step to ask a person:

  `- business fact: <what is missing> — options: <a> | <b>`

An **assumption that sets behaviour** is a line under Assumptions that changes what the code does:
null handling, where rounding happens, which limit is checked first. It needs a test, as an
acceptance criterion does.

## An answered business fact

When `decisions` answers a business fact, change the spec:

1. Remove its `business fact:` line from Assumptions.
2. Write the value into the acceptance criterion it belongs to, as a fact. Write only the value:
   add no example inputs or outputs that the spec and the answer do not give.

Write only values that `decisions` gives. Never invent one.
