# The four pillars

This file describes four existing projects. Each one holds one idea we want to keep. Later work builds
on these ideas. The file says what each project is and how it works. It does not propose changes.

This file is a summary, for direction only. It leaves out most of each source. To port anything,
follow `docs/PORTING.md` and read the source files themselves.

| Pillar | Project | Location |
|---|---|---|
| 1. Orchestration | be-coding-agent | `~/Projects/claude-code-plugins/plugins/be-coding-agent` |
| 2. Stack knowledge | java-stack | `~/Projects/claude-code-plugins/plugins/java-stack` |
| 3. Project rails | minions | `~/Projects-other/claude-minions` |
| 4. Multi-harness delivery | sc-agent-plugins | `~/Projects/sc-agent-plugins` |

---

## 1. be-coding-agent: the Uncle Bob gauntlet

### The idea

In an Uncle Bob talk, he says that with AI the human no longer writes or reviews code line by line.
The human builds a tight "straight jacket" around the agents. The rules from that talk:

- **No heavy upfront plans.** Agents cannot follow big plans, because nobody can foresee every
  detail. Changing code is now almost free, so we work in small iterations.
- **Short prompts.** Long instructions get lost in the middle of the context, and the agent treats
  them as loose guidelines. The prompt stays small, and tools enforce quality after the code is
  written.
- **A gauntlet of short-lived agents.** No single agent does everything. A chain of focused agents
  runs one after another:
  1. **Specifier** — turns the requirement into Gherkin acceptance tests (given-when-then) and a QA
     procedure.
  2. **Coder** — writes the code and the unit tests. Strict line-by-line TDD is not forced.
  3. **Cleaner** — reviews the code and lowers the CRAP score, a metric that combines complexity and
     test coverage.
  4. **Hardener** — runs mutation testing: it changes operators in the code and adds tests until
     every mutant fails a test.
  5. **QA** — turns the QA procedure into a script that drives the real system.
- **Hard architecture controls.** A config file says which modules may depend on which. A tool
  checks it, and the agent must fix any violation.
- **The human checks metrics, not lines.** The human spot-checks, watches the scores, and owns the
  architecture.

### What we are after

**Little noise while coding, more work in review.** The coder gets a tiny context and one job:
working code with honest tests. Quality comes after the code, from focused reviewers and tools.

### How the plugin does it

- **One entry skill** (`implement-task`) checks the inputs and calls a **workflow script**
  (`workflows/implement-task.js`). The script, not prose, fixes the order of stages, the retry
  limits and the model for each stage.
- **Each stage is a fresh subagent.** Its prompt is short: "read `stages/<stage>.md`" plus
  parameters. Each stage file is 16–63 lines and names the few skills that stage loads.
- **Stages pass work through files** in a workspace folder (`brief.md`, `plan.md`,
  `implementation-log.md`, one report per pass). Each stage returns a small JSON result, and the
  script uses it to choose the next step.
- **The pipeline**, each stage once, in this order:

  | Group | Stages | Job |
  |---|---|---|
  | Spec | spec, spec-check | Brief with given-when-then acceptance criteria, plus a plan with no code. A fresh agent checks and patches both. |
  | Build | one coder per 2 tasks | One commit per task. It loads only the Maven and testing skills. |
  | Review | logic-review, structure | Correctness and criteria-to-test mapping, then layering and naming. Both fix what they find. |
  | Verify | verify, fix-verify | A full build and test run that only measures. One root-cause fix if it fails. |
  | Text | logging, comments, layout | Cosmetic passes on a cheaper model. Each skips itself when a grep finds nothing to do. Spotless runs last. |

- **Headless.** It never asks the human. It records its choices as assumptions. It stops only for
  a real product decision.
- **Triage of findings.** The two judgement stages put each finding into one bucket, and the bucket
  sets the action:
  - **Decide** — stop for a human. This needs both a real fork (two or more options with different
    trade-offs) and a choice the agent cannot make (a product question, or a shape-setting call with
    no clear recommendation).
  - **Patch** — fix it now.
  - **Evaluate** — skip it and record it for a human.
  - **Noise** — drop it.

  No severity labels are used.

---

## 2. java-stack: stack-specific knowledge (SSK)

### The idea

An agent writes generic Java unless something tells it the house rules. java-stack is that
"something": a set of small skills, one per concern. Each skill says exactly how Java is written in
our projects. Any agent or workflow loads only the skills its job needs.

### What it holds

| Skill | Tells the agent |
|---|---|
| `java` | The index of the other skills |
| `java-architecture` | Layering, records for data holders, `@UtilityClass`, the required REST DTO annotations |
| `java-style` | Naming, member order, Commons Lang3 for null and blank checks |
| `java-comments` | A comment must state a constraint, reason, external fact, API contract or expiry. No plan IDs, no "is now". It has self-check greps and evals from real code. |
| `java-formatting` | Empty-line and import rules, Spotless |
| `java-logging` | Logger declaration, WARN vs INFO, message format, exception logging, masking |
| `java-testing` | AssertJ, SoftAssertions, `BusinessRuleException` helpers, parameterized tests |
| `java-maven` | The exact wrapper command, flags and settings file; output to a log file; do not run twice |
| `java-ops` | Error handling, argument checks, security, concurrency, Flyway migration rules |
| `java-review` | The review checklist |
| `java-maven-upgrade`, `spotless-maven-setup` | Procedures for version upgrades and for adding Spotless to a repository |

It also has two agents: `java-code-reviewer` and `sc-java-logging`.

### How it makes code consistent

- **The facts are specific.** Many are ship.cars facts that an agent cannot guess: helper classes,
  flags, annotations, error types.
- **One concern per skill.** A stage loads only what it needs. In be-coding-agent, the coder loads
  `java-maven` and `java-testing`, and the logging pass loads `java-logging`.
- **Rules that a tool can check come with the check.** Examples are the comment greps and Spotless.

---

## 3. minions: keep the project on rails

### The problem

A vibe-coded project drifts. Either it has no direction, or its roadmap becomes a mess as the code
moves away from it. minions keeps a horizon, a small set of rules and the project context current,
so each new piece of work stays on track.

### The philosophy: fluid, not frozen

A project's real shape is found while building it, so a framework that freezes intent is wrong
within a month. minions keeps the picture *current*, not *stable*:

- **Records are immutable; conclusions are not.** Decisions are append-only. To reverse a decision,
  you add a new row that names the one it reverses. Each decision is `hard:` (cannot be undone) or
  `soft:` (true for now), and soft ones get looked at again.
- **Nothing blocks.** Open questions are information, not a veto.
- **Constraints are pressure, not design.** A constraint says what a coming item demands from
  today's code, never what the future code looks like. A design for unbuilt work cannot be proven
  wrong by the repository, so it rots.
- **Something must subtract.** After each feature, the curate step removes claims that the code
  made false. It does not only add.
- **Compute, don't remember.** If a condition can be derived from files on disk, derive it. Do not
  use a flag that someone must remember to set.

### How it works

**Separate files by time frame. No fact is in two files.**

| File | Holds | Time frame |
|---|---|---|
| `BACKLOG.md` | The vision as prose, plus rows (`Bn`) in **Now / Next / Later / Shipped**. The sections mean confidence, not dates. Rows move both ways. | Future |
| `PRODUCT.md` | What is true today, and why the product has this shape | Present |
| `DIRECTION.md` | Constraints (`Cn`) that the Now and Next rows put on code written today | Pressure on today's code |
| `DECISIONS.md` | Why we chose (`Dn`), append-only | Past |
| `QUESTIONS.md` | Open questions (`Qn`), never blocking | Open |
| `CONTEXT.md` | The project's glossary of domain terms | — |

**How it stays true:**

- Each constraint cites its backlog row (`from B7`). When that row moves out of Now/Next or is
  dropped, the constraint is orphaned automatically and gets removed.
- An `## Evaluated` table records "this row was checked and needs no constraint". Without it,
  "needs nothing" and "never checked" look the same.
- `## Later` is read by nobody on purpose. A constraint from an unproven bet is an abstraction for a
  feature that may never exist.
- The planner reads `DIRECTION.md` on every plan, but it plans only the current feature.

**The work flows, sized to the change:**

- `shape-project` — interviews the product and the tech choices, then fills the files above. You
  can run it again when the direction changes.
- `feature` — specify → plan → code → review → verify → reconcile → curate. It pauses after each
  step by default.
- `quick` — for small edits: code, a light review, a doc touch.
- `backlog` — add, move or drop rows, then repair what depended on them.
- `direction` — the sweep that keeps `DIRECTION.md` in line with Now and Next.

**The layers:** workflow skills only route. Step skills send work to agents, or run inline when they
must talk to the user. Agents (coder, reviewer, verifier, curator) do the work in a fresh context.
`STATE.md` is the resume point. `config.yml` sets the mode (`vibe` builds conventions, `maintain`
follows existing ones) and the skill packs each role must load, for example java-stack.

**Knowledge goes where Claude already looks.** After a feature ships, the curator writes what it
learned to `CLAUDE.md`, `.claude/rules/` and project skills. A convention becomes a rule only after
it shows up in 3 features.

---

## 4. sc-agent-plugins: one repository, many harnesses

### The idea

One set of skill files runs unchanged on Claude Code, Codex and any other client that follows the
open standards. The repository has no per-harness code: everything harness-specific is generated or
left out. The procedures are in the `multi-harness-support` skill
(`.agents/skills/multi-harness-support/`).

### The four rules

1. **The skill is the unit.** `SKILL.md` frontmatter has only `name` and `description`, as the
   Agent Skills standard says. Other keys work only in Claude Code and do nothing elsewhere.
2. **A specialist is a skill, not an agent.** No plugin file can register an agent on both Claude
   Code and Codex. So an orchestrator starts a subagent with a clean context and tells it which
   skill to load. The clean context comes from starting a subagent, not from the file type. We lose
   the tool allowlist and the fixed model. A **Permitted actions** section in the skill states the
   limits as rules instead.
3. **Skill text names actions, not tools.** It says "dispatch a subagent" and "invoke the X skill".
   It never says `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool` or `claude -p`. Neutral
   text reads correctly everywhere, including Claude Code, so there is no translation layer.
4. **Manifests are generated, not maintained.** Each plugin has a portable `plugin.json` (Agent
   Plugins 1.0) and a `.claude-plugin/plugin.json`. The repository has two catalogs:
   `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`. The version numbers
   move together.

### The patterns it uses

- **An inline fallback.** Every orchestrator says what to do when the harness cannot start
  subagents: run the specialist skills itself, in order, with the same review steps.
- **Shared context as its own plugin.** `sc-shared-context` holds the product documents once. Other
  plugins load its skill by name and use that skill's own folder as the base path. The orchestrator
  picks the product once and passes the paths to each specialist.
- **Pass paths, not contents.** Specialists read the files they need, so the orchestrator's context
  stays small.
- **Honest limits.** Tool allowlists and model pinning cannot be enforced. Commands and workflow
  scripts have no portable form, so a plugin whose value is a script stays Claude-Code-only.

### How a port is checked

- A grep shows that no `SKILL.md` has frontmatter keys other than `name` and `description`.
- A grep shows that no shipped file uses harness-specific words.
- Every manifest parses as JSON.
- **The real test:** open a clean session on a second harness, ask a normal question, and see the
  skill load without naming it. Files that look right prove nothing.
