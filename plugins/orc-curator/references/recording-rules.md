# Recording rules

> **Shared policy.** Every skill that writes a file in `docs/curator/` cites it. It is policy only:
> the table of where a fact goes, and the rules for ids and for changes. Which *content* a skill
> writes is the business of that skill.

## Ids

`Bn` (backlog), `Cn` (constraint), `Dn` (decision) and `Qn` (question) are **numbered independently**.
`ACn` (acceptance criteria) and `Tn` (tasks) are **scoped to one run**: they are the criteria of the
brief and the tasks of the plan of that run, and they mean nothing outside it. Another run can also
have an `AC1`.

**The next id is the highest existing id plus one, never a count of rows.** Read the file before you
add a row. A count breaks when anything is deleted, and it issues a live id again without a sound.

**Ids are never reused**, also after a reversal or a deletion. They are permanent handles: anything
that points at `D3` must still mean what it meant.

An id inside an HTML comment, such as the examples of a template, does not count.

A `Bn` **keeps its id when it moves between horizons.** A row that moves from `## Later` to `## Next`
is the same row.

## Where a fact goes

Six files, by tense. **No fact is written to two of them.** This split is the only thing that keeps
the files from becoming copies of each other.

| File | Holds | Tense |
|---|---|---|
| `BACKLOG.md` | the prose vision **and** the rows it breaks into: the only file that describes what does not exist | future |
| `PRODUCT.md` | what is true today, and above all *why the product has its shape* | present |
| `TECH.md` | what the project runs on: a thin index of capability rows, under about 50 lines, never a rulebook | present |
| `DIRECTION.md` | what near-term work **demands of** the code that is written now | forward constraint |
| `DECISIONS.md` | why we chose, in the affirmative or the negative | past |
| `QUESTIONS.md` | what is still open | unsettled |

**Never write one dimension to two files.** A fact in both `TECH.md` and `QUESTIONS.md` is a double
write, and double writes drift. Settled goes in one file. Open goes in the other. Not applicable goes
in neither.

**A question is never a backlog row.** "Decide X" or "which Y" goes to `QUESTIONS.md`. A decision
that is routed to the backlog gets specified as if it were work.

**`PRODUCT.md` holds only what is true today.** The test: *would deleting one backlog row make this
sentence false?* If yes, it is a feature description in prose, and it belongs in the backlog. On a new
project `PRODUCT.md` says very little, and that is correct.

## Mutation

**`DECISIONS.md` is append-only.** Never edit a row, never delete one, never reuse an id. A reversal
is a **new** row whose *Why* names what it reverses.

**Every `Why` that you write opens with `hard:` or `soft:`.** It is a prefix inside the cell, never a
new column (a new column breaks every row already written in every project that uses the Curator):

| Marker | Means | Example |
|---|---|---|
| `hard:` | a one-way door: expensive or impossible to undo once code exists | what a write is, what owns identity, the persistence engine after data lands in it |
| `soft:` | decided on thin evidence, or true only *for now* | "social login only, no email/password yet" |

**Set it when you write the row. Never infer it later.** To guess from append-only prose whether a
call was firm is expensive and unreliable, and it fails in silence. One word, written when you know
the answer, replaces all of that.

**Append-only is about the record, not the conclusion.** A `soft:` row is *invited* to be
**challenged**: show it and let the user decide. "We already settled that" is not an argument, and a
rule that forbids a second look turns a scope call for now into permanent architecture. What stays
forbidden is to edit the row. A challenge makes a **new** row, so anything that cites the old id
still means what it meant.

**`QUESTIONS.md` never blocks.** It is a thinking space. Never refuse to go on because an entry is
open, and never tell the user that they must close one first. (Inside a run, the Curator asks the user
a question directly. That is the Curator that asks. It is not `QUESTIONS.md` that blocks.) Entries are
**closed, never deleted**: change the heading and extend the prose with how it was settled.

## Removal

An artifact whose writers only add fills up with plans. Every knowledge file needs something that
subtracts. Removal is **tiered by confidence**: delete outright only when the evidence plainly
contradicts the sentence. Otherwise flag it for the user. (In a run, the Curator asks the user.) Adding a
row cannot undo a deletion.
