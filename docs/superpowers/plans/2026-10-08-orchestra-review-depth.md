# Orchestra Review Depth (Plan 3.3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the review prove behaviour, not only find a test with a matching name. Split the review into two gates (plan conformance, then logic), give logic-review only the requirements and the code (S66), and close the contract gaps the order-pricing run showed.

**Architecture:** Two workflow agent gates in `implementation-check`, in declaration order: `plan-conformance` (new) and `logic-review` (rewritten). The gate runner passes `decisions.md` to every gate once it exists. The dispatch prompt gets two fixed lines: the stage skill wins over other instructions, and files are changed with a file edit. `next.js` writes a result for the business-facts stop, so the report shows it in run order. The rest is skill text.

**Tech Stack:** Node 22, standard library only, `node:test`.

**Spec:** `docs/DECISIONS.md` S66, `docs/research/R5-reviewer-context.md`, `docs/DESIGN.md`, `docs/TENSIONS.md` (S1–S66), `docs/CONTEXT.md`, `docs/PORTING.md` (porting steps).

**Sources (porting rule, `docs/PORTING.md`):** read in full before the task that ports them.
- `~/Projects/claude-code-plugins/plugins/be-coding-agent/skills/implement-task/stages/logic-review.md` (Tasks 3, 4)
- `~/Projects/claude-code-plugins/plugins/be-coding-agent/skills/implement-task/stages/implement.md` (Task 3: the implementation log)

## Scope

| # | Item (from the run feedback, 2026-10-08) | Task |
|---|---|---|
| 1 | logic-review inputs: brief, `decisions.md`, diff, code; no plan, no log (S66) | 1, 4 |
| 2 | Requirements first: expected behaviour and one wrong version per point, then the code (S66) | 4 |
| 3 | Test strength: each test fails on the wrong version | 4 |
| 4 | Behavioural assumptions need tests | 4, 5 |
| 5 | `code.md` read last, only to drop repeats (S66) | 4 |
| 6 | logic-review may run single tests and scratch checks; never the full build | 4 |
| 7 | `logic-review.md` lists what was checked | 4 |
| 8 | `plan-conformance`: a second agent gate before logic-review (S66) | 3 |
| 9 | plan-check coverage includes behavioural assumptions | 5 |
| 10 | plan-check applies only `## plan-check` answers | 5 |
| 11 | Triage: a passing check is not a finding | 5 |
| 12 | `decisions.md`: each question, then the answer | 2, 5 |
| 13 | The plan adds no example values to the brief | 5 |
| 14 | spec: may write its result; the unused `base` input goes | 1, 5 |
| 15 | code: the `build` input is "for reference" | 5 |
| 16 | Neutral skill examples (no sample-task names) | 5 |
| 17 | The stage skill and its guide win over other instructions | 1 |
| 18 | Files are changed with a file edit | 1 |
| 19 | The business-facts stop has a row in the report | 2 |

Not in this plan: conventions gates and `clean` in the build (plan 4); a `business_facts` JSON field, plugin discovery without manifests, notes outside the branch (rejected).

## Global Constraints

- Node, standard library only (S11).
- `SKILL.md` frontmatter has only `name` and `description`. Skill text names actions, never tool names: no `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p`, `Bash`, `Edit`, `Write` (S33).
- Both manifests of each plugin have the same version (S33).
- No skill pipes a test or build command (S60).
- A port reads the source in full and updates `docs/PORTING.md` in the same commit (porting rules).
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A gate gets `decisions` while its own question is still open.** `decisions.md` with only `## business-facts` must not restart a logic-review that stopped on Decide. Only a new `## logic-review` section does. Test in Task 1.
2. **The business-facts row before any answer.** The report of the stop must show the row as `decide`, and after the answer as `ok`, both between `spec` and `plan`. Test in Task 2.
3. **A run with no business facts.** No business-facts row, no file. Test in Task 2.
4. **Gate order.** `plan-conformance` runs before `logic-review`, and a Decide in plan-conformance stops the phase before logic-review starts. Test in Task 3.
5. **The prompt lines must name no tool.** The new prompt lines describe actions only. Test in Task 1.

---

### Task 1: Engine — decisions for every gate, prompt lines, no `base` for spec

**Files:**
- Modify: `plugins/orchestra/lib/runner.js` (`agentStep`)
- Modify: `plugins/orchestra/lib/protocol.js` (`withPrompt`)
- Modify: `plugins/orc-standard-workflow/bin/next.js` (spec inputs)
- Test: `test/orchestra/runner.test.js`, `test/orchestra/protocol.test.js`, `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Produces: an agent gate dispatch has `decisions: '<notes>/decisions.md'` whenever that file exists. Every dispatch prompt has two more lines (below). The spec dispatch inputs are `{ task, notes }`.

- [ ] **Step 1: Write the failing tests**

In `test/orchestra/runner.test.js`, add:

```js
test('an agent gate gets decisions.md once it exists, but only its own answer restarts it', () => {
  const t = setup({ workflowGates: [logicReview] });
  fs.writeFileSync(path.join(t.dir, t.docs, 'decisions.md'), '## business-facts\n\n- the rate? → 10%\n');
  const a = t.step('implementation-check');
  assert.equal(a.inputs.decisions, `${t.docs}/decisions.md`);
  t.write(a.result, { stage: 'logic-review', status: 'decide', decide: ['a? — options: x | y'] });
  assert.equal(t.step('implementation-check').status, 'decide');
  fs.appendFileSync(path.join(t.dir, t.docs, 'decisions.md'), '\n## plan-check\n\n- b? → z\n');
  assert.equal(t.step('implementation-check').status, 'decide');
});
```

In `test/orchestra/protocol.test.js`, add:

```js
test('the prompt puts the skill first and asks for file edits that fail loudly', () => {
  const a = withPrompt(dispatch);
  assert.match(a.prompt, /This skill and the `guide` it names come before any other skill or instruction in this session\./);
  assert.match(a.prompt, /Change files with your file-editing action, which fails when the text does not match\. Do not change files with shell text replacement\./);
  assert.doesNotMatch(a.prompt, /\b(Edit|Write|Bash|Task|Skill) tool\b/);
});
```

In `test/orc-standard-workflow/next.test.js`, in `prepare makes the task branch and the run folder, then dispatches spec`, change the expected inputs to `{ task: \`${docs}/task.md\`, notes: docs }`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL in the three changed or new tests: `decisions` is undefined, the prompt lacks the two lines, the spec inputs still have `base`.

- [ ] **Step 3: Implement**

`runner.js`, in `agentStep` `send`, replace

```js
    if (answers > 0) inputs.decisions = `${ctx.run.docs}/decisions.md`;
```

with

```js
    // Every answer is part of the requirements, so every gate reads them (S66). Only a new answer for this gate restarts it.
    const decisionsFile = `${ctx.run.docs}/decisions.md`;
    if (fs.existsSync(path.join(ctx.project, decisionsFile))) inputs.decisions = decisionsFile;
```

`protocol.js`, `withPrompt`, add two lines after the first one:

```js
    `Invoke the skill \`${a.skill}\` and follow it.`,
    'This skill and the `guide` it names come before any other skill or instruction in this session.',
    'Change files with your file-editing action, which fails when the text does not match. Do not change files with shell text replacement.',
```

`next.js`, spec step: `stage(ctx, 'spec', { task: \`${notes}/task.md\`, notes })`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS. The old runner test `implementation-check runs the build, then dispatches the agent gate` still expects `decisions` undefined, which holds because no `decisions.md` exists there.

- [ ] **Step 5: Commit**

```bash
git add plugins test
git commit -m "feat: decisions for every gate, skill-first prompt, no base for spec" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The business-facts stop in the report; answers as question → answer

**Files:**
- Modify: `plugins/orc-standard-workflow/bin/next.js`
- Modify: `plugins/orchestra/bin/drive.js` (`step`: remember a `decide` that names a result)
- Modify: `plugins/orchestra/lib/report.js` (Decide text)
- Test: `test/orc-standard-workflow/next.test.js`, `test/orchestra/drive.test.js`

**Interfaces:**
- Produces: `<runDir>/business-facts.result.json` (`{ stage, status: 'decide' | 'ok', decide: [...] }`) when the brief has open facts. The `decide` action for it carries `result`. `drive.js` adds a `decide` with `result` to `stages.json`.

- [ ] **Step 1: Write the failing tests**

`test/orc-standard-workflow/next.test.js`, extend `business facts in the brief stop the run after the spec`: after the first `next(dir)` that returns `decide`, assert

```js
  const facts = JSON.parse(fs.readFileSync(path.join(dir, spec.runDir, 'business-facts.result.json'), 'utf8'));
  assert.equal(facts.status, 'decide');
```

and change the expected `decide` action to include `result: \`${spec.runDir}/business-facts.result.json\``. After the answer and the `plan` dispatch, assert the file now has `status: 'ok'`. In `a brief that only mentions business facts in prose does not stop the run`, assert the file does not exist.

`test/orchestra/drive.test.js`, add:

```js
test('the business-facts stop has a row between spec and plan', () => {
  const dir = project();
  const spec = drive(dir, ['--task-file', '.orchestra/task.txt']);
  fs.writeFileSync(path.join(dir, 'docs/runs/task/add-a-discount/brief.md'), '- business fact: the rate — options: 5% | 10%\n');
  writeJson(path.join(dir, spec.result), { stage: 'spec', status: 'ok' });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  let report = fs.readFileSync(path.join(dir, stop.report), 'utf8');
  assert.match(report, /\| business-facts \| decide \|/);
  assert.match(report, /- <question> → <your answer>/);
  fs.writeFileSync(path.join(dir, 'docs/runs/task/add-a-discount/decisions.md'), '## business-facts\n\n- business fact: the rate — options: 5% | 10% → 10%\n');
  const plan = drive(dir, [], { resume: true });
  assert.equal(plan.skill, 'orc-standard-workflow:plan');
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL: no result file, no `result` in the action, no report row, no answer format line.

- [ ] **Step 3: Implement**

`next.js`, replace the business-facts block with:

```js
  const facts = openFacts(path.join(project, run.spec));
  if (facts.length) {
    // A result file gives the stop its own row in the report, in run order.
    const result = `${runDir}/business-facts.result.json`;
    const answered = countAnswers(path.join(project, notes), 'business-facts') > 0;
    writeJson(path.join(project, result), { stage: 'business-facts', status: answered ? 'ok' : 'decide', decide: facts });
    if (!answered) return { action: 'decide', gate: 'business-facts', questions: facts, result, runDir };
  }
```

`drive.js`, `step`: before `if (a.action !== 'phase') return finish(project, a, resolved);` add

```js
    if (a.action === 'decide' && a.result) remember(project, a);
```

`report.js`, Decide text: after the sentence `Text added to an old section is not read as an answer.` add, as its own line before the questions:

```js
      'Write one line per question: `- <question> → <your answer>`.', '',
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins test
git commit -m "feat: the business-facts stop has a report row; answers as question → answer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The plan-conformance gate

**Source:** be-coding-agent `stages/logic-review.md` (Review steps 1 "named tests the plan promised exist", 2 "Completeness", 3 "Deviations") and `stages/implement.md` (the implementation log). Read both in full first.

**Files:**
- Create: `plugins/orc-standard-workflow/skills/plan-conformance/SKILL.md`
- Modify: `plugins/orc-standard-workflow/orchestra.json`
- Test: `test/packaging.test.js`, `test/orchestra/drive.test.js`

**Interfaces:**
- Produces: workflow gate `plan-conformance` (agent, `implementation-check`, `always: true`), declared before `logic-review`. Result `implementation-check.plan-conformance.result.json` in the standard result format.

- [ ] **Step 1: Write the failing tests**

`test/packaging.test.js`: add `'orc-standard-workflow/plan-conformance'` to `REFERENCED`, and add it to the list in `every judging skill takes its triage from orchestra:triage`.

`test/orchestra/drive.test.js`: add a helper after `toCode`:

```js
// Passes plan-conformance and returns the logic-review dispatch.
function toReview(dir) {
  const pc = drive(dir);
  assert.equal(pc.skill, 'orc-standard-workflow:plan-conformance');
  writeJson(path.join(dir, pc.result), { stage: 'plan-conformance', status: 'ok' });
  return drive(dir);
}
```

Replace every `const review = drive(dir);` with `const review = toReview(dir);`. In the order assertion of `a run goes from task to done…`, add `'| implementation-check.plan-conformance |'` before `'| implementation-check.logic-review |'`. Add:

```js
test('a plan-conformance Decide stops the phase before logic-review', () => {
  const dir = project();
  const code = toCode(dir);
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  const pc = drive(dir);
  writeJson(path.join(dir, pc.result), { stage: 'plan-conformance', status: 'decide', decide: ['Task 2 changed the API — options: keep | revert'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.equal(stop.gate, 'plan-conformance');
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL: `missing skill orc-standard-workflow/plan-conformance`, and the drive tests get `logic-review` where they expect `plan-conformance`.

- [ ] **Step 3: Declare the gate**

`plugins/orc-standard-workflow/orchestra.json`, `gates`:

```json
    { "name": "plan-conformance", "phase": "implementation-check", "kind": "agent", "skill": "plan-conformance", "always": true },
    { "name": "logic-review", "phase": "implementation-check", "kind": "agent", "skill": "logic-review", "always": true }
```

- [ ] **Step 4: Write the skill**

````markdown
---
name: plan-conformance
description: Checks that the code of one orchestra run does what its plan promised — every task done, every named test present, no undeclared or out-of-scope change — and fixes what it can. An orchestra gate; dispatched by orchestra.
---

# Plan conformance

You check the change against the plan. You give no verdict on whether the code is correct: logic-review
does that, from the brief alone. You check only that the plan was carried out.

## Inputs

- `spec`: the brief.
- `base`: the commit before any work.
- `notes`: the run's notes folder. It holds `plan.md` and `implementation-log.md`. Your findings file
  goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Read `<notes>/plan.md`, `<notes>/implementation-log.md` and `decisions` if given.
2. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`. Read the
   changed files in full.
3. Check, and write down each check you made:
   - **Tasks done:** every task in the plan is in the code, complete. Nothing is stubbed, left as a
     placeholder, or skipped.
   - **Named tests:** every test that a task's Tests line names exists, with that class and method,
     and asserts the criterion the plan says it covers.
   - **Deviations:** every change in the diff that departs from the plan is declared, with its
     reason, under Deviations in the implementation log. An undeclared deviation is a finding.
   - **Scope:** every changed file belongs to a task. A change outside every task is a finding.
4. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
5. Write `<notes>/plan-conformance.md` in the triage notes format. Start with a section **Checked**
   that lists each check from step 3 and its outcome.
6. If there is an open Decide finding, stop here. Do not fix anything. Write the result with
   `"status": "decide"`.
7. Otherwise fix every Patch finding: add a missing named test, finish a stubbed task, or add a
   missing Deviations entry to the implementation log when the deviation is right. Run only the tests
   you touched, with no pipe that hides the exit code. Never run the full build: orchestra runs it.
   Commit once: `fix(plan-conformance): <summary>`. Do not stage files under `docs/runs/` or `tmp/`:
   orchestra commits the notes, including the implementation log.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "plan-conformance",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 1, "evaluate": 0, "noise": 0 },
  "evaluate": [],
  "files": ["<notes>/plan-conformance.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. Write `skipped` only when the diff changes no code.

## Permitted actions

Read the project. Edit code, tests and the implementation log. Run tests. Commit. Do not push. Do not
change branches. Do not ask the user; a question goes into `decide`.
````

- [ ] **Step 5: Update the inventory**

In `docs/PORTING.md`, `stages/logic-review.md` table: set "Completeness: every plan task done, nothing stubbed" and "Undeclared deviations from the plan" to `ported (S66, plan-conformance)`. Set "Read brief, plan, implementation log, diff, changed files in full" to `ported (S66: split — plan-conformance reads the plan and the log; logic-review reads the brief)`.

- [ ] **Step 6: Run all tests, commit**

Run: `npm test` — Expected: PASS.

```bash
git add plugins test docs/PORTING.md
git commit -m "feat(workflow): plan-conformance gate before logic-review (S66)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: logic-review from the requirements

**Source:** be-coding-agent `stages/logic-review.md`. Read it in full first. Port: test quality (tautological asserts, disabled tests, mocks of the thing under test, tests that pass without the change), correctness incl. races and transaction and error boundaries, `security` apart (triage carries this), the "not yours" list.

**Files:**
- Modify: `plugins/orc-standard-workflow/skills/logic-review/SKILL.md`
- Modify: `docs/PORTING.md`

- [ ] **Step 1: Rewrite the Inputs and Procedure**

Replace the description line with: `description: Reviews the code of one orchestra run against the brief alone — correctness, and a test for every criterion and behavioural assumption that fails on a wrong version — then fixes what it can. An orchestra gate; dispatched by orchestra.`

Replace `## Inputs` and `## Procedure` with:

````markdown
## Inputs

- `spec`: the brief. This is your answer key.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers. They are part of the requirements.

Read only the brief, `decisions`, the diff and the code. The plan, the implementation log and the
other review notes describe how the author saw the code; they would steer your judgement, so leave
them unread. `<notes>/code.md` is the one exception, and only in step 6.

## Procedure

1. **Requirements first, before any code.** From the brief and `decisions`, write a list:
   - each acceptance criterion, and each assumption in the brief that sets behaviour (null handling,
     where rounding happens, which limit is checked first);
   - for each one, the behaviour it requires, with one concrete input and its expected output;
   - for each one, one likely wrong version of the code: the wrong rounding mode, rounding at the
     wrong step, `<` for `<=`, a missing null check, the wrong order of two steps.
2. Get the change: `git diff <base> HEAD -- . ':(exclude)docs/runs' ':(exclude)tmp'`. Read the
   changed files in full. If nothing in the change concerns code or tests, write the result with
   `"status": "skipped"` and stop.
3. **Each point has a test, and the test can fail.** For each point of step 1, find the code that does
   it and the test that proves it. A test must fail on the wrong version from step 1: check its input
   and its expected value against that version. Findings:
   - a point with no code, or no test;
   - a test that passes on the wrong version (its input cannot tell them apart);
   - a test with an empty or self-confirming assert, a disabled test, a mock of the unit under test,
     or a test that passes without the change.
4. **Correctness.** Look for bugs in the changed code: wrong conditions, off-by-one, null handling,
   rounding, races, wrong transaction or error boundaries, security holes.
5. To check a claim, you may run a single test, or a small scratch check of a calculation. Never run
   the full build: orchestra built and tested this commit and builds again later. Never pipe a test
   command: the pipe hides the exit code.
6. Read `<notes>/code.md` now, and only to drop findings that repeat a recorded choice. A recorded
   choice that breaks a point of step 1 or causes a bug stays a finding.
7. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
8. Write `<notes>/logic-review.md` in the triage notes format. Start with a section **Checked**: the
   list from step 1, and for each point the test you found and whether it fails on the wrong version.
9. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
10. Otherwise fix every Patch finding and every answered Decide. A weak test gets an input that tells
    the right and the wrong version apart. Run only the tests you touched. Commit once:
    `fix(logic-review): <summary>`. orchestra commits `notes` itself: do not stage files under
    `docs/runs/` or `tmp/`. Do not review your own fixes again.

Not yours: naming, structure, comments, log statements, layout, and plan conformance. Other gates own
them.
````

Change the Result example's `evaluate` line to a neutral one: `"evaluate": ["LoanService.java:42 — a missing return date now throws; before it was ignored"]`.

- [ ] **Step 2: Update the inventory**

`docs/PORTING.md`, `stages/logic-review.md` table: "Test quality …" → `ported (S66)`; "Correctness: bugs, edges, races, transaction and error boundaries" → `ported`; "Not yours: …" → `ported`; "Patch: check it first, fix minimally" stays `ported (S64)`.

- [ ] **Step 3: Run all tests, commit**

Run: `npm test` — Expected: PASS (the packaging test checks the triage reference and the banned words).

```bash
git add plugins docs/PORTING.md
git commit -m "feat(workflow): logic-review works from the brief and proves each test can fail (S66)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Other skill text

**Files:** `plugins/orc-standard-workflow/skills/{plan-check,plan,spec,code}/SKILL.md`, `plugins/orchestra/skills/{triage,run}/SKILL.md`.

- [ ] **Step 1: plan-check**
  - In step 3, change **Coverage** to: `every acceptance criterion, and every assumption in the brief that sets behaviour (null handling, where rounding happens, which limit is checked first), is in at least one task's Tests line, with a named test.`
  - In step 2 (answers), change "write each answer into the documents first" to "write each answer from the `## plan-check` sections into the documents first. The `## business-facts` answers are already in the brief: the plan stage wrote them."

- [ ] **Step 2: triage**
  - In "Check the finding first", add at the end: `A check that passes is not a finding. List it in the notes under **Checked**, not in a bucket.`
  - In "The notes file", add a first section before **Found**: `0. **Checked**: each check you made, and its outcome.` Renumber the list.

- [ ] **Step 3: plan**
  - In Procedure step 2, after "write the value into the acceptance criterion it belongs to, as a fact", add: `Write only the value. Add no example inputs or outputs that the brief and the answer do not give.`

- [ ] **Step 4: spec**
  - Inputs: remove the `base` line.
  - Permitted actions: `Read the project. Write \`<notes>/brief.md\` and the result JSON. Do not change code. Do not commit. Do not ask the user.`
  - Rules: change the example `"then the price is reduced by the VIP rate"` to `"then the late fee is the daily fee times the days late"`.
  - Result example: change `"Rounding is half up to 2 decimals."` to `"A loan returned on the due date is not late."`.

- [ ] **Step 5: code**
  - Inputs: `- \`build\`: for reference only: the command that builds the project and runs all tests. orchestra runs it after you.`
  - Result example: change `"The 50.00 limit applies to the amount before rounding."` to `"The loan limit counts loans that are not yet returned."` and `"business fact: the VIP discount rate is a placeholder of 10%."` to `"business fact: the daily late fee is a placeholder of 0.50."` (keep the same meaning: one technical choice, one business-fact placeholder).

- [ ] **Step 6: run**
  - In the `decide` bullet, replace `add that new section yourself, with their words exactly` with `add that new section yourself: one line per question, \`- <question> → <their answer>\`, with the question copied from \`questions\` and the answer in their words exactly`.

- [ ] **Step 7: Check for leftover sample-task names**

Run: `grep -rn -E "PriceCalculator|VIP|50\.00|discount" plugins`
Expected: no output.

- [ ] **Step 8: Run all tests, commit**

Run: `npm test` — Expected: PASS.

```bash
git add plugins
git commit -m "feat: skill text from the run feedback — coverage of assumptions, checked lists, answers, neutral examples" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docs and versions

- [ ] **Step 1: `docs/DESIGN.md`**
  - §8.1, the table "The workflow's own gates": add a row before logic-review: `| \`plan-conformance\` | \`implementation-check\` | agent | Every plan task done, every named test present, no undeclared or out-of-scope change. Reads the plan and the implementation log. No correctness verdict (S66) |`. Change the logic-review row's job to: `Correctness, and a test for every criterion and behavioural assumption that fails on a wrong version. Reads the brief and \`decisions\` only, never the plan (S66)`.
  - §6.6 or §8.4: add one sentence: `Every agent gate gets \`decisions\` once the file exists; only a new section for that gate restarts it (S66).`
- [ ] **Step 2: Versions.** `0.7.0` → `0.8.0` in the six manifests; `orc-standard-workflow 0\.7\.0` → `0\.8\.0` in `test/orchestra/drive.test.js`.
- [ ] **Step 3: Run all tests, commit**

```bash
npm test
git add docs plugins test
git commit -m "docs: plan-conformance and logic-review in DESIGN; bump to 0.8.0" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: A run from another domain (manual)

- [ ] **Step 1:** `/plugin marketplace update depitropov-plugins`, then `/reload-plugins`. Expected: 0.8.0.
- [ ] **Step 2:** In `~/Projects-other/orchestra-sample-java`: `git status --porcelain` is empty; `git checkout main`.
- [ ] **Step 3:** Run:

```
orchestra run: Add library loans. A member can borrow a book for 14 days. A member may have at most a fixed number of open loans. Returning a book late costs a fee for each day late. Returning on the due date is not late. Reject a loan when the member is at the limit, and reject returning a book that is not on loan.
```

Expected: spec, then a `business-facts` stop asking for the loan limit and the daily fee (both missing on purpose). Answer in the chat, for example "limit 3, fee 0.25 per day". The driver writes `- <question> → <answer>` lines. Then plan, plan-check, code, the build, `plan-conformance`, `logic-review`, `done`.

- [ ] **Step 4:** Check `logic-review.md`: a **Checked** section lists each criterion and assumption with its test and whether the test fails on a wrong version (for example, "returned on the due date" against `<` versus `<=`). `plan-conformance.md` lists its checks. The report shows the `business-facts` row between `spec` and `plan`.
- [ ] **Step 5:** Record what did not behave as expected as a row under "Open (phase 1)" in `docs/TENSIONS.md`.

---

## Self-review notes

- **Coverage:** items 1–19 map to Tasks 1–5 (see Scope). Review Focus 1: Task 1. 2–3: Task 2. 4: Task 3. 5: Task 1.
- **Names:** `plan-conformance` (gate and skill), `business-facts.result.json`, the prompt lines, `toReview` (drive test helper) are each defined once.
- **Known risk:** logic-review can still open `plan.md`, because it is in the notes folder. The skill tells it to leave it unread; R5 says instructions reduce anchoring but do not remove it. Moving the plan out of reach would need a separate notes layout; not in this plan.
