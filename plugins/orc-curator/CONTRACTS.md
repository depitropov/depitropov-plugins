# Contract matrix

> **Who adds to each doc, who updates it, who may remove from it, and who reads it.** Every doc is
> in `docs/curator/` of the project.
>
> **This file is a claim, not a record.** A matrix that people keep by hand rots when somebody edits a
> skill and not this file. So a test checks it: `test/orc-curator/contracts.test.js` reads the
> tables below and the skill texts. It fails when a skill named in a row does not name that doc, and
> when a skill names a doc and no row of that doc names the skill. A mention is not a read or a write:
> the columns are the judgement, and the test checks only that they agree with the mentions.
>
> **A change to a skill, a template or a reference updates this file in the same commit.**

Names without a prefix are of three kinds. A **skill** is `setup` or `curate`. A **procedure** is a file
in `procedures/` (`direction`, `backlog`, `landing`) that only `curate` follows, inline. A **guide** is a
file in `guides/` that orchestra reads by path; the matrix names it `spec-guide`, `plan-guide` or
`code-guide` for `guides/spec.md`, `guides/plan.md` and `guides/code.md`. "Names only" is a file that
names the doc only to forbid a write, or to say who else writes it.

## The docs

| Doc | Adds | Updates | **Removes** | Reads | Names only |
|---|---|---|---|---|---|
| `PRODUCT.md` | `setup` (the template, and the present on a project with code), `curate`, `landing` (Deliberately not, Why it's shaped this way) | `curate` | `curate` (what the diff made false: tiered, a question when not plain) | `spec-guide`, `plan-guide`, `direction` | `backlog` |
| `BACKLOG.md` | `setup` (the template), `backlog` (add), `curate` (deferred work, a row for `Serves: new`), `landing` (the cut, into Next; a Later row for an out-of-scope line, when the user chooses it) | `backlog` (move), `curate` (move to Shipped) | `backlog` (drop), `curate` (Vision prose that shipped) | `spec-guide`, `backlog`, `direction` | — |
| `DIRECTION.md` `## Constraints` | `setup` (the template), **`direction` (the only author)** | `curate` (satisfied) | `curate` (retire, orphans), `backlog` (orphans), `direction` (orphans) | `plan-guide` | — |
| `DIRECTION.md` `## Evaluated` | `direction` (one row per verdict) | `direction` (overwrite in place) | `direction` (rows whose `Bn` left Now and Next), `backlog` (on a drop, a demotion, or a change of meaning), `curate` (the retire rule: a reversed `Dn` or a changed dimension) | — | — |
| `DECISIONS.md` | `setup` (the template), `backlog` (reversals), `curate` (**the only writer of `Dn`**, with the procedures it follows; the answer of a change in words), `landing` (`hard:` from an ADR, `soft:` from a ticket answer) | never: append-only | never | `spec-guide`, `code-guide` (the `Dn` a comment may cite), `direction` | — |
| `QUESTIONS.md` | `setup` (the template), `direction` (an open `Qn`), `backlog` (a question the user asked), `curate` (**the only writer of `Qn`**, with the procedures it follows), `landing` (the fog) | `direction`, `backlog`, `curate` and `landing` (close) | never: closed, not deleted | `direction` (the agenda), `backlog` | — |
| `TECH.md` | `setup` (the template, and a transcription of the code) | `curate` (refresh from the code, a known dimension, a change in words), `landing` (a dimension that a map answer settles) | — | `spec-guide`, `plan-guide`, `direction` | `backlog` |
| `GLOSSARY.md` (at the repo root, or the files that `GLOSSARY-MAP.md` lists) | `curate` (creates it on the first term) | `curate` (edit in place) | `curate` (a retired term) | `spec-guide`, `plan-guide`, `code-guide` | `setup` |
| `research/` | `setup` (the folder), `direction` (one note per topic, written by `mattpocock-skills:research`), `landing` (copied from the `research/*` branches) | never: a new note supersedes | never | `direction` (the `For:` line of each note) | — |
| `maps/` | `setup` (the folder), `landing` (the map of a landed burst, moved from `.scratch/<effort>/`) | never: a closed record | never | `landing` (the `map:` refs of the cut) | `curate` (permitted actions) |

`setup` calls no skill and never runs `direction`. It writes the template copy, the present (the
`TECH.md` transcription and the `PRODUCT.md` answers), the `.scratch/` line in `.gitignore`, and the
flag. `curate` reads every doc, and follows the three procedures inline: it is the one organizer, and
the only way in for a diff, a map (a finished burst) or a change in words. `Dn` and `Qn` come from
`curate` alone; a procedure that writes one does it inside `curate`. At a landing, `curate` also
commits the burst's `GLOSSARY.md` changes and the ADRs that a new `Dn` links; it never edits an ADR.
Before it writes, it stops on uncommitted changes to the docs, so a discard touches only its own edits.

## The shared policy

`<plugin>/references/*.md` is cited by path, never invoked. It ships with the plugin, and no project
writes it. A reference earns its place at two readers or more, and never holds flow: flow lives in a procedure.

| Reference | Readers |
|---|---|
| `recording-rules.md` | `direction`, `backlog`, `curate`, `landing` |
| `glossary.md` | `curate` |
| `product.md` | `curate`, `landing`, `setup` |
| `tech.md` | `direction`, `curate`, `landing`, `setup` |

`glossary.md` has one reader today. Its second reader is the glossary gate (O13), when it is built.

## Invariants

- **`DIRECTION.md` has three writers and one author.** `direction` writes each `Cn`. `curate` marks
  rows satisfied, retires them and deletes orphans. `backlog` deletes rows whose backlog row lost its
  license. Only `direction` decides that a constraint exists; the others react to one. A move between
  horizons belongs to `backlog` and the user; `direction` only flags it.
- **`direction` has one caller: `curate`.** `setup` leaves `BACKLOG.md` and `DIRECTION.md` empty and
  never runs it. `direction` and `curate` never explore: an answer that they lack becomes a `Qn` and
  a nudge, "To <purpose>, run `/wayfinder <topic>`". Only the user starts a burst.
- **One judgement owner per file.** A mechanical write (move a row to Shipped, mark a `Cn` satisfied)
  can be shared. A judgement write cannot: two skills that make judgement calls on one file drift.
- **The ids that code may cite come from the Removes column.** `Dn` can be cited (never removed,
  never renumbered). `Cn` cannot (`direction` and `curate` remove it); `Bn`, `ACn` and `Tn` cannot
  either. A change to a removal rule makes `code-guide` wrong.
- **Evidence is not authority.** A research note that `direction` asks for holds only evidence. Each
  row that its findings earn is written by `curate`, which sits with the user.
- **Coverage is derived, never flagged.** A `Bn` in Now or Next with no `## Evaluated` row is the
  signal. Nobody sets a flag for it.
