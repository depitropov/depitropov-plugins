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

## S66: What the logic reviewer sees

- **Date:** 2026-10-08
- **Status:** decided (inputs and order). Open: how the plan-conformance check is built.
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
  - Conformance to the plan is checked separately. Open: a check in code (a workflow tool gate: named
    tests exist, changed files are listed in the plan; cheap and unbiased) or a second agent pass (can
    also see a task that is only half done).
- **Cost and risk:** A reviewer without the plan may flag a deliberate choice it cannot see a reason
  for; the conformance check and the coder's recorded choices cover that. The cost of hiding the plan
  is reasoned, not measured: watch the next runs for findings the plan would have prevented.
- **Where it lives:** plan 3.3 (to be written): `orc-standard-workflow/skills/logic-review`, the gate
  runner's inputs, the plan-conformance check.
