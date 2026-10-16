# The Curator: `orc-curator` (O3)

Date: 2026-10-16. Source: minions, inventoried in `docs/PORTING.md` section "minions". Decision: S76.

## Goal

A vibe-coded project keeps its direction current while it grows. A backlog, the product as it is
today, the constraints that near-term work puts on today's code, the decisions and the open questions
stay true to the code after every change. The Curator is minions' long-term tier, rewritten as an
orchestra slot plugin that also works by hand in any project.

Orchestra stays free of any knowledge of direction docs. It sees only the Curator's declaration:
`curate`, `setup` and `guides`.

Success: on the sample repo, with `orc-curator` in the `curator` slot:
1. The first `orchestra:run` runs `setup` once, and the second run does not.
2. The brief names the backlog row it serves.
3. The plan prompt lists `orc-curator:plan-guide`.
4. At `done`, `curate` moves the row to Shipped and commits on the task branch.
5. A judgement call is asked in the session, and the run applies the answer and ends `done`.

## Decisions taken in the brainstorm

| # | Question | Choice |
|---|---|---|
| 1 | What the Curator owns | The direction docs: BACKLOG, PRODUCT, DIRECTION, DECISIONS, QUESTIONS, CONTEXT, TECH and research notes. The code-knowledge half of minions (conventions into skills, rules, `CLAUDE.md`, the knowledge ledger) waits for the PSK. |
| 2 | Which minions skills | The whole long-term tier: shape-project (as `setup`), shape-product, shape-tech, research, backlog, direction, curate. Without them the docs start empty. |
| 3 | Where it runs | Both: orchestra calls it in a run, and every skill also works by hand. |
| 4 | Modes | One mode, minions' `vibe`. A project without the Curator is minions' `maintain`. |
| 5 | Where the docs live | A fixed folder, `docs/curator/`. No config key. It avoids a clash with a project's own `docs/DECISIONS.md` or `docs/CONTEXT.md`. |
| 6 | How the stages get the docs | Guides by role, pushed by orchestra. The workflow knows roles, not the Curator. |
| 7 | Who calls curate (O3) | orchestra, on the workflow's `done`, from the declared `curate` skill. |
| 8 | Who writes the docs in a run | `curate` alone, at the end. Spec only reads. Accepted losses: Now no longer means "in progress", and the product answers of a failed run stay in its notes folder. |
| 9 | Questions in a run | Allowed. `setup` and `curate` run inline in the main session and ask the user directly. Sure edits are committed with the answered ones. |
| 10 | New `Cn` constraints | `curate` runs the direction sweep. Sure `Cn` rows are committed; the others are questions. |
| 11 | Setup | The Curator declares a flag file. Every run checks it; a missing flag runs `setup`. |
| 12 | What the slot contract requires | `curate` and `setup`. `guides` are optional. `backlog` is plugin-only. |
| 13 | Research in spec and plan | No. Research runs in `direction` and `shape-tech` only. |
| 14 | A code guide | Yes: CONTEXT words in names; only `Dn` may be cited in code. |

## The orchestra changes

### Roles and guides by role

The roles are fixed in `plugins/orchestra/lib/protocol.js`: `spec`, `plan`, `code`. They replace
`GUIDE_KINDS` in `check.js`.

- A workflow declares the roles its stages have: `"roles": ["spec", "plan", "code"]`.
- `next.js` puts `role` on each dispatch action of such a stage: `spec` → `spec`; `plan` and
  `plan-check` → `plan`; every `code-<n>` → `code`.
- A slot plugin (Stack Skills or Curator) may declare `"guides": { "<role>": "<skill>" }`.
- `withPrompt` adds, when the dispatch has a role and any slot has a guide for it that is not
  disabled: "Before you start, invoke each guide below and follow it:" and one line per guide
  (`<plugin>:<skill>`), Curator first, then Stack Skills.
- The prompt line "This skill, and the `guide` input if given, take priority…" names the guides
  instead of the `guide` input.

The Stack Skills guides move to this mechanism. `next.js` loses its `guide()` helper and its
`guide` inputs. The stage skills `plan`, `plan-check` and `code` lose their `guide` input and the step
"if `guide` is given, invoke it".

The guard has two sides:
- `orchestra check` fails when a slot declares a guide for a role that the workflow does not declare,
  and on an unknown role in any declaration. The fix names `<slot>.disable`.
- `drive.js` fails a dispatch whose `role` the workflow did not declare.

### The `curator` slot

- `check.js`: `SLOTS` gains `curator`. The section is optional in `.orchestra/config.json`: a missing
  section means no Curator. `workflow` and `stack-skills` stay required.
- The declaration keys for `curator`: `slot`, `config`, `curate`, `setup`, `guides`.
  - `curate`: the name of a skill in the plugin. Required.
  - `setup`: `{ "skill": "<skill>", "done": "<path>" }`. Required. `done` is a file path relative
    to the run root, and the setup skill writes it as its last step.
  - `guides`: optional, as above.
- Resolution invokes `orc-curator:manifest` like any slot plugin.
- `orchestra:init` asks for the Curator as an optional third choice.

### The `inline` action

`setup` and `curate` run in the main session, not in a subagent. They interview the user, and they
may start subagents (`research` in `wide` mode). `setup` comes before the first stage and `curate`
after the last gate, so neither fills the context of a stage.

`drive.js` returns a new action for them, `inline`, with `skill`, `inputs`, `result` and the
worktree. The `orchestra:run` skill invokes the skill in the main session, works in the worktree,
and writes the result JSON that the skill describes. Then it calls `drive.js` again. The workflow's
`next.js` never prints `inline`; only `drive.js` does.

### Setup

After `next.js` has created the task branch and before the first stage is dispatched, `drive.js`
checks the curator's `setup.done` file in the run root. When it is missing, `drive.js` returns an
`inline` action for the setup skill. The skill commits the docs and the flag on the task branch. On
the next call `drive.js` checks the flag again.

The check runs on every call, so a Curator added after `orchestra:init` gets its setup on the next
run. A run that starts before the setup branch is merged runs setup again (O10).

### Curate at the end

When `next.js` prints `done` and the curator slot is filled:
1. `drive.js` returns an `inline` action for `<curator>:curate`, with the inputs `base`, `brief`
   (`run.spec`) and `notes`. The result is `tmp/runs/<branch>/curate.result.json`.
2. `ok`: curate has committed its edits. `drive.js` goes on to the report and the worktree removal,
   as today. The report lists the curate stage.
3. `failed`: the run fails with the reason. The worktree is kept. A resume runs curate again.

When the user stops the session in the middle of curate, the result file is missing, and the resume
runs curate again from the start. Its uncommitted edits stay in the worktree, so the resume's
dirty-files check (S63) stops first and names them. The user discards them, and curate starts from
the committed docs.

## The `orc-curator` plugin

### Skills

| Skill | Runs | Writes | Port of |
|---|---|---|---|
| `manifest` | resolution | — | the orchestra pattern |
| `setup` | main session; first run or by hand | PRODUCT, BACKLOG, DECISIONS, QUESTIONS, the flag; runs shape-product, shape-tech, backlog, direction | `shape-project` |
| `shape-product` | main session | PRODUCT, BACKLOG Vision and rows, DECISIONS, QUESTIONS | `shape-product` |
| `shape-tech` | main session | TECH, DECISIONS, QUESTIONS | `shape-tech` |
| `research` | main session | `research/` notes only | `research` |
| `backlog` | by hand | BACKLOG and the fallout (orphan `Cn`, Vision, `Dn` reversals, `Qn`); runs direction | `backlog` |
| `direction` | by hand, or from curate, setup and backlog | DIRECTION, QUESTIONS | `direction` |
| `curate` | main session at `done`, or by hand on a commit range | every doc, as the single writer of a run | `agents/curator.md`, `skills/curate` |
| `spec-guide` | role `spec` | — | the direction-doc parts of `specify` |
| `plan-guide` | role `plan` | — | the direction-doc parts of `plan` |
| `code-guide` | role `code` | — | CONTEXT names; the code-citation rule of `CONTRACTS.md` |

Templates: BACKLOG, PRODUCT, DIRECTION, DECISIONS, QUESTIONS, CONTEXT, TECH, RESEARCH. References:
recording-rules, glossary, interview-cadence, ask-vs-research, right-sizing.

### The docs folder

`docs/curator/`: `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`,
`CONTEXT.md`, `TECH.md`, `research/`, and the setup flag `.setup`. The ids are the minions ids: `Bn`,
`Cn`, `Dn`, `Qn`, independent, never reused.

### The guides

- `spec-guide`: read BACKLOG (Vision, Now, Next) and PRODUCT (why it is shaped this way). Write
  `Serves: Bn` or `Serves: new` in the brief. List deferred work and research-shaped gaps in the
  brief, for curate. Write no doc.
- `plan-guide`: DIRECTION is binding where it applies. BACKLOG Now and Next are context, never
  scope. Plan only this task. Never write a `Bn`, `Cn`, `Dn` or `Qn`.
- `code-guide`: name things in the CONTEXT words. Cite only `Dn` in code, never a `Cn`, `Bn`, `Tn` or
  `ACn`.

### Curate in a run

`curate` reads the brief, the notes folder, the diff from `base`, and every doc. Then it:
1. Moves the `Serves` row to Shipped, or adds the work as a Shipped row for `Serves: new`. When the
   row was dropped while the run was open, it asks: add it as shipped, or record the work with no
   row. A `Serves` row found in Later is shipped too. Before it adds a row for `Serves: new`, it
   checks Now, Next and Later and asks the user on a match, so no row is duplicated.
2. Turns the deferred work of the brief into Next or Later rows.
3. Updates PRODUCT: it adds what became true and removes what the diff made false. It rewrites the
   Vision prose that the diff made real, or that promised a row that is now dropped or in Later.
4. Records the product answers of the run (`decisions.md`) as `Dn` rows and PRODUCT "why" lines.
5. Closes the `Qn` entries that the code settled, with one sentence on how.
6. Edits CONTEXT in place for terms the diff added, renamed or retired.
7. Maintains DIRECTION: it marks constraints satisfied, retires them, deletes orphans and flags a cap
   overflow. Then it runs the direction sweep for the rows that owe a verdict.

Each removal that needs judgement, each sweep verdict that needs the user, and each contradiction is
a question to the user, one at a time. A sweep verdict that needs `research` or `shape-tech` runs that
skill. All edits, sure and answered, are committed in one commit at the end.

## Porting

`docs/PORTING.md`, section "minions", lists every part of every source file, its target and its
status. Each port task names its source files, and its review compares the target with the source.

## Plans

1. **The orchestra contract**: roles and guides by role (with the Stack Skills move), the `curator`
   slot in `check.js`, the `inline` action, setup and curate at their points, `orchestra:init`,
   `orchestra:run`, `writing-plugins`. It is tested with a stub Curator under `test/`.
2. **Curate and direction**: the `orc-curator` plugin with `manifest`, `curate`, `direction`, the
   three guides, the templates and `recording-rules`.
3. **Setup**: `setup`, `shape-product`, `shape-tech`, `glossary`, `interview-cadence`.
4. **Backlog and research**: `backlog`, `research`, `ask-vs-research`, `right-sizing`.

Plan 1 lands first and alone. Plans 2 to 4 follow in order. The success run above is the done test of
plan 3. Plan 4 adds the by-hand entries.

## Out of scope

- The code-knowledge half of minions, the knowledge ledger, the journal and the hooks (PSK).
- `orchestra:setup` (O11), a backlog pick when `orchestra:run` gets no task (O12), a glossary gate
  (O13).
- Research in the spec and plan stages.
