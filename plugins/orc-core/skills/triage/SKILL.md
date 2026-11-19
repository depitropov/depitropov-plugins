---
name: triage
description: The method for sorting review findings into Decide, Fix, Report and Noise, with the axes, the rules, the finding format and the notes format. Invoked by a judging step when an orchestra run gives it as the triage shared role.
---

# Triage

Every finding of a judging step gets its axes and exactly one bucket. The bucket
sets the action. Severity labels (critical, high, low) are not used: the bucket tells the run what to
do, and the flags carry the urgency.

## The five axes

| Axis | Values | Question |
|---|---|---|
| **Origin** | `plan-gap` · `spec-deviation` · `coder-miss` (built code only) · `newly-found` | Where does the gap come from? A hole in the plan, a drift from the spec, a coding mistake, or something nobody saw before? |
| **Risk** | High · Mid · Low | What do we risk if it stays unfixed? |
| **Fix-Risk** | High · Mid · Low | How risky is the fix itself? **Low**: one line, plain. **Mid**: some new code, nothing dangerous, unit tests cover it. **High**: new flows, new tables, new libraries, existing logic rebuilt. |
| **Probability** | High · Mid · Low · `—` | How likely are we to hit it (an edge case, a race)? `—` for a mismatch: a plan that disagrees with the code is certain, not probable. |
| **Impact** | `race-condition` · `edge-case` · `bug` · `security` · `performance` · `plan-inconsistency` · `improvement` | What kind of problem is it? The closest label wins. A `security` finding keeps its own label, always. |

## Check the finding first

Before you bucket a finding, read the code or the document it names. A finding that is wrong gets no
bucket: list it under Noise as `rejected: <the evidence>`, and leave it out of the tally. The `noise`
array still holds it. A check that passes is not a finding: list it under `## Checked`, not in a
bucket.

## The bucket: the first rule that matches wins

The rules from our runs (below) come before this table. Apply them first; use the table for every
finding they do not settle.

| # | Rule | Bucket |
|---|---|---|
| 1 | The Decide test below holds: a real fork AND a call that is not yours | **Decide** |
| 2 | Probability Low AND Risk Low AND Fix-Risk Mid or High | **Noise** |
| 3 | Fix-Risk Low; or Fix-Risk Mid AND Risk Mid/High AND Probability Mid/High; or any mismatch inside or between the plan, the spec and the docs (fixed by editing the document) | **Fix** |
| 4 | Everything else (Fix-Risk High; Fix-Risk Mid with Risk or Probability Low) | **Report** |

### The Decide test

Decide needs both halves. One half alone is not Decide.

**Half A: a real fork.** You can name two or more concrete fix options with materially different
trade-offs, not only cosmetic ones. Or the finding challenges a choice that the spec or the plan already made, and you can
name the other options. List the options in the finding. A missing product answer meets half A by itself: its options are
the possible values. Name the known candidates, or write "value needed". No fork, no Decide: a finding with one
obvious fix is Fix or Report, however serious it feels.

**Half B: the call is not yours.** At least one of:

- **B1, a product answer you cannot read anywhere.** The right option depends on what the product
  must do, and no source you can read gives it: not the code, the task, the spec, the plan, the acceptance
  criteria, `decisions` or the repo's docs. More reading does not settle it: only the product owner
  knows. Do not guess. A rate, a price, a limit value, who qualifies: such a product answer is
  always B1. Take no "safe" default for a product
  answer: invented product behaviour is the one mistake a later review cannot see.
  A **technical choice** is not B1: rounding mode, null handling, the order of two steps, a limit
  before or after rounding. It has a sensible default, and the step that took it records it (S60).
- **B2, a shape-setting choice with no recommendation.** The choice changes the shape of most of the
  work, or the way of working: the layering, the data model, a module boundary, the concurrency, the
  transaction or error strategy, the team's workflow. AND no option earns your recommendation. The size alone is not the trigger. The
  missing recommendation is.

**Half A without half B: you make the call.** When you can reason to a recommendation, pick the
option, write why in the finding, and bucket it by rules 2–4. Handing back a call you could make is
as much a failure as guessing a call you cannot make.

### Rules from our runs

- An answer in `decisions` settles its question. Raise it again only when the answer leaves a new
  question open (S63).
- A product answer that the spec or `decisions` gives is settled. Use its value.
- A technical choice that a step already recorded in the run's notes stays out of your
  findings: the report shows it (S60). The exception: when the choice breaks an acceptance criterion or
  causes a bug, it is a normal finding.
- A technical choice that nobody recorded is Report, whatever the table says (S59).
- A change to existing behaviour that the spec does not ask for is never Noise: a null input that
  now throws, a changed default, a removed case (S57). Bucket it Fix when the old behaviour is
  clearly right and the fix restores it; otherwise Report.
- An answered Decide is no longer Decide: bucket it Fix and apply the answer. A Decide that is
  still open stops the step, also on a resume.

## Flags: urgency, apart from the bucket

- 🔴: Risk High AND Probability Mid/High.
- 🟡: Risk High AND Probability Low, or Risk Mid AND Probability Mid/High.
- no flag: everything else.

A 🔴 Fix means "serious, but the fix is easy: fix it". A 🔴 Report means "the fix costs more
than the problem: a human must see this".

## The action per bucket

`judging.md` says what each bucket does: Decide stops the step, Fix is fixed, Report is recorded for a
person, Noise is dropped. Triage adds this:

| Bucket | What triage adds |
|---|---|
| **Decide** | Each open Decide has the full format, with its options. |
| **Fix** | Make the smallest fix. |
| **Report** | Record it with its axes. |
| **Noise** | One line, with why it does not matter. |

## Finding format

Write every finding for a reader who does not know this code. Start with plain prose. Then the
details. Then the fix in plain words.

```
▸ <one-line title>   [🔴 origin · impact · Risk:H · Prob:M · Fix-Risk:L]
  <prose: what happens and what it costs; no code names, they go in "In the code:">
  In the code: <file:line, class names; define each internal term the first time>
  Fix: <the fix in plain words; a Decide lists its options with their trade-offs>
```

Use "In the plan:" or "In the spec:" in place of "In the code:" for a document finding.

A Decide also says why the call is not yours. A **B1** Decide states, in product words, the question
whose answer picks the option. A **B2** Decide states what the choice reshapes, and why no option
earns your recommendation.

The length follows the bucket: Decide and Report get the full format. Fix stays short. Noise is
one line plus why it does not matter.

### Calibration: a real Decide, and a near-miss

A real Decide. Two options, and nothing in the repository says which behaviour is wanted:

```
▸ What happens to an open booking when its vehicle is withdrawn   [🔴 plan-gap · bug · Risk:H · Prob:H · Fix-Risk:M]
  A customer can be in the middle of a booking on a vehicle that the owner withdraws. The plan
  never says what that customer sees then, so whichever branch gets written becomes the product's
  answer without anyone deciding it.
  In the plan: task 4 withdraws the vehicle and leaves the booking row as it is. Nothing in the
  spec, the acceptance criteria or the code covers the overlap.
  Not my call: both options are fair product behaviour and the code prefers neither. The question
  is what the business promises the customer, and that is not written down here.
  Options:
    a) Cancel the booking and notify the customer. Simple and honest, but the customer loses a
       confirmed booking with no way back.
    b) Keep the booking and block the withdrawal until it ends. Protects the customer, but the
       owner loses control of the vehicle for up to the booking's length.
```

The near-miss. Same shape, but **not** Decide, because half B fails. Two options exist and the
evidence prefers one, so the reviewer picks it and the finding is a Fix:

```
▸ The withdrawal check runs once per row   [🟡 coder-miss · performance · Risk:M · Prob:M · Fix-Risk:L]
  Each booking row asks again whether the vehicle is withdrawn, so a long list makes one query per
  row instead of one per page.
  In the code: `BookingListService.enrich()` (BookingListService.java:88) calls the repository
  inside the loop. A batch fetch or a join both work; the join matches how
  `VehicleQueryRepository` already loads its other flags, so take it: it is the existing pattern and no new code path appears. One method changes.
  Fix: move the lookup into the existing query as a join. A recommended path exists, so this is my
  call, not a Decide.
```

## The notes file

Use the notes sections and the result of `judging.md`. Two additions: put the tally line under
`## Checked`, for example `1 Decide · 4 Fix · 2 Report · 1 Noise`, and in each bucket section write
each finding in the full format, flagged ones first (🔴, then 🟡).

## Hard gate

<HARD-GATE>
Triage honestly, by the rules, not by comfort. Decide needs both halves: two or more concrete options
with different trade-offs listed in the finding, AND a reason the call is not yours (a product
answer that no reading of this repository gives, or a shape-setting choice you cannot recommend a
path for).

Both directions are failures. Keep every real risk out of Noise, and raise a question instead of
inventing product behaviour. Equally, never inflate a fork you could resolve into a Decide to dodge a
call that is yours, and never call a finding Decide only because it is large: size with a clear
recommendation is Report. Every finding gets its axes and exactly one bucket.
</HARD-GATE>
