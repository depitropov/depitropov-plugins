---
name: fix-build
description: How to fix a failed npm install, build or test run in a TypeScript project. A fix guide for the orchestra fixer.
---

# Fix a TypeScript build

1. Find the first error in the log. Later errors often come from the first one.
   - `npm ci` fails (`npm ERR!`, a lock file that does not match `package.json`): do not add, remove
     or upgrade a dependency, and do not edit `package-lock.json`. Report it in the result as
     `failed` with the reason.
   - `npm ERR! Missing script: "test"`: the project has no test script. Report it as `failed` with
     the reason. Do not add a script.
   - A type error (`error TS<number>`): fix the code at the reported `file:line`.
   - A failing test: open the test and the code it tests. Decide which one is wrong, using the spec.
     Fix the code when the test matches the spec.
2. Run the single failing test file first, with the test runner that the `test` script in
   `package.json` names (for example `npx vitest run <file>` or `npx jest <file>`). Then run the full
   build command from the log's first line.
3. Do not skip, focus or delete a test (`.skip`, `.only`, `xit`), and do not change the `test`
   script to make the build pass.
