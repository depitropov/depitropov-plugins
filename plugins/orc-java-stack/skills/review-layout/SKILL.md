---
name: review-layout
description: Reviews empty lines, static imports and helper classes in the changed Java code, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Layout review

## Scope

Changed `.java` files are in scope. When the change has no `.java` file, skip.

## Rules

Empty lines (rules 1–5) apply to `log.*`, `return` and `throw` statements and to `try`, `catch` and
`finally` blocks, in all Java code.

1. **One empty line before** each `log.*`, `return` and `throw` statement, and **one after** each
   `log.*` statement. Consecutive log statements have an empty line between each pair.
2. **Method body.** When a `log.*` or `return` is the first statement of a method, keep the empty
   line after the method's opening `{`.
3. **Other blocks** (`if`, `for`, `while`, …): no empty line after the block's `{`, and no empty line
   before any closing `}`. Inside such a block, a `return` or `throw` right after a `log.*` needs no
   empty line between them. The empty line before `} catch` or `} finally`, and the one after their
   opening `{`, follow rule 5.
4. **A method body of one statement** (only a `return` or a `throw`) has no empty lines.
5. **`catch` and `finally`.** An empty line before `} catch` or `} finally`, and an empty line after
   its opening `{`.

   ```java
   public String process(String id) {

     log.debug("Process called, id: {}", id);

     if (id == null) {
       log.warn("Null id received");
       return null;
     }

     try {
       doSomething(id);

     } catch (Exception e) {

       log.error("Failed to process, id: {}, error: {}", id, e.getMessage(), e);

       notifyFailure(id);
     }

     return transform(id);
   }

   public int getValue() {
     return value;
   }
   ```

6. **Enum constants are statically imported** in all Java code, production and tests: comparisons,
   `switch` cases, arguments, assertions, test data. When two enums in one file have a constant with
   the same name, keep the qualified form for those constants only.

   ```java
   import static com.example.order.OrderStatus.PENDING;

   if (order.getStatus() != PENDING) {   // not OrderStatus.PENDING
   ```

7. **Static imports for frequent static calls** (`assertThat`, `kv`, `Math.*`), unless the bare name
   loses its meaning (`of`, `min`, `EMPTY`): then keep the class name. Never a wildcard static import
   (`import static ….*`).
8. **A class with only static members**, in a project that uses Lombok, uses `@UtilityClass` (it makes the class `final`,
   adds a private constructor that throws, and makes every member `static`), not a hand-written
   private constructor.
