---
name: review-testing
description: Reviews the style of the changed Java tests against the testing conventions, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Testing conventions review

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Get the change: `git diff <base> HEAD -- '*src/test/*.java'`. Read each changed file in full. If the change
   has nothing in scope, write the result with `"status": "skipped"` and stop.
2. Check the lines this change adds or edits against each rule below. Code the change does not touch
   is not in scope.
3. The project's code wins. When the untouched code of the same kind in this project does it another
   way, follow the project: that rule is not a finding.
4. The title of each finding starts with its rule number, as in `▸ Rule 3: <title>`, and its "In the
   code" line gives `file:line`.
5. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/testing.md` in the triage notes format.
7. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
8. Otherwise fix every Patch finding and every answered Decide. Run only the tests of the files you
   changed. Never pipe a test command: the pipe hides the exit code. Commit once:
   `fix(testing): <summary>`. orchestra commits `notes` itself: do not stage files under
   `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: whether a test exists and can fail (logic-review owns that), static imports of enum constants (the layout gate), comments.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "testing",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 0, "noise": 1 },
  "evaluate": [],
  "files": ["<notes>/testing.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user; a
question goes into `decide`.

## Rules

1. **AssertJ.** When the project has AssertJ, assert with `assertThat(actual).isEqualTo(expected)`,
   not JUnit's `assertEquals`. For JSON, use `assertThatJson` (json-unit) when the project has it.
2. **Business errors.** When the project uses depitropov-commons, assert a `BusinessRuleException`
   with `assertBusinessRuleException` from `dev.depitropov.commons.test.DETestErrorHandlingUtils`, never with
   `assertThrows(BusinessRuleException.class, …)`:

   ```java
   assertBusinessRuleException(() -> service.call(), BAD_REQUEST_GENERAL);
   assertBusinessRuleException(() -> service.call(), BAD_REQUEST_GENERAL, "Expected error message");
   assertBusinessRuleException(() -> service.call(id), BAD_REQUEST_GENERAL, "Error, itemId: %s", id);
   assertBusinessRuleException(() -> service.call(), BAD_REQUEST_GENERAL,
       message -> assertThat(message).contains("partial text"));
   ```

3. **Errors at the HTTP edge.** When the project uses depitropov-commons: there the exception is already an `ErrorDto` body, so there is
   nothing to catch. Assert the body string with
   `assertErrorDto(body, BAD_GATEWAY_GENERAL, "Upstream service unavailable")` from the same class;
   an empty message skips the details check. Assert the HTTP status apart, with the test client.
4. **`assertSoftly` only for four or more** consecutive related assertions. Three or fewer stay
   plain `assertThat`.
5. **Inside `assertSoftly`, only assertions.** Act and arrange before the block. Do not mix a plain
   `assertThat` into the block: its failure skips the remaining soft checks. Check an intermediate
   object with `isNotNull()` before the block, when the block reads through it
   (`result.getLocation().getStreet()`): a null inside the block throws instead of reporting.
6. **Repeated assertion blocks become a helper.** When the same two or more assertions on one
   subject appear in several tests, extract a private `assert<What>` method, with parameters for the
   values that change between tests.
7. **Input variants go in one parameterized test.** The same check for null, empty and blank input
   is one `@ParameterizedTest` with `@NullAndEmptySource`, `@ValueSource(strings = {"   "})` or
   `@MethodSource`, not one method per value.
8. **Names and order.** A test name says the behaviour (`shouldThrowWhenUserIsNull`). The body is in
   arrange, act, assert order.
