# Open questions

> Your thinking space for what is not settled yet, in product or in tech. **Prose, not a table:** the
> paragraph is the point, and a table cell cannot hold one. One `##` section per question, with the
> status in the heading: `· open` or `· answered → Dn`. Add a `Refs:` line that points at research
> notes, specs or diffs.
>
> Answered entries **stay**. That a thing was open once, and how it was settled, is the valuable
> part. To delete it throws that away.
>
> **Non-blocking by design.** Nothing in the Curator gates on this file, waits for it, or refuses to
> go on because an entry is open. To close entries is good, but never required.
>
> Written by `orc-curator:curate` (and the sweep and the landing it runs), which opens a new `Qn` for each `Question` line of a run's brief. The curator also proposes to close an entry
> when a shipped run settled it in code.
>
> **Delete the commented example block below when your first real entry lands.** Its `· open` text
> can be found with a search, so if it stays there, it makes every count of open questions too high.

<!-- Example — replace with real entries.

## Q1 — do teams share projects or own them? · open

Leaning shared, because presence has to be visible across a whole project. Not settled: ownership
changes the permission model, and nothing needs it yet.

Refs: docs/curator/research/2026-07-30-multi-user-notes.md

## Q2 — which persistence engine? · answered → D3

Durability is required but write volume is tiny, so Postgres was overkill for a single-user CLI.
The real question was whether multi-user lands inside a year; it does not, so SQLite.

Refs: docs/curator/research/2026-07-30-storage-comparison.md

-->
