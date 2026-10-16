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
