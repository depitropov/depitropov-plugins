---
name: code-guide
description: Short Java rules for writing code and tests. Invoked by the code stage of an orchestra workflow; can also be invoked by hand.
---

# Java code guide

Use these rules when you write Java code and tests. The project's own code wins over a rule: when
the project does it another way, follow the project.

## Build and tests

1. Use the Maven wrapper `./mvnw` with `-B`, never a global `mvn`. If the project has
   `.mvn/settings.xml`, add `-s .mvn/settings.xml`.
2. Run one test class with `./mvnw -B test -Dtest=<TestClass>`. In a multi-module project add
   `-pl <module> -am`.
3. Write the output to a log file and check the exit code. Read the end of the log for the result.
4. In the Surefire summary, `Failures` means an assertion failed. `Errors` means the test did not
   run to its assertions. Fix an error before you judge the code.

## Code

5. Names say what a thing is or does: nouns for classes, verbs for methods. No `Manager` or
   `Helper` with no context.
6. Keep a method short and on one job. Pass a small object, not a long list of parameters.
7. Money uses `BigDecimal` with an explicit scale and `RoundingMode`. Compare with `compareTo`,
   never `equals`.
8. Check arguments at the public entry of a class. Throw an exception that names the bad value.
9. Keep fields `private final` where you can. Prefer a `record` for a data holder.

## Tests

10. Use JUnit 5. Use AssertJ when the project has it; otherwise use JUnit's assertions.
11. One behaviour per test. Arrange, act, assert, in that order.
12. Use `@ParameterizedTest` for the same check over many values, for example the values around
    a limit.
13. Never delete or disable a test to get a pass.
