# Decisions

The full record of the deliberate decisions that shape the framework: the question, the options, the
evidence, the choice and what it costs. `docs/TENSIONS.md` stays the short index: every settled
decision has one row there. A decision that needed a real weighing of options also gets an entry here,
under the same `S` number.

## When to add an entry

Add an entry when the user and the agent weigh options and pick one on purpose, for example after
research, after a run's feedback, or when a port changes the source's behaviour. A plain bug fix or a
wording change needs no entry.

## Entry format

```markdown
## S<n>: <title>

- **Date:** <yyyy-mm-dd>
- **Status:** decided | open | replaced by S<m>
- **Question:** <what had to be decided, in one or two sentences>
- **Options:** <each option, with its trade-off>
- **Evidence:** <the research note (`docs/research/R<n>`), the run, or the inventory row behind it>
- **Decision:** <what we chose>
- **Cost and risk:** <what we give up, and what to watch>
- **Where it lives:** <the files that carry it>
```

---

## S67: plan-conformance checks direction, not detail

- **Date:** 2026-10-08
- **Status:** decided
- **Question:** In the library-loans run, the coder added argument checks that the plan did not name.
  It recorded them in `code.md`, as the code skill asks. plan-conformance raised them as an
  undeclared deviation. Should the plan be followed line by line, and who checks the extra behaviour?
- **Options:**
  1. Keep it strict: every departure from the plan is declared. The plan must then name every check,
     which it never aims to do. The findings cost work and add no value.
  2. Soften it: check that no task is skipped or half done, that a change of direction is declared,
     and that nothing falls outside the brief's scope. Detail inside a task is the coder's call.
  3. Drop plan-conformance: logic-review already checks that each acceptance criterion has code and a
     test. Then scope creep and half-done tasks have no check.
  4. Also make the plan write its behaviour choices (such as a rounding mode) into the brief, so that
     logic-review sees them.
- **Evidence:** the library-loans run in `orchestra-sample-java` and an outside review of it: a false
  Patch from plan-conformance for the argument checks, and no test for those checks.
- **Decision:** Option 2. plan-conformance also reads `code.md`; a recorded choice is not a
  deviation. Because the extra behaviour now passes plan-conformance, logic-review step 6 requires a
  test that fails without a recorded choice that changes behaviour; a missing test is Patch. Option 4
  is rejected: it blurs which stage writes the brief. If the next runs show that plan-conformance finds
  nothing real, go to option 3.
- **Cost and risk:** "direction" is a judgement, so the gate can now miss a real change that it calls
  detail. logic-review still checks the behaviour against the brief. This changes one part of S66:
  the conformance gate no longer checks the plan line by line.
- **Where it lives:** `orc-standard-workflow/skills/plan-conformance`, step 6 of
  `orc-standard-workflow/skills/logic-review`.

---

## S66: What the logic reviewer sees

- **Date:** 2026-10-08
- **Status:** decided
- **Question:** The logic-review gate checks the code against the acceptance criteria and judges
  whether each test would fail on a wrong version of the code. Should it also see the plan and the
  coder's implementation log, or only the requirements and the code?
- **Options:**
  1. Give it the plan and the log. It can then see undeclared deviations and missing tasks. But the
     plan is the author's view of the code, and it can anchor the reviewer.
  2. Give it only the brief, the answers in `decisions.md`, the diff and the code. It judges the code
     against the requirements alone. It cannot see deviations from the plan.
  3. Option 2, plus a separate plan-conformance check that compares the plan with the diff and gives
     no verdict on correctness.
- **Evidence:** `docs/research/R5-reviewer-context.md`. Author framing makes LLM reviewers miss bugs
  (measured, in a hostile setting); "ignore it" instructions only partly help; working out the
  required behaviour first improves verification (measured); tests derived from the code repeat its
  bugs (measured). No study measures plan exposure in a normal pipeline. Also the order-pricing run:
  logic-review reported 0 findings while a rounding test could not fail on a wrong rounding mode.
- **Decision:** Option 3.
  - logic-review gets the brief, `decisions.md` (whenever it exists), the diff and the code. No plan,
    no implementation log.
  - It first writes down what each acceptance criterion and each behavioural assumption requires, and
    one likely wrong version of the code for each. Then it reads the code, and checks that each test
    fails on the wrong version.
  - It reads `<notes>/code.md` (the coder's recorded choices) only after it has its findings, and only
    to drop repeats.
  - Conformance to the plan is a second agent gate, `plan-conformance`, declared by the workflow before
    logic-review in `implementation-check`. It sees the plan, the implementation log and the diff. It
    checks that every task is done, every named test exists, and no change falls outside the plan or
    goes undeclared. It gives no verdict on correctness. The two gates write separate results; the
    report shows both.
  - Rejected for conformance: a check in code. It is cheaper and cannot be biased, but it cannot see a
    task that is only half done.
- **Cost and risk:** A reviewer without the plan may flag a deliberate choice it cannot see a reason
  for; the conformance gate and the coder's recorded choices cover that. One more subagent per run
  (about 34k tokens of fixed start-up cost). The cost of hiding the plan
  is reasoned, not measured: watch the next runs for findings the plan would have prevented.
- **Where it lives:** plan 3.3: `orc-standard-workflow/skills/logic-review`, the new skill
  `orc-standard-workflow/skills/plan-conformance`, the workflow's `orchestra.json`, the gate runner's
  inputs.

## S68: The Java port keeps the coder lean and puts the stack rules in reviewers

- **Date:** 2026-10-09
- **Status:** decided
- **Question:** java-stack gives the coder and the reviewer the same long skills: SOLID, Clean
  Architecture, patterns, style, logging, tests. What do we port, where does it go (write time or
  review time), and what do we leave behind as debt?
- **Options:**
  1. Port 1:1, as write-time skills and one broad reviewer. Rejected: R6 finds no gain from generic
     principles or personas and some cost (more code, more abstraction), and broad reviewers
     over-report (R3).
  2. A thin write-time layer of 5–15 rules plus reviewers (R3's recommendation). Rejected for now:
     R6 finds no measured gain from the general rules that would fill it, and the user wants the
     stage skills lean.
  3. Write time holds only facts the model cannot guess (test commands); every convention goes to a
     focused reviewer with numbered rules. Chosen.
- **Evidence:** `docs/research/R6-coder-guidance.md` (personas: no gain on code; quality prompts:
  cleaner start, same decay, higher cost; a bad plan is worse than none; vendors: models are literal
  and over-build). `docs/research/R3-write-vs-review-time.md` (named-rule reviewers reach 75–80%
  precision). The grilling of 2026-10-09, Q1–Q18.
- **Decision:** `code-guide` = test-command facts; no `plan-guide`; gates ops, testing, comments,
  logging, layout and Spotless; no structure gate (clean-code later, at workflow level); dropped:
  SOLID, Clean Architecture, the pattern list, the performance, security, concurrency and
  documentation lists, member order, the entities, converters and DTOs gates,
  `java-maven-upgrade`, the `java` index, the Spotless set-up and hooks, Spring `scValue`. The
  personal repo names depitropov-commons helpers (`DEStringUtils.hideString`,
  `DETestErrorHandlingUtils`, `ErrorUtils.isValidArgument`).
- **Cost and risk:** each agent gate costs a subagent per run (follow-up 4 measures whether each one
  earns it). With no structure gate until clean-code arrives, over-engineering is caught only by
  logic-review and plan-conformance. A rule from a house style may not fit another project: the
  "project's code wins" line is the guard. The ship.cars port must swap the helper names back.
- **Where it lives:** `plugins/orc-java-stack/orchestra.json`, `plugins/orc-java-stack/skills/`,
  `plugins/orchestra/lib/gates.js`, `plugins/orchestra/lib/runner.js`, `PORT-TO-SC.md`.
