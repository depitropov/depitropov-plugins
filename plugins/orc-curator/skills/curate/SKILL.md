---
name: curate
description: Use when the project's direction docs (backlog, product, tech, decisions, questions, glossary, direction) must change — after an orchestra run or on a commit range (a diff), when a wayfinder burst is finished (a map in .scratch/<effort>/), or when the user says what changed (a change in words: "drop B7", "we use Postgres now", "add social login"). The one organizer of docs/curator/, and the only writer of decisions and questions. Runs in the main session and may ask the user.
---

# Curate

You keep the docs in `docs/curator/` true. You are the one organizer: each change to the direction
docs comes through you. You find each durable learning, give it one verdict, write it to the one doc
that owns it, remove what became false, run the direction sweep once, and commit once.

You are **the only writer of `Dn` and `Qn`**. Inside a run, the stages before you only read the
docs. No run moves a backlog row to `## Now`.

**You never explore.** Navigation is `/wayfinder`, and only the user starts it. An answer that you
do not have becomes a `Qn` and a nudge in one form: "To <purpose>, run `/wayfinder <topic>`." A
nudge is a suggestion, never a step that you take.

You run in the main session, so you may ask the user. Ask one question at a time.

`<plugin>` is the folder two levels above this skill's folder. Ids, destinations and change rules:
`<plugin>/references/recording-rules.md`. Terms: `<plugin>/references/glossary.md`. The rules for
`PRODUCT.md`: `<plugin>/references/product.md`. The rules for `TECH.md`:
`<plugin>/references/tech.md`.

## Step 1: Inputs

You take one of three inputs:

- **A diff.** From orchestra (an `inline` action at the end of a run): `base`, `brief` (the brief
  of the run), `notes` (the notes folder of the run), and the result path that the prompt names.
  Work in the worktree that the prompt names. By hand: the user names a commit range
  (`<base>..HEAD`). There is no brief and no notes folder. Ask the user which backlog row the work
  served, or `new`. Do Steps 2 to 6.
- **A map.** The user says that a burst is finished and names the effort. Its map is in
  `.scratch/<effort>/`. Do Step 2, then Step 7.
- **A change in words.** The user says what changed: "drop B7", "we deploy to Fly now", "add social
  login". Do Step 2, then Step 8.

With no input, ask the user which one it is: a commit range, a finished burst, or a change to
describe. When an input that you need is missing from the prompt, say which one. Do not guess it.

Every input ends the same way: Steps 9 to 12.

## Step 2: Read every input first

Read all of these before you write anything:

- Every doc under `docs/curator/`: `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`,
  `QUESTIONS.md`, `TECH.md`, and `GLOSSARY.md` at the repo root. Read `DECISIONS.md` twice over: for
  the next `Dn` (highest existing plus one, never a count of rows) and for a decision that a
  candidate contradicts.
- For a diff: `git diff <base>..HEAD -- . ':!docs/runs/' ':!docs/curator/'`, and the commit log of
  the range. The brief and its `## Direction` section: `Serves` (once), `Deferred` and `Question`
  (zero or more). `<notes>/decisions.md` when it exists. It holds the product answers of the run:
  sections `## <gate>` with lines `- <question> → <answer>`.

When `docs/curator/` does not exist, stop: the result is `failed` with the reason "the Curator is
not set up; run orc-curator:setup". When an input cannot be read, the result is `failed` with what
could not be read.

**Uncommitted docs.** Before you write anything, look for uncommitted changes in `docs/curator/`
and in the glossary (`GLOSSARY.md` at the repo root, or the files that `GLOSSARY-MAP.md` lists).
When there are some, stop and ask the user which of two: commit them first, or treat them as a
backlog reconcile first (a change in words that follows the reconcile path of
`<plugin>/procedures/backlog.md`). Then go on with the input. So the docs agree with the last
commit, and a discard (Steps 7, 8 and 12) touches only your own edits. Two exceptions: when the
input is that reconcile, the changes are the input; and at a landing, the burst's changes to the
glossary and its new ADRs are input too. You commit them in Step 11.

## Step 3: The served row (a diff)

| The brief says | You do |
|---|---|
| `Serves: B<n>`, and the row is in `## Now` or `## Next` | move it to `## Shipped`, same `Bn`, with the run's branch or commit range as "shipped as" |
| `Serves: B<n>`, and the row is in `## Later` | move it to `## Shipped` the same way |
| `Serves: B<n>`, and the row was dropped while the run was open (it is in no section) | ask the user: add it as shipped, or record the work with no row |
| `Serves: new` | first check `## Now`, `## Next` and `## Later` for a row that the work matches. The spec stage never reads `## Later`, so a task that serves a Later row arrives as `new`. When a row matches, ask the user whether to ship that row instead. When none matches, add one row straight to `## Shipped` with the next `Bn` |
| the brief has no `## Direction` section, or there is no brief | ask the user which row the work served, or `new` |

A row that is already in `## Shipped` with this run's branch or range is done. Do not add it again.
Never add a silent duplicate.

## Step 4: One verdict for each candidate (a diff)

The candidates come from the diff, the brief (`Deferred`, `Question`, its out-of-scope items) and
`<notes>/decisions.md`. Each candidate gets exactly one verdict:

| Verdict | When |
|---|---|
| **ADD** | it is new and passes the checks below |
| **UPDATE** | it refines a fact that exists. Edit that entry in place, except in `docs/curator/DECISIONS.md` |
| **NOOP** | it is already there, correct and complete, or it fails a check. Give the reason. A NOOP is a verdict, not a silence |
| **question** | it contradicts an existing entry, or the change needs judgement. Ask the user (Step 10). Never overwrite in silence |

Before you give a verdict:

1. **The filter.** Is it *inferable* (a competent reader of the code knows it)? Then NOOP. Is it *a
   choice* that this project made among valid options? If not, NOOP. Is it *checkable* by a later
   run? If not, rephrase it so that it is, or NOOP.
2. **Dedup.** Search the target doc for the same fact, in the same words or near synonyms. Never add
   a fact a second time.
3. **Verify.** Ground each claim in the code. Open the file. Never trust prose or memory.
4. **Prune test.** "Would removing this line cause a mistake later?" If not, do not write it.

Never append blindly. Edit the entry or section that owns the fact, in place, except `docs/curator/DECISIONS.md`:
it is append-only. A refinement or a reversal is a new `Dn` whose `Why` names the row it reverses.
Never edit or delete a `Dn`.

## Step 5: Route each ADD or UPDATE to one doc (a diff)

| The learning is… | It goes to |
|---|---|
| the *why* behind a choice, also each answer in `<notes>/decisions.md` | `docs/curator/DECISIONS.md`, the next `Dn`. The `Why` opens with `hard:` or `soft:` |
| what the product *is*, or who it is for | `docs/curator/PRODUCT.md`, by the product reference: only what is true now that the diff has landed, never a feature inventory |
| a product rationale that the run settled | `docs/curator/PRODUCT.md` → "Why it's shaped this way", citing the `Dn`. Do not restate it |
| `## Vision` prose that the diff made real | delete it from `docs/curator/BACKLOG.md`. At most one clause goes to the overview of `PRODUCT.md` |
| an idea, a want for later, a `Deferred` line | `docs/curator/BACKLOG.md`: `## Next` when it is shaped and near-term, else `## Later`. The next `Bn`. Keep its refs |
| a `Question` line | `docs/curator/QUESTIONS.md`: a new `## Qn — <question> · open` entry |
| a question that the shipped code settled | `docs/curator/QUESTIONS.md`: change the heading to `· answered → Dn` and add one sentence on how the code settled it. Close only on evidence in the diff, never on intent, a plan or an inference. Never delete an entry |
| a domain term that the diff added, renamed or retired | `GLOSSARY.md` at the repo root, per the glossary reference. Only terms specific to this domain. Edit the entry in place; a rename puts the old word under `_Avoid_`. Create the file lazily on the first term |
| a change to what the project runs on | `docs/curator/TECH.md`, the capability row, refreshed from the code by the tech reference |

A question is never a backlog row. Layers and where code goes are not direction docs: NOOP.

## Step 6: Subtract (a diff)

Every doc here grows unless you also remove. Nothing else in a run removes.

- **`PRODUCT.md`.** Read it again against the diff. Remove what the diff made false. A sentence that
  is still unbuilt aspiration moves to `## Vision` of the backlog; do not delete the intent.
- **`## Vision`.** Keep the prose and the rows telling one story, in both directions. Rewrite prose
  that promises a row that is dropped or in `## Later`.
- **`GLOSSARY.md`.** Delete a term whose concept the diff retired. A term that one file stopped using
  is not retired.

**Removal is tiered by confidence.** Delete outright only on a plain contradiction: a claim about a
mechanism that the code no longer has. Anything else is a question with the file, the sentence and
what makes it look stale.

Four checks on `docs/curator/DIRECTION.md`:

1. **Satisfied.** For each `unsatisfied` row that the diff now carries, set `satisfied by <path>`,
   with the real file. Do not restate what the file says.
2. **Retire.** A `satisfied` row whose `from Bn` is in `## Shipped` is finished. Delete it. The why
   stays in `DECISIONS.md`.
3. **Orphans.** A row whose `from Bn` is no longer in `## Now` or `## Next` (dropped, or in
   `## Later`) is an orphan. Delete it and name it in the summary.
4. **Cap.** Past 50 rows, ask the user, with the probable cause (`## Next` carries `## Later` work,
   satisfied rows not retired, rows at the level of a design). Never cut rows.

Keep the diff evidence for the sweep (Step 9): shipped code that contradicts a live `Cn` (name the
`Cn`), and a row recorded as `no constraint` that the diff undermines (name the `Bn` and what
changed). Then go to Step 9.

## Step 7: A map

Follow `<plugin>/procedures/landing.md` with the effort. Read its return block.

When it returns `blocked` or `needs-input`, discard your own edits: restore each file that it
changed under `docs/curator/` from the last commit, and delete each file that it created there. So
a rerun does not append the same `Dn` and `Qn` rows again. Keep the burst's changes to
`GLOSSARY.md` and its ADRs: they are not yours. Tell the user the reason. Do not run the sweep and do not commit. The map stays in
`.scratch/<effort>/`, so the user can land it again.

When it returns `ok`, keep its `Markers:` and `Missing:` lines for the summary. Apply the retire
rule (Step 8) to each line of its `Reversed:`. Then go to Step 9.

## Step 8: A change in words

Sort the change. When it is not clear which kind it is, ask the user.

Before you write, list the `soft:` `Dn` rows that the change touches (the same topic or the same
capability dimension). Show each one to the user and ask: still true? A "no" is a reversal: a new
`Dn` that names the one it reverses, never an edit.

- **known: a plan change.** Add, drop, move, groom or reconcile a backlog row. Follow
  `<plugin>/procedures/backlog.md`. Keep its return block for the summary. When it returns
  `blocked` or `needs-input`, discard your own edits as in Step 7, tell the user the reason, do not
  run the sweep and do not commit. In a reconcile, your edits and the user's are in the same files:
  discard nothing, and name the files that you changed.
- **known: a decision or dimension change.** The user gives the answer ("we deploy to Fly now", "no
  more guest checkout"). Append the next `Dn`. Its `Why` opens with `hard:` or `soft:`, and it
  names the `Dn` it reverses, when there is one. Edit `TECH.md` by the tech reference, or
  `PRODUCT.md` by the product reference. Close each `· open` `Qn` that the answer settles: change
  its heading to `· answered → Dn` with the new `Dn`, and add one sentence. Never delete it. Then
  apply the retire rule.
- **unknown.** The user names a change but not its answer ("we may need offline mode"). Write one
  `## Qn — <question> · open` entry, and no `Dn`. Give the nudge: "To <purpose>, run
  `/wayfinder <topic>`."
- **bug.** The code does not do what it should. That is not a change of direction, so write
  nothing. Give the nudge: "To find the cause, run `/diagnosing-bugs <symptom>`."

**The retire rule.** For a reversed `Dn`, or a capability dimension that changed,
retire the `## Evaluated` row of each near-term `Bn` (in `## Now` or `## Next`) when one of
these cites the old `Dn` or names the dimension: the row text of the `Bn`, a `Cn` with `from Bn`,
or the `outcome` cell of its `## Evaluated` row. Delete only the `## Evaluated` row. Do not delete
a `Cn` with `from Bn` of such a row. Keep it as evidence for the sweep:
a live `Cn` that a reversed `Dn` or a changed dimension contradicts. Name the `Cn`. With no `## Evaluated` row, the
sweep treats the `Bn` as owed and derives fresh constraints.

Then go to Step 9.

## Step 9: The sweep

Follow `<plugin>/procedures/direction.md` once, with the line `Caller: curate` and the evidence
when there is any: the diff evidence from Step 6, and each `Cn` that the retire rule named. Do not report what the sweep can count: a moved row, a
missing `## Evaluated` row, an orphan. Never write a `Cn` yourself; the sweep writes it.

Read its return block and keep its `Coverage:` line for the summary. For each
`known: <dimension> → <answer>` line in `Escalated:`, write the row in `TECH.md` by the tech
reference and a `Dn` for the why. Relay each nudge to the user as it is. When it returns
`Result: blocked` or `needs-input`, tell the user the reason, ask the open question when there is
one, and go on. Never fail curate for it.

## Step 10: Questions

Ask each judgement call, one at a time: a dropped served row, a contradiction, a removal that is not
plain, the cap, a question from the sweep. Give the file, the sentence and the reason, the options,
and the option you recommend. Apply each answer before the next question.

## Step 11: Commit once

Show the user each new `Dn` with its marker (`hard:` or `soft:`) and its source, before the commit.
At a landing, these are the `Markers:` lines.

Commit in one commit: all sure edits, all applied answers and the moved map under `docs/curator/`;
the glossary (`GLOSSARY.md`, or the files that `GLOSSARY-MAP.md` lists); and at a landing, the ADRs
in `docs/adr/` or `<context>/docs/adr/` that a new `Dn` links. The message is
`docs(curator): curate <branch, range, effort or change>`. Use only read-only git commands before
it. Never push. When there is nothing to commit, skip the commit; it is not an error. A rerun after
the commit then goes straight to the result.

## Step 12: Result and summary

When orchestra runs you, write `{ "status": "ok" }` to the result path after the commit. On an
unreadable input or an error, write `{ "status": "failed", "reason": "<what>" }`.
Before you write a `failed` result, discard your own edits under `docs/curator/` and in
`GLOSSARY.md` as in Step 7, so that a rerun starts from the committed docs. At a landing, keep the
burst's changes.

Then tell the user the summary: the input. For a diff, the served row and where it went, the verdict
counts (ADD, UPDATE, NOOP, question) with one line for each candidate, what you removed and the
orphans. For a map, the markers, the rows of the cut, the `Qn` ids opened and closed, and each
missing research branch. For a change in words, its kind and what you wrote. Then the questions
asked and their answers, each nudge, and the sweep's `Coverage:` line. By hand, name the branch and
say that nothing was pushed.

## Permitted actions

Do not change files outside `docs/curator/`, except the result file that the prompt names, the
glossary (`GLOSSARY.md` at the repo root, or the files that `GLOSSARY-MAP.md` lists), and the map that
a landing moves from `.scratch/<effort>/` to `docs/curator/maps/<effort>/`. At a landing, you also
commit the ADRs in `docs/adr/` or `<context>/docs/adr/` that a new `Dn` links. Never edit an ADR.
Do not push.
The only skill that you invoke is `mattpocock-skills:research`, and it runs
only through the `direction` procedure. Every other skill that you name is a nudge to the user.
