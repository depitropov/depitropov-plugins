---
name: review-logging
description: Reviews the log statements of the changed Java code against the logging rules, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Logging review

## Scope

Changed `.java` files are in scope. When the change has no `.java` file, skip.

## Steps

1. Read `references/stack-reference.md` in the plugin folder, two folders above this skill's folder,
   not in the `references/` folder of this skill, and do what it says. Do this step before you read
   the change.

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
