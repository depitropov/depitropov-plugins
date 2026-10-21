# orc-curator

**The Curator keeps the direction of a project current while the project grows.** It owns a small set
of docs in `docs/curator/`: the backlog, the product as it is today, the constraints that near-term
work puts on today's code, the decisions, the open questions, the glossary and the tech the project
runs on. After every change, it makes them agree with the code again.

It fills the optional `curator` slot of orchestra: its guides tell each stage of a run how to read
the docs, and its `curate` skill updates them at the end of the run. Every skill also works by hand,
in any project, with or without orchestra.

---

## Fluid by design

The real shape of a project is found while it is built. A tool that freezes the intent is wrong within
a month. The Curator keeps the picture *current*, not *stable*, and it puts no blocker in your way.

Five commitments follow:

- **Records never change; conclusions can.** `DECISIONS.md` is append-only, because its ids are
  permanent handles. But a call made on thin evidence, or true only *for now*, is fair to challenge. A
  reversal is a **new row** whose *why* names what it reverses, never an edit. "We already settled
  that" is not an argument. Each row says which kind it is when it is written: **`hard:`** for a
  one-way door, **`soft:`** for thin evidence or true for now. `shape-product` and `shape-tech` read the
  `soft:` rows again, so that they are examined and not inherited.
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

Say these in plain words to your AI tool:

```
set up the curator                  # once: the product interview, the tech interview, the sweep
orchestra run "…"                   # a run: the guides read the docs, curate updates them at the end
add social login to the backlog     # change the plan; the fallout is repaired
drop B7 / move B9 to later / groom the backlog
I edited the backlog by hand        # repair what the hand edit broke
research which queue fits here      # evidence in one note; the deciding skill records it
curate the docs from this branch    # curate by hand, on a commit range
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

`GLOSSARY.md` is not a seventh tense: it is the dictionary that the others are written in. `curate`
creates it on the first domain term, and edits it in place. `research/` holds one evidence note per
topic. The flag `.setup` says that setup ran.

The rules for ids, for where a fact goes and for changes are in `references/recording-rules.md`.

**Horizons are confidence, not dates.** `## Now`, `## Next`, `## Later` and `## Shipped` say how sure
we are, never when a row lands. Rows move in both directions. **Nobody reads `## Later`**: a
constraint taken from a bet that nobody validated is an abstraction bought for a feature that may
never come.

## The skills, grouped by what they are for

**Skills that decide write the docs; guides only read them. No skill does both.** That one sentence
settles most "who owns this" questions.

| Group | Skills |
|---|---|
| **You ask for these** | `setup` · `backlog` · `research` · `curate` (by hand) · `shape-product` and `shape-tech` (by hand, for a focus) |
| **Decide** | `shape-product` · `shape-tech` · `direction` · `backlog` |
| **Keep current** | `curate` (with the `landing` procedure for a finished burst) |
| **Read, inside a run** | `spec-guide` · `plan-guide` · `code-guide` |
| **Tools** | `research` (evidence, never a decision) · `manifest` (for orchestra) |

`shape-product` and `shape-tech` are the **product** and **tech** halves of one altitude: what outlives
one feature. `direction` is not a design act. It is a **sweep** that keeps `DIRECTION.md` in agreement
with the backlog, closer to `curate` than to the skills next to it. You seldom ask for it: it runs after
whatever moved the backlog.

## The three flows

Everything is one of these. There is no fourth: a big change of direction is flow A again, because
`setup` can run again.

**A: a new project, or a change of direction**

```
setup ──→ shape-product ──→ shape-tech ──→ [backlog] ──→ direction ──→ commit, flag
          (product)         (tech)         (review)      (constraints)
```

The backlog step is a **review pause**: you see the rows before constraints come from them, and
`backlog` runs only when you want changes. The order is important: `direction` derives from `## Now`
and `## Next` as they are when it runs.

**B: a run of orchestra**

```
spec ──→ plan ──→ code ──→ gates ──→ curate ──→ direction
(spec-guide) (plan-guide) (code-guide)          (sweep)
```

The guides **read** the docs and never write them. The brief says which backlog row it serves
(`Serves: Bn`). At the end, `curate` is the single writer: it moves the row to Shipped, records the
answers of the run, removes what the diff made false, and runs the sweep. It asks you each judgement
call in the session.

**C: a change to what is planned**

```
backlog {add | drop | move | groom | reconcile} ──→ arrange + repair ──→ direction
```

`backlog` is thin on purpose: it reads no `TECH.md` and no code, because the escalation belongs to the
skill with that evidence. Each path ends in the sweep, **except** a change to `## Later` only: nothing
reads that section, so nothing is owed.

### What `direction` decides for each near-term row

This ladder keeps small changes small. Which verdict a row gets follows from which *file* it forces a
write to: one owner per file does the routing.

| The row | Verdict |
|---|---|
| add social media icons | `no constraint — additive` |
| add social login | research (`deep`, 5 sources at most) → escalate the **authenticates** dimension to `shape-tech` → write the `Cn` |
| "one account per user, or per team?" | an open `Qn`, unless it constrains the code written now: then a `Cn` |
| change from individuals to teams | **stop and name it:** run `setup`. Full ceremony, and a human starts it |

The last row is the important one. "Add X to the backlog" never grows into a study of competitors by
itself. An escalation up is a suggestion, and you start it.

### Two skills, split by cadence

`shape-tech` settles the **capability dimensions** (what this runs as, deploys to, persists in,
integrates with, how it authenticates, its hard constraints) into `TECH.md`, and runs **rarely**: at
project start, or when one dimension changes. `direction` runs the **constraint sweep** and runs
**often**: after `setup`, after `backlog`, after each run. Joined, the rare interview would block the
frequent sweep, and `curate` could not afford to call it.

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

The skills stay a flat `skills/<name>/SKILL.md` tree, so this README is the only place that shows the
groups, the flows and the verdict ladder. A new skill, a changed flow or a renamed skill makes it
wrong, and nothing fails when it does. Update it, and `CONTRACTS.md`, in the same commit.
