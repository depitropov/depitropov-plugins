# Clean-code rules

The rules that do not depend on the language. Each language skill adds its own numbered rules. A
finding cites a rule here as `Rule <n>`.

1. **Names say what, not how.** `remainingBudget`, not `calc`. A name that needs a comment is the
   wrong name.
2. **One job per function.** A function is a paragraph. When it has sections with heading comments,
   each section is a function.
3. **Small.** A function has at most 20 lines (blank lines and doc comments count), complexity at
   most 10, at most 3 parameters, and nesting at most 2. A test has at most 50 lines: a function in
   a file named `test_*.py`, `*_test.py`, `conftest.py`, `*.test.ts(x)`, `*.spec.ts(x)`,
   `*Test.java`, `*Tests.java` or `*IT.java`, or under `__tests__/` or `src/test/`. A file has at
   most 500 lines. Each suppression of a check carries its reason on its line. These numbers are
   the defaults of `shape.py`; a project may change them in its `CLAUDE.md` or `AGENTS.md`. The 20
   counts raw lines. A test gets more room because it builds its data and states its expectations
   in line.
   `measurement.md` says how to measure them. What crossing a limit usually means:
   - lines: the sections (declarations, setup, loop, output) are several jobs; extract each one;
   - complexity: an `if` chain or a `switch` that does several things; put it once behind
     polymorphism, or extract each branch;
   - parameters: arguments that travel together are a missing object; a flag argument is two
     functions (rule 4);
   - nesting: nested blocks hide the normal flow; return early with a guard clause, or extract each
     block into a one-line call;
   - file lines: more than one job in one file; split by job, not by line count.

   One exception: a flat `switch` or `match` whose arms answer one question can be over complexity
   10. It is not a finding; say why in the report. Never split it into helpers that take a flag the
   caller already knows.

   The Boy Scout Rule: leave each function you edited (its body or its signature) better in at
   least one measure, or with one fewer smell, when the step stays inside the task. A function you
   did not edit is not yours to clean. When an edited function stays over a limit, the finding says
   why, and what the split would be. On legacy code (`--legacy`, see `measurement.md`), that is not
   a finding.
4. **No flag arguments.** A boolean parameter that picks a path means two functions.
5. **No hidden side effects.** A function named like a query does not write.
6. **No duplication inside one responsibility.** Extract at the second copy, not the third, when
   both copies change for the same reason. Only true duplication counts: every change to one copy
   forces the same change to the other. Two similar views, queries or data shapes that serve
   different use cases, or different domain contexts, stay apart. Across contexts that change on
   their own, compare the duplication with volatility, ownership and release or runtime coupling.
   Extract a stable common mechanism only when the shared dependency is worth it.
7. **Errors are types.** A domain error is a class in the domain: not a string, not a status code,
   not a null with a comment.
8. **Comments explain why.** Intent, a warning, a consequence the reader would not expect. A comment
   that repeats the next line is deleted, and its reason goes into a better name. Code you cannot
   rename (a regular expression, an obscure library argument) is the one place where a comment may
   say what the code does.
9. **Dead code is deleted.** Not commented out, not kept "in case".
10. **Tests are code.** The same rules apply. One behaviour per test, not one assertion; a name that
    reads as a sentence; no logic in a test that needs its own test.
11. **The core works without the UI and the IO.** A handler, a component or a template asks a domain
    function for each decision and translates the answer into HTML, JSON or text. It does not
    compute the rule itself. Formatting is the adapter's job (dates, currency, labels, a greyed
    button); the decision behind the formatting is not. A correct import direction does not excuse a
    copy: an adapter that computes what a domain function already gives is wrong, and so is a
    domain function that only the tests call while the adapter keeps its own copy.
12. **Dependencies point inward.** A domain module does not import the ORM, the HTTP framework or a
    client library, does not take the framework's request object, and does not read an environment
    variable. It defines an interface; the adapter implements it, and the caller injects it. A
    stable platform facility, such as the standard library, is not a finding. Judge by the imports,
    not by the folder name.
13. **A simple typed value crosses a boundary.** No ORM row or entity, no request schema, no free
    map whose keys the receiver must know. The adapter translates. An error crosses in the form the
    inner module defines: the adapter turns an outside failure into a domain error, and a domain
    error into a transport error. A domain module never names a transport or framework error type.
