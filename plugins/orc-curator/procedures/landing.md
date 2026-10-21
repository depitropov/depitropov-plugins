# Landing procedure

You land a finished burst. A burst is one round of navigation that the user ran with `/wayfinder`.
Its map is in `.scratch/<effort>/`. You write its results into `docs/curator/`: decisions, scope
cuts, open questions, research notes and backlog rows. Then you move the map to
`docs/curator/maps/<effort>/`.

**You record. You do not explore.** Each answer is already in the map. When an answer is missing,
it becomes a `Qn`, not a new decision.

`curate` runs you inline in the main session, so you may ask the user. Ask one question at a time.

`<plugin>` is the folder of the orc-curator plugin, the folder that holds `procedures/`. Ids,
destinations and change rules: `<plugin>/references/recording-rules.md`.

## Caller

You have one caller: `curate`. It gives you the effort: the folder name under `.scratch/`.

## Step 1: Prepare

When `docs/curator/` does not exist, tell the user that the Curator is not set up, write nothing,
and return `Result: blocked`. When `.scratch/<effort>/map.md` does not exist, say so and return
`Result: blocked`.

A ticket that is not `Status: resolved`, and that `## Out of scope` does not link, means that the
burst is not finished. Name each one and ask
the user: land now, or wait. When the user says land now, each open ticket becomes a `Qn` (Step 5).

## Step 2: Read

Read all of these before you write:

- `.scratch/<effort>/map.md`: `## Destination`, `## Notes`, `## Decisions so far`,
  `## Not yet specified`, `## Out of scope`.
- Each ticket in `.scratch/<effort>/issues/NN-<slug>.md`: its `Type:` line (`research`,
  `prototype`, `grilling` or `task`), its `Status:` line, its `Blocked by:` line and its `## Answer`.
- Each ADR in `docs/adr/` (`NNNN-slug.md`), and in `<context>/docs/adr/` of each context that
  `GLOSSARY-MAP.md` lists, when it exists. The `domain-modeling` skill writes an ADR only for a
  trade-off that is hard to reverse and surprising.
- `docs/curator/DECISIONS.md`: the next `Dn`, the ADRs that a `Dn` links already, each `Dn` that
  an answer reverses, and the `soft:` `Dn` rows that the map touches (the same topic or the same
  capability dimension). Show each of these `soft:` rows to the user before Step 3, and ask:
  still true? A "no" is a reversal, and a reversal stays a new `Dn` (Step 3).
- `docs/curator/QUESTIONS.md`: the `· open` entries.
- `docs/curator/BACKLOG.md`: the next `Bn`, `## Vision`, `## Now` and `## Next`.
- `docs/curator/PRODUCT.md` and `docs/curator/TECH.md`.

## Step 3: Decisions

**The ADR signal sets the marker.** You never guess `hard:` or `soft:`.

1. **An ADR in `docs/adr/` (or a `<context>/docs/adr/`) that no `Dn` links yet** lands as its own
   `hard:` `Dn`. Its refs link the ADR. The ADR stays where it is. Do not edit it.
2. **A ticket answer that records a choice, and that no such ADR covers,** lands as a `soft:` `Dn`.
   An answer that an ADR covers gets no second `Dn`: cite the ADR's `Dn`.
3. A `task` answer that records only what was done (a URL, a count, where a key is) is not a choice.
   It gives no `Dn`. Put the fact in the refs of the row that needs it (Step 7).

The refs of each `Dn` hold the ticket path under `docs/curator/maps/<effort>/issues/` (the path
after the move) and its research note or its branch pointer (Step 6).

When an answer reverses a `Dn`, the new `Dn` names the `Dn` that it reverses. Never edit or delete
the old one. When an answer settles a capability dimension (runs as, deploys to, persists,
integrates with, authenticates, a hard constraint), write its row in `TECH.md` by
`<plugin>/references/tech.md`. When an answer says why the product has its shape, write one line in
`## Why it's shaped this way` of `PRODUCT.md` by `<plugin>/references/product.md`. Give each
reversed `Dn` and each changed dimension back to `curate` (`Reversed:`), so that it retires the
`## Evaluated` rows that depend on them.

## Step 4: Out of scope

A line of `## Out of scope` says that the burst ruled it out of this effort. It is not always a
product non-goal. For each line, ask the user which it is:

- **A product non-goal.** Write one line in `## Deliberately not` of `PRODUCT.md` with its `Dn`, by
  `<plugin>/references/product.md`. The `Dn` is `soft:` unless an ADR covers it.
- **Out of this effort only.** A row in `## Later` of `BACKLOG.md` (the next `Bn`, with the `map:`
  ref), or nothing. The user chooses.

## Step 5: Fog and questions

- **`## Not yet specified`**: each patch becomes one `## Qn — <question> · open` entry in
  `QUESTIONS.md`, with a `Refs:` line to the map. Do not cut the fog into smaller pieces.
- **An open ticket** that the user chose to land (Step 1) becomes a `Qn` the same way.
- **An `· open` `Qn` that a map answer settles** gets the heading `· answered → Dn` and one sentence
  on how the burst settled it. Close it, never delete it.

## Step 6: Research notes

A `research` ticket keeps its note on a branch `research/<name>` that is never merged. The ticket
holds a pointer to it. For each `research/*` branch that a ticket points to:

1. Look for the branch locally, then on the remote.
2. Copy the note into `docs/curator/research/<yyyy-mm-dd>-<topic>.md` with `git show
   <branch>:<path>`. Do not merge the branch and do not delete it.

When the branch is missing, copy nothing. Name the branch in the summary as missing, and keep the
ticket's pointer in the refs of its `Dn`.

## Step 7: The cut

Cut the decided work into rows in `## Next` of `BACKLOG.md`. One row is one tracer bullet, and one
row is one run. The rules:

- **vertical:** a row cuts a narrow path through every layer that the work touches (storage, API,
  screen, tests). A row is never one layer only.
- **demoable:** when the row is done, you can show it or check it on its own.
- **one run:** a row fits in one orchestra run. When it does not fit, cut it again.
- **prefactoring first:** when a change to the existing code makes the work easy, that change is the
  first row. Make the change easy, then make the easy change.
- **expand–contract:** a wide refactor (one change, such as a rename, that breaks many places at
  once) cannot be one vertical row. Cut it in three steps. First, expand: add the new form next to
  the old form, so that nothing breaks. Then migrate the callers in batches, one row for each batch,
  each `after` the expand. Last, contract: remove the old form, in a row that is `after` each batch.

Each row gets the next `Bn`. Its refs are: `map: docs/curator/maps/<effort>/`, the `Dn` ids that it
rests on, its research notes, and `after B<n>` for each row that must ship first. Do not put a file
path or code in the row text. When a row rests on a research note (Step 6), make `For: B<n>` the
first line of the note. The `direction` procedure finds a note by that line.

Show the cut to the user as a numbered list: the row, its `after` lines, and what it delivers. Ask
if the size is right, if each `after` line is real, and if a row must be merged or split. Change the
cut until the user approves it. Then write it. Extend `## Vision` when the story never covered the
rows.

When the map drops or moves a row that exists, follow `<plugin>/procedures/backlog.md` for that
change.

## Step 8: Move the map

Move the folder `.scratch/<effort>/` with its tickets to `docs/curator/maps/<effort>/`. It is now a
closed record: nothing edits it again. The `map:` refs point at it.

You write the files and stop there. `curate` commits.

## Hard gate

<HARD-GATE>
**Record the burst, never extend it.** Never answer an open ticket yourself, and never start
`/wayfinder`. Never edit an ADR. Never write a constraint: the `direction` procedure does that when
`curate` runs it. Never edit or delete a `Dn`, and never delete a `Qn`. Never put a row in
`## Now`.
</HARD-GATE>

## End of run

**The return block is the LAST thing in your reply:**

```
Result: ok | blocked | needs-input
Wrote: <files>
Markers: <one line per new Dn: "D<n> hard: <ADR path>" or "D<n> soft: <ticket>">
Reversed: <the Dn ids reversed and the dimensions changed, or "none">
Missing: <research branches not found, or "none">
Summary: <the rows of the cut, the Qn ids opened and closed, the Deliberately not lines, the Later rows from out of scope>
Deviations/Warnings: <or "none">
```

`blocked` when `docs/curator/` or the map does not exist. `needs-input` when the user cannot
approve the cut now.
