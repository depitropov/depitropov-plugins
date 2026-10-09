# Java Stack Port (Plan 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `orc-java-stack` its reviewer gates (ops, testing conventions, comments, logging, layout, Spotless) and a code guide that holds only test-command facts, ported from java-stack with the decisions of the 2026-10-09 grilling (S68).

**Architecture:** Five agent gates and one tool gate, declared as data in `plugins/orc-java-stack/orchestra.json`. Each agent gate is one skill: a short fixed procedure, then a numbered rule list. The gate runner gets two small changes: `files` may be a list, and a green tool gate commits what it changed. No new lines go into the orchestra `code` or `plan` skills (R6, the user).

**Tech Stack:** Node 22, standard library only, `node:test`. Skill text in Markdown.

**Spec:** the grilling of 2026-10-09 (Q1–Q18, recorded as S68 in Task 9), `docs/research/R6-coder-guidance.md`, `docs/research/R3-write-vs-review-time.md`, `docs/DESIGN.md` §4, §8.4, §10, `docs/TENSIONS.md` (S1–S67), `docs/CONTEXT.md`, `docs/PORTING.md` (porting steps).

**Sources (porting rule, `docs/PORTING.md`):** read in full before the task that ports them. All under `~/Projects/claude-code-plugins/plugins/java-stack/`.
- `skills/java-maven/SKILL.md`, `skills/java-testing/SKILL.md` ("Reading Surefire Results") (Task 2)
- `skills/java-comments/SKILL.md`, `skills/java-comments/evals/` (all files) (Task 3)
- `skills/java-logging/SKILL.md`, `agents/sc-java-logging.md` (Task 4)
- `skills/java-formatting/SKILL.md`, `skills/java-architecture/SKILL.md` (`@UtilityClass`) (Task 5)
- `skills/java-testing/SKILL.md` (Task 6)
- `skills/java-ops/SKILL.md`, `skills/java-style/SKILL.md` ("Null and Empty Checks"), `skills/java-review/SKILL.md` (Task 7)
- `skills/spotless-maven-setup/SKILL.md` (Task 8)
- every file above, plus `README.md`, `agents/java-code-reviewer.md`, `skills/java/SKILL.md`, `skills/java-maven-upgrade/` (Task 9: inventory)

## Scope

| # | Decision (grilling 2026-10-09) | Task |
|---|---|---|
| 1 | `code-guide` holds only test-command facts (Q1) | 2 |
| 2 | No `plan-guide` (Q2) | — (nothing to build) |
| 3 | No new lines in the orchestra `code` and `plan` skills (Q3) | — |
| 4 | Gates: ops, testing conventions, comments, logging, layout, Spotless (Q4, Q11) | 3–8 |
| 5 | No structure gate; clean-code comes later at workflow level (Q5, Q14, Q15) | 9 (records) |
| 6 | Numbered rules; a finding cites rule and `file:line`; the project's code wins (Q6) | 3–7 |
| 7 | depitropov-commons names instead of ship.cars helpers; `PORT-TO-SC.md`, git-ignored (Q7, Q10) | 4, 6, 7, 9 |
| 8 | Phases and selection (Q8) | 1, 3–8 |
| 9 | Comments: one agent gate, tier-1 grep first, tier-2 as hints, evals ported (Q9) | 3 |
| 10 | Logging without `scValue` (Q10) | 4 |
| 11 | Testing conventions without general principles (Q12) | 6 |
| 12 | Ops without the security, concurrency and documentation lists (Q13) | 7 |
| 13 | Spotless only when the pom has the plugin; no set-up, no hooks; gotchas as fix guide (Q16) | 1, 8 |
| 14 | Drop `java-maven-upgrade` and the `java` index (Q17) | 9 |
| 15 | Check: comments evals, then one run on the sample repo (Q18) | 3, 10 |

Not in this plan: the build's `-s .mvn/settings.xml` and JaCoCo (inventory top loss 3), the comments judgment cases (`evals/cases.md`, run by hand), the `when` select step, crap4java and mutate4java (phase 2).

## Global Constraints

- Node, standard library only (S11).
- `SKILL.md` frontmatter has only `name` and `description`. Skill text names actions, never tool names: no `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p`, `Bash`, `Edit`, `Write` (S33).
- Both manifests of each plugin have the same version (S33).
- No skill pipes a test or build command (S60).
- Skill examples use no names from the sample task: no `PriceCalculator`, `VIP`, `50.00`, `discount` (packaging test).
- No ship.cars names in shipped files: no `cars.ship`, `SC*Utils`, `scValue`, `LITE-` (S3, S68). They go only into `PORT-TO-SC.md`.
- Skill prose in simple English (ASD-STE-100), the names in `docs/CONTEXT.md`.
- A port reads the source in full and updates `docs/PORTING.md` (porting rules). Task 9 does the inventory for all tasks in one commit; each task names its source rows in its commit message body.
- Stage files by path. Never stage `CLAUDE.md`, `.serena/` or `docs/guide.html` (they hold unrelated work).
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A migration-only change.** A task that adds only a `.sql` migration must still select the ops gate. Test in Task 1 (`files` as a list) and the ops declaration in Task 7.
2. **A repo without Spotless.** The Spotless gate must pass (exit 0) and change nothing when `pom.xml` has no `spotless-maven-plugin`, and when there is no `pom.xml` at all. Test in Task 8.
3. **A green tool gate that changed nothing.** The new commit-after-green must not fail or make an empty commit. Test in Task 1.
4. **A comment with a Jira key or the word "before".** The tier-1 pattern must not flag it. Test in Task 3 (`clean.txt`).
5. **A gate declared but its skill missing.** A typo in `orchestra.json` must fail the tests, not the run. Test in Task 2.

---

## The agent gate skill shape

Tasks 3–7 write one agent gate skill each. Every one has the same frame, written out in full in each
task. Only the parts in angle brackets change. It follows `logic-review` (the existing agent gate):

````markdown
---
name: <skill>
description: <one line>. An orchestra gate; dispatched by orchestra.
---

# <Title>

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Get the change: `git diff <base> HEAD -- <paths>`. Read each changed file in full. If the change
   has nothing in scope, write the result with `"status": "skipped"` and stop.
<extra step, only where a task names one>
2. Check the lines this change adds or edits against each rule below. Code the change does not touch
   is not in scope.
3. The project's code wins. When the untouched code of the same kind in this project does it another
   way, follow the project: that rule is not a finding.
4. Each finding names the rule number and `file:line`.
5. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/<gate>.md` in the triage notes format.
7. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
8. Otherwise fix every Patch finding and every answered Decide. <phase line> Run only the tests of the
   files you changed. Never pipe a test command: the pipe hides the exit code. Commit once:
   `fix(<gate>): <summary>`. orchestra commits `notes` itself: do not stage files under `docs/runs/`
   or `tmp/`. Do not review your own fixes again.

Not yours: <the areas of the other gates>.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "<gate>",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 0, "noise": 1 },
  "evaluate": [],
  "files": ["<notes>/<gate>.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user; a
question goes into `decide`.

## Rules

<numbered rules>
````

`<phase line>` is, for a gate in `finish`: "Your fixes must not change behaviour." For the other
phases it is empty.

---

### Task 1: The runner: `files` as a list, and a green tool gate commits

**Files:**
- Modify: `plugins/orchestra/lib/gates.js` (`select`)
- Modify: `plugins/orchestra/lib/runner.js` (`toolStep`, the line `if (s.fix === 'self') commitAll(...)`)
- Test: `test/orchestra/gates.test.js`, `test/orchestra/runner.test.js`

**Interfaces:**
- Produces: a gate's `files` is a glob string or a list of globs; a changed file that matches any of them selects the gate. A tool gate (not the build) that exits 0 commits any change it made, with the message `orchestra: <gate> (<phase>)`, whatever its `fix`.

- [ ] **Step 1: Write the failing tests**

In `test/orchestra/gates.test.js`, add after the test `select applies files and grep, …`:

```js
test('select takes a list of globs in files', () => {
  const gates = [{ name: 'ops', files: ['**/*.java', '**/*.sql'] }, { name: 'none', files: ['**/*.kt'] }];
  const v = select(gates, ['db/migration/V2__idx.sql'], () => null);
  assert.deepEqual(v.map(x => [x.name, x.selected]), [['ops', true], ['none', false]]);
  assert.match(v[1].why, /no changed file matches \*\*\/\*\.kt/);
});
```

In `test/orchestra/runner.test.js`, add after the test `a self-fixing tool commits its changes`:

```js
test('a fixer tool gate that passes commits what it changed', () => {
  const spotless = { name: 'spotless', phase: 'finish', kind: 'tool', run: `node -e "require('fs').appendFileSync('src/Car.java', '// formatted')"`, fix: 'fixer', guide: 'fix-spotless', always: true };
  const t = setup({ stackGates: [spotless] });
  assert.equal(t.step('finish').status, 'ok');
  assert.equal(git(t.dir, 'log', '-1', '--format=%s'), 'orchestra: spotless (finish)');
});

test('a green tool gate that changed nothing makes no commit', () => {
  const lint = { name: 'lint', phase: 'finish', kind: 'tool', run: OK, fix: 'fixer', guide: 'fix-lint', always: true };
  const t = setup({ stackGates: [lint] });
  const before = git(t.dir, 'rev-parse', 'HEAD');
  assert.equal(t.step('finish').status, 'ok');
  assert.equal(git(t.dir, 'rev-parse', 'HEAD'), before);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orchestra/gates.test.js test/orchestra/runner.test.js`
Expected: FAIL. `select takes a list of globs` fails in `globToRegExp` (`glob[i]` on an array). `a fixer tool gate that passes commits` fails: the last commit is still `code`. `a green tool gate that changed nothing` passes already (it guards the change).

- [ ] **Step 3: Implement**

In `plugins/orchestra/lib/gates.js`, in `select`, replace the `if (g.files) { … }` block with:

```js
    if (g.files) {
      const globs = [].concat(g.files);
      const res = globs.map(globToRegExp);
      files = files.filter(f => res.some(re => re.test(f)));
      if (!files.length) return { name: g.name, selected: false, why: `no changed file matches ${globs.join(' or ')}` };
    }
```

In `plugins/orchestra/lib/runner.js`, in `toolStep`, replace

```js
    if (s.fix === 'self') commitAll(ctx.project, `orchestra: ${s.name} (${ctx.phase})`);
```

with

```js
    // A tool that formats the code (Spotless) leaves changes, whatever its fix. commitAll makes no empty commit.
    if (!s.build) commitAll(ctx.project, `orchestra: ${s.name} (${ctx.phase})`);
```

- [ ] **Step 4: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`, every test passes.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/gates.js plugins/orchestra/lib/runner.js test/orchestra/gates.test.js test/orchestra/runner.test.js
git commit -m "feat(orchestra): files takes a list; a green tool gate commits its changes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The code guide, and a test that every declared skill exists

**Files:**
- Create: `plugins/orc-java-stack/skills/code-guide/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`
- Test: `test/packaging.test.js`

**Interfaces:**
- Consumes: `next.js` already passes `guides.code` to the code stage as `guide` (`plugins/orc-standard-workflow/bin/next.js:87-89`).
- Produces: `orchestra.json` gets `"guides": { "code": "code-guide" }`. The new packaging test checks every `skill` and every `guide` a declaration names; Tasks 3–8 rely on it.

- [ ] **Step 1: Read the sources in full** — `skills/java-maven/SKILL.md` and the section "Reading Surefire Results" of `skills/java-testing/SKILL.md`.

- [ ] **Step 2: Write the failing test**

In `test/packaging.test.js`, replace the test `every guide a stack declares is a skill in that plugin` with:

```js
test('every skill and guide a declaration names is a skill in that plugin', () => {
  for (const p of plugins) {
    const file = path.join(PLUGINS, p, 'orchestra.json');
    if (!fs.existsSync(file)) continue;
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const names = [
      ...Object.values(d.guides || {}),
      ...(d.build && d.build.guide ? [d.build.guide] : []),
      ...(d.gates || []).flatMap(g => [g.skill, g.guide].filter(Boolean)),
    ];
    for (const name of names) {
      assert.ok(fs.existsSync(path.join(PLUGINS, p, 'skills', name, 'SKILL.md')), `${p}: ${name} has no skill`);
    }
  }
});
```

- [ ] **Step 3: Add the guide to the declaration**

`plugins/orc-java-stack/orchestra.json` becomes:

```json
{
  "slot": "stack-skills",
  "params": [],
  "config": {},
  "build": { "run": "./mvnw -B verify", "guide": "fix-build", "max_rounds": 3 },
  "guides": { "code": "code-guide" },
  "gates": []
}
```

- [ ] **Step 4: Run the test to see it fail**

Run: `node --test test/packaging.test.js`
Expected: FAIL with `orc-java-stack: code-guide has no skill`.

- [ ] **Step 5: Write the guide**

`plugins/orc-java-stack/skills/code-guide/SKILL.md`:

```markdown
---
name: code-guide
description: Facts for running the tests of a Maven project. Invoked by the code stage of an orchestra workflow.
---

# Java code guide

Facts about the test tools. The project's own set-up wins: when it runs tests another way, follow it.

1. Use the Maven wrapper with batch mode: `./mvnw -B`. When `.mvn/settings.xml` exists, add
   `-s .mvn/settings.xml`, or the private dependencies do not resolve.
2. One test class: `-Dtest=<TestClass>`. One method: `-Dtest=<TestClass>#<method>`. More methods of
   one class: `<TestClass>#<m1>+<m2>`. Methods of different classes: a comma between them.
3. In a multi-module project, add `-pl <module> -am`. Without `-am`, Maven takes the other modules
   from old SNAPSHOT jars, and the errors (an unsatisfied CDI dependency, `NoSuchMethodError`) are
   not in your code. With `-Dtest` across modules, also add `-Dsurefire.failIfNoSpecifiedTests=false`,
   or every module with no match fails. `-DfailIfNoTests=false` does not do this.
4. In the Surefire summary, `Failures` means an assertion failed: judge the code. `Errors` means the
   test did not reach its assertions (set-up, a missing resource, an old `target/`): make the test run
   first, then judge the code. A run that was stopped can leave `target/test-classes` half full. Run
   again, or clean the module.
```

- [ ] **Step 6: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`.

- [ ] **Step 7: Commit**

```bash
git add plugins/orc-java-stack/skills/code-guide/SKILL.md plugins/orc-java-stack/orchestra.json test/packaging.test.js
git commit -m "feat(java): code guide with test-command facts only (S68)

Source: java-maven (test selection, multi-module pitfalls), java-testing (Surefire results).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The comments gate, and its grep evals

**Files:**
- Create: `plugins/orc-java-stack/skills/review-comments/SKILL.md`
- Create: `test/orc-java-stack/fixtures/comments/flagged.txt`, `flagged-regressions.txt`, `flagged-tier2.txt`, `clean.txt`, `tier2-collisions.txt`
- Create: `test/orc-java-stack/comments-grep.test.js`
- Modify: `plugins/orc-java-stack/orchestra.json` (add the gate)
- Modify: `test/packaging.test.js` (the triage test covers stack gates)

**Interfaces:**
- Produces: gate `comments`, skill `review-comments`. The skill holds the two patterns as the shell lines `TIER1='…'` and `TIER2='…'`; the test reads them from there, so the skill and the test cannot drift.

- [ ] **Step 1: Read the sources in full** — `skills/java-comments/SKILL.md` and every file in `skills/java-comments/evals/`.

- [ ] **Step 2: Write the fixtures**

The source fixtures are real ship.cars comment lines. Port each line with the same pattern shape and
neutral names: the Jira key `LITE-` becomes `ABC-`, and internal class or table names become generic
ones. `test/orc-java-stack/fixtures/comments/flagged.txt`:

```text
# Comment lines that MUST be flagged by tier 1. Ported from real comments, names made neutral.
 * flight silently loses the correlated skip-all (T4.4 / R-6).
// no vehicles array at all - the load-level clause used to demand dates for every shipping
// R5 (T4.4): a 4xx-class create error is now terminal — surfaced as NonRetryableException so
// T4.2: the real archive activity is now invoked (not the Phase-3 NOOP default branch).
// P21 (T4.5): the create/update-failure skip-all flips every still-unapplied
// Step 10 (T4.1): a DISPATCH_LEG op must route to dispatchLegActivity, not the
// Reconciled with T4.5/M1/B2: the same failure ALSO fires skip-all (intended behavior, covered
 * <h3>PARITY ENVELOPE (WS2 Step 1)</h3>
 * WS2 — cross-engine parity proof (ABC-8008, rollout-gating before the Phase 6 flip).
 * R-8: continue-as-new when the SDK suggests it (history/replay-cost heuristics) OR an explicit
```

`flagged-regressions.txt`:

```text
# Pattern bugs found in an external review. Each was missed by an earlier tier-1 pattern.
// AC3: a low-priority group never waits longer than the deferral window
// Phase 3 leaves this branch as a NOOP default
// R5: a 4xx create error is terminal
```

`flagged-tier2.txt`:

```text
# Bare letter-digit plan shorthand. Tier 1 misses all of these; tier 2 flags them.
 * match the registration or the workflow start fails with INVALID_ARGUMENT (REVIEW-FIX R-12 /
 *   <li><b>D3/D4/R7 — consumer gates</b>: the {@code ListingActivityImpl}
 * {@code signalRetryFailedOp} (G1) swallow {@code WorkflowNotFoundException}
 * status-guarded (R-4) to prevent clobbering rows that advanced past the expected state between the
 * A terminal-failure record for a single dispatch operation (G1).
 * surface a {@code dispatch_event} row — D5 physical separation).
 * Parity-test harness for ABC-8008 (WS2 — the cross-engine parity proof).
 // Assert: the dispatch_event row is back to PENDING (NOT outbox_message — M2/A2).
 * task-brief E1 class of bug).
```

`clean.txt`:

```text
# Good comment lines that MUST NOT be flagged: Jira keys, "before" in a non-temporal sense, digits.
// a migrated order may legitimately carry no money - ABC-8415. Null stays a 400 either way:
 * dispatched - ABC-8356.
 * them on the call that derives dates from them. Runs before anything is mutated, otherwise
// the mirror of the mixed-status test below: with both vehicles archived nothing is rejected,
// Hold past 3 idle windows (2s each): still RUNNING, with a blocked-exit WARN per expiry.
 * <p>Delete this toggle and its two guards once the migration is done - ABC-8415.
// Belt-and-braces: an assertion failure can leave a run open on the shared embedded server.
// a LinkedHashMap because the sort below is stable and its keys can tie, which makes
// Two invariants this rests on - see the javadoc for why the rule itself is safe.
// the integrator owns the cleanup - the revert clears nothing
```

`tier2-collisions.txt`:

```text
# Real-world tokens that tier 2 also flags. Expected; the reason tier 2 gives hints, not findings.
// switched to G1 because the CMS pause times were unacceptable on this heap
// benchmarked on an Apple M1; the numbers do not transfer to x86 CI
// the D3 force layout needs the nodes mutated in place, so this copy is deliberate
// uploads go to R2 rather than S3 — egress on this bucket is free
```

- [ ] **Step 3: Write the failing test**

`test/orc-java-stack/comments-grep.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '../../plugins/orc-java-stack/skills/review-comments/SKILL.md');
const FIX = path.join(__dirname, 'fixtures/comments');

// The skill is the source of truth for the patterns. grep -E and JavaScript agree on \b, \s and the groups used here.
function pattern(name) {
  const m = fs.readFileSync(SKILL, 'utf8').match(new RegExp(`^${name}='(.+)'$`, 'm'));
  assert.ok(m, `${name} not found in the skill`);
  return new RegExp(m[1]);
}
const lines = file => fs.readFileSync(path.join(FIX, file), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));

test('tier 1 flags every plan coordinate and change description', () => {
  const t1 = pattern('TIER1');
  for (const l of [...lines('flagged.txt'), ...lines('flagged-regressions.txt')]) assert.match(l, t1);
});

test('tier 1 leaves good comments alone', () => {
  const t1 = pattern('TIER1');
  for (const l of lines('clean.txt')) assert.doesNotMatch(l, t1);
});

test('tier 2 flags the bare shorthand that tier 1 cannot see', () => {
  const t1 = pattern('TIER1');
  const t2 = pattern('TIER2');
  for (const l of lines('flagged-tier2.txt')) {
    assert.match(l, t2);
    assert.doesNotMatch(l, t1);
  }
});

test('tier 2 also flags known collisions, which is why its hits are hints', () => {
  const t2 = pattern('TIER2');
  for (const l of lines('tier2-collisions.txt')) assert.match(l, t2);
});
```

Run: `node --test test/orc-java-stack/comments-grep.test.js`
Expected: FAIL with `ENOENT` on the skill file.

- [ ] **Step 4: Write the skill**

`plugins/orc-java-stack/skills/review-comments/SKILL.md` — the frame from "The agent gate skill
shape", with:
- `name`: `review-comments`; description: "Reviews the comments and Javadoc of the changed Java code against the comment contract, then fixes them. An orchestra gate; dispatched by orchestra."
- Title: `Comments review`; `<gate>`: `comments`; `<paths>`: `'*.java'`; `<phase line>`: "Your fixes must not change behaviour."
- Extra step, between 1 and 2: "Run the tier-1 sweep below on the changed files. Each hit is a finding under rule 3 or 4. Then run the tier-2 sweep. A tier-2 hit is only a hint: judge it against rule 4, because the same tokens name real things (a garbage collector, a chip)."
- Not yours: "logic, structure, log statements, layout and test style. Other gates own them."
- Rules:

````markdown
A comment carries what the code cannot. A comment that a reader can derive from the code below it is
a second copy of the code that no compiler checks. A wrong comment is worse than none: misleading
text costs about 23% of code-reasoning accuracy, and correct comments raise automated bug-fix
accuracy up to three times. The bar is accuracy, not volume.

1. **Every comment says one of five things.** If it says none of them, delete it.

   | Kind | Says |
   |---|---|
   | Constraint | An invariant or bound the code must not break |
   | Reason | Why this way, and what breaks with the obvious way |
   | External fact | Library, driver, database planner, spec or upstream behaviour not visible in this file |
   | API contract | Public Javadoc: what a caller passes, what it gets, what it must handle |
   | Expiry | This construct is temporary: what must be true before it is deleted |

2. **Describe state, never change.** No `now`, `no longer`, `was X before`, `used to`. Git holds the
   history. A comment that describes a diff is wrong after the next change. A regression guard names
   the broken behaviour it prevents, in the present tense. During a migration, the system being
   replaced still runs: what it does is an external fact (kind 3), in the present tense.
3. **No plan coordinates.** `T4.2`, `R5`, `Step 6`, `AC3`, `Phase 3` resolve only against a plan the
   reader does not have. A Jira key is fine: it is stable and resolvable. The test is whether the
   reference survives: a decision-log entry that is never renumbered is fine; a task ID from a plan
   that is archived on delivery is not. Write the fact, and cite the reference after it.
4. **Bare plan shorthand** (`G1`, `R-9`, `D4`, `M1`, `WS2`, `E1`) is a plan coordinate too, when the
   context shows it is one. The same token can name a real thing (`G1` garbage collector, `M1` chip,
   `D3` library, `R2` bucket): then it is not a finding.
5. **Never invent a reason.** A reason that the code, the brief or the commit history cannot back is a
   finding. Delete the reason; keep any fact the comment holds. A plausible wrong reason is the most
   expensive comment there is.
6. **Delete on sight:**
   - anything that restates the line below it;
   - section banners (`// ---- Helpers ----`): extract a method instead;
   - leaked reasoning (`// Now we need to handle the case where...`);
   - commented-out code;
   - Javadoc that re-spells the method name (`/** Gets the name. */`);
   - `@param` and `@return` lines that repeat the signature and add nothing.
7. **In tests, comment the trap the test guards, never the fixture it builds.** The builder is
   readable; the reason the fixture has that shape is not.
8. **A comment matches the code next to it.** Code that changed with its comment left behind: update
   or delete the comment. A cross-file fact (a fixture ID, a seeded row) is cited exactly, or not at
   all.

Examples.

Reason plus external fact. Delete this, and the next reader turns the literal into a bind parameter
and loses the index:

```java
/**
 * The status is spelled as a literal rather than bound: this query runs on every tick, so the
 * driver switches it to a server-side prepared statement with a generic plan, and under a generic
 * plan the planner cannot prove a bound value satisfies the partial index predicate.
 */
```

Constraint that an innocent refactor would break:

```java
// a LinkedHashMap because the sort below is stable and its keys can tie, which makes the query's
// ordering the final tiebreak — a HashMap would randomize it
```

API contract that names the failure mode, not the signature:

```java
/**
 * Returns at most {@code topGroups} pending groups, most urgent first.
 *
 * <p>A group whose oldest pending message was created before {@code promotedBefore} outranks every
 * non-promoted group regardless of its priority, so a steady stream of urgent groups cannot starve
 * a low-priority one for longer than that threshold.
 */
```

Plan coordinates plus a change description (rules 2 and 3), then the same comment as state and reason:

```java
// R5 (T4.4): a 4xx create error is now terminal — surfaced as NonRetryableException so the
// P6 activity predicate does not retry it. (Was a bare BusinessRuleException before R5.)

// a 4xx create is terminal: the retry predicate lets NonRetryableException through, so a
// malformed payload fails fast instead of burning the retry budget
```

In a test (rule 7):

```java
// bad — narrates the lines below it
// create three low priority messages and one urgent one

// good — states what would break without this test
// only the two oldest aged groups are promoted; without the cap all five would rank first and the
// urgent group would not make the tick at all
```

Sweeps. Run them on the changed files only:

```sh
TIER1='(\b(AC[0-9]+|T[0-9]+\.[0-9]+|P[0-9]+|Step [0-9]+|Phase ?-?[0-9]+|is now|no longer|was previously|used to)\b|\bR-?[0-9]+:)'
TIER2='\b([GMBEDRT]-?[0-9]+|WS[0-9]+|concept [0-9]+)\b'
git diff --name-only <base> HEAD -- '*.java' | xargs grep -nE "^\s*(//|\*).*${TIER1}"
git diff --name-only <base> HEAD -- '*.java' | xargs grep -nE "^\s*(//|\*).*${TIER2}"
```
````

- [ ] **Step 5: Declare the gate, and extend the triage test**

In `plugins/orc-java-stack/orchestra.json`, set `"gates"` to:

```json
  "gates": [
    { "name": "comments", "phase": "finish", "kind": "agent", "skill": "review-comments", "files": "**/*.java" }
  ]
```

In `test/packaging.test.js`, replace the test `every judging skill takes its triage from orchestra:triage, …` with:

```js
test('every judging skill takes its triage from orchestra:triage, not from its own copy', () => {
  const judging = [
    ...['plan-check', 'plan-conformance', 'logic-review'].map(n => ['orc-standard-workflow', n]),
    ...skills.filter(s => s.plugin === 'orc-java-stack' && s.name.startsWith('review-')).map(s => [s.plugin, s.name]),
  ];
  for (const [plugin, name] of judging) {
    const text = fs.readFileSync(path.join(PLUGINS, plugin, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(text, /invoke the skill\s+`orchestra:triage`/i, name);
    assert.doesNotMatch(text, /\*\*Noise\*\*: not a real problem/, `${name} still has its own bucket list`);
  }
});
```

- [ ] **Step 6: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`. If a fixture line fails, check that the neutral rename kept the token the pattern
needs (for example `T4.4`, `used to`, `R5:`).

- [ ] **Step 7: Commit**

```bash
git add plugins/orc-java-stack/skills/review-comments/SKILL.md plugins/orc-java-stack/orchestra.json test/orc-java-stack/ test/packaging.test.js
git commit -m "feat(java): comments gate with tier-1 and tier-2 sweeps and their evals (S68)

Source: java-comments SKILL.md and evals (layer 1). The judgment cases are not ported.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The logging gate

**Files:**
- Create: `plugins/orc-java-stack/skills/review-logging/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`

**Interfaces:**
- Produces: gate `logging`, skill `review-logging`, phase `finish`.

- [ ] **Step 1: Read the sources in full** — `skills/java-logging/SKILL.md`, `agents/sc-java-logging.md`.

- [ ] **Step 2: Write the skill**

The frame from "The agent gate skill shape", with:
- `name`: `review-logging`; description: "Reviews the log statements of the changed Java code against the logging rules, then fixes them. An orchestra gate; dispatched by orchestra."
- Title: `Logging review`; `<gate>`: `logging`; `<paths>`: `'*.java'`; `<phase line>`: "Your fixes must not change behaviour."
- Not yours: "empty lines around log statements (the layout gate), exception handling (the ops gate), comments."
- Rules:

````markdown
1. **Logger.** Use Lombok's `@Slf4j` on the class; the field is `log`. Do not declare
   `private static final Logger log = LoggerFactory.getLogger(...)` by hand.
2. **Placeholders.** Use `{}` placeholders. No string concatenation, no `%s` or `String.format` in a
   log call: the message is built even when the level is off.
3. **Message format.** A short message that starts with a capital letter and has no full stop at the
   end. Then the context, as `name: {}` pairs joined by `, `. Add every value that helps to
   investigate: primary keys, user input.

   ```java
   log.info("Order shipped, orderId: {}, carrierId: {}", orderId, carrierId);
   ```

4. **When the label is not needed.** The `name: {}` label says what a value is. Skip it when the line
   already says it:
   - a self-describing `toString()` (a `record`, Lombok `@ToString` or `@Data`, `ToStringBuilder`):
     use a bare `{}`. `log.debug("Loaded shipment {}", shipment);`, not `"…, shipment: {}"`.
   - a `{}` inside the sentence that names it: `log.info("Processing check-in for {} companies", count);`
   A scalar (`String`, a number, `boolean`, an `enum`, `Instant`) has no type or field name in its
   output, so outside a sentence it always needs `name: {}`, never `name={}` or a bare `{}`. Both
   forms may mix in one statement.
5. **Exceptions.** Log both `error: {}` with `e.getMessage()` and the exception itself as the last
   argument, with no placeholder for it:

   ```java
   log.error("Failed to process order, orderId: {}, error: {}", orderId, e.getMessage(), e);   // correct
   log.error("Failed to process order, orderId: {}", orderId, e);                              // no error: {}
   log.error("Failed to process order, orderId: {}, error: {}", orderId, e.getMessage());      // no exception object
   ```

6. **Log or rethrow, not both.** A catch that logs an exception and throws the same exception logs it
   twice. No `printStackTrace()`, no `System.out` or `System.err`.
7. **Levels.**
   - ERROR: a system failure or data loss that needs attention now.
   - WARN: only a condition the system does not expect: an internal anomaly, an inconsistent state,
     something an operator may act on.
   - INFO: business events and the life cycle, and the expected outcomes of user or API calls, even
     when work is skipped: an entity not found for a stale id, a status change skipped because a
     concurrent update moved the record on, a duplicate event ignored.
   - DEBUG: diagnostics. TRACE: fine detail.

   Before WARN, ask: can normal user or API behaviour cause this? Then it is INFO. When unsure, trace
   where the data comes from: data from callers means INFO; data the system itself guarantees, being
   wrong, means WARN or ERROR.
8. **Sensitive data is never logged in plain text:** `password`, `secret`, `token`, `apiKey`,
   `accessToken`, `refreshToken`, `ssn`, `taxId`, card number, `cvv`, `pin`, bank account, routing
   number, and a full email address or phone number in production logs. When tracing really needs
   the value, mask it with `DEStringUtils.hideString` from depitropov-commons
   (`import static dev.depitropov.commons.DEStringUtils.hideString;`). `hideString(value)` shows one
   character at each end, `hideString(value, n)` shows `n`; the output is
   `<first n>...<length>...<last n>`. Use it only when it is needed.
9. **Cost.** An expensive argument at DEBUG or TRACE, or a log inside a tight loop, sits inside
   `if (log.isDebugEnabled())`.
10. **Large objects in Quarkus.** When `pom.xml` has `io.quarkus` dependencies, a large object (a
    request or response body, a top-level DTO) goes in as `kv("name", object)`
    (`import static io.quarkiverse.loggingjson.providers.KeyValueStructuredArgument.kv;`). It needs
    no `{}`, and the line above the call is
    `//noinspection LoggingPlaceholderCountMatchesArgumentCount`. Never use `kv()` for a simple value
    such as an id. Never serialize the object yourself: `kv()` does it.

    ```java
    //noinspection LoggingPlaceholderCountMatchesArgumentCount
    log.info("Processing transaction, transactionId: {}", transactionId, kv("transaction", transactionDto));
    ```
````

- [ ] **Step 3: Declare the gate**

In `plugins/orc-java-stack/orchestra.json`, append to `"gates"` after `comments`:

```json
    { "name": "logging", "phase": "finish", "kind": "agent", "skill": "review-logging", "files": "**/*.java" }
```

- [ ] **Step 4: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`. Also run `grep -nE 'cars\.ship|SC[A-Z][A-Za-z]*Utils|scValue' plugins/orc-java-stack/skills/review-logging/SKILL.md; echo "exit $?"`. Expected: `exit 1` (no match).

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-java-stack/skills/review-logging/SKILL.md plugins/orc-java-stack/orchestra.json
git commit -m "feat(java): logging gate with depitropov-commons masking (S68)

Source: java-logging, sc-java-logging. Spring scValue left for the ship.cars port.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The layout gate

**Files:**
- Create: `plugins/orc-java-stack/skills/review-layout/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`

**Interfaces:**
- Produces: gate `layout`, skill `review-layout`, phase `finish`. Declared before `spotless`, so it runs first (agents before tools in `finish`, S45).

- [ ] **Step 1: Read the sources in full** — `skills/java-formatting/SKILL.md`; in `skills/java-architecture/SKILL.md`, the `@UtilityClass` part.

- [ ] **Step 2: Write the skill**

The frame from "The agent gate skill shape", with:
- `name`: `review-layout`; description: "Reviews empty lines, static imports and helper classes in the changed Java code, then fixes them. An orchestra gate; dispatched by orchestra."
- Title: `Layout review`; `<gate>`: `layout`; `<paths>`: `'*.java'`; `<phase line>`: "Your fixes must not change behaviour."
- Not yours: "indentation, line length and import order (Spotless does them), comments, log messages."
- Rules:

````markdown
Empty lines (rules 1–5) apply to `log.*`, `return` and `throw` statements and to `try`, `catch` and
`finally` blocks, in all Java code.

1. **One empty line before** each `log.*`, `return` and `throw` statement, and **one after** each
   `log.*` statement. Consecutive log statements have an empty line between each pair.
2. **Method body.** When a `log.*` or `return` is the first statement of a method, keep the empty
   line after the method's opening `{`.
3. **Other blocks** (`if`, `for`, `while`, …): no empty line after the block's `{`, and no empty line
   before any closing `}`.
4. **A method body of one statement** (only a `return` or a `throw`) has no empty lines.
5. **`catch` and `finally`.** An empty line before `} catch` or `} finally`, and an empty line after
   its opening `{`. This wins over rule 3.

   ```java
   public String process(String id) {

     log.debug("Process called, id: {}", id);

     if (id == null) {
       log.warn("Null id received");
       return null;
     }

     try {
       doSomething(id);

     } catch (Exception e) {

       log.error("Failed to process, id: {}, error: {}", id, e.getMessage(), e);

       notifyFailure(id);
     }

     return transform(id);
   }

   public int getValue() {
     return value;
   }
   ```

6. **Enum constants are statically imported** in all Java code, production and tests: comparisons,
   `switch` cases, arguments, assertions, test data. When two enums in one file have a constant with
   the same name, keep the qualified form for those constants only.

   ```java
   import static com.example.order.OrderStatus.PENDING;

   if (order.getStatus() != PENDING) {   // not OrderStatus.PENDING
   ```

7. **Static imports for frequent static calls** (`assertThat`, `kv`, `Math.*`), unless the bare name
   loses its meaning (`of`, `min`, `EMPTY`): then keep the class name. Never a wildcard static import
   (`import static ….*`).
8. **A class with only static members** uses Lombok's `@UtilityClass` (it makes the class `final`,
   adds a private constructor that throws, and makes every member `static`), not a hand-written
   private constructor.
````

- [ ] **Step 3: Declare the gate**

Append to `"gates"` after `logging`:

```json
    { "name": "layout", "phase": "finish", "kind": "agent", "skill": "review-layout", "files": "**/*.java" }
```

- [ ] **Step 4: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-java-stack/skills/review-layout/SKILL.md plugins/orc-java-stack/orchestra.json
git commit -m "feat(java): layout gate for empty lines, static imports and helper classes (S68)

Source: java-formatting (empty lines, imports), java-architecture (@UtilityClass).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The testing conventions gate

**Files:**
- Create: `plugins/orc-java-stack/skills/review-testing/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`

**Interfaces:**
- Produces: gate `testing`, skill `review-testing`, phase `conventions-check`, selected only when a test file changes.

- [ ] **Step 1: Read the source in full** — `skills/java-testing/SKILL.md`. Check the helper signatures in `~/Projects-other/depitropov-commons/commons-test/src/main/java/dev/depitropov/commons/test/DETestErrorHandlingUtils.java`.

- [ ] **Step 2: Write the skill**

The frame from "The agent gate skill shape", with:
- `name`: `review-testing`; description: "Reviews the style of the changed Java tests against the testing conventions, then fixes them. An orchestra gate; dispatched by orchestra."
- Title: `Testing conventions review`; `<gate>`: `testing`; `<paths>`: `'*Test.java' '*IT.java'`; `<phase line>`: empty.
- Not yours: "whether a test exists and can fail (logic-review owns that), static imports of enum constants (the layout gate), comments."
- Rules:

````markdown
1. **AssertJ.** When the project has AssertJ, assert with `assertThat(actual).isEqualTo(expected)`,
   not JUnit's `assertEquals`. For JSON, use `assertThatJson` (json-unit) when the project has it.
2. **Business errors.** Assert a `BusinessRuleException` with `assertBusinessRuleException` from
   `dev.depitropov.commons.test.DETestErrorHandlingUtils`, never with
   `assertThrows(BusinessRuleException.class, …)`:

   ```java
   assertBusinessRuleException(() -> service.call(), BAD_REQUEST_GENERAL);
   assertBusinessRuleException(() -> service.call(), BAD_REQUEST_GENERAL, "Expected error message");
   assertBusinessRuleException(() -> service.call(id), BAD_REQUEST_GENERAL, "Error, itemId: %s", id);
   assertBusinessRuleException(() -> service.call(), BAD_REQUEST_GENERAL,
       message -> assertThat(message).contains("partial text"));
   ```

3. **Errors at the HTTP edge.** There the exception is already an `ErrorDto` body, so there is
   nothing to catch. Assert the body string with `assertErrorDto(body, BAD_GATEWAY_GENERAL, "Upstream service unavailable")`
   from the same class; an empty message skips the details check. Assert the HTTP status apart, with
   the test client.
4. **`assertSoftly` only for four or more** consecutive related assertions. Three or fewer stay plain
   `assertThat`.
5. **Inside `assertSoftly`, only assertions.** Act and arrange before the block. Do not mix a plain
   `assertThat` into the block: its failure skips the remaining soft checks. Check an intermediate
   object with `isNotNull()` before the block, when the block reads through it
   (`result.getLocation().getStreet()`): a null inside the block throws instead of reporting.
6. **Repeated assertion blocks become a helper.** When the same two or more assertions on one subject
   appear in several tests, extract a private `assert<What>` method, with parameters for the values
   that change between tests.
7. **Input variants go in one parameterized test.** The same check for null, empty and blank input is
   one `@ParameterizedTest` with `@NullAndEmptySource`, `@ValueSource(strings = {"   "})` or
   `@MethodSource`, not one method per value.
8. **Names and order.** A test name says the behaviour (`shouldThrowWhenUserIsNull`). The body is in
   arrange, act, assert order.
````

- [ ] **Step 3: Declare the gate**

Append to `"gates"`, before `comments` (declaration order follows the phases):

```json
    { "name": "testing", "phase": "conventions-check", "kind": "agent", "skill": "review-testing", "files": ["**/*Test.java", "**/*IT.java"] }
```

- [ ] **Step 4: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`. Also run `grep -nE 'cars\.ship|SC[A-Z][A-Za-z]*Utils' plugins/orc-java-stack/skills/review-testing/SKILL.md; echo "exit $?"`. Expected: `exit 1`.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-java-stack/skills/review-testing/SKILL.md plugins/orc-java-stack/orchestra.json
git commit -m "feat(java): testing conventions gate with depitropov-commons assertions (S68)

Source: java-testing. General principles (TDD, coverage, e2e) left to logic-review or dropped.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The ops gate

**Files:**
- Create: `plugins/orc-java-stack/skills/review-ops/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`

**Interfaces:**
- Consumes: `files` as a list (Task 1).
- Produces: gate `ops`, skill `review-ops`, phase `implementation-check`, selected by a Java or a SQL change.

- [ ] **Step 1: Read the sources in full** — `skills/java-ops/SKILL.md`; in `skills/java-style/SKILL.md`, "Null and Empty Checks"; `skills/java-review/SKILL.md`.

- [ ] **Step 2: Write the skill**

The frame from "The agent gate skill shape", with:
- `name`: `review-ops`; description: "Reviews exception handling, argument checks and database migrations in the changed code, then fixes them. An orchestra gate; dispatched by orchestra."
- Title: `Ops review`; `<gate>`: `ops`; `<paths>`: `'*.java' '*.sql'`; `<phase line>`: empty.
- Not yours: "log statements (the logging gate), whether the behaviour is right (logic-review), comments."
- Rules:

````markdown
1. **Wrapping keeps the cause.** A caught exception that is wrapped goes in as the cause:
   `throw new ProcessingException("Failed to process order, orderId: " + id, e);`
2. **No swallowed exception.** A `catch` handles the exception, wraps it, or rethrows it. An empty
   `catch`, or one that only calls `printStackTrace()`, is a finding.
3. **No exceptions for normal control flow.**
4. **Catch the specific type.** Catch `Exception` only at a boundary that must not fail (a scheduler
   loop, a message listener), and say why on that line.
5. **Checked or unchecked.** A checked exception only when the caller can recover. An unchecked one
   for programming errors and states nobody can recover from.
6. **The message names the context:** the bad value, the id, the operation.
7. **A String argument is checked for blank, not only for null.** An empty or blank string is almost
   always as invalid as null. Check with `isNotBlank`, and with `ErrorUtils.isValidArgument` from
   `dev.depitropov.commons.errors` when the project uses it:

   ```java
   isValidArgument(externalId != null, "External ID cannot be null or empty");     // bad: accepts "" and "   "
   isValidArgument(isNotBlank(externalId), "External ID cannot be null or empty"); // good
   ```

   Trim on purpose, one way per flow:
   - normalize at the boundary: `trimToNull(value)` once on entry, check that it is not null, and pass
     only the trimmed value down; or
   - check and trim at use: `isNotBlank(value)` on entry, `trimToEmpty(value)` where it is used.
8. **Null and empty checks use Commons Lang, by meaning.** For null-or-blank strings:
   `StringUtils.isBlank` / `isNotBlank`, not `s == null || s.isBlank()`. For null-or-empty strings,
   collections, maps and arrays: `ObjectUtils.isEmpty` / `isNotEmpty`, not `x == null || x.isEmpty()`.
   `ObjectUtils.isEmpty("   ")` is false: never use it where blank is meant. Import them statically.
9. **One `CREATE INDEX CONCURRENTLY` per Flyway migration file, with `IF NOT EXISTS`.** PostgreSQL
   cannot run `CREATE INDEX CONCURRENTLY` in a transaction, so such a migration runs without one. If a
   later statement in the same file fails, the earlier ones stay applied, and the migration needs a
   manual repair. `IF NOT EXISTS` lets a retried migration pass an index that already exists.

   ```sql
   -- V220__add_order_customer_id_idx.sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS order_customer_id_idx ON orders (customer_id, id DESC);
   ```
````

- [ ] **Step 3: Declare the gate**

Append to `"gates"`, first in the list:

```json
    { "name": "ops", "phase": "implementation-check", "kind": "agent", "skill": "review-ops", "files": ["**/*.java", "**/*.sql"] }
```

- [ ] **Step 4: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-java-stack/skills/review-ops/SKILL.md plugins/orc-java-stack/orchestra.json
git commit -m "feat(java): ops gate for exceptions, argument checks and migrations (S68)

Source: java-ops, java-style (null and empty checks), java-review. The security, concurrency and
documentation lists are dropped.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Spotless tool gate and its fix guide

**Files:**
- Create: `plugins/orc-java-stack/skills/fix-spotless/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`
- Test: `test/orc-java-stack/spotless-gate.test.js`

**Interfaces:**
- Consumes: the commit after a green tool run (Task 1).
- Produces: gate `spotless`, `kind: tool`, `fix: fixer`, guide `fix-spotless`, `max_rounds: 1`.

- [ ] **Step 1: Read the source in full** — `skills/spotless-maven-setup/SKILL.md`.

- [ ] **Step 2: Write the failing test**

The gate's command must exit 0 and do nothing when the project has no Spotless. The test runs the
declared command, with `./mvnw` replaced by a stub that records it ran.

`test/orc-java-stack/spotless-gate.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DECL = path.join(__dirname, '../../plugins/orc-java-stack/orchestra.json');
const run = () => JSON.parse(fs.readFileSync(DECL, 'utf8')).gates.find(g => g.name === 'spotless').run;

function project(pom) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotless-'));
  fs.writeFileSync(path.join(dir, 'mvnw'), '#!/bin/sh\necho "$@" > ran\n', { mode: 0o755 });
  if (pom !== null) fs.writeFileSync(path.join(dir, 'pom.xml'), pom);
  return dir;
}
const exec = dir => spawnSync(run(), { cwd: dir, shell: true, encoding: 'utf8' });

test('spotless runs spotless:apply when the pom has the plugin', () => {
  const dir = project('<plugin><artifactId>spotless-maven-plugin</artifactId></plugin>');
  assert.equal(exec(dir).status, 0);
  assert.match(fs.readFileSync(path.join(dir, 'ran'), 'utf8'), /spotless:apply/);
});

test('spotless passes and does nothing without the plugin, or without a pom', () => {
  for (const pom of ['<project></project>', null]) {
    const dir = project(pom);
    assert.equal(exec(dir).status, 0);
    assert.ok(!fs.existsSync(path.join(dir, 'ran')));
  }
});
```

Run: `node --test test/orc-java-stack/spotless-gate.test.js`
Expected: FAIL: `Cannot read properties of undefined (reading 'run')`.

- [ ] **Step 3: Declare the gate**

Append to `"gates"`, last in the list:

```json
    { "name": "spotless", "phase": "finish", "kind": "tool", "files": "**/*.java",
      "run": "if grep -q spotless-maven-plugin pom.xml 2>/dev/null; then ./mvnw -B spotless:apply; fi",
      "fix": "fixer", "guide": "fix-spotless", "max_rounds": 1 }
```

- [ ] **Step 4: Write the fix guide**

`plugins/orc-java-stack/skills/fix-spotless/SKILL.md`:

```markdown
---
name: fix-spotless
description: How to read a failed `spotless:apply` in a Maven project. A fix guide for the orchestra fixer.
---

# Fix Spotless

`spotless:apply` formats the code; it does not fail on unformatted code. When it fails, the cause is
either a Java syntax error or a broken Spotless set-up in the `pom.xml`.

1. A Java parse error names a file and a line: fix the syntax in that file.
2. Every other failure is the set-up. Do not change any `pom.xml`: the fixer never changes a tool's
   configuration. Find the case below, and write the result as `failed` with the case letter and its
   fix in `reason`, so the human can fix the set-up.

| Case | Error | Cause | Fix for the human |
|---|---|---|---|
| A | `No plugin found for prefix 'spotless'`, one module | No `<plugin>` block, or it is outside `<build>` | Add the plugin to `<build><pluginManagement>` |
| B | The prefix fails on a recursive run, every module `SKIPPED`; `-N` or `-pl` works | The first reactor module (often a `bom` with `packaging=pom`) has no `<parent>`, so it does not inherit `pluginManagement` | Copy the version properties and the full plugin block into that module's pom, with a comment that says why |
| C | `Spotless plugin absent from the project: <module>` | The module does not inherit or activate the plugin | As B for that module, or give it the shared parent |
| D | A `spotless-maven-plugin.version` property, but no plugin | A cherry-pick carried only the version bump | Add the plugin block |
| E | `verify` is green, but Spotless never ran | The `<executions>` block is only in `pluginManagement`, which does not activate it | Add the executions block to the active `<build><plugins>` of the parent pom |
```

- [ ] **Step 5: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-java-stack/skills/fix-spotless/SKILL.md plugins/orc-java-stack/orchestra.json test/orc-java-stack/spotless-gate.test.js
git commit -m "feat(java): Spotless tool gate, skipped without the plugin; gotchas as fix guide (S68)

Source: spotless-maven-setup (gotchas A-E). Set-up, hooks and revalidation are dropped.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Records, inventory, `PORT-TO-SC.md` and versions

**Files:**
- Modify: `docs/TENSIONS.md` (row S68; the research list in the header gets "R6 coder guidance")
- Modify: `docs/DECISIONS.md` (entry S68)
- Modify: `docs/DESIGN.md` §10 (the gate table)
- Modify: `docs/PORTING.md` (the java-stack section)
- Create: `PORT-TO-SC.md`; Modify: `.gitignore`
- Modify: `plugins/orchestra/plugin.json`, `plugins/orchestra/.claude-plugin/plugin.json`, `plugins/orc-java-stack/plugin.json`, `plugins/orc-java-stack/.claude-plugin/plugin.json` (version `0.9.0`)
- Add (written earlier, still uncommitted): `docs/research/R6-coder-guidance.md`, `docs/follow-ups/first-iteration.txt`

- [ ] **Step 1: Row S68 in `docs/TENSIONS.md`**, after S67:

```markdown
| S68 | The Java port (plan 4), after R6. (1) Write time stays lean: `code-guide` holds only test-command facts; no `plan-guide`; no new lines in the orchestra `code` or `plan` skills. Generic principles (SOLID, Clean Architecture, patterns) and personas go nowhere. (2) Gates: ops (implementation-check), testing (conventions-check), comments, logging, layout, Spotless (finish). Each holds numbered rules; a finding cites the rule and `file:line`; the project's code wins. (3) No structure gate: clean-code comes later at workflow level. (4) The personal repo names depitropov-commons helpers where java-stack named ship.cars ones; this changes S3 for those rules. `PORT-TO-SC.md` (git-ignored) says how to swap them back. (5) `files` may be a list; a green tool gate commits its changes. Full record: `docs/DECISIONS.md`. | Grilling, R6, user decision |
```

In the header, change the research list `… R5 reviewer context` to `… R5 reviewer context, R6 coder guidance`.

- [ ] **Step 2: Entry S68 in `docs/DECISIONS.md`**, at the end, in the file's format:

```markdown
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
  precision). The grilling of 2026-10-09, Q1–Q18.
- **Decision:** `code-guide` = test-command facts; no `plan-guide`; gates ops, testing, comments,
  logging, layout and Spotless; no structure gate (clean-code later, at workflow level); dropped:
  SOLID, Clean Architecture, the pattern list, the performance, security, concurrency and
  documentation lists, member order, the entities, converters and DTOs gates,
  `java-maven-upgrade`, the `java` index, the Spotless set-up and hooks, Spring `scValue`. The
  personal repo names depitropov-commons helpers (`DEStringUtils.hideString`,
  `DETestErrorHandlingUtils`, `ErrorUtils.isValidArgument`).
- **Cost and risk:** each agent gate costs a subagent per run (follow-up 4 measures whether each one
  earns it). With no structure gate until clean-code arrives, over-engineering is caught only by
  logic-review and plan-conformance. A rule from a house style may not fit another project: the
  "project's code wins" line is the guard. The ship.cars port must swap the helper names back.
- **Where it lives:** `plugins/orc-java-stack/orchestra.json`, `plugins/orc-java-stack/skills/`,
  `plugins/orchestra/lib/gates.js`, `plugins/orchestra/lib/runner.js`, `PORT-TO-SC.md`.
```

- [ ] **Step 3: `docs/DESIGN.md` §10.** Replace the paragraph "Candidate gates, one skill each:" and its table with:

```markdown
Gates, one skill each (S68):

| Phase | Gates |
|---|---|
| `implementation-check` | ops (exceptions, argument checks, migrations) |
| `conventions-check` | testing (test style) |
| `finish` | comments, logging, layout (agents); Spotless (tool, skipped when the pom has no plugin) |

The `guides` row becomes: "`code-guide` only: test-command facts (S68). No plan guide."
```

Keep the sentence on crap4java and mutate4java. Remove "The final list is decided in the build plan."

- [ ] **Step 4: `docs/PORTING.md`, java-stack section.** Read the source files again where a row is unclear. Set each row to the statuses below, with "Where now" naming the skill and rule number. Fix every row that says `planned (plan 4)` or `lost`:

| Source file | Ported to | Dropped (reason) |
|---|---|---|
| `README.md` | — | as now |
| `agents/java-code-reviewer.md` | the six gates | the 8-area list, persona, severity output (S68, S14) |
| `agents/sc-java-logging.md` | `review-logging` | review-only mode (§6.1) |
| `skills/java/SKILL.md` | — | the whole index (S68) |
| `skills/java-architecture/SKILL.md` | `review-layout` 8 (`@UtilityClass`) | Clean Architecture, SOLID, interfaces at boundaries, pattern list, DRY/encapsulate, performance, DTO annotations, `ObjectUtils` line (S68) |
| `skills/java-style/SKILL.md` | `review-ops` 8 (Commons Lang checks) | naming, member order, method size (S68: clean-code later) |
| `skills/java-review/SKILL.md` | its checklist items, spread over the gates | principles, "code generation best practices", performance, magic numbers (S68) |
| `skills/java-comments/SKILL.md` + `evals/` | `review-comments` 1–8, sweeps; `test/orc-java-stack/comments-grep.test.js` | `evals/cases.md` (judgment cases, run by hand; ship.cars text) |
| `skills/java-logging/SKILL.md` | `review-logging` 1–10 | Spring `scValue` (ship.cars port, `PORT-TO-SC.md`); empty lines (moved to `review-layout`) |
| `skills/java-formatting/SKILL.md` | `review-layout` 1–7 | indentation and line length (Spotless); comments section (`review-comments`) |
| `skills/java-testing/SKILL.md` | `review-testing` 1–8; Surefire results in `code-guide` 4 | general principles, TDD, e2e, "all services have tests" (logic-review); enum imports (`review-layout` 6) |
| `skills/java-ops/SKILL.md` | `review-ops` 1–7, 9 | custom exception hierarchies, security list, concurrency list, documentation list (conflicts with comments) (S68) |
| `skills/java-maven/SKILL.md` | `code-guide` 1–4 | log-to-file workflow (in the `code` skill), Spotless commands (gate), dependency management (S68) |
| `skills/java-maven-upgrade/` | — | all (S68: not part of a task run) |
| `skills/spotless-maven-setup/` | Spotless gate; `fix-spotless` (gotchas A–E) | set-up, hooks, revalidation (S68); `commit-msg` (S3) |

In "Top losses (java-stack)": items 2, 5 (the DTO rule is dropped by S68), 6, 7 and 8 are closed by S68; say so on each. Items 1, 3, 4, 9 and 10 stay, updated: 1 (the comments evals now run; other gates have none), 4 (migration rules are at review time by S68).

- [ ] **Step 5: `PORT-TO-SC.md`** at the repo root, and add the line `PORT-TO-SC.md` to `.gitignore`.

```markdown
# Porting orchestra back to ship.cars

This file is git-ignored. It lists what the personal repo changed from java-stack, and what to swap
back when the commits are copied to the ship.cars repo (S3, S68).

## Helper names

| Personal (depitropov-commons) | ship.cars | Files |
|---|---|---|
| `dev.depitropov.commons.DEStringUtils.hideString` | `cars.ship.commons.SCStringUtils.hideString` | `plugins/orc-java-stack/skills/review-logging/SKILL.md` rule 8 |
| `dev.depitropov.commons.test.DETestErrorHandlingUtils.assertBusinessRuleException` | `cars.ship.commons.test.SCTestErrorHandlingUtils.assertBusinessRuleException` | `review-testing` rule 2 |
| `DETestErrorHandlingUtils.assertErrorDto` | `SCTestErrorHandlingUtils.assertErrorDto` | `review-testing` rule 3 |
| `dev.depitropov.commons.errors.ErrorUtils.isValidArgument` | the ship.cars `isValidArgument` (check its class in `commons`) | `review-ops` rule 7 |
| `dev.depitropov.commons.errors.GeneralErrorCode` | `cars.ship.commons.errors.GeneralErrorCode` | `review-testing` rules 2–3 examples |

Search for leftovers: `grep -rn 'depitropov\|DEStringUtils\|DETest' plugins/`.

## Content to restore

- **Spring `scValue`** in `review-logging`, as a rule 11 next to the Quarkus `kv()` rule. Source:
  java-stack `skills/java-logging/SKILL.md`, "Spring Boot JSON Data Logging": the
  `import static cars.ship.commons.spring.utils.SCStructuredArgument.scValue;`, the `{}` placeholder
  it needs (unlike `kv()`), the third argument shown in the message, "only for large objects", "never
  serialize yourself", and the framework detection (`spring-boot` in `pom.xml`).
- **The comments eval fixtures** may go back to the real posting-backend lines (`LITE-` keys) in
  `test/orc-java-stack/fixtures/comments/`.

## Known ship.cars conflicts

- The `commit-msg` hook in ship.cars repos needs a JIRA key. orchestra's commits (`feat: …`,
  `fix(<gate>): …`, `orchestra: …`) do not have one. Decide before the first ship.cars run.
- ship.cars builds need `-s .mvn/settings.xml`. The build line in `orc-java-stack/orchestra.json` and
  the Spotless gate's command do not add it.
```

- [ ] **Step 6: Versions.** Set `"version": "0.9.0"` in both manifests of `orchestra` and of `orc-java-stack`.

- [ ] **Step 7: Run all tests**

Run: `npm test > tmp/test.log 2>&1; echo "exit $?"`, then read the end of `tmp/test.log`.
Expected: `exit 0`. Then `git check-ignore PORT-TO-SC.md`. Expected: it prints `PORT-TO-SC.md`.

- [ ] **Step 8: Commit**

```bash
git add docs/TENSIONS.md docs/DECISIONS.md docs/DESIGN.md docs/PORTING.md .gitignore \
  docs/research/R6-coder-guidance.md docs/follow-ups/first-iteration.txt \
  docs/superpowers/plans/2026-10-09-java-stack-port.md \
  plugins/orchestra/plugin.json plugins/orchestra/.claude-plugin/plugin.json \
  plugins/orc-java-stack/plugin.json plugins/orc-java-stack/.claude-plugin/plugin.json
git commit -m "docs: S68 — the Java port: lean coder, stack rules in reviewers; R6; bump to 0.9.0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: One run on the sample repo (the human)

**Files:** none in this repo.

- [ ] **Step 1:** In `~/Projects-other/orchestra-sample-java`, check the branch first: `test "$(git branch --show-current)" = main`. Pick a task that adds a service method with a log statement, a comment, a test with four or more assertions, and a migration with an index.
- [ ] **Step 2:** Run it with orchestra. In the report, check: each of the six gates is selected or skipped with a reason; each findings file names rule numbers and `file:line`; no gate changes behaviour in `finish`; Spotless is skipped if the sample pom has no plugin.
- [ ] **Step 3:** Write what you see as run feedback. Gates with mostly noise feed follow-up 4.
