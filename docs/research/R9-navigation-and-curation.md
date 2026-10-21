# R9: How do navigation and curation split between wayfinder and the Curator?

Researched 2026-10-19 to 2026-10-21 from mattpocock-skills 1.3.1
(`~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.3.1/skills/`), from the
minions source (`~/Projects-other/claude-minions`: `README.md`,
`docs/design/2026-08-03-knowledge-layer-design.md`, `skills/backlog/SKILL.md`), from `plugins/orc-curator`
at 0.16.0, and from the Claude Code docs. Paths in "wayfinder" and "mattpocock" findings are relative
to the mattpocock skills root.

**Navigation** makes the unknown known: it explores, researches, prototypes and decides. **Curation**
keeps the known true while the code moves. A **burst** is one short round of navigation with a
narrow destination: kick-off, a big feature, a redesign, or a turn whose answer is unknown.

## Short answer

Wayfinder is a strong navigator and has no curation: its map ends when the way is clear, and nothing
keeps it true to the code after that. The Curator is a strong curator and a weak navigator: its open
questions have no type, no order and no reader that drives them to closure, and its exploration sat
inside two interviews (`shape-product`, `shape-tech`) that also wrote the files. Use each for what it
is good at. Do all exploring in bursts with wayfinder, unchanged. Let the Curator record the present
once (`setup`), and let one organizer (`curate`) translate every burst, every run and every change in
words into the curated files. The two fit the minions philosophy only if a burst's destination is a
step, never the whole product.

## Findings

### Wayfinder

- It plans and never does the work: "each ticket resolves a decision, and the map is done when the
  way is clear". An effort may override this in its Notes. `engineering/wayfinder/SKILL.md`, "Plan,
  don't do". Source, strong.
- The map is an index, not a store: each decision lives in its closed ticket, and the map links it.
  Same file, "The Map". Source, strong.
- Tickets have four types: research (agent alone), prototype and grilling (with the human), task
  (either). A grilling ticket always calls `grilling` and `domain-modeling`. Same file, "Ticket Types".
  Source, strong.
- Fog: a question you cannot yet phrase sharply stays in "Not yet specified" and becomes a ticket
  later. Out-of-scope work never comes back into the same effort. Same file, "Fog of war", "Out of
  scope". Source, strong.
- One ticket per session, except research tickets, which run in parallel subagents. Same file,
  "Invocation". Source, strong.
- Each session calls "whichever skills the `## Notes` block names". Same file, "Work through the map",
  step 3. Source, strong.
- It has no marker for a one-way door, no step after the map closes, and no record of a reversed
  decision: when an answer invalidates other tickets, it updates or deletes them. Same file, step 5.
  Source, strong.
- It has `disable-model-invocation: true`, so only the user can start it. Same file, frontmatter.
  Source, strong.

### The mattpocock tracker and neighbour skills

- The local tracker writes the map to `.scratch/<effort>/map.md` and each ticket to
  `.scratch/<effort>/issues/NN-<slug>.md`, with `Type:`, `Status:`, `Blocked by:` and an `## Answer`
  section. `engineering/setup-matt-pocock-skills/issue-tracker-local.md`, "Wayfinding operations".
  Source, strong.
- `domain-modeling` writes `GLOSSARY.md` at the repo root (or one per context, listed in
  `GLOSSARY-MAP.md`) and ADRs in `docs/adr/NNNN-slug.md`. `engineering/domain-modeling/SKILL.md`.
  Source, strong.
- The glossary format is the format of the Curator's `CONTEXT.md`: `## Language`, a bold term, one
  or two sentences, `_Avoid_`, only terms of this domain.
  `engineering/domain-modeling/GLOSSARY-FORMAT.md` against `plugins/orc-curator/templates/CONTEXT.md`.
  Compared, strong.
- An ADR is written only when a decision is hard to reverse, surprising, and a real trade-off. Its
  examples include architectural shape, integration between contexts and boundary decisions.
  `engineering/domain-modeling/ADR-FORMAT.md`, "When to offer an ADR". Source, strong. So "has an ADR"
  is the one-way-door signal that the Curator's `hard:` marker needs.
- `research` saves its note "where the repo already keeps such notes".
  `engineering/research/SKILL.md`, step 3. Wayfinder puts research findings on a throwaway
  `research/<name>` branch that is never merged. `engineering/wayfinder/SKILL.md`, "Chart the map",
  step 5. Source, strong.
- The rest of the chain: `to-spec` writes one spec with a long list of user stories and implementation
  decisions that include schema changes and API contracts. `to-tickets` cuts work into tracer-bullet
  slices: vertical through every layer, demoable alone, one context window each, prefactoring first,
  expand–contract for a wide change, with blocking edges. `implement-spec` runs one subagent per
  frontier ticket on an integration branch. `engineering/to-spec/SKILL.md`,
  `engineering/to-tickets/SKILL.md`, `engineering/implement-spec/SKILL.md`. Source, strong. `to-spec`
  designs ahead for unbuilt work, which `DIRECTION.md` forbids; `to-tickets` would be a second backlog.

### Claude Code

- A plugin may declare `dependencies` in `plugin.json`. Missing ones are installed automatically. A
  dependency from another marketplace is refused unless the root `marketplace.json` lists that
  marketplace in `allowCrossMarketplaceDependenciesOn`, or the user already has it at the same scope.
  Docs (`plugins/manifest-reference`, `plugins/dependencies`), read through a summary. Medium.
- `disable-model-invocation: true` means "Claude can't invoke the skill on its own", and Claude Code
  blocks the call. Docs (`skills`), read through a summary. Medium.

### The minions philosophy

- "Plan one step deep. No frozen up-front master plan that rots." "Under-committing is the deliberate
  bias." "Nothing blocks." "Something must subtract." `README.md`, "Why" and "Fluid by design".
  Source, strong.
- The synthesis of its evidence: "settle the one-way doors, leave the two-way doors to emerge", and
  encode them as constraints and real files, never as prose designs or doctrine. It rules out a
  "deep-shape phase". `docs/design/2026-08-03-knowledge-layer-design.md`, §2 and §8. Source, strong;
  the studies behind it (Boehm: about 5% of schedule for architecture at 10 KSLOC; the
  constraint-decay paper: a database spec cost agents 19.3 points, Clean Architecture as a rule 9.1)
  are cited there, not re-read here. Medium.
- Wayfinder fits this philosophy in its fog of war, and conflicts with it in its end condition: a map
  that ends when "nothing is left to decide" is a master plan when its destination is the whole
  product. Compared, strong.

### The Curator today

- `PRODUCT.md` holds only what is true today; the future is in `BACKLOG.md` (Vision and rows) and
  `DIRECTION.md` (constraints). `templates/PRODUCT.md`, `templates/BACKLOG.md`. Source, strong.
- `QUESTIONS.md` never blocks. Its readers are `direction` (to avoid duplicates), `shape-tech` (its
  agenda), and `curate`, which closes an entry only on evidence in a diff. Nothing drives an open
  entry to closure. `references/recording-rules.md`, `skills/direction/SKILL.md`,
  `skills/curate/SKILL.md`. Source, strong.
- `shape-product` and `shape-tech` do two jobs: they explore (directions, comparable products,
  capability dimensions, what each option closes off) and they write PRODUCT, TECH, BACKLOG, DECISIONS
  and QUESTIONS. `skills/shape-product/SKILL.md`, `skills/shape-tech/SKILL.md`. Source, strong.
- On an empty repo, `shape-tech` commits only the spine (language, runtime, test runner) and defers
  persistence, auth and deploy until an acceptance criterion exists. `skills/shape-tech/SKILL.md`,
  "The evidence gate". Source, strong.
- `direction` gives a fresh verdict only to a near-term row that is missing from `## Evaluated`. A
  changed decision changes no row, so today it makes nothing owed. `skills/direction/SKILL.md`,
  "First: what is owed". Source, strong.
- For a changed capability dimension, `direction` calls `shape-tech` with one named dimension; it
  interviews about that dimension only, writes the TECH row and a `Dn`, and returns
  `Constraints owed:` and `Worth reopening:`. `skills/shape-tech/SKILL.md`, "Callers", "Return".
  Source, strong.
- The name `CONTEXT.md` appears only inside orc-curator (the glossary reference, `setup`, `curate`
  and the three guides); orchestra's code does not read it. `grep` over `plugins/`. Measured, strong.
- One backlog row is one run: the spec names it once (`Serves: Bn`) and `curate` ships it at `done`.
  `skills/spec-guide/SKILL.md`, `skills/curate/SKILL.md`, Step 3. Source, strong.

## Recommendation

- **Navigation is mattpocock `/wayfinder`, unchanged.** orc-curator declares
  `mattpocock-skills@claude-plugins-official` as a dependency; our `marketplace.json` allows that
  marketplace. A burst's destination is a step, never the whole product; the north star is
  `BACKLOG.md` `## Vision`. Architecture style and module boundaries are decided in the kick-off
  burst. A one-way call is committed when the evidence exists (the product shape, a prototype,
  research); nothing is designed ahead for rows that are not built.
- **`setup` records the present once.** On a new project it asks nothing. It adds `.scratch/` to
  `.gitignore` and ends with a nudge to run `/wayfinder`. A second run adds only missing files, then
  redirects.
- **`curate` is the one organizer, with three inputs.** A diff (after a run), a map (when a burst
  ends), a change in words (any time). It is the only writer of `Dn` and `Qn`. On a change in words it
  sorts the change: known → record it and walk the chain; unknown → a `Qn` and a nudge to
  `/wayfinder`; a bug → a nudge to `diagnosing-bugs`. When a change touches a decision or a dimension,
  it retires the `## Evaluated` rows that depend on it, so the sweep derives fresh constraints.
- **Landing a map.** Each answer becomes a `Dn`: `hard:` when it has an ADR, `soft:` when it has
  none; the summary shows each marker before the commit. ADRs stay in `docs/adr/`, linked from their
  `Dn`. Out-of-scope work goes to "Deliberately not". Leftover fog goes to `QUESTIONS.md`. Research
  notes are copied from their `research/*` branches into `docs/curator/research/`. The decided work is
  cut into rows with the tracer-bullet rules of `to-tickets`, into `## Next`; one row is one tracer
  bullet and one run, with refs `map:`, `Dn`, research notes and `after Bn`. The map moves to
  `docs/curator/maps/<effort>/` and is committed as a closed record.
- **`shape-product` and `shape-tech` are removed.** Their rules for a good PRODUCT and TECH file
  become private procedures. `direction` and `backlog` become private procedures too: plain `.md` files
  in `orc-curator/procedures/`, read and followed inline by `curate` and `setup`. `direction` keeps
  "research first", through mattpocock `research`; a choice between options or a one-way door becomes
  a `Qn` and a nudge to `/wayfinder`.
- **The glossary is `GLOSSARY.md` at the repo root**, written by `domain-modeling` during bursts and
  by `curate` during upkeep. `DECISIONS.md` stays the one decision log.
- **`QUESTIONS.md` is the user's list.** `curate` closes entries after a run and at landing.
- **Visible skills:** `curate` and `setup`. The skills that orchestra calls by name (`manifest` and
  the three guides) stay skills, hidden from the `/` menu.

## Evidence gaps

- No burst has been run and landed on a real project. The landing rules (the ADR signal for `hard:`,
  the tracer-bullet cut, the map move) are designed, not measured.
- The Claude Code facts came through a summary of the docs. The exact wording of `dependencies`,
  `allowCrossMarketplaceDependenciesOn` and `disable-model-invocation` is not checked against the live
  pages.
- `user-invocable: false` (to hide a skill from the `/` menu) is not checked in the docs, nor against
  `orchestra check`.
- Whether `domain-modeling` writes an ADR reliably enough to serve as the `hard:` signal is not
  measured. A one-way decision without an ADR would land as `soft:`.
- The size of a `curate` with three inputs is not known. If it grows too big, an input moves into its
  own procedure.
- Whether mattpocock `research` follows `docs/curator/research/` as "where the repo keeps such notes"
  is inferred from its step 3, not observed.
