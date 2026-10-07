---
name: triage
description: The contract for sorting review findings into Decide, Patch, Evaluate and Noise, with the axes, the rules, the finding format and the notes format. Invoked by every judging stage and agent gate of an orchestra run.
---

# Triage

Every finding of a judging stage or an agent gate gets its axes and exactly one bucket. The bucket
sets the action. Severity labels (critical, high, low) are not used: the bucket tells the run what to
do, and the flags carry the urgency.

## The five axes

| Axis | Values | Question |
|---|---|---|
| **Origin** | `plan-gap` · `brief-deviation` · `coder-miss` (built code only) · `new` | Where does the gap come from? A hole in the plan, a drift from the brief, a coding mistake, or something nobody saw before? |
| **Risk** | High · Mid · Low | What do we risk if it stays unfixed? |
| **Fix-Risk** | High · Mid · Low | How risky is the fix itself? **Low**: one line, plain. **Mid**: some new code, nothing dangerous, unit tests cover it. **High**: new flows, new tables, new libraries, existing logic rebuilt. |
| **Probability** | High · Mid · Low · `—` | How likely are we to hit it (an edge case, a race)? `—` for a mismatch: a plan that disagrees with the code is certain, not probable. |
| **Impact** | `race-condition` · `edge-case` · `bug` · `security` · `performance` · `plan-inconsistency` · `improvement` | What kind of problem is it? The closest label wins. A `security` finding keeps its own label, always. |

## The bucket: the first rule that matches wins

| # | Rule | Bucket |
|---|---|---|
| 1 | The Decide test below holds: a real fork AND a call that is not yours | **Decide** |
| 2 | Probability Low AND Risk Low AND Fix-Risk Mid or High | **Noise** |
| 3 | Fix-Risk Low; or Fix-Risk Mid AND Risk Mid/High AND Probability Mid/High; or any mismatch between the plan, the brief, the docs and the code | **Patch** |
| 4 | Everything else (Fix-Risk High; Fix-Risk Mid with Risk or Probability Low) | **Evaluate** |

### The Decide test

Decide needs both halves. One half alone is not Decide.

**Half A: a real fork.** You can name two or more concrete options with clearly different
trade-offs. Or the finding challenges a choice that the brief or the plan already made, and you can
name the other options. List the options in the finding. No fork, no Decide: a finding with one
obvious fix is Patch or Evaluate, however serious it feels.

**Half B: the call is not yours.** At least one of:

- **B1, a product answer you cannot read anywhere.** The right option depends on what the product
  must do, and no source you can read gives it: not the code, the brief, the plan, the acceptance
  criteria, `decisions` or the repo's docs. Only the product owner knows. A **business fact** is
  always B1: a rate, a price, a limit value, who qualifies. Take no "safe" default for a product
  answer: invented product behaviour is the one mistake a later review cannot see.
  A **technical choice** is not B1: rounding mode, null handling, the order of two steps, a limit
  before or after rounding. It has a sensible default, and the stage that took it records it (S60).
- **B2, a shape-setting choice with no recommendation.** The choice changes the shape of most of the
  work: the layering, the data model, a module boundary, the concurrency, the transaction or error
  strategy. AND no option earns your recommendation. The size alone is not the trigger. The
  missing recommendation is.

**Half A without half B: you make the call.** When you can reason to a recommendation, pick the
option, write why in the finding, and bucket it by rules 2–4. Handing back a call you could make is
as much a failure as guessing a call you cannot make.

### Rules from our runs

- An answer in `decisions` settles its question. Raise it again only when the answer leaves a new
  question open (S63).
- A business fact that the brief or `decisions` gives is settled. Use its value.
- A technical choice that a stage already recorded (in the brief's Assumptions or in
  `<notes>/code.md`) stays out of your findings: the report shows it (S60).
- A technical choice that nobody recorded is Evaluate (S59).
- A change to existing behaviour that the brief does not ask for is Evaluate at least: a null input
  that now throws, a changed default, a removed case (S57).

## Flags: urgency, apart from the bucket

- 🔴: Risk High AND Probability Mid/High.
- 🟡: Risk High AND Probability Low, or Risk Mid AND Probability Mid/High.
- no flag: everything else.

A 🔴 Patch means "serious, but the fix is easy: fix it". A 🔴 Evaluate means "the fix costs more
than the problem: a human must see this".

## The action per bucket

| Bucket | Action |
|---|---|
| **Decide** | An agent never fixes it. When a finding is Decide, stop before you fix anything, write the notes and the result with `"status": "decide"`, and list each Decide in `decide`. The run stops for the human (S46). On resume you get `decisions`. |
| **Patch** | Fix it in this run of the stage. First check that the finding is right: read the code it names. A finding that is wrong goes to Noise, with the evidence. |
| **Evaluate** | Do not fix it. Record it with its axes. It goes to `evaluate` in the result and to the report. |
| **Noise** | Drop it. One line in the notes, with why it does not matter. |

## Finding format

Write every finding for a reader who does not know this code. Start with plain prose. Then the
details. Then the fix in plain words.

```
▸ <one-line title>   [🔴 origin · impact · Risk:H · Prob:M · Fix-Risk:L]
  <prose: what happens and what it costs; no names the reader has not seen>
  In the code: <file:line, class names; define each internal term the first time>
  Fix: <the fix in plain words; a Decide lists its options with their trade-offs>
```

Use "In the plan:" or "In the brief:" in place of "In the code:" for a document finding.

A Decide also says why the call is not yours. A **B1** Decide states, in product words, the question
whose answer picks the option. A **B2** Decide states what the choice reshapes, and why no option
earns your recommendation.

The length follows the bucket: Decide and Evaluate get the full format. Patch stays short. Noise is
one line plus why it does not matter.

### Calibration: a real Decide, and a near-miss

A real Decide. Two options, and nothing in the repository says which behaviour is wanted:

```
▸ What happens to an open booking when its vehicle is withdrawn   [🔴 plan-gap · bug · Risk:H · Prob:H · Fix-Risk:M]
  A customer can be in the middle of a booking on a vehicle that the owner withdraws. The plan
  never says what that customer sees then, so whichever branch gets written becomes the product's
  answer without anyone deciding it.
  In the plan: task 4 withdraws the vehicle and leaves the booking row as it is. Nothing in the
  brief, the acceptance criteria or the code covers the overlap.
  Not my call: both options are fair product behaviour and the code prefers neither. The question
  is what the business promises the customer, and that is not written down here.
  Options:
    a) Cancel the booking and notify the customer. Simple and honest, but the customer loses a
       confirmed booking with no way back.
    b) Keep the booking and block the withdrawal until it ends. Protects the customer, but the
       owner loses control of the vehicle for up to the booking's length.
```

The near-miss. Same shape, but **not** Decide, because half B fails. Two options exist and the
evidence prefers one, so the reviewer picks it and the finding is a Patch:

```
▸ The withdrawal check runs once per row   [🟡 coder-miss · performance · Risk:M · Prob:M · Fix-Risk:L]
  Each booking row asks again whether the vehicle is withdrawn, so a long list makes one query per
  row instead of one per page.
  In the code: `BookingListService.enrich()` (BookingListService.java:88) calls the repository
  inside the loop. A batch fetch or a join both work; the join matches how
  `VehicleQueryRepository` already loads its other flags, so take it: it is the existing pattern.
  Fix: move the lookup into the existing query as a join. A recommended path exists, so this is my
  call, not a Decide.
```

## The notes file

The stage or gate names its notes file (for example `<notes>/logic-review.md`). Its sections, in
order:

1. **Found**: the tally first, for example `1 Decide · 4 Patch · 2 Evaluate · 1 Noise`. Then every
   finding in the format above, in the order Decide, Patch, Evaluate, Noise; flagged ones first
   (🔴, then 🟡) inside each bucket.
2. **Patched**: what you changed.
3. **Evaluate**: each one with the axes that put it there.
4. **Noise**: one line each.
5. **Awaiting decision**: every Decide word for word, with its options.

The run never reads this file to choose its next step. It reads the result JSON. So keep the two the
same: `counts` match the tally, `decide` holds exactly the questions under "Awaiting decision" (one
line each: `<question> — options: <a> | <b>`), and `evaluate` holds one line per Evaluate finding with
its `file:line`.

## Hard gate

Triage honestly, by the rules, not by comfort. Decide needs both halves: two or more concrete options
with different trade-offs listed in the finding, AND a reason the call is not yours (a product
answer that no reading of this repository gives, or a shape-setting choice you cannot recommend a
path for).

Both directions are failures. Keep every real risk out of Noise, and raise a question instead of
inventing product behaviour. Equally, make the calls that are yours, and keep a finding out of Decide
when it is only large: size with a clear recommendation is Evaluate. Every finding gets its axes and
exactly one bucket.
