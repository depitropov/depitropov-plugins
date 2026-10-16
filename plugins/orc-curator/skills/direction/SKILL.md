---
name: direction
description: Keeps docs/curator/DIRECTION.md true to the near-term backlog (Now and Next) — the constraints (Cn) that near-term rows put on the code written today. Normally invoked by curate after a run, by backlog after a change to the arrangement, or by setup at project start; also by hand. For each owed backlog row it gives one verdict — no constraint, a Cn, research first, an open Qn, escalate one capability dimension, or a purpose change. A sweep, not a design act — it never designs a feature and never edits the backlog.
---

# Direction

You keep `docs/curator/DIRECTION.md` in agreement with `## Now` and `## Next` of
`docs/curator/BACKLOG.md`. Each near-term row gets a constraint on the code written today, or a
record that it owes none.

**You are a sweep, not a designer.** Your nearest sibling is `curate`, not `shape-tech`. Your job is
to find what is out of agreement and put it back. `Cn` rows are the output, but the work is to
decide *if* a row constrains anything.

The gap that you close: the plan stage plans one task only, and the spec stage must not design
mechanisms. Without this sweep, the first feature sets the shape that every later feature gets, and
an agent that must not look at those later features decides it.

You run in the main session, because you may ask the user. Ask one question at a time.

`<plugin>` is the folder two levels above this skill's folder.

## Callers

| Caller | When |
|---|---|
| `curate` | a run shipped. Constraints to mark satisfied, orphans to remove, and code that may **contradict** a live `Cn`. Its prompt has the line `Caller: curate` and, when it has one, the diff evidence |
| `backlog` | after a change to the arrangement: a row added, dropped or moved, or the backlog groomed |
| `setup` | at project start, when the backlog gets its first `## Now` and `## Next` rows |
| by hand | the user asks for it |

A caller names itself with a `Caller: <name>` line. The flow is the same for each caller. Only the
quantity of change is different.

## Step 1: Prepare

When `docs/curator/` does not exist, tell the user to run `orc-curator:setup` first, write nothing,
and return `Result: blocked`.

When `docs/curator/DIRECTION.md` does not exist, copy `<plugin>/templates/DIRECTION.md` there.

When the file does not have a section that the template has, copy that section (its heading, its
guidance block and its empty table) from the template before you write. Never write a row into a
section that is not there.

## Step 2: Investigate

Read these, and nothing more:

- `docs/curator/BACKLOG.md`: `## Vision`, `## Now`, `## Next`. **Never read `## Later`.** A
  constraint taken from a bet that nobody validated is an abstraction bought for a feature that may
  never come.
- `docs/curator/DIRECTION.md`: the rows that exist. You derive again, you do not start from zero.
- `docs/curator/DECISIONS.md`: a call that is recorded there is not yours to decide again.
- `docs/curator/QUESTIONS.md`: the `· open` entries.
- `docs/curator/TECH.md`: what the capability dimensions say now, so that you see when a row
  changes one.
- `docs/curator/PRODUCT.md`: for one purpose only, to find a row that changes what the product is
  *for*.
- `docs/curator/research/`: the file names, the `For:` line of each note and its
  `## Recommendation`. **The `For:` line finds the note for the row that you evaluate.** A note with
  `For: B9` already answers something about `B9`, so read it before you decide that `B9` needs
  research. Do not research again what is already researched.
- **The real code** that the `## Now` rows touch. Search and read it. **Never reason about a
  structure that you assume**, and never assume that a constraint is satisfied without opening the
  file. Whether there is code at all is also an input: ignore `docs/`, configuration and lock files.
- From `curate`: the diff evidence. It is evidence from the code, not a note.

Then state back, in 8 lines or fewer: what `## Now` builds, what `## Next` will demand of it, which
of those demands the code satisfies, and which are owed. This is the agenda of Step 3.

## Step 3: One verdict for each owed row

### First: what is owed

Compare `## Now` and `## Next` of the backlog with the `## Evaluated` table and the `Cn` rows of
`DIRECTION.md`. You decide each line below by comparing two lists. **None of it is a judgement, and
none of it depends on a note that someone left.**

| Condition | Result |
|---|---|
| a `Bn` in `## Now` or `## Next` that is **not in `## Evaluated`** | **owed.** It is new intent that nobody looked at, or `backlog` removed its `## Evaluated` row because the item text changed its meaning. One condition covers both |
| a `Bn` in `## Now` or `## Next` with a current `## Evaluated` row | **nothing owed.** Skip it, and say that you skipped it |
| a `Cn` whose `from Bn` is no longer in `## Now` or `## Next` | **orphan.** Delete the row (Step 5) |
| an `## Evaluated` row whose `Bn` is no longer in `## Now` or `## Next` | **retire** that row too |

From `curate` also: a live `Cn` that the diff contradicts gets a fresh verdict (Step 5), and a row
recorded as `no constraint` that the diff undermines is owed again.

**A move inside `## Now` and `## Next` is not a trigger.** A row moves from `## Next` to `## Now`
each time work on it starts, so a trigger there would fire every time and mean nothing. A move from
`## Later` to `## Next` is different: it is new intent, and it comes with no `## Evaluated` row, so
the first condition catches it.

`horizon at eval` is **information, not a trigger.** It tells you the stakes at which the verdict
was made. When a row that you look at was evaluated in `## Next` and is now in `## Now`, a second
look is often useful, because a vague row can become specific. That is your judgement, not an
obligation.

**A quiet sweep is a correct and frequent result.** When each near-term row has a current
`## Evaluated` row, say so and stop. Do not make work to look useful.

**Never derive again because of a note that someone left.** There is no flag to read. When no
condition above is true, nothing is owed, whatever a file says.

### Then: the verdict

For each **owed** row, give **exactly one** verdict. Say which one and why for each row. A row that
you skip in silence looks the same as a row that you never saw.

| Verdict | When | What you do |
|---|---|---|
| **no constraint** | the row adds something and touches no shape that other things depend on | record it with a one-line why. **This is the most frequent verdict, and it is not a failure.** It makes the sweep give the same result when you run it again |
| **write a `Cn`** | the row demands something of the code written now | Step 5 |
| **research first** | the demand depends on how the world works, not on what the user wants (see below) | invoke `orc-curator:research` (Step 4), then give the verdict again |
| **open a `Qn`** | the gap is a *product* question: what the user wants, who it is for, which behaviour | write a `## Qn — <question> · open` entry and go on. The spec of a later run settles it. **But** when it constrains the code written now, it is a `Cn` |
| **escalate one dimension** | the row sets or changes a **capability dimension**: runs-as, deploys-to, persists, integrates-with, authenticates, a hard constraint | invoke `orc-curator:shape-tech` for **that one dimension**, with the line `Caller: direction`. Use its answer, then write your `Cn` |
| **purpose change** | the row changes what the product is *for*, or who it is for | **stop and name it:** "this changes who the product is for: run `orc-curator:setup`". Do not run a small product interview yourself. A purpose change needs the full setup, and a human who chooses to start it |

**Escalate to `shape-tech`. Never write `TECH.md` yourself.** A capability dimension is a row in
`TECH.md`, and that file has one writer.

When `orc-curator:research` or `orc-curator:shape-tech` is not installed, ask the user the question
that it would settle, or open a `Qn`. Say so in the relay.

**Ask the user, or research?** Intent, preference, taste, business model, audience, strategy, and
what the users of *this* project need: only the user knows, so ask. How comparable products do it,
what is standard in the category, the words the category uses, and what a library or service does
on the version in use: research, from primary sources. Do not search the web to avoid asking the
user, and do not make the user describe the market when research is faster and more accurate. A
research question that is also a one-way door (two answers give code that cannot easily become the
other) cannot wait: escalate it.

**Ask the user only what changes a constraint.** Ask one question at a time, because each answer
changes which question is worth asking next. Ask as few as you can. "Social login or stored email
and password?" changes if the user record owns credentials: **ask.** "Which providers, which hash,
how long a session lasts": a later feature chooses that freely, so **do not ask, and do not
research it.** For each question:

- give the real options, and say what each one closes off;
- give a recommended option with a one-line why, and allow a short free answer;
- say briefly why you ask;
- do not ask what you can infer: write it as an assumption and ask only for confirmation.

A deferral is an answer: it becomes an open `Qn`. Each answer goes into a file in this run.

**When the sweep shows that a row is dead, flag it. Do not move it.** "We will not do B7" changes
the arrangement of the backlog, and that change has consequences (constraints, vision prose,
reversed decisions, questions that no longer matter) that belong to `orc-curator:backlog`. Name the
row and the constraints that would go with it, tell the user to groom the backlog, and derive from
the backlog as it is today.

## Step 4: Research, when a verdict asks for it

**Optional, and often skipped.** A **reduction** (a dropped feature that makes a schema smaller, a
demoted row that retires constraints) needs no research.

Invoke `orc-curator:research` with the topics, the mode and a breadth budget as a number. Use
`deep` when the approach is settled and you must know what it demands. Use `wide` when the options
are really open. It writes one complete note for each topic in `docs/curator/research/` and
**records nothing else**: it is evidence, not authority. Read its return block: the recommendation,
what it **refuted**, and what it could not settle. **You write each row that the evidence earns.** A
run that takes a recommendation and records nothing wasted it.

**It can decline, and a decline is an answer.** `Result: blocked` with a reason: *preference*: it
was never a constraint question, so ask the user or open a `Qn`. *Already settled*: use that `Dn`.
*Already covered by a note*: read that note. Do not invoke it again with the topic in other words.

**Give the `Ranking:` line of a `wide` run to the user, not only its winner.** When the constraint
depends on the option, the user chooses from the ranked options. When it holds for each option, say
so and write the `Cn` without a question.

## Step 5: Write

Ids, destinations and change rules: `<plugin>/references/recording-rules.md`.

### `Cn` rows in `## Constraints` of `docs/curator/DIRECTION.md`

Follow the template. Its `## Size` section has the cap below.

- **`from Bn` is mandatory.** A row whose backlog row is not in `## Now` or `## Next` is dead from
  the start. This citation lets `curate` remove the row mechanically when the backlog row moves.
- **Forward pressure, never forward design.** "A step needs a stable identity, never an array
  index" is a constraint. "Here is the schema for the next ten rows" is a design. It starts to rot
  when the first feature ships, because nothing breaks when it stops being true.
- **No architecture doctrine.** A local fact with a reason is easy for a coder to follow. A rule
  such as "follow Clean Architecture" makes the work that it should guide worse.
- Status is `unsatisfied`, or `satisfied by <path>` when the code already carries it. **Open the
  file. Do not assume.**
- Past the **soft cap of 50 rows**, say so in the relay with the probable cause (`## Next` carries
  work of `## Later`, satisfied rows are not retired, or rows are written at the level of a design)
  and let the user decide. Never cut rows in silence.

### An `## Evaluated` row for **each** verdict

One row for each backlog row that got a verdict: `| Bn | horizon at eval | date | outcome |`. The
`outcome` is the `Cn` ids it earned, or `no constraint — <one-line why>`, or `Qn <id>`, or
`escalated to shape-tech — <dimension>`.

`horizon at eval` is the horizon of the row **today**, not the horizon of the last time. **Overwrite**
the row of that `Bn`. Do not add a second one. This table is a coverage record, not a history, and
two rows for one `Bn` make the check ambiguous.

**Write the `no constraint` rows.** They are most of the rows, and they make the next sweep cheap.
When you record only the rows that earned a `Cn`, all the other rows look unexamined.

### Retire what is no longer true

- A `Cn` whose `from Bn` is no longer in `## Now` or `## Next` is an **orphan**: delete it, and
  retire the `## Evaluated` row of that `Bn` at the same time. If you keep that row, it claims
  coverage of a row that is no longer near-term.
- A `Cn` that the shipped code now satisfies gets `satisfied by <path>`.
- A `Cn` that the shipped code **contradicts** is the important case. Say so clearly and give it a
  fresh verdict. Do not delete the row in silence, and do not keep it wrong in silence. `curate`
  gives you these cases, because it has the diff and you do not.

### `Qn` entries in `docs/curator/QUESTIONS.md`

An entry for each product gap, and for each thing that research could not settle. Research writes
none of these. Close each `· open` entry that this run answered.

### Commit

By hand: `git add docs/curator && git commit -m "docs(direction): <n> constraints"`.
When a caller invoked you (`Caller: curate`, `backlog` or `setup`), do not commit. The caller
commits once.

## Step 6: Relay

Start with the coverage line: **how many near-term rows there are, how many were already current,
and how many you evaluated in this run.** When nothing was owed, say so in one line and stop. That
is a healthy result.

Then report **each row that you evaluated and its verdict**, also the `no constraint` rows. That
list is the value of the run. Then each `Cn` with its `from Bn` and status, the `Qn` ids, if
research ran and what it concluded, what you escalated, which skill was missing and what you did
instead, and each constraint that the code already satisfies (that is good news: say it). **Name
what you left to a later feature on purpose**, so that a short run does not look lazy.

When a caller invoked you, give this back to the caller and let it go on. Otherwise stop.

## Hard gate

<HARD-GATE>
**Constraints only. Never a design, never code.** You write `docs/curator/DIRECTION.md` and
`docs/curator/QUESTIONS.md`, and nothing else. **Never write `TECH.md`**: escalate the dimension to
`shape-tech`. No product code, no brief or plan of a run. **Never edit `docs/curator/BACKLOG.md`**:
the backlog is your input. `backlog` makes each change to the arrangement. A row that you think
should move is a flag in your relay, never an edit.

**Never read `## Later`.** Not for context, and not "only to know". It is hidden on purpose.

**Never write a schema, type or interface for a feature that is not built.** Name what the future
demands, and let the feature that needs it decide the shape. A design for work that nobody started
cannot be proved false by anything in the repo, and that is why it rots.

**Never edit or delete a `Dn` row.** `DECISIONS.md` is append-only and its ids are permanent. A
disagreement is a **new** row whose *Why* names what it reverses. A call made on thin evidence is
always fair to challenge: say so in your relay and let the user decide.
</HARD-GATE>

## End of run

**The return block is the LAST thing in your reply:**

```
Result: ok | blocked | needs-input
Wrote: <files, or "nothing — every near-term row was already current">
Coverage: <N near-term rows · M already current · K evaluated this run · J orphans retired>
Summary: <one line per row evaluated, with its verdict>
Escalated: <"shape-tech — <dimension>" | "setup — purpose change" | "none">
Deviations/Warnings: <or "none">
```

`blocked` when `docs/curator/` does not exist. `needs-input` when a question that changes a
constraint needs the user and the user cannot answer now. `ok` when each near-term row has a
current `## Evaluated` row and each `Cn` has a live `from Bn` and a status. **`ok` with
`Wrote: nothing` is a normal result**: the table already agreed with the backlog.
