---
name: review-testing
description: Reviews the style of the changed Java tests against the testing conventions, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Testing conventions review

## Scope

Changed `.java` files under `src/test` are in scope. When the change has none, skip.

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
