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

Skills are named without the `orc-curator:` prefix. "Names only" is a skill that names the doc only to
forbid a write, or to say who else writes it.

## The docs

| Doc | Adds | Updates | **Removes** | Reads | Names only |
|---|---|---|---|---|---|
| `PRODUCT.md` | `setup` (the template), `shape-product`, `curate` | `shape-product`, `curate` | `curate` (what the diff made false: tiered, a question when not plain) | `spec-guide`, `plan-guide`, `direction`, `research`, `shape-tech` | `backlog` |
| `BACKLOG.md` | `setup` (the template, and a reshape row on approval), `shape-product` (Vision and rows), `backlog` (add), `curate` (deferred work, a row for `Serves: new`) | `backlog` (move), `curate` (move to Shipped) | `backlog` (drop), `curate` (Vision prose that shipped) | `spec-guide`, `setup` (the counts), `backlog`, `direction`, `shape-tech` | — |
| `DIRECTION.md` `## Constraints` | `setup` (the template), **`direction` (the only author)** | `curate` (satisfied) | `curate` (retire, orphans), `backlog` (orphans), `direction` (orphans) | `plan-guide` | `shape-tech`, `research` |
| `DIRECTION.md` `## Evaluated` | `direction` (one row per verdict) | `direction` (overwrite in place) | `direction` (rows whose `Bn` left Now and Next), `backlog` (on a drop, a demotion, or a change of meaning) | — | — |
| `DECISIONS.md` | `setup` (the template, and a reshape `Dn`), `shape-product`, `shape-tech`, `backlog` (reversals), `curate` | never: append-only | never | `spec-guide`, `code-guide` (the `Dn` a comment may cite), `direction`, `research` (already settled), `shape-product` and `shape-tech` (the `soft:` rows) | — |
| `QUESTIONS.md` | `setup` (the template), `shape-product`, `shape-tech`, `direction`, `backlog` (a question the user asked), `curate` | `setup` (flip to answered), `shape-tech`, `direction`, `backlog` and `curate` (close) | never: closed, not deleted | `setup` (the reshape agenda), `shape-tech` and `direction` (the agenda), `backlog` | `research` |
| `TECH.md` | `setup` (the template), `shape-tech` | `shape-tech`, `curate` (refresh from the code) | — | `spec-guide`, `plan-guide`, `direction`, `research` | `backlog` |
| `GLOSSARY.md` | `curate` (creates it on the first term) | `curate` (edit in place) | `curate` (a retired term) | `spec-guide`, `plan-guide`, `code-guide` | `setup` |
| `research/` | `setup` (the folder), `research` (one note per topic) | never: a new note supersedes | never | `direction`, `shape-tech`, `research` (supersede check) | — |

`setup` writes only through its calls, plus the template copy, the reshape edits the user approved,
and the flag. `curate` reads every doc.

## The shared policy

`<plugin>/references/*.md` is cited by path, never invoked. It ships with the plugin, and no project
writes it. A reference earns its place at two readers or more, and never holds flow: each skill keeps
its own questions and its own procedure.

| Reference | Readers |
|---|---|
| `recording-rules.md` | `setup`, `shape-product`, `shape-tech`, `direction`, `backlog`, `curate` |
| `ask-vs-research.md` | `shape-product`, `shape-tech`, `research` |
| `interview-cadence.md` | `shape-product`, `shape-tech` |
| `right-sizing.md` | `shape-tech`, `research` |
| `glossary.md` | `curate` |
| `product.md` | curate and setup (wired in S79, tasks 3 and 4) |
| `tech.md` | `direction`, curate and setup (wired in S79, tasks 3 and 4) |

`glossary.md` has one reader today. Its second reader is the glossary gate (O13), when it is built.

## Invariants

- **`DIRECTION.md` has three writers and one author.** `direction` writes each `Cn`. `curate` marks
  rows satisfied, retires them and deletes orphans. `backlog` deletes rows whose backlog row lost its
  license. Only `direction` decides that a constraint exists; the others react to one. A move between
  horizons belongs to `backlog` and the user; `direction` only flags it.
- **`direction` and `shape-tech` split by cadence.** `shape-tech` runs rarely: at project start, or
  for one changed dimension. `direction` runs after each change to the backlog and at the end of each
  run. A change that gives one of them the rate of the other joins them again, and then the rare
  interview blocks the frequent sweep.
- **One judgement owner per file.** A mechanical write (move a row to Shipped, mark a `Cn` satisfied)
  can be shared. A judgement write cannot: two skills that make judgement calls on one file drift.
- **The ids that code may cite come from the Removes column.** `Dn` can be cited (never removed,
  never renumbered). `Cn` cannot (`direction` and `curate` remove it); `Bn`, `ACn` and `Tn` cannot
  either. A change to a removal rule makes `code-guide` wrong.
- **Evidence is not authority.** `research` writes only its notes. Each row that its findings earn is
  written by the skill that sits with the user.
- **Coverage is derived, never flagged.** A `Bn` in Now or Next with no `## Evaluated` row is the
  signal. Nobody sets a flag for it.
