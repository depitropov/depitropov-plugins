# Backlog

> Everything the product intends to become: the prose vision **and** the rows it breaks into.
> **This file owns the future.** `PRODUCT.md` describes what is real. Nothing goes there until it
> ships. This split stops the two files from copying each other on a new project, where "what it is"
> and "what we plan to do" would be the same set.
>
> **The sections are horizons of confidence, not dates.** `Now` is being built, `Next` is shaped but
> not started, `Later` is a bet. Rows move between sections freely, in both directions. A demotion is
> information, not a failure. Dated columns make every heading a promise. These do not.
>
> **Edit this file by hand when you want to.** It is a markdown table. No Curator step must write it
> first. But a hand edit cannot follow the consequences: a dropped row leaves `DIRECTION.md`
> constraints that cite it, and vision prose that still promises it. Run `orc-curator:curate`
> afterwards and tell it you edited the file by hand. It repairs the damage. Its orphan sweep catches the dangerous half even if you never do.
>
> **Ids are `Bn`.** They are independent of `Cn`, `Dn` and `Qn`. Read the file before you add a row:
> the next id is the highest existing `Bn` plus one, never a count of rows. Ids are never reused. A
> row keeps its id when it moves between sections.

## Vision

> The product as prose: what it becomes when the rows below are built. Written by
> `orc-curator:curate` (a plan change, or the landing of a burst). **Curate thins it as
> things ship.** When code carries a paragraph, the code describes it better and the paragraph goes.
> At most a clause stays in the overview of `PRODUCT.md`. If this section never gets shorter, the
> product story and the code have started to tell different stories.

[One to four paragraphs. A narrative, not a list of the rows below.]

## Now

> Being built. **Several rows can sit here.** This section is intent, not work in progress. The open
> runs are the task branches. `DIRECTION.md` derives constraints from here.

| id | item | why / refs |
|---|---|---|
| _none yet_ | | |

## Next

> Shaped enough to reason about, not started. **`DIRECTION.md` derives constraints from here too.**
> In this band, future work puts real pressure on the code that is written today. That is the reason
> the horizon split exists.

| id | item | why / refs |
|---|---|---|
| _none yet_ | | |

## Later

> Bets: wanted, not validated, maybe never built. **`DIRECTION.md` never reads this section.** A
> constraint taken from here is an abstraction bought for a feature that may not come.

| id | item | why / refs |
|---|---|---|
| _none yet_ | | |

## Shipped

> Done. Name the run's branch or commit range. Curate adds the row at the end of each run.

| id | item | shipped as |
|---|---|---|
| _none yet_ | | |
