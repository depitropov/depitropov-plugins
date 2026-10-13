---
name: review-logging
description: Reviews the log statements of the changed Java code against the logging rules, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Logging review

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Get the change: `git diff <base> HEAD -- '*.java'`. Read each changed file in full. If the change
   has nothing in scope, write the result with `"status": "skipped"` and stop.
2. Check the lines this change adds or edits against each rule below. Code the change does not touch
   is not in scope.
3. The project's code wins. When the untouched code of the same kind in this project does it another
   way, follow the project: that rule is not a finding.
4. The title of each finding starts with its rule number, as in `▸ Rule 3: <title>`, and its "In the
   code" line gives `file:line`.
5. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/logging.md` in the triage notes format.
7. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
8. Otherwise fix every Patch finding and every answered Decide. Your fixes must not change
   behaviour. Run only the tests of the files you changed. Never pipe a test command: the pipe hides
   the exit code. Commit once: `fix(logging): <summary>`. orchestra commits `notes` itself: do not
   stage files under `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: empty lines around log statements (the layout gate), exception handling other than
rule 6 (the ops gate), comments.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "logging",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 0, "noise": 1 },
  "evaluate": [],
  "files": ["<notes>/logging.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user; a
question goes into `decide`.

## Rules

1. **Logger.** When the project uses Lombok, use `@Slf4j` on the class; the field is `log`. Do not declare
   `private static final Logger log = LoggerFactory.getLogger(...)` by hand.
2. **Placeholders.** Use `{}` placeholders. No string concatenation, no `%s` or `String.format` in a
   log call: the message is built even when the level is off.
3. **Message format.** A short message that starts with a capital letter and has no full stop at the
   end. Then the context, as `name: {}` pairs joined by `, `. Add every value that helps to
   investigate: primary keys, user input.

   ```java
   log.info("Order shipped, orderId: {}, carrierId: {}", orderId, carrierId);
   ```

4. **When the label is not needed.** The `name: {}` label says what a value is. Skip it when the line
   already says it:
   - a self-describing `toString()` (a `record`, Lombok `@ToString` or `@Data`, `ToStringBuilder`):
     use a bare `{}`. `log.debug("Loaded shipment {}", shipment);`, not `"…, shipment: {}"`.
   - a `{}` inside the sentence that names it: `log.info("Processing check-in for {} companies", count);`

   A scalar (`String`, a number, `boolean`, an `enum`, `Instant`) has no type or field name in its
   output, so outside a sentence it always needs `name: {}`, never `name={}` or a bare `{}`. Both
   forms may mix in one statement.
5. **Exceptions.** Log both `error: {}` with `e.getMessage()` and the exception itself as the last
   argument, with no placeholder for it:

   ```java
   log.error("Failed to process order, orderId: {}, error: {}", orderId, e.getMessage(), e);   // correct
   log.error("Failed to process order, orderId: {}", orderId, e);                              // no error: {}
   log.error("Failed to process order, orderId: {}, error: {}", orderId, e.getMessage());      // no exception object
   ```

6. **Log or rethrow, not both.** A catch that logs an exception and throws the same exception logs it
   twice. No `System.out` or `System.err`.
7. **Levels.**
   - ERROR: a system failure or data loss that needs attention now.
   - WARN: only a condition the system does not expect: an internal anomaly, an inconsistent state,
     something an operator may act on.
   - INFO: business events and the life cycle, and the expected outcomes of user or API calls, even
     when work is skipped: an entity not found for a stale id, a status change skipped because a
     concurrent update moved the record on, a duplicate event ignored.
   - DEBUG: diagnostics. TRACE: fine detail.

   Before WARN, ask: can normal user or API behaviour cause this? Then it is INFO. When unsure, trace
   where the data comes from: data from callers means INFO; data the system itself guarantees, being
   wrong, means WARN or ERROR.
8. **Sensitive data is never logged in plain text:** `password`, `secret`, `token`, `apiKey`,
   `accessToken`, `refreshToken`, `ssn`, `taxId`, card number, `cvv`, `pin`, bank account, routing
   number, and a full email address or phone number in production logs. When tracing really needs
   the value, and the project uses depitropov-commons, mask it with `DEStringUtils.hideString`
   (`import static dev.depitropov.commons.DEStringUtils.hideString;`). `hideString(value)` shows one
   character at each end, `hideString(value, n)` shows `n`; the output is
   `<first n>...<length>...<last n>`. Use it only when it is needed.
9. **Cost.** An expensive argument at DEBUG or TRACE, or a log inside a tight loop, sits inside
   `if (log.isDebugEnabled())`.
10. **Large objects in Quarkus.** When `pom.xml` has `io.quarkus` dependencies, a large object (a
    request or response body, a top-level DTO) goes in as `kv("name", object)`
    (`import static io.quarkiverse.loggingjson.providers.KeyValueStructuredArgument.kv;`). It needs
    no `{}`, and the line above the call is
    `//noinspection LoggingPlaceholderCountMatchesArgumentCount`. Never use `kv()` for a simple value
    such as an id. Never serialize the object yourself: `kv()` does it.

    ```java
    //noinspection LoggingPlaceholderCountMatchesArgumentCount
    log.info("Processing transaction, transactionId: {}", transactionId, kv("transaction", transactionDto));
    ```
