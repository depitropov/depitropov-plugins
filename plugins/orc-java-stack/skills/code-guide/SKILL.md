---
name: code-guide
description: Facts for running the tests of a Maven project. Invoked by the code stage of an orchestra workflow.
---

# Java code guide

Facts about the test tools. The project's own set-up wins: when it runs tests another way, follow it.

1. Use the Maven wrapper with batch mode: `./mvnw -B`. When `.mvn/settings.xml` exists, add
   `-s .mvn/settings.xml`, or the private dependencies do not resolve.
2. One test class: `-Dtest=<TestClass>`. One method: `-Dtest=<TestClass>#<method>`. More methods of
   one class: `<TestClass>#<m1>+<m2>`. Methods of different classes: a comma between them.
3. In a multi-module project, add `-pl <module> -am`. Without `-am`, Maven takes the other modules
   from old SNAPSHOT jars, and the errors (an unsatisfied CDI dependency, `NoSuchMethodError`) are
   not in your code. With `-Dtest` across modules, also add `-Dsurefire.failIfNoSpecifiedTests=false`,
   or every module with no match fails. `-DfailIfNoTests=false` does not do this.
4. In the Surefire summary, `Failures` means an assertion failed: judge the code. `Errors` means the
   test did not reach its assertions (set-up, a missing resource, an old `target/`): make the test run
   first, then judge the code. A run that was stopped can leave `target/test-classes` half full. Run
   again, or clean the module.
