---
name: logic-review
description: Reviews the code of one orchestra run against the spec alone — correctness, and a test for every criterion and behavioural assumption that fails on a wrong version — then fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Logic review

## Scope

The spec (`spec`) and `decisions` are your answer key. `decisions` holds the human's answers. They are part of the requirements.

Read only the spec, `decisions`, `formats/spec.md` of this plugin, the diff and the code. The plan, the implementation log and the
other review notes describe how the author saw the code; they would steer your judgement, so leave
them unread. `<notes>/code.md` is the one exception, and only in step 5.

Changed code and tests are in scope. When nothing in the change concerns code or tests, skip.

The project's code does not excuse a bug or a broken criterion.

## Steps

1. **Requirements first, before you read the change.** From the spec and `decisions`, write a list:
   - each acceptance criterion, and each assumption in the spec that sets behaviour, as
     `formats/spec.md` in the plugin folder (two folders above this skill's folder) defines it;
   - for each one, the behaviour it requires, with one concrete input and its expected output;
   - for each one, one likely wrong version of the code: the wrong rounding mode, rounding at the
     wrong step, `<` for `<=`, a missing null check, the wrong order of two steps.
2. **Each point has a test, and the test can fail.** For each point of step 1, find the code that does
   it and the test that proves it. A test must fail on the wrong version from step 1: check its input
   and its expected value against that version. Findings:
   - a point with no code, or no test;
   - a test that passes on the wrong version (its input cannot tell them apart);
   - a test with an empty or self-confirming assert, a disabled test, a mock of the unit under test,
     or a test that passes without the change.

   Put the list of step 1 under `## Checked`. For each point, add the test you found and whether it
   fails on the wrong version.
3. **Correctness.** Look for bugs in the changed code: wrong conditions, off-by-one, null handling,
   rounding, races, wrong error boundaries, security holes.
4. To check a claim, you may run a single test, or a small scratch check of a calculation.
5. Read `<notes>/code.md` now, and only to drop findings that repeat a recorded choice. A recorded
   choice that breaks a point of step 1 or causes a bug stays a finding. A recorded choice that
   changes behaviour (a check that throws, a new limit, a default) needs a test that fails without
   it, like a point of step 1; when it has none, that is a Fix finding. A `business fact:` line in
   `code.md` is not a repeat: it is a placeholder for a business fact nobody gave (see
   `formats/spec.md`), so it is a Decide finding.

## Fixing

A weak test gets an input that tells the right and the wrong version apart.
