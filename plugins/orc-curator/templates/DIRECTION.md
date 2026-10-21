# Direction

> The constraints that today's code gets from work that is already decided. **Forward pressure, not
> forward design:** a row says what a future backlog item will *demand of* the code that is written
> now. It never says what that future code will look like. "A step needs a stable identity" is a
> constraint. "Here is the schema for B1-B10" is a design, and it starts to rot when the first
> feature ships, because nothing breaks when it stops being true.
>
> **Derived from `BACKLOG.md` `## Now` and `## Next` only.** `## Later` is invisible here on
> purpose. A constraint taken from a bet that nobody validated is how a codebase ends up with
> abstractions for features that never come.
>
> **Who reads this:** the **planner**, on every plan, through the Curator's `plan` guide. It is the
> only file that lets a plan account for work outside its own run, which is otherwise forbidden.
> The direction sweep of `orc-curator:curate` writes it. **Curate** keeps it: it marks rows satisfied, deletes orphans
> and flags drift after every run.
>
> **Rows are not written by hand.** The sweep writes them. It reaches one verdict per
> near-term backlog row first. `orc-curator:curate` keeps them, and deletes the
> rows whose backlog row lost its license. A hand edit of a status is harmless. A row that you invent
> by hand skips the interview that makes a row a constraint and not a guess.
>
> **Ids are `Cn`.** They are numbered independently of `Bn` (backlog), `Dn` (decisions) and `Qn`
> (questions). Read the file before you add a row: the next id is the highest existing `Cn` plus one,
> never a count of rows. Ids are never reused.

## Constraints

> **Every row cites the backlog row that motivates it** (`from Bn`). This citation is the whole
> defense against drift. Demote or delete `Bn`, and this row is an orphan by rule, with no need for
> anyone to remember to look. A row whose backlog row is no longer in `## Now` or `## Next` is dead.
> Curate deletes it.
>
> **Status is one of:**
>
> - `unsatisfied`: the constraint is owed. No code answers it yet.
> - `satisfied by <path>`: real code carries it now. **Point at the file. Never repeat what it
>   says.** A prose copy of a schema is a second source of truth that cannot fail loudly.
>
> A row that is satisfied *and* whose backlog row has shipped is finished. Curate retires it. This
> file is a live ledger, not a history: the **why** belongs in `DECISIONS.md`, which never forgets.

| id | from | constraint | status |
|----|------|------------|--------|
| _none yet_ | | | |

## Size

> **Soft cap: 50 rows.** Past that, `orc-curator:curate` and its sweep raise it with you
> and do not continue in silence. A file that keeps growing usually has one of three causes:
> `## Next` holds items that belong in `## Later`, satisfied rows are not retired, or constraints are
> written at the size of a design and not at the size of a pressure. It is a smoke alarm, not a rule.
> If 60 rows are really owed, keep them and write here why.
>
> The rows that need the discipline are the **unsatisfied** ones. A satisfied row points at code that
> you can check. An unsatisfied row is a claim about work that nobody has started, and nothing in the
> repo can prove that it is still true. Keep that half small.

## Evaluated

> **The coverage record: which near-term backlog rows were looked at.** `from Bn` above gives you
> constraint to row. This table gives you row to *looked at*, the half that was missing. Without it
> nothing can tell **"`B9` gave no constraint"** from **"`B9` was never looked at"**, so every sweep
> either derives everything again or skips rows in silence.
>
> **The outcome `no constraint — <why>` is the important one.** It makes the sweep safe to repeat,
> and it is by far the most common outcome. A sweep that records only the rows that earned a `Cn` has
> recorded nothing of use.
>
> **Written by the sweep of `orc-curator:curate`:** one row per near-term backlog row, written when it reaches a
> verdict. `orc-curator:curate` retires the rows whose `Bn` left
> `## Now` and `## Next`.
>
> **`horizon at eval` is information, not a trigger.** It records the stakes at the time of the
> verdict. That is useful when a row that was vague in `## Next` becomes specific in `## Now`. It is
> not a condition to derive again, because a row moves between Now and Next by hand, and no run
> moves a row to Now. A trigger there would mean nothing. A move from `## Later` to `## Next` needs
> no special case: new intent arrives with no row here at all.
>
> **This is not a flag that anyone sets.** Anything you can derive from this table plus `BACKLOG.md`
> must be derived, and never noted somewhere for a later run to find. A note that several writers
> must remember to leave is a note that will be missing.

| Bn | horizon at eval | date | outcome |
|----|-----------------|------|---------|
| _none yet_ | | | |
