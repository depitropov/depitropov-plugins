---
name: curate
description: Use when a run has shipped and the project's direction docs (backlog, product, decisions, questions, glossary, direction) must agree with the code that landed — at the end of every orchestra run, or by hand on a commit range ("curate the docs", "update the curator docs from this branch"). The single writer of docs/curator/ in a run. Runs in the main session and may ask the user.
---

# Curate

You keep the docs in `docs/curator/` true to the code that just shipped. You find each durable
learning, give it one verdict, write it to the one doc that owns it, remove what the code made
false, and commit once.

Inside a run, you are the **only writer** of the docs. The stages before you only read them. No run
moves a backlog row to `## Now`.

You run in the main session, so you may ask the user. Ask one question at a time.

`<plugin>` is the folder two levels above this skill's folder. Ids, destinations and change rules:
`<plugin>/references/recording-rules.md`. Terms: `<plugin>/references/glossary.md`.

## Step 1: Inputs

- **From orchestra** (an `inline` action at the end of a run): `base`, `brief` (the brief of the
  run), `notes` (the notes folder of the run), and the result path that the prompt names. Work in
  the worktree that the prompt names.
- **By hand:** the user names a commit range (`<base>..HEAD`). There is no brief and no notes
  folder. Ask the user which backlog row the work served, or `new`.

When an input that you need is missing from the prompt, say which one. Do not guess it.

## Step 2: Read every input first

Read all of these before you write anything:

- The diff: `git diff <base>..HEAD -- . ':!docs/runs/' ':!docs/curator/'`, and the commit log of
  the range.
- The brief and its `## Direction` section: `Serves` (once), `Deferred` and `Question` (zero or
  more).
- `<notes>/decisions.md` when it exists. It holds the product answers of the run: sections
  `## <gate>` with lines `- <question> → <answer>`.
- Every doc under `docs/curator/`: `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`,
  `QUESTIONS.md`, `CONTEXT.md`, `TECH.md`. Read `DECISIONS.md` twice over: for the next `Dn`
  (highest existing plus one, never a count of rows) and for a decision that a candidate
  contradicts.

When `docs/curator/` does not exist, stop: the result is `failed` with the reason "the Curator is
not set up; run orc-curator:setup". When an input cannot be read, the result is `failed` with what
could not be read.

## Step 3: The served row

| The brief says | You do |
|---|---|
| `Serves: B<n>`, and the row is in `## Now` or `## Next` | move it to `## Shipped`, same `Bn`, with the run's branch or commit range as "shipped as" |
| `Serves: B<n>`, and the row is in `## Later` | move it to `## Shipped` the same way |
| `Serves: B<n>`, and the row was dropped while the run was open (it is in no section) | ask the user: add it as shipped, or record the work with no row |
| `Serves: new` | first check `## Now`, `## Next` and `## Later` for a row that the work matches. The spec stage never reads `## Later`, so a task that serves a Later row arrives as `new`. When a row matches, ask the user whether to ship that row instead. When none matches, add one row straight to `## Shipped` with the next `Bn` |
| the brief has no `## Direction` section, or there is no brief | ask the user which row the work served, or `new` |

A row that is already in `## Shipped` with this run's branch or range is done. Do not add it again.
Never add a silent duplicate.

## Step 4: One verdict for each candidate

The candidates come from the diff, the brief (`Deferred`, `Question`, its out-of-scope items) and
`<notes>/decisions.md`. Each candidate gets exactly one verdict:

| Verdict | When |
|---|---|
| **ADD** | it is new and passes the checks below |
| **UPDATE** | it refines a fact that exists. Edit that entry in place, except in `docs/curator/DECISIONS.md` |
| **NOOP** | it is already there, correct and complete, or it fails a check. Give the reason. A NOOP is a verdict, not a silence |
| **question** | it contradicts an existing entry, or the change needs judgement. Ask the user (Step 7). Never overwrite in silence |

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

## Step 5: Route each ADD or UPDATE to one doc

| The learning is… | It goes to |
|---|---|
| the *why* behind a choice, also each answer in `<notes>/decisions.md` | `docs/curator/DECISIONS.md`, the next `Dn`. The `Why` opens with `hard:` or `soft:` |
| what the product *is*, or who it is for | `docs/curator/PRODUCT.md`, only what is true now that the diff has landed. Never a feature inventory: if deleting one backlog row would make the sentence false, it is a feature and belongs in the backlog. Why it has its shape is worth a sentence; what it does is in the code |
| a product rationale that the run settled | `docs/curator/PRODUCT.md` → "Why it's shaped this way", citing the `Dn`. Do not restate it |
| `## Vision` prose that the diff made real | delete it from `docs/curator/BACKLOG.md`. At most one clause goes to the overview of `PRODUCT.md` |
| an idea, a want for later, a `Deferred` line | `docs/curator/BACKLOG.md`: `## Next` when it is shaped and near-term, else `## Later`. The next `Bn`. Keep its refs |
| a `Question` line | `docs/curator/QUESTIONS.md`: a new `## Qn — <question> · open` entry |
| a question that the shipped code settled | `docs/curator/QUESTIONS.md`: change the heading to `· answered → Dn` and add one sentence on how the code settled it. Close only on evidence in the diff, never on intent, a plan or an inference. Never delete an entry |
| a domain term that the diff added, renamed or retired | `docs/curator/CONTEXT.md`, per the glossary reference. Only terms specific to this domain. Edit the entry in place; a rename puts the old word under `_Avoid_`. Create the file lazily on the first term |
| a change to what the project runs on | `docs/curator/TECH.md`, the capability row, refreshed from the code |

A question is never a backlog row. Layers and where code goes are not direction docs: NOOP.

## Step 6: Subtract

Every doc here grows unless you also remove. Nothing else in a run removes.

- **`PRODUCT.md`.** Read it again against the diff. Remove what the diff made false. A sentence that
  is still unbuilt aspiration moves to `## Vision` of the backlog; do not delete the intent.
- **`## Vision`.** Keep the prose and the rows telling one story, in both directions. Rewrite prose
  that promises a row that is dropped or in `## Later`.
- **`CONTEXT.md`.** Delete a term whose concept the diff retired. A term that one file stopped using
  is not retired.

**Removal is tiered by confidence.** Delete outright only on a plain contradiction: a claim about a
mechanism that the code no longer has. Anything else is a question with the file, the sentence and
what makes it look stale.

### DIRECTION

Four checks on `docs/curator/DIRECTION.md`:

1. **Satisfied.** For each `unsatisfied` row that the diff now carries, set `satisfied by <path>`,
   with the real file. Do not restate what the file says.
2. **Retire.** A `satisfied` row whose `from Bn` is in `## Shipped` is finished. Delete it. The why
   stays in `DECISIONS.md`.
3. **Orphans.** A row whose `from Bn` is no longer in `## Now` or `## Next` (dropped, or in
   `## Later`) is an orphan. Delete it and name it in the summary.
4. **Cap.** Past 50 rows, ask the user, with the probable cause (`## Next` carries `## Later` work,
   satisfied rows not retired, rows at the level of a design). Never cut rows.

Then invoke `orc-curator:direction` with the line `Caller: curate`, and the diff evidence when there
is any:

- shipped code that contradicts a live `Cn` (name the `Cn`);
- a row recorded as `no constraint` that the diff undermines (name the `Bn` and what changed).

Do not report what the sweep can count: a moved row, a missing `## Evaluated` row, an orphan. Never
write a `Cn` yourself; the sweep writes it. It does not commit when you call it. Read its return
block and keep its `Coverage:` line for the summary. When it returns `Result: blocked` or
`needs-input`, tell the user the reason from its return block, ask the user the open question when
there is one, and go on with the rest of curate. Never fail curate for it.

## Step 7: Questions

Ask each judgement call, one at a time: a dropped served row, a contradiction, a removal that is not
plain, the cap, a question from the sweep. Give the file, the sentence and the reason, the options,
and the option you recommend. Apply each answer before the next question.

## Step 8: Commit once

Commit all sure edits and all applied answers under `docs/curator/` in one commit:
`docs(curator): curate <branch or range>`. Use only read-only git commands before it. Never push.
When there is nothing to commit, skip the commit; it is not an error. A rerun after the commit then
goes straight to the result.

## Step 9: Result and summary

When orchestra runs you, write `{ "status": "ok" }` to the result path after the commit. On an
unreadable input or an error, write `{ "status": "failed", "reason": "<what>" }`.

Then tell the user the summary: the served row and where it went, the verdict counts
(ADD, UPDATE, NOOP, question) with one line for each candidate, what you removed, the orphans, the
questions asked and their answers, and the sweep's `Coverage:` line. By hand, name the branch and
say that nothing was pushed.

## Permitted actions

Do not change files outside `docs/curator/`, except the result file that the prompt names. Do not push. The only skill you invoke is
`orc-curator:direction`.
