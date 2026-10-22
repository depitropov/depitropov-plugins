# R11: Which SDD practices does orchestra not follow, and which fit?

Researched 2026-10-22 from the Superpowers 7.0.0 source
(`~/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.0/skills/subagent-driven-development/`:
`SKILL.md`, `implementer-prompt.md`, `task-reviewer-prompt.md`, `scripts/task-brief`,
`scripts/review-package`; `writing-plans/SKILL.md`) against `orc-standard-workflow` (`bin/next.js`,
the skills `plan`, `code`, `logic-review`) and orchestra (`lib/protocol.js`, the skill `fixer`).

## Question

Superpowers' subagent-driven development (SDD) is more exhaustive than our code stage and gates.
Which of its practices do we not follow, and which of those do not conflict with a settled decision?

## Short answer

Much of SDD's extra text is its review loop after every task, which is a different design from
our gates after the code (S7, S43, R3), not a gap. Seven practices fit with no conflict. Three are
cheap and live in a gate or in orchestra's code, not in a stage skill: a Review Focus step in
`logic-review`, one diff file per phase, and a "do not start subagents" line in every dispatch.
Five practices conflict with a settled decision and stay out.

## Findings

### Practices that fit

1. **Review Focus.** `writing-plans` lists "the five input classes or failure modes the spec implies
   but no task's tests exercise", and each gets a test: "its silence on an input is not permission
   for that input to break the program". `logic-review` checks each criterion and stated assumption
   against a wrong version, and hunts bugs, but never asks what input the brief leaves out. Source,
   strong. Value: high. Lives in: `logic-review` (a gate).
2. **Interfaces per task.** Each plan task has `Consumes` and `Produces` with exact signatures, and
   SDD's pre-flight scan checks every pair of tasks that share one. Our coders learn what earlier
   chunks built only from `implementation-log.md`. Source, strong. Value: medium. Lives in: the task
   format of `plan` (a new line in a stage skill), or a check in `plan-check`.
3. **A brief per task.** `scripts/task-brief` copies one task's text to a file; "Never make a
   subagent read the whole plan file". Our coder reads the whole plan and does `from`..`to`. Source,
   strong. Value: medium. Lives in: `next.js`, as code. Not checked: whether `plan-conformance` needs
   the coder to have seen the whole plan.
4. **One diff file per review.** `scripts/review-package` writes the commit list, the stat and
   `git diff -U10` to one file that the reviewer reads once. Each of our agent gates runs `git diff`
   itself, with its own exclusions. Source, strong. Value: medium (cost, and every gate sees the same
   diff). Lives in: `gates.js`.
5. **No subagents from workers.** Implementer and reviewer prompts forbid spawning helpers or
   reviewers: in real sessions such a reviewer "duplicated the task review … a full extra review
   seat per task". Nothing in our prompts forbids it on Claude Code. Source, strong; the cost claim
   is Superpowers' own observation, not measured here. Value: medium. Lives in: `withPrompt`.
6. **Concerns and cost if wrong.** The implementer status `DONE_WITH_CONCERNS`, and every ruling
   ends "what it costs if wrong". Our coder returns `ok` or `failed` and `assumptions`, with no field
   for doubts. Source, strong. Value: low to medium. Lives in: the result JSON of `code`; concerns go
   to `evaluate`.
7. **Pristine test output.** "Warnings or other noise in the implementer's reported test output are
   findings." Source, strong. Value: low. Lives in: a stack's code guide.

### Already covered, or stronger here

| SDD practice | orchestra |
|---|---|
| "Do not trust the report" | `logic-review` reads neither the plan nor the log |
| Tests verify real behaviour, not mocks | `logic-review`: each test must fail on a named wrong version |
| The reviewer does not re-run the suite | Every gate says so |
| A plan-mandated defect is still a finding | `logic-review` never reads the plan |
| Minor findings to the ledger, then the final review | Triage bucket Evaluate, then `report.md` |
| A final review of the whole branch | The three phases on the whole diff |
| A ledger that survives compaction | Result files and a deterministic `next.js` |
| Artifacts handed over as files | Inputs are paths |
| A pre-flight scan of the plan | `plan-check`, against the real code |

orchestra has things SDD does not: triage with a real Decide, business facts that stop a run, stack
gates, and the order of steps in code.

### Practices that conflict

| SDD practice | Conflicts with |
|---|---|
| A model per role; a stronger model in fix rounds 4–5 | Scope: one model for everything |
| A review after every task, up to 5 fix rounds | S7, S43 (S81 offers it through the Superpowers workflow) |
| A scoped re-review after each fix | S14: a gate never re-reviews its own fixes |
| The implementer asks questions before it starts | S12: the standard workflow is headless |
| The controller rules on a plan problem and goes on | S63: a business fact stops the run |

## Recommendation

Take 1, 4 and 5 first: they live in a gate or in orchestra's code and add no line to a stage skill.
Then consider 3 (code in `next.js`) and 6 (the result JSON). Weigh 2 against the rule to keep stage
skills lean; a check in `plan-check` is the leaner form. Leave 7 to each stack.

## Evidence gaps

- None of the seven is measured on a run: the value ratings are judgement.
- Not checked: whether a per-chunk brief changes what `plan-conformance` finds.
- Not measured: how often our coders or gates spawn subagents today.
