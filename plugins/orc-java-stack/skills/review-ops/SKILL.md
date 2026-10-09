---
name: review-ops
description: Reviews exception handling, argument checks and database migrations in the changed code, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Ops review

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Get the change: `git diff <base> HEAD -- '*.java' '*.sql'`. Read each changed file in full. If the change
   has nothing in scope, write the result with `"status": "skipped"` and stop.
2. Check the lines this change adds or edits against each rule below. Code the change does not touch
   is not in scope.
3. The project's code wins. When the untouched code of the same kind in this project does it another
   way, follow the project: that rule is not a finding.
4. Each finding names the rule number and `file:line`.
5. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/ops.md` in the triage notes format.
7. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
8. Otherwise fix every Patch finding and every answered Decide. Run only the tests of the files you
   changed. Never pipe a test command: the pipe hides the exit code. Commit once:
   `fix(ops): <summary>`. orchestra commits `notes` itself: do not stage files under
   `docs/runs/` or `tmp/`. Do not review your own fixes again. A fix that changes behaviour (a value now rejected, a different
   exception type, a changed check) must not contradict the brief or `decisions`: when it would, the
   brief wins and the finding is Evaluate. Otherwise the fix needs a test that fails without it.

Not yours: log statements (the logging gate), whether the behaviour is right (logic-review), comments.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "ops",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 0, "noise": 1 },
  "evaluate": [],
  "files": ["<notes>/ops.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user; a
question goes into `decide`.

## Rules

1. **Wrapping keeps the cause.** A caught exception that is wrapped goes in as the cause:
   `throw new ProcessingException("Failed to process order, orderId: " + id, e);`
2. **No swallowed exception.** A `catch` handles the exception, wraps it, or rethrows it. An empty
   `catch`, or one that only calls `printStackTrace()`, is a finding.
3. **No exceptions for normal control flow.**
4. **Catch the specific type.** Catch `Exception` only at a boundary that must not fail (a scheduler
   loop, a message listener), and say why on that line.
5. **Checked or unchecked.** A checked exception only when the caller can recover. An unchecked one
   for programming errors and states nobody can recover from.
6. **The message names the context:** the bad value, the id, the operation.
7. **A String argument is checked for blank, not only for null.** An empty or blank string is almost
   always as invalid as null. Check with `isNotBlank`, and with `ErrorUtils.isValidArgument` from
   `dev.depitropov.commons.errors` when the project uses it:

   ```java
   isValidArgument(externalId != null, "External ID cannot be null or empty");     // bad: accepts "" and "   "
   isValidArgument(isNotBlank(externalId), "External ID cannot be null or empty"); // good
   ```

   Trim on purpose, one way per flow:
   - normalize at the boundary: `trimToNull(value)` once on entry, check that it is not null, and
     pass only the trimmed value down; or
   - check and trim at use: `isNotBlank(value)` on entry, `trimToEmpty(value)` where it is used.
8. **Null and empty checks use Commons Lang, by meaning.** For null-or-blank strings:
   `StringUtils.isBlank` / `isNotBlank`, not `s == null || s.isBlank()`. For null-or-empty strings,
   collections, maps and arrays: `ObjectUtils.isEmpty` / `isNotEmpty`, not `x == null || x.isEmpty()`.
   `ObjectUtils.isEmpty("   ")` is false: never use it where blank is meant. (Static imports are the layout gate's.)
9. **One `CREATE INDEX CONCURRENTLY` per Flyway migration file, with `IF NOT EXISTS`.** PostgreSQL
   cannot run `CREATE INDEX CONCURRENTLY` in a transaction, so such a migration runs without one. If
   a later statement in the same file fails, the earlier ones stay applied, and the migration needs a
   manual repair. `IF NOT EXISTS` lets a retried migration pass an index that already exists.

   ```sql
   -- V220__add_order_customer_id_idx.sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS order_customer_id_idx ON orders (customer_id, id DESC);
   ```
