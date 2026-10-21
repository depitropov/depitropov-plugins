# Decisions

> Append-only log of cross-cutting calls and the **why** behind them. Newest at the bottom.
> One line each where you can. The *why* is the valuable part: the code cannot show it.
> Never edit or delete a past line. If a decision is reversed, add the reversal as a new line.
>
> **Who reads this:** you; the **curator**, on every curate run, to take the next `Dn` and to catch a
> new learning that contradicts a decision that is already here (that is a flag for you, never a
> silent overwrite); and **a burst of `/wayfinder` and a change in words**, which read the
> **`soft:` rows only** again, so that a call made on thin evidence is challenged and does not harden.
> A rule that you need *enforced* still belongs on a native surface (`CLAUDE.md`, `.claude/rules/`, a
> skill). This file records the why, not the rule.
>
> **The `Why` of every row opens with `hard:` or `soft:`.** It is a prefix inside the cell, and
> deliberately **not a fifth column**: a new column would break every row already written in every
> project. Write it at the same time as the row. To infer later whether a call was reversible, from
> append-only prose, is expensive and fails in silence.
>
> - **`hard:`**: a one-way door. Expensive or impossible to undo once code exists. Examples: what a
>   write is, what owns identity, the persistence engine after data lands in it.
> - **`soft:`**: decided on thin evidence, or true only *for now*. "No email/password login yet,
>   social only" is soft: it was right when made, and it is a candidate for reversal when that
>   changes.
>
> **Immutability is about the record, not the conclusion.** Never edit or delete a row: ids are
> permanent handles. But a `soft:` row is *invited* to be challenged. The skills above show it, you
> decide, and a reversal is a **new** row whose `Why` names the row it reverses. "We already settled
> that" is not an argument. A rule that forbids a second look is how a scope call for now becomes
> permanent architecture.
>
> **Ids are `Dn`.** They are numbered independently of `Bn` (backlog), `Cn` (constraints) and `Qn`
> (questions). Read the file before you add a row: the next id is the highest existing `Dn` plus one,
> never a count of rows. **Ids are never reused, also after a reversal.** A reversal is a new row
> with a new id whose *Why* names the row it reverses, so anything that points at `D3` still means
> what it meant.

| id | Date | Decision | Why |
|----|------|----------|-----|
<!-- D1 | 2026-06-02 | Use SQLite for storage | hard: single-file, zero-ops; fits the local-first constraint. Migrating once real data lands is a rewrite -->
<!-- D2 | 2026-06-02 | Social login only, no email/password | soft: nothing needs it yet and it halves the auth surface. Revisit the moment a user without a social account matters -->
