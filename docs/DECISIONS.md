# Decisions

The full record of the deliberate decisions that shape the framework: the question, the options, the
evidence, the choice and what it costs. `docs/TENSIONS.md` stays the short index: every settled
decision has one row there. A decision that needed a real weighing of options also gets an entry here,
under the same `S` number.

## When to add an entry

Add an entry when the user and the agent weigh options and pick one on purpose, for example after
research, after a run's feedback, or when a port changes the source's behaviour. A plain bug fix or a
wording change needs no entry.

## Entry format

```markdown
## S<n>: <title>

- **Date:** <yyyy-mm-dd>
- **Status:** decided | open | replaced by S<m>
- **Question:** <what had to be decided, in one or two sentences>
- **Options:** <each option, with its trade-off>
- **Evidence:** <the research note (`docs/research/R<n>`), the run, or the inventory row behind it>
- **Decision:** <what we chose>
- **Cost and risk:** <what we give up, and what to watch>
- **Where it lives:** <the files that carry it>
```

---

## S67: plan-conformance checks direction, not detail

- **Date:** 2026-10-08
- **Status:** decided
- **Question:** In the library-loans run, the coder added argument checks that the plan did not name.
  It recorded them in `code.md`, as the code skill asks. plan-conformance raised them as an
  undeclared deviation. Should the plan be followed line by line, and who checks the extra behaviour?
- **Options:**
  1. Keep it strict: every departure from the plan is declared. The plan must then name every check,
     which it never aims to do. The findings cost work and add no value.
  2. Soften it: check that no task is skipped or half done, that a change of direction is declared,
     and that nothing falls outside the brief's scope. Detail inside a task is the coder's call.
  3. Drop plan-conformance: logic-review already checks that each acceptance criterion has code and a
     test. Then scope creep and half-done tasks have no check.
  4. Also make the plan write its behaviour choices (such as a rounding mode) into the brief, so that
     logic-review sees them.
- **Evidence:** the library-loans run in `orchestra-sample-java` and an outside review of it: a false
  Patch from plan-conformance for the argument checks, and no test for those checks.
- **Decision:** Option 2. plan-conformance also reads `code.md`; a recorded choice is not a
  deviation. Because the extra behaviour now passes plan-conformance, logic-review step 6 requires a
  test that fails without a recorded choice that changes behaviour; a missing test is Patch. Option 4
  is rejected: it blurs which stage writes the brief. If the next runs show that plan-conformance finds
  nothing real, go to option 3.
- **Cost and risk:** "direction" is a judgement, so the gate can now miss a real change that it calls
  detail. logic-review still checks the behaviour against the brief. This changes one part of S66:
  the conformance gate no longer checks the plan line by line.
- **Where it lives:** `orc-standard-workflow/skills/plan-conformance`, step 6 of
  `orc-standard-workflow/skills/logic-review`.

---

## S66: What the logic reviewer sees

- **Date:** 2026-10-08
- **Status:** decided
- **Question:** The logic-review gate checks the code against the acceptance criteria and judges
  whether each test would fail on a wrong version of the code. Should it also see the plan and the
  coder's implementation log, or only the requirements and the code?
- **Options:**
  1. Give it the plan and the log. It can then see undeclared deviations and missing tasks. But the
     plan is the author's view of the code, and it can anchor the reviewer.
  2. Give it only the brief, the answers in `decisions.md`, the diff and the code. It judges the code
     against the requirements alone. It cannot see deviations from the plan.
  3. Option 2, plus a separate plan-conformance check that compares the plan with the diff and gives
     no verdict on correctness.
- **Evidence:** `docs/research/R5-reviewer-context.md`. Author framing makes LLM reviewers miss bugs
  (measured, in a hostile setting); "ignore it" instructions only partly help; working out the
  required behaviour first improves verification (measured); tests derived from the code repeat its
  bugs (measured). No study measures plan exposure in a normal pipeline. Also the order-pricing run:
  logic-review reported 0 findings while a rounding test could not fail on a wrong rounding mode.
- **Decision:** Option 3.
  - logic-review gets the brief, `decisions.md` (whenever it exists), the diff and the code. No plan,
    no implementation log.
  - It first writes down what each acceptance criterion and each behavioural assumption requires, and
    one likely wrong version of the code for each. Then it reads the code, and checks that each test
    fails on the wrong version.
  - It reads `<notes>/code.md` (the coder's recorded choices) only after it has its findings, and only
    to drop repeats.
  - Conformance to the plan is a second agent gate, `plan-conformance`, declared by the workflow before
    logic-review in `implementation-check`. It sees the plan, the implementation log and the diff. It
    checks that every task is done, every named test exists, and no change falls outside the plan or
    goes undeclared. It gives no verdict on correctness. The two gates write separate results; the
    report shows both.
  - Rejected for conformance: a check in code. It is cheaper and cannot be biased, but it cannot see a
    task that is only half done.
- **Cost and risk:** A reviewer without the plan may flag a deliberate choice it cannot see a reason
  for; the conformance gate and the coder's recorded choices cover that. One more subagent per run
  (about 34k tokens of fixed start-up cost). The cost of hiding the plan
  is reasoned, not measured: watch the next runs for findings the plan would have prevented.
- **Where it lives:** plan 3.3: `orc-standard-workflow/skills/logic-review`, the new skill
  `orc-standard-workflow/skills/plan-conformance`, the workflow's `orchestra.json`, the gate runner's
  inputs.

## S68: The Java port keeps the coder lean and puts the stack rules in reviewers

- **Date:** 2026-10-09
- **Status:** decided
- **Question:** java-stack gives the coder and the reviewer the same long skills: SOLID, Clean
  Architecture, patterns, style, logging, tests. What do we port, where does it go (write time or
  review time), and what do we leave behind as debt?
- **Options:**
  1. Port 1:1, as write-time skills and one broad reviewer. Rejected: R6 finds no gain from generic
     principles or personas and some cost (more code, more abstraction), and broad reviewers
     over-report (R3).
  2. A thin write-time layer of 5–15 rules plus reviewers (R3's recommendation). Rejected for now:
     R6 finds no measured gain from the general rules that would fill it, and the user wants the
     stage skills lean.
  3. Write time holds only facts the model cannot guess (test commands); every convention goes to a
     focused reviewer with numbered rules. Chosen.
- **Evidence:** `docs/research/R6-coder-guidance.md` (personas: no gain on code; quality prompts:
  cleaner start, same decay, higher cost; a bad plan is worse than none; vendors: models are literal
  and over-build). `docs/research/R3-write-vs-review-time.md` (named-rule reviewers reach 75–80%
  precision). The grilling of 2026-10-09 has no file; its
  record is the Scope table of `docs/superpowers/plans/2026-10-09-java-stack-port.md`.
- **Decision:** `code-guide` = test-command facts; no `plan-guide`; gates ops, testing, comments,
  logging, layout and Spotless; no structure gate (clean-code later, at workflow level); dropped:
  SOLID, Clean Architecture, the pattern list, the performance, security, concurrency and
  documentation lists, member order, the entities, converters and DTOs gates,
  `java-maven-upgrade`, the `java` index, the Spotless set-up and hooks, Spring `scValue`. The
  personal repo names depitropov-commons helpers (`DEStringUtils.hideString`,
  `DETestErrorHandlingUtils`, `ErrorUtils.isValidArgument`). A green tool gate (Spotless) commits its changes to the files the
  task changed, and reverts its edits to other files, so a format run never sweeps untouched files
  into the task branch.
- **Cost and risk:** each agent gate costs a subagent per run (follow-up 4 measures whether each one
  earns it). With no structure gate until clean-code arrives, no gate covers
  structure or naming. A rule from a house style may not fit another project: the
  "project's code wins" line is the guard. The ship.cars port must swap the helper names back.
- **Where it lives:** `plugins/orc-java-stack/orchestra.json`, `plugins/orc-java-stack/skills/`,
  `plugins/orchestra/lib/gates.js`, `plugins/orchestra/lib/runner.js`, `plugins/orchestra/lib/git.js` (`commitKeeping`), `PORT-TO-SC.md`.

---

## S69: The lost rows of the port inventory

- **Date:** 2026-10-12
- **Status:** decided
- **Question:** `docs/PORTING.md` had 18 rows with status `lost`: be-coding-agent content that no
  target carries and nobody decided. Two of them are bugs in code, not only lost text: a stage that
  writes no result is dispatched again with no limit, and a mid-run `verify` can fail on
  `spotless:check` before the Spotless gate runs. What do we port, and what do we drop?
- **Options:**
  1. Port each row 1:1. Rejected: escalation would need a new status and a new code path, and the
     brief's Risks and the constraints input add text that changes nothing that runs.
  2. Decide each row on its own, reuse what orchestra has (Decide, the implementation log, the
     report), prefer a check by a later stage over a new instruction to the writer. Chosen.
  3. Decide only the "Top losses". Rejected: the minor rows stay `lost`, which `docs/PORTING.md`
     does not allow.
- **Evidence:** the inventory rows in `docs/PORTING.md`; the code facts checked on 2026-10-12
  (`orc-standard-workflow/bin/next.js` `stage()`, `orchestra/lib/runner.js` `agentStep` and
  `toolStep`, `orc-java-stack/orchestra.json`, `orchestra/lib/report.js`). The grilling of
  2026-10-12 has no file; its record is the Scope table of
  `docs/superpowers/plans/2026-10-12-lost-rows.md`.
- **Decision:**
  - No-result limit: a step is dispatched at most twice with no result, then it fails with "wrote
    no result". The source halted on the first miss; one extra try covers a crashed subagent.
  - Escalation reuses Decide. The spec lists the needs of other repos under a new brief section,
    "Integration points". plan-check raises such a need as Decide, unless the task names the repo.
    A named repo is read only: the run reads it as a sibling checkout and lists its changes as
    follow-ups in the report. The run never changes another repo. No `escalated` status.
  - External facts: plan-check checks that each one has a source or is an assumption with its cost,
    and that each claim in the plan about another service, library or contract has a line there.
    The spec's step 3 names the places to look that exist in any stack. The local Maven repo is
    dropped.
  - Blocker context: before a failed code chunk runs again, `next.js` writes the reason into
    `implementation-log.md`, which the coder already reads.
  - The Java build is `./mvnw -B -fae -Dspotless.check.skip=true verify`. The skip is safe because
    the Spotless gate applies the format before the final build. The skip applies only when the root
    `pom.xml` names the Spotless plugin, the same guard as the gate.
  - The report lists the deviations from the implementation log and the `git diff --stat` of the run.
  - The fixer's commit body says the failure, the root cause, and which side was wrong.
  - Dropped: the brief's Risks (the triage risk axis covers risk), the constraints input (it rides
    in the task text), `deviations[]` in the result (the log holds them). "A missing required input"
    is `n/a`: the task text is the only input.
- **Cost and risk:** a cross-repo need that the spec misses goes unnoticed; plan-check's fact check
  is the only guard. The format skip means a mid-run build never reports formatting, so the Spotless
  gate must stay in the finish phase. Several runs on one repo for multi-repo work stay a human job.
- **Where it lives:** `orc-standard-workflow/bin/next.js`, `orchestra/lib/runner.js`,
  `orchestra/lib/report.js`, `orc-java-stack/orchestra.json`, the skills `spec`, `plan-check` and
  `orchestra:fixer`, `docs/PORTING.md`.

## S70: The contracts (plan 2)

- **Date:** 2026-10-14
- **Status:** decided
- **Question:** `docs/DESIGN.md` §5.1, §5.3 and §5.4 were written before S56, and later decisions changed the declaration, the guides and the selection keys. What do `orchestra check`, `orchestra:init` and the authoring skills look like now, and how do the rules stay true as the plugins change?
- **Options:**
  1. Build §5 as written: JSON Schema files, a `--dry-run` flag in every workflow's `next.js`, two authoring skills, `check` stops on the first failure. Rejected: S11 allows no schema validator, so the schemas would be a second copy of the rules or a validator to maintain; the flag is a second code path in each workflow that only the check uses; two skills is more text than one author needs.
  2. No shipped check: keep the rules in `test/packaging.test.js`. Rejected: S28 makes the check the guarantee of the contracts, and a plugin outside this repo would get no guarantee.
  3. One rule set as plain code in `lib/check.js`, shipped and also run by the repo tests; a dry run that runs the real `next.js` in a throwaway repo; one short authoring skill kept in step by a test. Chosen.
- **Evidence:** the grilling of 2026-10-14 (record: the Scope table of `docs/superpowers/plans/2026-10-14-orchestra-contracts.md`); the code facts checked that day: `test/packaging.test.js` already held the packaging rules; `orc-standard-workflow/bin/next.js` does `prepare` itself when it gets a task; no code read `params`; `config.disable` and `config.gates` are read by `orchestra/lib/gates.js`.
- **Decision:**
  - `check.js <plugin-folder>…` runs every rule; `check.js --project <dir>` runs the config rules and the declaration rules of each resolved plugin. Every failure is one line, `<where>: <problem>. Fix: <fix>.`, and all are listed.
  - The dry run builds a git repo with a bare remote in the system temp folder, a config, a `resolved.json` with a stub Stack Skills slot (`build.run: true`), and a task file outside the repo. It runs `next.js --project <repo> --task-file <file>` and validates the printed action with the protocol's `validateAction`. `failed` fails the rule.
  - `resolve.js` runs the project rules after it writes `resolved.json`, so a bad config stops the run before any subagent.
  - init reads the skill list in its context for `<plugin>:manifest` skills, and asks the user when it finds none. It writes only `plugin`; every other key takes its default.
  - A config key must declare a default, so a config with no values always works and `{config.<key>}` always expands.
  - `params` is removed from the declarations.
  - From the final review of the branch: every slot needs a section in the config (a missing slot made the run fail after it had created the task branch), and `build.run` takes only `{plugin}`, because `buildStep` and `next.js` expand nothing else there.
- **Cost and risk:** the sync test checks one direction only: a key that the runtime reads but `check.js` does not know is caught only by the `CLAUDE.md` rule. The dry run needs `git` on the path and takes about a second. init depends on the harness showing its skill list; the question to the user is the fallback.
- **Where it lives:** `orchestra/lib/check.js`, `orchestra/bin/check.js`, `orchestra/lib/resolved.js`, `orchestra/lib/gates.js`, `orchestra/lib/git.js`, the skills `orchestra:init` and `orchestra:writing-plugins`, `test/packaging.test.js`, `CLAUDE.md`.

## S73: Close phase 1 without the Codex run

- **Date:** 2026-10-14
- **Status:** decided
- **Question:** Phase 1 needs five criteria (S34). Four pass (S72). The Codex run (criterion 3) waits for plan 5, which is paused because no Codex install is available (S71). Does phase 1 stay open until then?
- **Options:**
  1. Keep phase 1 open until a Codex run passes. Rejected: no date is known, and the open phase blocks the next phase for a test that no one can run.
  2. Close phase 1 now and move the Codex run to plan 5 as its own exit test. Chosen.
- **Evidence:** the run `task/add-a-bulk-discount-to-pricecalculator-t` in the sample repo (S72); R7, which finds that Codex reads the Claude Code plugin layout as it is.
- **Decision:** Phase 1 is closed on Claude Code. The Codex run is no longer a phase 1 criterion; it is the done test of plan 5. Pillar 4 (portability) stays: no harness-specific file enters a plugin.
- **Cost and risk:** portability is not proven by a run. A Codex difference (skill names, subagent dispatch, the `manifest` skill's folder) can surface late, after more code depends on it. Watch for it when plan 5 resumes.
- **Where it lives:** `docs/DESIGN.md` §13, `docs/TENSIONS.md`.

## S74: Runs work in a git worktree

- **Date:** 2026-10-14
- **Status:** decided
- **Question:** How does a run stay out of the user's checkout? In the first real run, a run moved the user's branch (O9).
- **Options:**
  1. Where the worktree lives.
     - In the project, at `.orchestra/worktrees/<branch>`. Chosen. It is easy to find and it needs one git-ignore rule. The IDE may index it.
     - In a sibling folder. The IDE ignores it, but it litters the parent folder and orchestra must guess a name.
     - In the home folder. Nothing is near the project, and paths for several projects collide.
  2. What happens on `done`.
     - Remove the worktree and keep the branch. Chosen. No clutter; the report stays readable with `git show`.
     - Keep it. Nothing is lost, but worktrees pile up.
     - Keep it with a clean command. It adds a command for a job the run can do itself.
  3. The base of the worktree.
     - `origin/<default>` after a fetch. Chosen. It is the same base for every run. Unpushed local commits are not in the run.
     - The local default branch, fast-forwarded. It touches the user's branch.
     - The local branch as it is. It carries the user's half-done work into the run.
  4. Who owns it.
     - orchestra. Chosen. Every workflow gets the same safe start.
     - The workflow. Each workflow must repeat the logic.
     - A config option. It lets a project turn the safety off.
- **Evidence:** R8, with the scratch-repo measurements in it.
- **Decision:** As the S74 row in `docs/TENSIONS.md`. Two amendments came from planning. (1) The `report` path stays relative to the run root. A kept worktree is named by the action key `worktree`, relative to the project root. On `done` the skill reads the report with `git show <branch>:<report>`. A `done` action whose worktree git refused to remove carries `worktree` and `kept`. (2) The config comes from the base commit. `.orchestra/config.json` is read inside the worktree. `drive.js` copies only `.orchestra/resolved.json` from the project root on every call. A config that is not on `origin/<default>` stops the start. `create()` reads `origin/HEAD` before `git fetch`. A missing `origin/HEAD` fails with the hint "Run `git remote set-head origin -a`". Git 2.50's fetch would otherwise recreate it silently. `orchestra check --project` fails when `.orchestra/worktrees/` is not git-ignored.
- **Cost and risk:** Unpushed local commits are not in a run. A fresh worktree has no untracked files (`.env`) and no build output. A run started in place before the upgrade cannot resume. IDEs may index the worktree. It is not run on Codex yet.
- **Where it lives:** `plugins/orchestra/lib/worktree.js`, `plugins/orchestra/bin/drive.js`, `plugins/orchestra/lib/protocol.js`, `plugins/orchestra/lib/check.js`, `plugins/orc-standard-workflow/bin/next.js`, the skills `orchestra:run` and `orchestra:writing-plugins`.

## S75: Clean code as a workflow gate, measured by the Stack Skills

- **Date:** 2026-10-16
- **Status:** decided
- **Question:** S68 left clean code for later, "at workflow level". mentorano's clean-code plugin
  has language-agnostic rules but measures only Python and TypeScript. Where does each part go, and
  who measures the code of a stack?
- **Options:**
  A. Port the scripts into the workflow as they are. Smallest change, but a Java run measures
     nothing, and the workflow learns two languages.
  B. One multi-language measurer (for example `lizard`) inside the workflow. Stack-free, but a new
     install on every machine, no compare mode, and nesting depth only through an extension.
  C. The Stack Skills plugin declares the measurement; the workflow gate uses it. The workflow never
     learns a parser, like `build`. Costs a contract change (`check.js`, `writing-plugins`).
- **Evidence:** The mentorano source (`docs/PORTING.md`, section "ai-marketplace-mentorano"): the
  rules section of `SKILL.md` names no language; `languages.py` accepts only `.py`, `.ts` and `.tsx`;
  `boundaries.py` reads only Python and knows FastAPI layer names. An agent gate gets `base` as an
  input, a tool gate does not (`lib/gates.js` expands only `{plugin}` and `{config.<key>}`), and the
  verdicts need judgement (a renamed function shows as `new-over`; a flat `switch` over complexity
  10 is not split).
- **Decision:** C. The gate `clean-code` in `orc-standard-workflow`, `implementation-check`, an agent
  gate that fixes its Patch findings, with the comment rule kept. Stack Skills key `measure`
  (`run`, `rules`) and gate key `measure`. New `orc-ts-stack`: build `npm ci && npm test`, the
  measure and the TypeScript rules. Java declares no measure, so its runs show a warning. The
  mentorano plugin is copied whole to `plugins/clean-code` for use outside orchestra.
- **Cost and risk:** One more subagent per run, on every stack. The comment rule overlaps the Java
  `comments` gate in `finish`; watch for double findings. The TS measure needs Python 3.11 or later
  and the project's own `typescript@5`; without them the gate reviews with the rules only. The
  scripts exist twice (`plugins/clean-code`, `plugins/orc-ts-stack/scripts`); a test keeps them
  identical. The thresholds are the defaults of `measure.py`; a project that wants others needs a
  config key, not built yet.
- **Where it lives:** `plugins/orchestra/lib/{check,gates,runner}.js`,
  `plugins/orchestra/skills/writing-plugins/SKILL.md`, `plugins/orc-standard-workflow/orchestra.json`,
  `plugins/orc-standard-workflow/skills/clean-code/SKILL.md`, `plugins/orc-ts-stack/`,
  `plugins/clean-code/`, `docs/PORTING.md`.

## S76: The Curator as a slot plugin, fed by guides by role

- **Date:** 2026-10-16
- **Status:** decided; its setup point (option 8, setup inline before the first stage) is replaced by S77
- **Question:** How does minions' curate part (the backlog, product, direction, decisions and questions of a vibe-coded project) become the Curator, plug into orchestra, and stay usable without it? Who calls curate after a run (O3)?
- **Options:**
  1. What it owns.
     - The direction docs only. Chosen. The code-knowledge half (conventions into skills, rules and `CLAUDE.md`) overlaps with the PSK, which is not defined.
     - Both halves. It ports the knowledge ledger before the PSK exists.
     - BACKLOG and DIRECTION only. PRODUCT, DECISIONS and QUESTIONS would have no writer.
  2. Which skills.
     - The whole long-term tier: shape-project, shape-product, shape-tech, research, backlog, direction, curate. Chosen. Without the shaping skills a new project has empty docs, and the sweep has no rows to work on.
     - Curate, direction and backlog only. The docs must be written by hand from templates.
  3. How the stages get the docs.
     - Guides by role, pushed by orchestra in the dispatch prompt. Chosen. The workflow knows only roles, and the Curator's guide carries the full text on how to read each file.
     - A generic `context` list of files with one generic line in each stage skill. Rejected by the user: a file list without sentences that explain it.
     - A pointer in `CLAUDE.md`. Every stage sees it, orchestra cannot check it, and Codex reads `AGENTS.md`.
     - The workflow pulls the Curator's files, as it pulled Stack Skills guides. Every workflow must know the Curator.
  4. Who calls curate (O3).
     - orchestra, from a declared `curate` skill, on the workflow's `done`. Chosen. Every workflow gets it with no code.
     - A fourth phase of gates. Curate is not a check-and-fix gate.
     - The workflow's last stage. It couples every workflow to the Curator.
  5. Who writes the docs in a run.
     - `curate` alone, at the end. Chosen. Spec only reads. It loses two things on purpose: Now no longer means "in progress", and the product answers of a failed run stay in its notes folder.
     - Spec and curate, as in minions (specify moves the row to Now and records answers). Two writers in one run, and a move to Now that the same run undoes.
  6. Questions and approval in a run.
     - `curate` runs inline in the main session, asks each judgement call there, and commits at the end. Chosen. It is the last step of a run, so it can no longer fill a stage's context, and it can run `research` and `shape-tech`.
     - `curate` as a subagent: sure edits committed, judgement calls a Decide and a resume. A subagent cannot interview the user or start subagents, so `research` and `shape-tech` would become questions.
     - Commit all and list the doubts in the report. Judgement-heavy deletions would land with no human.
     - Stage everything uncommitted (minions `apply: review`). The run's commits would no longer hold its work.
  7. New `Cn` constraints.
     - `curate` runs the direction sweep; sure `Cn` rows are committed, the others are questions. Chosen.
     - By hand only. A row that curate adds to Next owes constraints until someone remembers the sweep.
  8. Setup.
     - The Curator declares a flag file; every run checks it and runs `setup` when it is missing. Chosen. It is deterministic and quick, it works for a Curator added after `orchestra:init`, and orchestra knows nothing of direction docs.
     - `orchestra:init` runs it once. A Curator added later never gets set up. This becomes O11 (`orchestra:setup`).
  9. Modes.
     - One mode (minions' `vibe`). Chosen. A project that does not want the Curator does not fill the slot.
     - Both modes. `maintain` would be a Curator that writes almost nothing.
  10. Where the docs live.
     - A fixed `docs/curator/`. Chosen. It avoids a clash with a project's own `docs/DECISIONS.md` or `docs/CONTEXT.md`, as this repo has.
     - `docs/` itself. It clashes in this repo.
     - A config key. A mechanism with no project that needs it.
- **Evidence:** the full read of the minions source in `docs/PORTING.md`, section "minions". `orc-standard-workflow/bin/next.js` pulled the Stack Skills guides (`guide()`); `withPrompt` in `lib/protocol.js` already writes every dispatch prompt, so the push needs no new channel.
- **Decision:** As the S76 row in `docs/TENSIONS.md`, with the design in `docs/superpowers/specs/2026-10-16-curator-design.md`. Research stays out of the spec and plan stages. A code guide carries two rules: CONTEXT words in names, and only `Dn` cited in code. `setup` and `curate` run inline in the main session through a new `inline` action that only `drive.js` prints. Amendment (plan 2): curate ships a `Serves` row found in Later, and before it adds a row for `Serves: new` it checks Now, Next and Later and asks the user on a match, so no row is duplicated. The plan guide writes a `Warning:` line under `## Approach` for a `Cn` the plan cannot satisfy, and plan-check raises an applicable `Cn` with neither a task nor a `Warning:` line as Patch. Amendment (plan 3): setup writes its flag only when the product half is confirmed (a stopped product interview reruns setup; an open tech or direction question does not), and on a project with code it states the existing product back instead of exploring from zero.
- **Cost and risk:** About 2,000 lines of source to port, in four plans. Two open runs can both edit `docs/curator/BACKLOG.md`, so their merges conflict (O10). A run that starts before the setup branch is merged runs setup again. The backlog row a run serves can be dropped while it is open; curate asks. `setup` and `curate` run in the main session, which the Codex path has not tested. A session stopped in the middle of curate runs it again from the start on resume. The Stack Skills guides change mechanism, so `orc-java-stack` and the stage skills change with plan 1.
- **Where it lives:** the spec above; later `plugins/orc-curator/`, `plugins/orchestra/lib/protocol.js`, `plugins/orchestra/lib/check.js`, `plugins/orchestra/bin/drive.js`, `plugins/orc-standard-workflow/bin/next.js` and its stage skills, the skills `orchestra:init`, `orchestra:run` and `orchestra:writing-plugins`.

## S77: The Curator's setup runs apart from a feature run

- **Date:** 2026-10-20
- **Status:** decided
- **Question:** The first real run with the Curator ran setup inside the feature run: one branch, one
  worktree and one conversation for both, and their questions overlapped. How should orchestra start a
  run when a Curator is configured but not set up?
- **Options:**
  1. Keep setup inline before the first stage (S76). The task text pulls the product interview into
     feature detail, and the Curator docs reach the default branch only with the feature.
  2. Never run setup inside a feature run. Check the flag on `origin/<default>` at the start; when it is
     missing, create no branch and let the user choose: set up on the default branch now, set up on
     its own branch, or go on without setup. Chosen.
  3. Run setup from `orchestra:init` only. A Curator added later never gets set up (O11).
- **Evidence:** the run on `~/Projects-other/orchestra-sample-java`, branch
  `task/add-a-minimum-order-value-to-pricecalcul`, base 99df3ca, plugins 0.15.0, status `done`.
  Mechanically it worked end to end: the inline setup, the flag, the spec guide's `## Direction`, the
  plan guide's `C1` and `Warning:` line, and an inline curate that shipped B1, closed Q1 and retired C1.
  But setup asked 10 questions, and 3 of them (what happens below the minimum, who sets it, is an equal
  amount accepted) were about the feature, not the product: `shape-product` saw the task text and turned
  the feature into D4, D5, B1 and C1, which is the spec stage's work. `shape-tech` transcribed Java 21,
  Maven, JUnit and Spotless from the code without a question, so the evidence gate works on a repo with
  code. The run's logs were lost with the worktree at `done`. This run is the outcome of plan 3's done
  test (Task 6 of `docs/superpowers/plans/2026-10-19-curator-setup.md`); its second run (no setup on a
  set-up project) is still owed and runs with the new flow.
- **Decision:** As the S77 row in `docs/TENSIONS.md`. One flag check at the start replaces the check
  before every dispatch, so the change is mostly a deletion; it also removes the held-back first
  dispatch, which gave the spec stage only one real dispatch on a setup run. orchestra still never
  edits the user's checkout by itself: the setup on the default branch runs only when the user chooses
  it, and the Curator's own skill writes and commits. The "go on" choice is not remembered: every start
  asks again.
- **Cost and risk:** A user with a task in mind must stop, set up, merge and start again; choice 3 lets
  them go on. A run that starts before the setup branch is merged offers setup again. Setup by hand on
  the default branch commits there, which the user must push. The setup skill on the default branch
  gets no inputs and writes no result file, so orchestra cannot see it fail; the next start checks the
  flag again.
- **Where it lives:** `plugins/orchestra/bin/drive.js` (`start`, `startSetup`, `setupStep`),
  `plugins/orchestra/lib/curator.js` (`setUp`), `plugins/orchestra/lib/worktree.js` (`find` by prefix),
  `plugins/orchestra/lib/report.js` (the `Note:` line), the skills `orchestra:run`,
  `orchestra:writing-plugins`, `orchestra:init` and `orc-curator:setup`, `docs/DESIGN.md` §5.2 and §9a,
  `docs/superpowers/specs/2026-10-16-curator-design.md`.

## S79: Navigation and curation, split between wayfinder and the Curator

- **Date:** 2026-10-21
- **Status:** decided
- **Question:** The user wants to start a project, explore wide, close the one-way doors, then
  iterate, and have the plan follow every deviation. Wayfinder explores and the Curator keeps docs
  true, but both decide things, and the Curator's `shape-product` and `shape-tech` both explore and
  write. Which tool owns which job, and how do their results meet?
- **Options:**
  1. Who explores.
     - mattpocock `/wayfinder`, unchanged, in bursts. Chosen. Its map, ticket types, frontier and fog
       drive unknowns to closure, which `QUESTIONS.md` never did.
     - Port wayfinder's loop into the Curator as typed, blocking `Qn` entries. It keeps one store but
       loses claims, the frontier, one ticket per session and the fog discipline.
     - Keep exploring in `setup` with `shape-product` and `shape-tech` (S76, plan 3). Setup then
       explores the future, and the first sample run (S77) showed it turning a task into decisions.
  2. Depend on wayfinder or port it.
     - Depend, declared in `plugin.json`. Chosen. It is clean and maintained, and the Curator must read
       its map anyway.
     - Port it. A second copy to keep in step with its source.
  3. What setup does.
     - Record the present once, ask nothing on a new project, end with a nudge. Chosen.
     - Setup and a burst run together. Setup cannot start wayfinder: only the user can.
  4. Who organizes a change.
     - One organizer, `curate`, with three inputs (a diff, a map, a change in words) and private
       procedures. Chosen. One public door, and one writer of `Dn` and `Qn`.
     - `curate`, `backlog`, `update-product` and `update-tech` as separate skills. Each copies the
       consequence chain, and the user must pick the right door.
  5. How `hard:` and `soft:` are set at landing.
     - From the ADR: `domain-modeling` writes one only for a hard, surprising trade-off. Chosen. It is
       automatic and recorded at decision time.
     - Ask the user at landing. It works, but the user asked for no step to remember.
  6. The glossary.
     - `GLOSSARY.md` at the repo root. Chosen. Its format is the format of `CONTEXT.md`, and
       `domain-modeling` already writes it.
     - Keep `docs/curator/CONTEXT.md`. Two glossaries drift.
  7. The map after landing.
     - Move it to `docs/curator/maps/<effort>/` and commit it. Chosen. Backlog refs then work on every
       machine.
     - Leave it in the ignored `.scratch/`. A ref to it breaks everywhere else.
  8. Research for a constraint.
     - `direction` calls mattpocock `research`; a choice between options becomes a `Qn` and a nudge.
       Chosen. One fact question needs no burst.
     - Every research need becomes a burst. Heavy for one fact.
  9. Skills that the user never types (`manifest`, the guides).
     - Guides become files: `guides` names a path inside the plugin, and the stage reads it. `manifest`
       stays a skill. Chosen. A subagent reads a file on every harness, and orchestra already knows
       each plugin's folder from `resolved.json`. The manifest is how it learns that folder, so it
       cannot be a file.
     - Hide them with `user-invocable: false`. It breaks S33: `orchestra check` allows only `name`
       and `description` in the frontmatter, so that skills stay portable.
     - Keep them as visible skills. Every Curator and Stack Skills guide shows in the `/` menu.
- **Evidence:** `docs/research/R9-navigation-and-curation.md`: the full read of wayfinder 1.3.1, its
  local tracker, `domain-modeling`, `research` and the `to-spec`/`to-tickets`/`implement-spec` chain;
  the Claude Code docs on `dependencies` and `disable-model-invocation`; the minions philosophy and its
  evidence ("settle the one-way doors, leave the two-way doors to emerge"); and the S77 sample run.
- **Decision:** As the S79 row in `docs/TENSIONS.md`. A burst's destination is a step, never the
  whole product, so wayfinder does not become a master plan. Architecture style and module boundaries
  are decided in the kick-off burst; a one-way call is committed when the evidence exists, and nothing
  is designed ahead for rows that are not built. One backlog row is one tracer bullet and one run.
  `QUESTIONS.md` is the user's list; curate closes entries after a run, at landing and on a known change in words. At a landing and on a change in words, curate shows the `soft:` rows that the map or the change touches and asks "still true?" (a "no" is a new `Dn`); wayfinder never reads `DECISIONS.md`, so this is where the `soft:` rows are challenged. curate commits the burst's `GLOSSARY.md` changes and the ADRs that a new `Dn` links. It stops on uncommitted docs before it writes, so that a discard never takes the user's own edits. A wayfinder `## Out of scope` line means out of this effort, so the user chooses: a non-goal, a `## Later` row, or nothing. The guides of every slot plugin (orc-curator and orc-java-stack) move to `guides/*.md`; the stage and gate skills of the workflow and the Stack Skills stay skills for now.
- **Cost and risk:** The exploring discipline of `shape-product` (four directions, comparable
  products, rejected directions recorded) and of `shape-tech` (the capability dimensions and what each
  option closes off) is gone; bursts rely on wayfinder's generic `grilling`. A one-way decision for
  which `domain-modeling` writes no ADR lands as `soft:`. `curate` becomes the largest skill; an input
  moves into its own procedure when it grows too big. A burst abandoned before landing stays on one
  machine. The orc-curator plugin now needs mattpocock-skills and our marketplace's allow list. No burst
  has been landed yet.
- **Where it lives:** `docs/research/R9-navigation-and-curation.md`; later `plugins/orc-curator/`
  (`skills/curate`, `skills/setup`, `procedures/`, `references/`, `templates/`, `.claude-plugin/plugin.json`),
  `.claude-plugin/marketplace.json`, `plugins/orchestra/lib/{check,protocol}.js`, `plugins/orchestra/skills/writing-plugins/SKILL.md`, `plugins/orc-java-stack/guides/`, `docs/DESIGN.md`, `docs/CONTEXT.md`, the Curator spec.

---

## S80: Gates that every workflow gets, in their own slot

- **Date:** 2026-10-21
- **Status:** decided
- **Question:** `clean-code` reads only what every workflow gives (the brief, the base, the notes, the measure), yet it lives in `orc-standard-workflow`. A second workflow, for example one built on Superpowers, would need its own copy. Where do gates that every workflow gets live?
- **Options:**
  1. A new optional slot, `global-gates`. Chosen. Any workflow gets the gates, and each gate is declared once.
  2. Let a gate name a skill of another plugin, `plugin:skill`. Smaller, but both workflows must be installed and each declares the gate again.
  3. Put the gates in the Curator slot (O13). The wrong owner: the Curator keeps the direction docs, not the checks.
  4. Move `logic-review` too. Rejected: it needs the given-when-then brief of `orc-standard-workflow:spec`.
- **Evidence:** The conversation of 2026-10-21 and the adapter backlog (O8) in `docs/TENSIONS.md`.
- **Decision:** As the S80 row in `docs/TENSIONS.md`. The slot is optional, its declaration holds `slot`, `config` and `gates`, and the provider order is workflow, global-gates, stack-skills. A gate name is unique across a project's slots.
- **Cost and risk:** An existing project loses `clean-code` until it adds the new section. The Superpowers review must cover what `logic-review` covered. O7 (General Knowledge) stays open.
- **Where it lives:** `plugins/orchestra/lib/{check,gates}.js`, `plugins/orchestra/skills/{writing-plugins,init}/SKILL.md`, the tests in `test/orchestra/`, and the plugin `plugins/orc-global-gates/` (Task 2).
