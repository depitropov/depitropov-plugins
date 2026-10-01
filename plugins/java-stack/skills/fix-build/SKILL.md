---
name: fix-build
description: How to fix a failed Maven build or test run in a Java project. A fix guide for the orchestra fixer.
---

# Fix a Java build

1. Find the first error in the log. Later errors are often caused by the first one.
   - `COMPILATION ERROR`: fix the code at the reported `file:[line,col]`.
   - `Tests run: … Failures: …`: open the failing test and the code it tests. Decide which one is
     wrong, using the spec. Fix the code when the test matches the spec.
   - `Could not resolve dependencies`: do not add or change dependencies. Report it in the result
     as `failed` with the reason.
2. Run the single failing test first: `./mvnw -B -Dtest=<TestClass>#<method> test`. Then run the
   full build command from the log's first line.
3. Do not use `-DskipTests`, `@Disabled`, or `-Dmaven.test.failure.ignore`.
