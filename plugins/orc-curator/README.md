# orc-curator

**The Curator keeps the direction of a project current while the project grows.** It owns a small set
of docs in `docs/curator/`: the backlog, the product as it is today, the constraints that near-term
work puts on today's code, the decisions, the open questions, the glossary and the tech the project
runs on. After every change, it makes them agree with the code again.

It fills the optional `curator` slot of orchestra: its guides tell each stage of a run how to read
the docs, and its `curate` skill updates them at the end of the run. `curate` and `setup` also work by
hand, in any project, with or without orchestra.

**Navigation and curation are two jobs.** Navigation is finding where the project should go: a
**burst** of `/wayfinder`, which only you start. Curation is keeping the docs true: `curate`. The
Curator never explores. When it lacks an answer, it writes a question and tells you which burst to
run.

---

## Fluid by design

The real shape of a project is found while it is built. A tool that freezes the intent is wrong within
a month. The Curator keeps the picture *current*, not *stable*, and it puts no blocker in your way.

Five commitments follow:

- **Records never change; conclusions can.** `DECISIONS.md` is append-only, because its ids are
  permanent handles. But a call made on thin evidence, or true only *for now*, is fair to challenge. A
  reversal is a **new row** whose *why* names what it reverses, never an edit. "We already settled
  that" is not an argument. Each row says which kind it is when it is written: **`hard:`** for a
  one-way door, **`soft:`** for thin evidence or true for now. At a landing and on a change in words,
  `curate` shows you the `soft:` rows that the map or the change touches and asks "still true?", so
  that they are examined and not inherited.
- **Nothing blocks.** `QUESTIONS.md` never stops a run. An open question is information, not a veto.
  Work starts with unknowns, and the Curator's job is to say which ones.
- **A constraint is the least that survives a check against the code.** `DIRECTION.md` holds forward
  *pressure*, never forward *design*. A design for work that is not built cannot be proved false by
  anything in the repo, and that is why it rots.
- **Movement goes both ways.** Horizons are confidence, not dates; a demotion is information. A
  satisfied constraint retires, a shipped Vision paragraph gets shorter, a reversed decision gets a
  successor.
- **Something must remove.** A file whose writers only add fills up with plans. `curate` must
  *remove* what a diff made false, not only add.

**Under-committing is the chosen bias.** It is better to decide late, with real requirements, than
early, with a guess that hardens into architecture.

## Install

```bash
/plugin marketplace add <path or URL of depitropov-plugins>
/plugin install orc-curator@depitropov-plugins
```

With orchestra, run `orchestra init` and pick the Curator, or add it to `.orchestra/config.json`:

```json
"curator": { "plugin": "orc-curator" }
```

## Quickstart

You type two things. The rest follows from them.

```
set up the curator                  # once: record the present, then a nudge to a burst
/wayfinder <your idea>              # navigation: a burst. Only you start it
curate the burst <effort>           # the landing: the map of a finished burst goes into the docs
orchestra run "…"                   # a run: the guides read the docs, curate updates them at the end
drop B7 / we deploy to Fly now      # a change in words: curate repairs the fallout
curate the docs from this branch    # curate by hand, on a commit range (a diff)
```

With orchestra, the first run offers `setup` before it makes a branch. You can set up on the default
branch, on its own branch `curator/setup`, or go on without it.

---

# Reference

## The docs

All in `docs/curator/`. Six files, split by tense, and **no fact in two of them**:

| File | Holds | Tense |
|---|---|---|
| `BACKLOG.md` | the Vision prose and the rows it breaks into: the only file about what does not exist | future |
| `PRODUCT.md` | what is true today, and above all *why the product has its shape* | present |
| `TECH.md` | what the project runs on: a thin index of capability rows | present |
| `DIRECTION.md` | what near-term work **demands of** the code written now | forward constraint |
| `DECISIONS.md` | why we chose, in the affirmative or the negative | past |
| `QUESTIONS.md` | what is still open | unsettled |

`GLOSSARY.md` is not a seventh tense: it is the dictionary that the others are written in. It is at
the repo root, and `curate` creates it on the first domain term and edits it in place. During a
burst, `domain-modeling` writes it and the ADRs in `docs/adr/`; `curate` commits them at the landing. `research/`
holds one evidence note per topic. `maps/<effort>/` holds the map of each landed burst, a closed
record. The flag `.setup` says that setup ran.

The rules for ids, for where a fact goes and for changes are in `references/recording-rules.md`.

**Horizons are confidence, not dates.** `## Now`, `## Next`, `## Later` and `## Shipped` say how sure
we are, never when a row lands. Rows move in both directions. **Nobody reads `## Later`**: a
constraint taken from a bet that nobody validated is an abstraction bought for a feature that may
never come.

## The skills, the guides and the procedures

**One skill organizes the docs: `curate`. The guides only read them.** That one sentence settles most
"who owns this" questions.

| Kind | Name | What it is for |
|---|---|---|
| **You type these** | `setup` | records the present once, then nudges you to `/wayfinder` |
| | `curate` | the one organizer, with three inputs: a diff, a map, a change in words. The only writer of `Dn` and `Qn` |
| **Read, inside a run** | `guides/spec.md` · `guides/plan.md` · `guides/code.md` | files that orchestra reads by path. They never write |
| **Followed by `curate` only** | `procedures/direction.md` · `procedures/backlog.md` · `procedures/landing.md` | plain files with the flow of the sweep, of a plan change and of a landing. They never commit |
| **For orchestra** | `manifest` | tells orchestra where the plugin is |

The rules for `PRODUCT.md` and `TECH.md`, for ids and for the glossary are in `references/`.
`direction` is not a design act. It is a **sweep** that keeps `DIRECTION.md` in agreement with the
backlog. You never ask for it: `curate` runs it once, after whatever moved the backlog.

## The three flows

Everything is one of these. A change of direction is a new burst, then flow B.

**A: set up**

```
setup ──→ records the present ──→ flag ──→ "To set the direction of the project, run /wayfinder <your idea>."
```

`setup` copies the templates, records the present of a project with code, and stops. It leaves the
backlog and `DIRECTION.md` empty, and it never runs `direction`.

**B: a burst and its landing**

```
/wayfinder <topic> ──→ map in .scratch/<effort>/ ──→ curate (the map) ──→ landing ──→ direction ──→ commit
   (you start it)                                                       (the docs)    (sweep)
```

The burst is navigation, and it is yours. The landing is curation: `curate` follows
`procedures/landing.md`, writes each decision, scope cut and open question into the docs, moves the
map to `docs/curator/maps/<effort>/`, runs the sweep and commits once. An ADR in `docs/adr/` that no
`Dn` links lands as a `hard:` `Dn`. A ticket answer that no ADR covers lands as `soft:`. For each
line of the map's `## Out of scope`, you choose: a product non-goal, a `## Later` row, or nothing.

**C: a run**

```
spec ──→ plan ──→ code ──→ gates ──→ curate (the diff) ──→ direction
(guides/spec.md) (guides/plan.md) (guides/code.md)            (sweep)
```

The guides **read** the docs and never write them. The brief says which backlog row it serves
(`Serves: Bn`). At the end, `curate` moves the row to Shipped, records the answers of the run,
removes what the diff made false, and runs the sweep. It asks you each judgement call in the session.

**A change in words** is the third input of `curate`, outside these flows. You say what changed:
a plan change follows `procedures/backlog.md` ("add social login", "drop B7"); a known answer
becomes a `Dn`; an unknown one becomes a `Qn` and a nudge. Each path ends in the sweep, **except** a
change to `## Later` only: nothing reads that section, so nothing is owed.

### What `direction` decides for each near-term row

This ladder keeps small changes small. Which verdict a row gets follows from which *file* it forces a
write to: one owner per file does the routing.

| The row | Verdict |
|---|---|
| add social media icons | `no constraint — additive` |
| add social login | research first (`mattpocock-skills:research`, one note in `research/`), then the **authenticates** dimension: a known answer goes back to `curate`, an unknown one becomes a `Qn` and a nudge to `/wayfinder` |
| "one account per user, or per team?" | an open `Qn`, unless it constrains the code written now: then a `Cn` |
| change from individuals to teams | **a purpose change:** name it and nudge: "To set the new direction, run `/wayfinder …`" |

The last row is the important one. "Add X to the backlog" never grows into a study of competitors by
itself. A nudge is a suggestion, and only you start the burst.

### Coverage is arithmetic, not memory

Each constraint cites its row (`from Bn`): drop or demote the row, and the constraint is an orphan by
rule. The `## Evaluated` table of `DIRECTION.md` records each row that got a verdict, also
`no constraint`. So "are the constraints current?" is a comparison of two lists, and nobody sets a
flag for it.

```
C3 | from B7 | a step needs a stable identity, never an array index | unsatisfied
C4 | from B6 | recipe writes are append-only snapshots              | satisfied by apps/api/prisma/schema.prisma
```

## Who writes what

`CONTRACTS.md` is the matrix: who adds to each doc, who updates it, who removes from it, and who
reads it. A test checks it against the skill texts. **One judgement owner per file**: a mechanical
write can be shared, a judgement write cannot.

## Changing the Curator

The Curator must change with the projects it serves. Check each edit against three failure modes:

- **A new gate.** Text that makes a skill refuse, block, or demand that something closes first.
  Blocking is almost never right here: flag it, write it down, or make the check derivable.
- **A "never revisit" rule.** That a *record* never changes (do not edit the row, do not reuse the id)
  is correct. That a *conclusion* never changes ("that call is settled") is a bug: it turns a for-now
  decision into a permanent constraint that nothing in the repo can prove false.
- **A flag that somebody must remember.** When a condition can be computed from the files, compute
  it. A flag that three writers must remember to set will be missing.

The skills stay a flat `skills/<name>/SKILL.md` tree, and the guides and procedures are plain files,
so this README is the only place that shows the kinds, the flows and the verdict ladder. A new skill,
a changed flow or a renamed file makes it wrong, and nothing fails when it does. Update it, and `CONTRACTS.md`, in the same commit.
