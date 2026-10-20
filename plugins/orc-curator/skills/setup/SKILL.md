---
name: setup
description: Use when a project's intent was never written down — "set up the curator", "shape this project", "what are we even building" — or when the product, tech or backlog in docs/curator/ no longer say what you now intend; also when orchestra run asks for the Curator's setup. Creates docs/curator/ from the templates, then runs two interviews (the product through shape-product, the tech through shape-tech, then the direction sweep). On a project that is already set up, it reshapes. It can run again at any time.
---

# Curator setup

You capture what the project is *for* and what it is *built on*. You write **intent**: never code,
never a brief, never a plan. You run in the main session and ask the user.

This skill can run again. Intent changes, so it must stay open to change: on a project that is
already set up, you reshape.

`<plugin>` is the folder two levels above this skill's folder.

## Step 1: Inputs

- **From orchestra, on its own branch:** the input `done` (`docs/curator/.setup`) and the path of the
  result file. Work in the worktree that the prompt names, on the branch `curator/setup`. The user is
  in the session.
- **By hand**, or from `orchestra:run` on the default branch: an idea, or nothing.

Setup never runs inside a feature run, so there is no task. A task the user named to start a run is
not the product idea: do not shape it here.

## Step 2: Bootstrap

1. For each of `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md` and
   `TECH.md`: when `docs/curator/<FILE>` does not exist, copy `<plugin>/templates/<FILE>` there.
   Never overwrite a file that exists. Do not copy `CONTEXT.md`: `orc-curator:curate` creates it on
   the first domain term.
2. Create `docs/curator/research/` with an empty `.gitkeep` when it does not exist.

## Step 3: Route on the fill state

Read `docs/curator/PRODUCT.md`, `TECH.md`, `BACKLOG.md` and `QUESTIONS.md`. A file is
**template-shaped** when it still has bracket placeholders (such as `[One paragraph, plain
language…]`), `_none yet_`, or only the commented example block.

- `PRODUCT.md` template-shaped → Step 4 (the product half), then Step 5. Neither half ran.
- `PRODUCT.md` real, `TECH.md` template-shaped → an earlier setup stopped, and shape-product writes
  `PRODUCT.md` before the user confirms it. Ask the user whether the product shape was confirmed.
  Not confirmed → Step 4 (shape-product resumes from the real `PRODUCT.md`). Confirmed → Step 5
  (the tech half). The files are the resume signal.
- Both real → Step 6 (reshape).

## Step 4: The product half

Invoke `orc-curator:shape-product` and give it the user's idea, if there is one.

When the project already has code (any source files outside `docs/`), say so in the call: it reads
the README and the code first, states the existing product back to the user, writes it to
`PRODUCT.md` as true today, and goes wide only on what is not built yet. Do not explore four
directions for a product that exists.

It runs its own coverage: it states the idea back, finds the gray areas, explores at least four
different directions before it narrows, examines comparable products, and keeps tech out of the
talk. Let it. Do not repeat its questions, and do not answer tech questions for it: that is
Step 5's job, and tech in the product talk makes the product space smaller too early.

It writes `PRODUCT.md`, `BACKLOG.md` (`## Vision` and the horizon rows), `DECISIONS.md` and
`QUESTIONS.md`.

Read its return block. When it says `Result: needs-input`, the user stopped before they confirmed
the shape: do not start the tech half. Commit what it wrote (Step 7, first commit only), do not
write the flag, and go to Step 8. Setup runs again and resumes from the files.

## Step 5: The tech half: three calls, in order

Tech is discussed only here, and you do not hold these talks yourself. Each call is a skill with its
own procedure. One procedure, several callers: only the evidence is different. Read each return
block before the next call.

**(a) `orc-curator:shape-tech`, with the line `Caller: setup`.** It walks every capability dimension
that applies (runs as, deploys to, persists, integrates with, authenticates, hard constraints), asks
about the ground-shaping calls, researches what reading and asking cannot settle, and writes the
`TECH.md` rows, their `Dn` and a `Qn` for each thing left open. With no code it commits only the
minimum spine; with existing code, its evidence gate records what the code shows. Do not ask its
dimensions again and do not answer for it.

**(b) Show the backlog and offer to arrange it.** Step 4 filled `## Now`, `## Next` and `## Later`
from the product talk alone, before the tech was known, and (a) can change what looks near-term.
Show the count per horizon and the rows, and ask if a row must move before the constraints are
derived from them. `orc-curator:backlog` is not built yet: when the user wants changes, tell them to
edit `docs/curator/BACKLOG.md` by hand now, and wait until they say that it is done. On the setup branch, give them the full path: the folder the prompt says to work in, plus `/docs/curator/BACKLOG.md`. Say that their checkout has no such file until the branch is merged. By hand, the path is the project's own `docs/curator/BACKLOG.md`. When they want
no change, say so and continue. This is a pause for review, not a required grooming.

The order is important: groom before the sweep. `direction` derives from `## Now` and `## Next` as
they are when it runs. A change after the sweep leaves `DIRECTION.md` about an arrangement that no
longer exists.

**(c) `orc-curator:direction`, with the line `Caller: setup`.** Every near-term row now owes a
verdict: a `Cn`, or "no constraint" with a reason. It asks what that near-term work demands of code
that does not exist yet, so the first run does not fill that gap by guessing. Give it shape-tech's
`Constraints owed:` and `Worth reopening:` lines word for word, not a summary.

A `needs-input` from shape-tech or direction does not stop setup: the open call is a `Qn`, and
`QUESTIONS.md` never blocks. Name it in the relay.

When direction returns `Escalated: setup — purpose change`, name it in the relay, and say to run
`orc-curator:setup` by hand to reshape (Step 6) for it.

Then go to Step 7.

## Step 6: Reshape

`docs/curator/QUESTIONS.md` is your agenda.

1. **State back what the files say.** In two or three sentences: what `PRODUCT.md` says the product
   is, which spine `TECH.md` records, and the count of `BACKLOG.md` rows per horizon (for example
   *"1 now, 3 next, 5 later, 4 shipped; 2 questions open"*). Count only live entries: a `Qn` inside
   an HTML comment is template example text. When the example block is still there, delete it.
2. **Walk every open `Qn`, by id.** *"Q1: do teams share projects or own them? Is it settled?"* This
   is the main part. For each one the user settles:
   - first append the `DECISIONS.md` row with the next `Dn` (highest existing plus one), and open
     its `Why` with `hard:` or `soft:` (`<plugin>/references/recording-rules.md`);
   - change the heading to `· answered → Dn` with that id;
   - keep the entry, and add to its prose how it was settled. Never delete it;
   - when the answer means work, add a `BACKLOG.md` row with the next `Bn`;
   - when the answer settles a tech dimension, the `TECH.md` row is shape-tech's and each `Cn` is
     direction's: make the Step 5 calls, and let them write.
3. **Ask what else changed:** product direction, users, scope, stack. Each new unknown is a new
   `## Qn — <question> · open` entry with the next `Qn` (highest existing plus one, answered entries
   included, ids never reused).
4. **Propose, then write.** Show the user a list of the edits and the diff. Write only on the user's
   approval.
5. **A reversal appends.** A reversed decision is a **new** `Dn` whose `Why` names the row it
   reverses. Never edit, delete or reuse a past `Dn`. The `Qn` it opens again goes back to `· open`.
6. **Always end with the sweep.** Invoke `orc-curator:direction` with `Caller: setup`, also when no
   tech dimension changed. The backlog has almost certainly moved since the last sweep, and the
   sweep costs little: when the constraints already agree, it returns `ok` with `Wrote: nothing`.
   When the reshape moved rows, show the backlog first (Step 5 (b)).

Then go to Step 7.

## Step 7: Commit and the flag

1. Commit `docs/curator/` with `docs(curator): setup`. Nothing to commit is not an error. The
   skills you invoked do not commit: you do.
2. Write the empty file `docs/curator/.setup` last, and commit it: `docs(curator): setup done`. A
   setup that stops before this step runs again. Skip this step when the product half stopped
   (Step 4).

## Step 8: Result and relay

When orchestra runs you on its own branch, write the result JSON to the path that the prompt names: `{ "status": "ok" }`
when the flag is written. When the product half stopped, or on an error, write
`{ "status": "failed", "reason": "<what stopped or failed>" }`. For a stopped product interview, end the reason with "Run orchestra run again to resume the product interview." (by hand: "Run setup again to resume.").

Tell the user:

- which files you wrote, and what the product and the spine are now;
- the open `Qn` ids;
- the sweep's `Coverage:` line and the `Cn` count;
- a purpose change that direction escalated, and that they run `orc-curator:setup` by hand to reshape;
- shape-tech's `Worth reopening:` line word for word, or "none": only the user can reverse a
  `soft:` `Dn`;
- on the setup branch: the docs are on `curator/setup` until it is merged;
- the next step: on the default branch, push; on the setup branch, merge it. Then start a run with
  `orchestra:run`, or curate by hand.

## Hard gate

<HARD-GATE>
**Intent only.** No code, no brief, no plan. Every file is written through its owner:
`shape-product` writes `PRODUCT.md`, the `BACKLOG.md` vision and rows, `DECISIONS.md` and
`QUESTIONS.md`; `shape-tech` writes `TECH.md`; `direction` writes `DIRECTION.md`. You write only the
bootstrap copy, the reshape edits the user approved (Step 6), the commits and the flag. Never write
a `TECH.md` row or a `Cn` yourself, and never ask again a dimension that shape-tech walked.

**Four skills, and no others.** You invoke `orc-curator:shape-product`, `orc-curator:shape-tech`,
`orc-curator:backlog` (when it is built, only when the user wants rows moved) and
`orc-curator:direction`. Never `research` directly: the skills you invoke use it when their own
rules say so.

**No runs.** You do not start a run, and a run never moves a backlog row to `## Now`. You may put a
row in `## Now` only when the user says so: that is intent, not a run.

**Horizons are confidence bands, not a roadmap.** No order inside a section, no estimates, no
dependencies, no milestones. A row moves between horizons in both directions. A broad row that is
broken down leaves the narrower rows with `from Bn` in the refs column.

**A question is never a backlog row.** "decide X" and "which Y" go to `QUESTIONS.md`.

**`QUESTIONS.md` never blocks.** Never refuse to go on because an entry is open, and never tell the
user to close one first.
</HARD-GATE>

## Permitted actions

Write files under `docs/curator/` only, except the result file that the prompt names. Do not
change other files. Do not push.
