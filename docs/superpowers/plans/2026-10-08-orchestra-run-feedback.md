# Orchestra Run Feedback (Plan 3.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the gaps the order-pricing run showed: stop for business facts right after the spec, keep the decision history, make answers hard to get wrong, never commit a user's files on resume, and never kill or repeat a long build.

**Architecture:** `next.js` gets one check in code after the spec: `business fact:` lines in `brief.md` stop the run until `decisions.md` has a `## business-facts` section. Every later stage gets `decisions` when the file exists, and plan-check loses its answer-only mode. `drive.js` gets a `--resume` flag that refuses a dirty tree instead of committing it. `report.js` writes clearer answer instructions and copies `decisions.md` into the report. The rest is skill text.

**Tech Stack:** Node 22, standard library only, `node:test`.

**Spec:** `docs/DESIGN.md`, `docs/TENSIONS.md` (S1–S62), `docs/CONTEXT.md`. The run feedback this plan answers was given in the session of 2026-10-08; the decisions are in row S63 (Task 5).

## Scope

Items from the run feedback, by number:

| # | Item | Task |
|---|---|---|
| 1 | Stop on business facts after the spec; plan-check always reviews in full | 1, 4 |
| 5 | The driver runs `drive.js` in the background or with the longest timeout | 4 |
| 6 | logic-review and the fixer do not run the full build again | 4 |
| 7 | A resume never commits files the user changed | 3, 4 |
| 8 | Answers go into a new section; the driver may write chat answers | 2, 4 |
| 9 | `report.md` keeps the decision history | 2 |

Not in this plan: #2 (S60 stays), #3 and #4 (plan 4), #10 and #11 (rejected; they conflict with S50, S33, S54 and S58).

## Global Constraints

- Node, standard library only (S11).
- `SKILL.md` frontmatter has only `name` and `description`. Skill text names actions, never tool names: no `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p`, `Bash` (S33).
- Both manifests of each plugin have the same version (S33).
- No skill pipes a test or build command (S60).
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A fact line inside prose.** Only list lines that start with `business fact:` (after `- `) count. A sentence that mentions "business fact" in the middle must not stop the run. Test in Task 1.
2. **An answer under an old heading.** Text added under an existing `## business-facts` section must not count as a new answer for plan-check. Test in Task 1 (the heading names differ, and the counts are per name).
3. **A resume on a clean tree with only notes changed.** A user who edited `decisions.md` (in `docs/runs`) must not be blocked by the resume check. Test in Task 3.
4. **The in-loop call after a dispatch.** A call with no flag still commits a subagent's leftovers. Only `--resume` refuses. Test in Task 3.
5. **`decisions.md` headings inside the report.** The copied `## <gate>` headings must not break the report's own `##` sections. Test in Task 2.

---

### Task 1: Business facts stop the run after the spec

**Files:**
- Modify: `plugins/orc-standard-workflow/bin/next.js`
- Test: `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Consumes: `stage()`, `countAnswers()` in `next.js`.
- Produces: `next()` returns `{ action: 'decide', gate: 'business-facts', questions: [...], runDir }` after the spec when `brief.md` has `business fact:` lines and `decisions.md` has no `## business-facts` section. Every stage dispatch gets `decisions: '<notes>/decisions.md'` when that file exists.

- [ ] **Step 1: Write the failing tests**

In `test/orc-standard-workflow/next.test.js`, replace the test `a stage with no answer for it gets no decisions input` with:

```js
function writeBrief(dir, text) {
  fs.writeFileSync(path.join(dir, DOCS, 'brief.md'), text);
}

test('business facts in the brief stop the run after the spec', () => {
  const dir = project();
  const spec = next(dir, '.orchestra/task.txt');
  writeBrief(dir, '# Brief\n\n## Assumptions\n- Rounding is half up.\n- business fact: the VIP rate — options: 5% | 10%\n  - business fact: the fee — options: 4.99 | 5.99\n');
  writeJson(path.join(dir, spec.result), { stage: 'spec', status: 'ok' });
  assert.deepEqual(next(dir), {
    action: 'decide',
    gate: 'business-facts',
    questions: ['business fact: the VIP rate — options: 5% | 10%', 'business fact: the fee — options: 4.99 | 5.99'],
    runDir: spec.runDir,
  });
  answer(dir, 'plan-check', 'not for business facts');
  assert.equal(next(dir).action, 'decide');
  answer(dir, 'business-facts', 'The VIP rate is 10%. The fee is 4.99.');
  const plan = next(dir);
  assert.equal(plan.skill, 'orc-standard-workflow:plan');
  assert.equal(plan.inputs.decisions, `${DOCS}/decisions.md`);
});

test('a brief that only mentions business facts in prose does not stop the run', () => {
  const dir = project();
  const spec = next(dir, '.orchestra/task.txt');
  writeBrief(dir, '# Brief\n\nNo business fact: is open here.\n- Rounding is half up.\n');
  assert.equal(pass(dir, spec).skill, 'orc-standard-workflow:plan');
});

test('a stage gets no decisions input while decisions.md does not exist', () => {
  const dir = project();
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.inputs.decisions, undefined);
  answer(dir, 'logic-review', 'x');
  assert.equal(pass(dir, plan).inputs.decisions, `${DOCS}/decisions.md`);
});
```

Note: the prose line `No business fact: is open here.` does not start with `business fact:`, so it does not count.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: FAIL. The first test gets a `plan` dispatch, not `decide`. The third test gets `undefined` after the answer.

- [ ] **Step 3: Implement**

In `stage()`, give `decisions` whenever the file exists. Replace:

```js
  if (!res) {
    const decisions = answers > 0 ? { decisions: `${ctx.run.docs}/decisions.md` } : {};
```

with:

```js
  if (!res) {
    const decisionsFile = `${ctx.run.docs}/decisions.md`;
    const decisions = fs.existsSync(path.join(ctx.project, decisionsFile)) ? { decisions: decisionsFile } : {};
```

Add above `planTasks`:

```js
// A business fact has no default (S60), so the run asks before anything is planned around a guess.
function openFacts(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return [...text.matchAll(/^\s*-\s*(business fact:.*)$/gm)].map(m => m[1].trim());
}
```

In `next()`, split the `steps` loop so the check runs after the spec. Replace:

```js
  const steps = [
    ['spec', { task: `${notes}/task.md`, base: run.base, notes }],
    ['plan', { spec: run.spec, notes, ...s.guide('plan') }],
```

with:

```js
  const specStep = stage(ctx, 'spec', { task: `${notes}/task.md`, base: run.base, notes });
  if (specStep) return specStep;
  const facts = openFacts(path.join(project, run.spec));
  if (facts.length && !countAnswers(path.join(project, notes), 'business-facts')) {
    return { action: 'decide', gate: 'business-facts', questions: facts, runDir };
  }
  const steps = [
    ['plan', { spec: run.spec, notes, ...s.guide('plan') }],
```


- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-standard-workflow/bin/next.js test/orc-standard-workflow/next.test.js
git commit -m "feat(workflow): business facts in the brief stop the run after the spec" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The report keeps the decisions and says how to answer

**Files:**
- Modify: `plugins/orchestra/lib/report.js`
- Test: `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: `final.gate`, `final.questions`, `<notes>/decisions.md`.
- Produces: `report.md` with a `## Decisions` section when `decisions.md` exists, and a Decide text that asks for a new section.

- [ ] **Step 1: Write the failing tests**

In `test/orchestra/drive.test.js`, in `a plan-check Decide ends the call before any code, with how to answer`, replace the last assertion with:

```js
  const text = fs.readFileSync(path.join(dir, stop.report), 'utf8');
  assert.match(text, /Add a new section `## plan-check` at the end of `docs\/runs\/task\/add-a-discount\/decisions\.md`/);
  assert.match(text, /Text added to an old section is not read as an answer/);
```

In `a Decide ends the call with the questions and a report that says how to answer`, replace `/under the heading \`## logic-review\`/` with `/Add a new section \`## logic-review\`/`.

Add:

```js
test('the report copies decisions.md, with its headings one level down', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(dir, 'docs/runs/task/add-a-discount/decisions.md'), '## business-facts\n\nThe VIP rate is 10%.\n');
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok' });
  const report = fs.readFileSync(path.join(dir, drive(dir).report), 'utf8');
  assert.match(report, /## Decisions\n\n### business-facts\n\nThe VIP rate is 10%\./);
  assert.doesNotMatch(report, /^## business-facts$/m);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orchestra/drive.test.js`
Expected: FAIL on the new Decide text and on the missing `## Decisions` section.

- [ ] **Step 3: Implement**

In `plugins/orchestra/lib/report.js`, replace the `if (final.action === 'decide') { … }` block with:

```js
  const decisionsFile = path.join(project, docs, 'decisions.md');
  if (fs.existsSync(decisionsFile)) {
    // One level down, so the answers' `## <gate>` headings stay inside this section.
    lines.push('', '## Decisions', '', fs.readFileSync(decisionsFile, 'utf8').trim().replace(/^#/gm, '##'));
  }
  if (final.action === 'decide') {
    lines.push('', '## Decide', '',
      `Add a new section \`## ${final.gate}\` at the end of \`${docs}/decisions.md\` with your answers, then run again. ` +
      'Text added to an old section is not read as an answer.', '',
      ...list(final.questions || []));
  }
```

`docs` is defined above this block already (`const docs = run ? run.docs : runDir;`). Move the line `const docs = …` above the new block if it is below it.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/report.js test/orchestra/drive.test.js
git commit -m "feat(orchestra): the report keeps decisions.md and asks for a new section" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A resume never commits the user's files

**Files:**
- Modify: `plugins/orchestra/lib/git.js`
- Modify: `plugins/orchestra/bin/drive.js`
- Test: `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: `EXCLUDE` in `git.js`.
- Produces: `dirtyFiles(cwd)` → array of paths changed outside `docs/runs`, `.orchestra` and `tmp`. `isClean(cwd)` stays and uses it. `drive(project, extraArgs, { resume })`; the CLI flag `--resume`.

- [ ] **Step 1: Write the failing tests**

Add to `test/orchestra/drive.test.js`:

```js
test('a resume with changed files stops and names them, and commits nothing', () => {
  const dir = project();
  toCode(dir);
  const head = git(dir, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const a = drive(dir, [], { resume: true });
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /mine\.txt/);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
});

test('a resume with only notes changed goes on', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(dir, 'docs/runs/task/add-a-discount/decisions.md'), '## plan-check\n\nok\n');
  assert.equal(drive(dir, [], { resume: true }).skill, code.skill);
});
```

The existing test `work a subagent left uncommitted is committed before the next step` stays: a call with no flag still commits leftovers.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orchestra/drive.test.js`
Expected: FAIL. The first new test gets a dispatch and a new commit `orchestra: commit work left uncommitted`.

- [ ] **Step 3: Implement**

In `plugins/orchestra/lib/git.js`, replace `isClean` with the code below. It calls `execFileSync` directly, because `git()` trims its output and so cuts the first character of the first porcelain line (` M file`).

```js
function dirtyFiles(cwd) {
  const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', '.', ...EXCLUDE], { cwd, encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map(line => line.slice(3));
}

const isClean = cwd => dirtyFiles(cwd).length === 0;
```

Add `dirtyFiles` to `module.exports`.

In `plugins/orchestra/bin/drive.js`, import `dirtyFiles` from `../lib/git`. Change `drive` and the start of `step`:

```js
function drive(project, extraArgs = [], { resume = false } = {}) {
  const action = step(project, extraArgs, resume);
  return { ...action, branch: git(project, 'branch', '--show-current') };
}
```

```js
function step(project, extraArgs, resume) {
  const resolved = load(project);
  if (resume) {
    // Between two calls of orchestra run, only the user changes files. Never commit them into the task.
    const dirty = dirtyFiles(project);
    if (dirty.length) {
      const files = dirty.slice(0, 5).join(', ') + (dirty.length > 5 ? ', …' : '');
      return { action: 'failed', reason: `Files changed since the run stopped: ${files}. Commit or stash them, then run again.` };
    }
  } else if (!extraArgs.length) {
    commitLeftovers(project);
  }
```

In the CLI block, pass the flag:

```js
  try {
    console.log(JSON.stringify(drive(process.cwd(), i >= 0 ? ['--task-file', argv[i + 1]] : [], { resume: argv.includes('--resume') })));
```

- [ ] **Step 3b: The same trim bug in `prepare`**

`prepare` in `plugins/orc-standard-workflow/bin/next.js` reads `git status --porcelain` through the trimming `git()` helper, so the dirty-tree message cuts the first letter of a changed tracked file (`README.md` → `EADME.md`). Add to `test/orc-standard-workflow/next.test.js`:

```js
test('the dirty-tree failure names a changed tracked file in full', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'README.md'), 'changed\n');
  assert.match(next(dir, '.orchestra/task.txt').reason, /dirty: README\.md/);
});
```

Run it and see it fail (`dirty: EADME.md`). Then in `prepare`, replace

```js
  const dirty = git(project, 'status', '--porcelain', '--untracked-files=normal').split('\n').filter(Boolean);
```

with

```js
  // Not through git(): its trim would cut the first character of the first line (` M file`).
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: project, encoding: 'utf8' }).split('\n').filter(Boolean);
```

Add `plugins/orc-standard-workflow/bin/next.js` and `test/orc-standard-workflow/next.test.js` to the commit of Step 5.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS, all tests (including `test/orchestra/git.test.js` and the build-skip tests in `runner.test.js`, which use `isClean`).

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/git.js plugins/orchestra/bin/drive.js test/orchestra/drive.test.js plugins/orc-standard-workflow/bin/next.js test/orc-standard-workflow/next.test.js
git commit -m "feat(orchestra): a resume stops on changed files instead of committing them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Skill text

**Files:**
- Modify: `plugins/orchestra/skills/run/SKILL.md`
- Modify: `plugins/orchestra/skills/fixer/SKILL.md`
- Modify: `plugins/orc-standard-workflow/skills/spec/SKILL.md`
- Modify: `plugins/orc-standard-workflow/skills/plan/SKILL.md`
- Modify: `plugins/orc-standard-workflow/skills/plan-check/SKILL.md`
- Modify: `plugins/orc-standard-workflow/skills/logic-review/SKILL.md`
- Test: `test/packaging.test.js` (unchanged; it must stay green)

- [ ] **Step 1: `run` skill (#5, #7, #8)**

In section "3. Drive":
- Change the resume bullet to: `If the user gave no task, this is a resume. Run \`node <orchestra>/bin/drive.js --resume\`.`
- Add after the bullet list, before "The command prints one JSON line":

```markdown
`drive.js` can run the project's full build before it prints, and a build can take many minutes.
Run every `drive.js` command in the background and wait until it ends, or, when that is not
possible, with the longest timeout your shell allows. Never stop it early and never start a second
one while it runs.
```

- Replace the `decide` bullet with:

```markdown
- `decide`: show each line of `questions` and the `report` path. The user answers in
  `decisions.md` in the notes folder: a **new** section `## <gate>` at the end of the file, with
  the answers. If the user gives the answers to you in the conversation, add that new section
  yourself, with their words exactly, and then run `drive.js --resume`. Otherwise tell the user
  to call orchestra run again after they write it.
```

In "Permitted actions", change `- Do not edit project files yourself. Subagents do the work.` to `- Do not edit project files yourself. Subagents do the work. The one exception: the user's answers to a \`decide\`, written to \`decisions.md\` as above.`

- [ ] **Step 2: `fixer` skill (#6)**

In "Procedure", step 2, add at the end: `Run only the tests that cover the files you change. orchestra runs the tool, and the full build, again after you.`

- [ ] **Step 3: `spec` skill (#1)**

In "Procedure", step 4, change the business fact bullet's last sentence `plan-check asks the human.` to `orchestra stops the run after you and asks the human.` In `## Result`, change `Business facts stay in \`brief.md\`; plan-check raises them.` to `Business facts stay in \`brief.md\`; orchestra asks the human about them.`

- [ ] **Step 4: `plan` skill (#1)**

Add to "Inputs": `- \`decisions\` (optional): the human's answers to open business facts and earlier questions.`

Add as the new step 2 of "Procedure" (renumber the rest):

```markdown
2. If `decisions` is given, read it. For each answered business fact, change the brief: remove the
   `business fact:` line from Assumptions and write the value into the acceptance criterion it
   belongs to, as a fact. Plan with these values. Never plan around a value that the brief or
   `decisions` does not give.
```

In "Rules", replace `- A \`business fact:\` assumption stays open. Plan the code around it and name it in Notes.` with `- A \`business fact:\` line that \`decisions\` does not answer stays open. Name it in Notes; do not pick a value.`

In "Permitted actions", change `Write \`<notes>/plan.md\`.` to `Write \`<notes>/plan.md\`, and edit \`<notes>/brief.md\` only to record answered business facts.`

- [ ] **Step 5: `plan-check` skill (#1)**

Delete the whole section `## If \`decisions\` is given` (its four steps). Change the `decisions` input line to: `- \`decisions\` (optional): the human's answers. They settle the questions they answer; do not raise those again.`

In "Procedure", step 1, add: `If \`decisions\` is given, read it first.`

In step 3, Decide bullet, change `Every business fact the brief does not give is Decide.` to `Every business fact that neither the brief nor \`decisions\` gives is Decide.`

- [ ] **Step 6: `logic-review` skill (#6)**

In "Procedure", step 8, change `Run the tests you touched, with no pipe that hides the exit code.` to `orchestra built and tested this commit just before you: do not run the full build. Run only the tests you touched, with no pipe that hides the exit code.`

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS, all tests. The packaging test checks the frontmatter and the banned words.

- [ ] **Step 8: Commit**

```bash
git add plugins/orchestra/skills plugins/orc-standard-workflow/skills
git commit -m "feat: skills for business facts after spec, resume, long builds and answers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Docs and versions

**Files:**
- Modify: `docs/TENSIONS.md`, `docs/DESIGN.md`
- Modify: the six plugin manifests
- Modify: `test/orchestra/drive.test.js` (the version in one assertion)

- [ ] **Step 1: Row S63 in `docs/TENSIONS.md`**

Add after S62:

```markdown
| S63 | From the order-pricing run. A `business fact:` line in the brief stops the run right after the spec (a check in `next.js`); the answer is a `## business-facts` section, and the planner reads it, so no stage plans around a guessed value. Every stage gets `decisions` once the file exists. plan-check always reviews in full; its answer-only mode of S62 is removed. `drive.js --resume` stops on files changed outside `docs/runs`, and never commits them. The driver runs `drive.js` in the background or with the longest timeout. logic-review and the fixer never run the full build. An answer is a new section; the driver may write the user's chat answers into it word for word. `report.md` copies `decisions.md`. S60 stays: a limit before or after rounding is a technical choice. Rejected: finding plugin folders without the manifest skills (S50, S33). | Run feedback, user decision |
```

- [ ] **Step 2: `docs/DESIGN.md`**

1. Section 8.1, row 3 (plan-check): replace `Raises every open business fact as Decide (S62).` with `Raises a business fact only when neither the brief nor \`decisions\` gives it (S63).`
2. Section 8.1, below the table, add: `After the spec, \`next.js\` reads the brief. Each \`business fact:\` line stops the run with \`decide\` until \`decisions.md\` has a \`## business-facts\` section (S63).`
3. Section 8.4, replace `Among the stages only plan-check returns \`decide\` (S62).` with `Among the stages only plan-check returns \`decide\`; \`next.js\` itself stops after the spec on open business facts (S63). An answer is always a new section.`
4. Section 8.5, add `the contents of \`decisions.md\`` to the list of what the report holds.

- [ ] **Step 3: Versions**

Change `"version": "0.5.0"` to `"version": "0.6.0"` in the six manifest files. In `test/orchestra/drive.test.js`, change `/orc-standard-workflow 0\.5\.0/` to `/orc-standard-workflow 0\.6\.0/`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add docs plugins test
git commit -m "docs: record the run feedback decisions (S63); bump to 0.6.0" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The same task again (manual)

- [ ] **Step 1:** `/plugin marketplace update depitropov-plugins`, then reload the plugins. Expected: all three plugins at 0.6.0.
- [ ] **Step 2:** In `~/Projects-other/orchestra-sample-java`, check `git status --porcelain` is empty, then `git checkout main`.
- [ ] **Step 3:** Start the same order-pricing task as the last run. Expected: spec runs, then `decide` with gate `business-facts` and the VIP rate question. Only one subagent has run. The report says to add a new section `## business-facts`.
- [ ] **Step 4:** Give the answer in the chat: "The VIP discount rate is 10% of the subtotal." Expected: the driver writes a new `## business-facts` section in `decisions.md` with exactly that text, and resumes with `--resume`. The plan's Notes name no guessed rate. plan-check runs a full review. The code, the build and logic-review follow, then `done`. logic-review does not run `./mvnw … verify`.
- [ ] **Step 5:** Check `report.md`: a `## Decisions` section shows the answer. Record every step that did not behave as expected as a new row under "Open (phase 1)" in `docs/TENSIONS.md`.

---

## Self-review notes

- **Coverage:** items 1, 5, 6, 7, 8, 9 map to Tasks 1–4 (see Scope). Review Focus 1–2: Task 1. 3–4: Task 3. 5: Task 2.
- **Names:** `openFacts`, `dirtyFiles`, `drive(project, extraArgs, { resume })`, the gate name `business-facts`, the report heading `## Decisions` are each defined once.
- **Kept on purpose:** the plan-check Decide path and its `seen` logic stay; plan-check can still stop on a real design fork, and on resume it now reviews in full with `decisions`.
