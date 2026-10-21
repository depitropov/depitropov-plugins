# Backlog procedure

You own each change to `docs/curator/BACKLOG.md` that needs judgement (**add**, promote, demote,
drop, reorder) **and the consequence chain that each one starts.** That chain is why this is a procedure
and not a table edit. A dropped row leaves a constraint that the plan stage still follows, and Vision
prose that promises work that nobody intends to do.

**You are the front door for a change to the plan.** You never decide what the change *demands of
the code*: that is the `direction` procedure, which `curate` runs once when the arrangement is
settled (Step 6). You read no `TECH.md` and no source code, on purpose: the evidence for that call
stays with the procedure that makes it.

`curate` runs you inline in the main session, so you confirm judgement calls with the user.

`<plugin>` is the folder of the orc-curator plugin, the folder that holds `procedures/`.

## Caller

You have one caller: `curate`. It runs you when the user wants the plan changed, or has edited
`BACKLOG.md` by hand.

## The interface: plain words, no flags

There is nothing to learn. The user says what must change, and you sort it:

| What the user says | Operation |
|---|---|
| "add social login", "we must also do X" | **add**: a new row (Step 4) |
| "drop B7", "this is not happening any more" | **drop** |
| "move B9 to later", "promote B3", "that is next, not now" | **move** |
| "groom the backlog", "reprioritise", "tidy this up", or nothing at all | **groom**: show the arrangement and ask what must move |
| "I edited BACKLOG.md by hand", "fix the fallout", "reconcile it" | **reconcile**: find what already changed (Step 3) |

One request can carry several operations. Do them all, then give back to `curate` for the sweep.

## Step 1: Prepare

When `docs/curator/` does not exist, tell the user that the Curator is not set up, write nothing,
and return `Result: blocked`.

A run can be open on a row that you drop or demote. That does not stop you: the run works from its
own base, and `curate` asks the user at its end what to do with the work.

## Step 2: Read all that depends on the backlog

Read all of these. You cannot walk the chain from the backlog alone:

- `docs/curator/BACKLOG.md`: each section, `## Vision` too.
- `docs/curator/DIRECTION.md`: each `Cn` and its `from Bn`, and the `## Evaluated` table.
- `docs/curator/DECISIONS.md`: which `Dn` rows assumed a row that you are about to change.
- `docs/curator/QUESTIONS.md`: which `· open` entries exist only because of that row.

## Step 3: Find the changes

**The normal path:** say each change again as `Bn: <from section> → <to section | dropped>`, or as
`new: <item> → <section>` for an add, and confirm the set with the user before you touch a file.
With no request at all, show the arrangement (the count per horizon, and the rows) and ask what
must move.

**The reconcile path** ("I edited it by hand"): do not propose changes. **Find** them. Compare the
backlog as it is now with what `DIRECTION.md`, `## Vision`, `DECISIONS.md` and `QUESTIONS.md` still
assume. Each mismatch is a change that already happened. When the edit is not saved in git yet,
`git diff docs/curator/BACKLOG.md` is the fastest way in.

A hand edit of `BACKLOG.md` is **expected and legal**: it is a markdown table. This path makes it
safe.

## Step 4: Add a row

The ids, the next-id rule and the destinations are in `<plugin>/references/recording-rules.md`. Read
the file for the next `Bn`. The item text is one line about the thing itself. In the `why / refs`
cell, write the why. The brief of a run links the row with its `Serves: Bn` line, and `curate` writes
the shipped-as cell.

**Pick the horizon by confidence, and say which one you picked, so that the user can correct it.**
A horizon says how sure we are, never when something lands:

| Section | Means |
|---|---|
| `## Now` | we are sure, and it is next. Only when the user says so. A row here does **not** start a run |
| `## Next` | shaped and near-term. Constraints become owed, so `curate` sweeps |
| `## Later` | a bet that nobody validated. **Nothing reads `## Later`**: no constraint is owed, no sweep |

Then two checks:

- **A question is never a row.** "Decide X", "which Y", "do we use Z" go to `QUESTIONS.md` as a
  `## Qn — <question> · open` entry, with your prose and a `Refs:` line. A run turns a backlog row
  into work with acceptance criteria, so a decision that is put here gets built as if it were work.
- **Extend `## Vision`** when the story never covered the row that you added. A row that the Vision
  does not describe is a plan that nobody wrote down.

**When the row looks big enough to change what the product is *for*, say so, and do not act on
it.** Name it in your relay and let the sweep of `curate` give the verdict. `direction` reads `TECH.md`
and the real code, and you do not, so your "this is huge" is an observation, never a decision. It is
the most important observation, though: a purpose change needs a nudge to the user, "To set the new direction, run `/wayfinder <topic>`.", and a
human who chooses to start it, not a one-line add that grows in silence.

## Step 5: Walk the consequence chain

For **each** change, go through this table from top to bottom. Do not skip a line because it looks
empty: check it, and say that you checked it.

| Change | Consequences that you must apply |
|---|---|
| **dropped** | ① delete each `Cn` in `DIRECTION.md` whose `from` cites the row, **and retire the `## Evaluated` row of that `Bn` in the same pass**. A constraint for work that nobody will do is a phantom that the plan stage still follows, and an `## Evaluated` row for a row that is no longer near-term claims coverage that nobody owes. ② rewrite the `## Vision` prose that promised it, so that the story no longer describes it. ③ when a `Dn` assumed it, **add a reversal**: a new `Dn` whose `Why` names the row it reverses. Never edit the old row. ④ close each `· open` `Qn` that exists only because of it, with one sentence: the row was dropped |
| **demoted to `## Later`** | the same as dropped, all four. `DIRECTION.md` never reads `## Later`, so its constraints have no license now. **Say this to the user clearly**: that a demotion retires constraints is the surprise |
| **added to `## Now` or `## Next`** | the row enters a horizon that `DIRECTION.md` reads, with no `## Evaluated` row, so constraints are owed: `curate` sweeps (Step 6). Extend `## Vision` when the story never covered it |
| **added to `## Later`** | nothing. Nothing reads `## Later`, so no constraint is owed and no sweep is needed |
| **promoted from `## Later` to `## Next`** | the row entered a horizon that `DIRECTION.md` reads, so constraints are owed now: `curate` sweeps (Step 6). Extend `## Vision` when the story never covered it |
| **moved between `## Next` and `## Now`** | nothing. Its `## Evaluated` row stays valid: a move inside the near-term pair is not a trigger. The user moves rows here when they choose; a run never moves one |
| **item text rewritten** (a near-term row now means something else, not a typo fix) | **retire the `## Evaluated` row of that `Bn`.** Its verdict was given against words that no longer apply, and without that row `direction` treats the row as owed again. Leave its `Cn` rows: `direction` decides if they still hold. A judgement call, and a narrow one: reword freely, and touch the table only when the *meaning* moved |
| **reordered inside a section** | nothing. A section has no order inside it |

Then check, whatever changed:

- Each `Cn` in `DIRECTION.md` cites a `Bn` that is still in `## Now` or `## Next`.
- No sentence of `## Vision` describes a row that is now in `## Later` or gone.
- Each `Bn` kept its id. **Ids never change and are never reused, in any section.**

## Step 6: Give back to `curate`

When the arrangement is settled and its chain walked, give back to `curate`. **`curate` runs the sweep once**, after you, with the `direction` procedure. You do not run it, and you do not decide
whether it is needed. State only whether any change touched `## Now` or `## Next`, so that `curate`
knows that constraints are owed. When each change touched `## Later` only, say so: nothing is owed.

When `direction` gives a purpose change later, `curate` relays it. It is the most important thing
that either of you will say.

## Step 7: Report

Give each change, and under it the consequences that you applied, **including the empty ones** ("no
`Cn` cited B14"). An empty check that you report is information. Silence looks the same as a check
that you skipped.

Then what you did not do on purpose: constraints that must be derived again and not deleted, and
all that is left for the sweep.

You write the files and stop there. `curate` commits.

When the user wants to build a row now, suggest that they start a run with `orchestra:run`, and stop.

## Hard gate

<HARD-GATE>
**Arrangement only.** You write `docs/curator/BACKLOG.md`, and only as consequences of a change that
you just made: `docs/curator/DIRECTION.md` (delete orphan rows and retire their `## Evaluated` rows,
nothing more), `docs/curator/DECISIONS.md` (add a reversal, nothing more), `docs/curator/QUESTIONS.md`
(open a question that the user asked as a question, or close an entry that a change made moot).
Nothing else. No product code, no brief, no plan, no `PRODUCT.md`, no `TECH.md`.

**You invoke no skill and no other procedure.** A purpose change or a changed dimension is a verdict
for `direction` to give, not for you to route.

**Never read `docs/curator/TECH.md` or source code.** When you want to, you are about to make the
call of `direction` with worse evidence than it has.

**Never write a `Cn`.** To derive constraints is the job of the `direction` procedure: leave it
to `curate`. You only delete a `Cn` whose backlog row lost its license.

**Never edit or delete a `Dn`.** `DECISIONS.md` is append-only. A reversal is a **new** row whose
`Why` names the row that it reverses, and it **opens with `hard:` or `soft:`** (see
`<plugin>/references/recording-rules.md`). A reversal for a dropped row is usually `soft:`: the
arrangement changed once and can change again.

**Never start a run.** You put a row in `## Now` only when the user says so: that is intent, not a
run.

**Never drop a row in silence.** Confirm each deletion with the user first, and report each
consequence, including the empty ones.
</HARD-GATE>

## End of run

**The return block is the LAST thing in your reply:**

```
Result: ok | blocked | needs-input
Wrote: <files>
Summary: <10 lines or fewer: one for each change, its consequences under it; and "sweep owed" or "no sweep owed: ## Later only">
Deviations/Warnings: <or "none">
```

`blocked` when `docs/curator/` does not exist. `needs-input` when a change needs a confirmation that
the user cannot give now. `ok` when each change had its chain walked.
