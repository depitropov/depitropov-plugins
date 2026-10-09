---
name: review-layout
description: Reviews empty lines, static imports and helper classes in the changed Java code, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Layout review

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
4. Each finding names the rule number and `file:line`.
5. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/layout.md` in the triage notes format.
7. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
8. Otherwise fix every Patch finding and every answered Decide. Your fixes must not change
   behaviour. Run only the tests of the files you changed. Never pipe a test command: the pipe hides
   the exit code. Commit once: `fix(layout): <summary>`. orchestra commits `notes` itself: do not
   stage files under `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: indentation, line length and import order (Spotless does them), comments, log messages.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "layout",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 0, "noise": 1 },
  "evaluate": [],
  "files": ["<notes>/layout.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user; a
question goes into `decide`.

## Rules

Empty lines (rules 1–5) apply to `log.*`, `return` and `throw` statements and to `try`, `catch` and
`finally` blocks, in all Java code.

1. **One empty line before** each `log.*`, `return` and `throw` statement, and **one after** each
   `log.*` statement. Consecutive log statements have an empty line between each pair.
2. **Method body.** When a `log.*` or `return` is the first statement of a method, keep the empty
   line after the method's opening `{`.
3. **Other blocks** (`if`, `for`, `while`, …): no empty line after the block's `{`, and no empty line
   before any closing `}`. Inside such a block, a `return` or `throw` right after a `log.*` needs no
   empty line between them.
4. **A method body of one statement** (only a `return` or a `throw`) has no empty lines.
5. **`catch` and `finally`.** An empty line before `} catch` or `} finally`, and an empty line after
   its opening `{`. This wins over rule 3.

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
8. **A class with only static members** uses Lombok's `@UtilityClass` (it makes the class `final`,
   adds a private constructor that throws, and makes every member `static`), not a hand-written
   private constructor.
