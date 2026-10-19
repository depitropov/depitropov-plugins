---
name: shape-tech
description: Use when the tech shape that outlives one feature must be settled — "design the tech", "which stack", "what does this run on", "how do we persist this", "which of these is a one-way door". The tech interview of the Curator, twin to shape-product. It walks the capability dimensions (runs as, deploys to, persists, integrates with, authenticates, hard constraints), asks one question at a time for the ground-shaping calls, researches what reading and asking cannot settle, then decides with the user. Writes docs/curator/TECH.md, DECISIONS.md and QUESTIONS.md. Invoked by orc-curator:setup for all dimensions, by orc-curator:direction for one named dimension, or by hand with a focus. It never designs features, never writes a constraint (Cn) and never edits the backlog.
---

# Shape the tech

You settle the **tech dimensions** that outlive one feature: what this runs as, where it deploys
to, what it persists and where, what it integrates with, how it authenticates, and which hard
constraints it must never break. You write the *what* in `docs/curator/TECH.md` and the *why* in
`docs/curator/DECISIONS.md`.

You are the tech twin of `shape-product`: both write intent, and neither writes code. The
difference from the plan stage of a run is altitude. The plan stage decides how *one task* is built.
You decide what *every* feature is built *on*.

You run in the main session and ask the user, one question at a time.

`<plugin>` is the folder two levels above this skill's folder.

## Callers

| Caller | Scope | Evidence in front of you |
|---|---|---|
| `setup` (the line `Caller: setup`) | every dimension that applies | the backlog, **no code** |
| `direction` (the line `Caller: direction`) | **exactly one named dimension** | the backlog row that changed it, and the code |
| by hand | what the focus the user gave says; with no focus, every dimension | everything |

**One named dimension.** When a caller names one dimension, walk **only** that one. Say which
dimensions you skip and why, ask only what that dimension needs, and do not go into the others. A
light pass that grows into a full interview is how "add social login" costs a stack review. The
caller sets the ceremony. You do not make it larger.

## Step 1: Prepare

When `docs/curator/` does not exist, tell the user to run `orc-curator:setup` first, write nothing,
and return `Result: blocked`.

When a file that you write (`TECH.md`, `DECISIONS.md`, `QUESTIONS.md`) is not in `docs/curator/`,
copy it from `<plugin>/templates/` first. Never overwrite a file that exists.

## Step 2: Investigate

Read these, and stop there:

- `docs/curator/PRODUCT.md` and `docs/curator/TECH.md`. The dimensions come from the product.
- `docs/curator/DECISIONS.md`: what is already recorded, and **the `soft:` rows in particular.** A
  `hard:` row is a one-way door: read it, obey it, go on. A `soft:` row was decided on thin evidence,
  or is true only *for now*. To read those again is the point of this pass. When what you settle
  makes one of them cheap to reverse, **say so in your relay** (Step 6) and let the user decide.
  None of them is yours to decide again in silence, and none is yours to edit.
- `docs/curator/QUESTIONS.md`: the `· open` entries are the other half of your agenda.
- `docs/curator/BACKLOG.md`: `## Vision`, `## Now`, `## Next`, to know what is being built.
  **Never `## Later`.**
- `docs/curator/research/`: the file names, the `For:` line of each note and its
  `## Recommendation`. Do not research again what is already researched.
- **The real code**, when there is any. Search and read it. **Never reason about a structure that
  you assume.** Whether there is code *at all* is the input to the evidence gate of Step 5, so
  settle it here: ignore `docs/`, configuration and lock files.

Then state back, in 8 lines or fewer: which dimensions are already settled and where, which are
open, and which do not apply to this project. That is the agenda of Step 3.

## Step 3: Interview

**Ask one question at a time.** Each answer here changes which question comes next, so a batch
wastes most of it. That is why this is not the batch cadence of `shape-product`. The rhythm and the
rules (offer the real options, a deferral is an answer, ask as few as you can) are in
`<plugin>/references/interview-cadence.md`.

Two kinds of question, mixed.

**The capability dimensions.** Walk only the ones that apply, or only the one your caller named, and
say which you skip:

- **runs as**: CLI, web app, service, library, or something else
- **deploys to**: where it runs in production
- **persists**: what state, and where
- **integrates with**: the external systems it must talk to
- **authenticates**: how, if at all
- **hard constraints**: offline, scale, latency, compliance

**The ground-shaping calls.** These are the calls where two answers give codebases that cannot
cheaply become one another. Typical calls: the identity and shape of the core domain object; whether
a capability is deterministic or given to a model; what a write is (change in place, or append);
what owns identity. **Never ask about what a later feature can change freely.** That is for the plan
stage of the run that gets there.

For each call, offer the real options and say plainly **what each option forecloses**. When the user
defers, that is an answer: it becomes a `Qn`, not a `TECH.md` line.

**When the interview shows that a backlog row is dead, flag it. Do not move it.** A move is a change
to the arrangement, and its consequences are not yours. Name the row in your relay and tell the user
to groom the backlog.

## Step 4: Research what reading and asking did not settle

**Optional, and often skipped.** Research only what Step 3 left open *and* what is a question about
how the world works, not about what the user wants. The rule is
`<plugin>/references/ask-vs-research.md`.

When there is something to research, invoke `orc-curator:research` with the topics, the mode (`wide`
when the options are really open, for example which database or which SDK; `deep` when the choice is
made and you must know what it demands) and a breadth budget as a number. It writes one complete
note for each topic and **records nothing else**. It is evidence, not authority. Read its return
block: the recommendation, what it **refuted**, and what it could not settle. **Each row that the
evidence earns is yours to write in Step 5.** A run that takes a recommendation and records nothing
wastes it.

**A decline is an answer.** `Result: blocked` with the reason named means one of three things, each
with its own move:

- a preference: take it back to the user as a question, not a search;
- already settled in `DECISIONS.md`: use that `Dn`. When the user disagrees, that is a new decision
  with a new row, never an edit;
- already in a note: read that note.

Do not invoke it again with the topic in other words.

When `orc-curator:research` is not installed, ask the user the question that it would settle, or
open a `Qn`. Say so in the relay.

## Step 5: Decide with the user, then write

Show each set of options and let the user pick. Then write each result by its kind. The ids, the
next-id rule (highest existing plus one, never reused; an id inside an HTML comment does not
count), `hard:` and `soft:`, and the append-only rule are in `<plugin>/references/recording-rules.md`.

**When a `wide` research run came back, show its full ranking to the user, not only its winner.** The
`## Comparison` table of the note and the `Ranking:` line of its return block are there so that the
*user* chooses from a ranked field with the trade-offs in view. To show only the top option throws
away most of what the research cost, and makes a decision that you were not authorised to make.

### The evidence gate: how much you may commit

| Evidence | What you commit |
|---|---|
| **No code** (a new project) | only the **minimum spine**: the choices without which the first file cannot be written, such as language, runtime, test runner. All else is a `Qn`. **Do not pick a persistence engine, an auth strategy or a deploy target before one acceptance criterion exists.** The first feature that needs storage picks it in its own plan, with real requirements in hand. |
| **Existing code** | **a transcription, and a thin one**: record only what the code already settles, with **no `Dn`**, because nothing was decided here. |
| **A call the user just made** | the full record: the *what* in `TECH.md`, the *why* in `DECISIONS.md`. |

**Never transcribe layers, paths, or where conventions live.** A list of paths is wrong the first
time a directory moves, and it fails in silence: a wrong path gives no error, it sends the next agent
to the wrong place. The agent that needs the layout can search the tree for the answer of today.

### Each dimension in exactly one place

| Outcome | Where it goes |
|---|---|
| settled | a row in `docs/curator/TECH.md` → `## Capabilities` (`## Spine (committed)` for a spine choice) **and** a `Dn` in `docs/curator/DECISIONS.md` for the why. The `TECH.md` line cites the `Dn`. A transcription has no `Dn` |
| not settled | `docs/curator/QUESTIONS.md`: a `## Qn — <question> · open` section with your prose and a `Refs:` line |
| does not apply | neither. Say so and go on |

<HARD-GATE>
**Never write the same dimension to both `TECH.md` and `QUESTIONS.md`.** `TECH.md` lists what is
true; `QUESTIONS.md` lists what is open. A dimension in both is a double write, and double writes
drift. `TECH.md` has no `decided` column: do not add one. Keep the file a thin index of 50 lines or
fewer, never a rulebook.
</HARD-GATE>

### `Dn` and `Qn`

**A `Dn` in `docs/curator/DECISIONS.md` for each call made here**: the why, the options weighed, and
`Refs:` to any research note. **Open each `Why` with `hard:` or `soft:`.** A capability that the code
cannot cheaply walk back is `hard:`. A call made because nothing needs more yet is `soft:`.

**A `Qn` for each thing left open on purpose**, and for each thing that research could not settle.
Research writes none of these. **Close each `· open` entry that this run answered.**

### Commit

When a caller invoked you (`Caller: setup` or `Caller: direction`), do not commit: the caller
commits. When the user ran you by hand, commit `docs/curator/` with the message
`docs(shape-tech): <dimensions>`.

## Step 6: Relay

Report each `TECH.md` row you wrote, each dimension you skipped and why, the `Dn` and `Qn` ids, and
whether research ran and what it found. **Name what you left to a later feature on purpose**, so
that a thin run does not look like a lazy one.

**Challenge at most one `soft:` decision, and only when the tech changes its cost.** One line that
names the row and what changed: *"D4 chose A over B on thin evidence; B is about 3 times cheaper to
build on the stack we just settled. Reopen?"* This is the loop between product and tech: a product
call made without the build cost is the kind that must not harden. Never reopen it yourself. A
reversal is a **new** `Dn` that the user asks for.

**When a call you just settled puts a demand on the code written now, say so, and never write a
`Cn`.** Name it in the relay as a constraint owed. `direction` writes the constraints. When it
invoked you, it writes yours as soon as you return.

When a caller invoked you, give this back and let it continue. When the user ran you by hand, stop
and suggest `orchestra:run` for the next task.

**Two lines of the return block need a human to see them, so a caller must pass them through, not
summarise them:** `Constraints owed:` (only `direction` can act on it) and `Worth reopening:` (only
the user can reverse a `soft:` decision). Say so when you give back.

## Hard gate

<HARD-GATE>
**Calls only. Never a design, never code, never a constraint.** You write `docs/curator/TECH.md`,
`docs/curator/DECISIONS.md` and `docs/curator/QUESTIONS.md`, and nothing else.
**Never write `docs/curator/DIRECTION.md`**: a `Cn` is `direction`'s, and two skills that write that
file give it two answers. No product code, no brief or plan of a run, and **no edit of `docs/curator/BACKLOG.md`
of any kind.** A row that you think must move is a flag in your relay.

**Never read `## Later`.** Not for context, and not "only to know". It is hidden on purpose.

**Never write a schema, type or interface for a feature that is not built.** Name what the future
demands, and let the feature that needs it decide the shape. A design for work that nobody started
cannot be proved false by anything in the repo, and that is why it rots.

**Never edit or delete a `Dn`.** `DECISIONS.md` is append-only and its ids are permanent. A
disagreement is a **new** row whose *Why* names what it reverses. But a call made on thin evidence,
or true only *for now*, is always fair to challenge: say so in your relay and let the user decide.
Settled is not the same as permanent.

**Never make the ceremony larger than your caller set.** One named dimension means one dimension.
</HARD-GATE>

## Return

The last thing in your reply is this block:

```
Result: ok | blocked | needs-input
Wrote: <files>
Summary: <TECH rows written; dimensions skipped and why; Dn and Qn ids>
Constraints owed: <what the near-term rows now demand, for direction; never a Cn>
Worth reopening: <at most one soft: Dn whose cost changed, or "none">
Warnings: <or "none">
```

`blocked` when `docs/curator/` does not exist. `needs-input` when a ground-shaping call needs the
user and the user cannot answer now. `ok` when each dimension in scope is settled, open as a `Qn`,
or clearly does not apply.
