---
name: review-general
description: Reviews exception handling, argument checks, money types and the Quarkus native-image rule in the changed Java code, then fixes them. An orchestra gate; dispatched by orchestra.
---

# General review

Java correctness rules that have no domain gate. When one subject grows, it moves to its own gate.

## Scope

Changed `.java` files are in scope. When the change has nothing that a rule covers, skip.

## Steps

1. Read `references/stack-reference.md` in the plugin folder, two folders above this skill's folder,
   not in the `references/` folder of this skill, and do what it says. Do this step before you read
   the change.

## Rules

### Exceptions

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

### Arguments

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
   `ObjectUtils.isEmpty("   ")` is false: never use it where blank is meant.

### Money

9. **Money is never binary floating point.** A money amount is a `BigDecimal`, never a `double`, a
   `float` or their boxed types. `BigDecimal` math whose result is money (division, rounding,
   `setScale`) names an explicit scale and `RoundingMode`. A money field in a shared DTO module
   (one that other services read, such as a shared DTO module) is Decide: changing its type
   changes the contract. Everywhere else it is Fix.

   ```java
   BigDecimal perVehicle = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
   ```
