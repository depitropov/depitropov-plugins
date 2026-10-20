# <Topic>: research

> Written by `orc-curator:research`. **One topic per note**: one file, one file name, one thing that a
> later note can supersede without a change to anything else.
>
> **This note is evidence, not the decision**, and `research` writes nothing else. No `Dn`, no
> `TECH.md` row, no `Cn`, not even a `Qn`: each of those is a decision or the record of one, and that
> authority belongs to the skill that sits with the user. `research` gives its recommendation, its
> refutations and what it could not settle back in its **return block**. The caller writes the rows:
> `orc-curator:shape-tech` for a tech call, `orc-curator:direction` for a constraint,
> `orc-curator:shape-product` for a product fact.
>
> **This note holds the complete research, not a summary of it.** Every finding, every source, the
> full comparison: enough that a person who reads it cold in three months needs nothing else. The
> return block is a pointer; this note is the record.
>
> Nothing reads `research/` on a schedule, so a finding that stays only here reaches nobody. That is
> a failure of the caller to record, not of this file.

**Date:** <YYYY-MM-DD> · **Mode:** <deep | wide> · **Question:** <the one question that this note answers, in one sentence>
**For:** <the `Bn` or the task this was run for: it makes the note findable from the row that caused it>
**Method:** <deep: N sources read → N claims checked · wide: N candidates against M axes>
**Supersedes:** <the path of the note that this one replaces, or "—">

## Recommendation

> The answer first, in 3–6 points. What to do, not what was found.
>
> **In a `wide` note, name the runners-up here too.** The user chooses. A recommendation that hides
> the other options takes the choice away from the user.

- **<dimension>:** <the call>: <the one-line why>

## Comparison

> **`wide` runs only.** In a `deep` note, delete this section. Do not fill it with one row.
>
> Candidates as rows, the **fixed axes** as columns. The axes were chosen *before* any candidate was
> researched, and each candidate was measured against the same axes. That makes the table
> comparable. For the same reason, do not add a column later for one candidate that is good at it.
>
> Rank the candidates, and say what would change the ranking. A candidate that lost still records
> what it wins at: that sentence is read when the requirements change.

| rank | candidate | <axis 1> | <axis 2> | <axis 3> | wins at |
|------|-----------|----------|----------|----------|---------|
| 1 | <name> | | | | |
| 2 | <name> | | | | |

**Would change the ranking:** <what must be true for #2 to win>

## Findings

> One `###` for each finding, each with a confidence level. Cite primary sources: a search snippet is
> not a source. Check what a library does against its own repo or docs before you write it.

### 1. <finding> (confidence: high | medium | low)

<What was found, and what it means for this project.>

Sources: <links>

## Refuted

> **The section with the most value, and the one that most research skips.** Claims that looked
> right and did not survive the check, with what killed them. An empty section usually means that
> nothing was checked, only collected.

- **<claim>**: REFUTED: <what disproved it>

## Caveats

> Where this note is weak: what was not checked, which sources are of blog quality, what would change
> the recommendation. Say it plainly. A caveat that you keep to yourself becomes a bug in three
> months.

## Open questions

> What research could not settle. **Reported to the caller, which writes each one as a `Qn`.** Never
> written here as a row, and never filed by `research`. Nothing reads this file on a schedule, so the
> caller must get each question in the return block.

1. <question>
