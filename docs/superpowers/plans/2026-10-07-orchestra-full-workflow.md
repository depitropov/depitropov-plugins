# Orchestra Full Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `orc-standard-workflow` runs all its stages: spec → plan → plan-check → code (in chunks) → the three phases. plan-check can stop the run on `decide`, and the run resumes from `decisions.md`. `orc-java-stack` ships a plan guide and a code guide.

**Architecture:** All order stays in `next.js` (S5, S10). One generic `stage()` function in `next.js` handles dispatch, failed, decide and resume for every stage, the same way the gate runner does it for agent gates (S55). The code stage becomes one dispatch per chunk of plan tasks. The chunk size is a config key that the workflow declares (default 2). orchestra changes only a little: `drive.js` records the order of the stage dispatches, so the report keeps run order with chunk names. The new skills are prose, rewritten from be-coding-agent's `spec.md`, `spec-check.md` and `implement.md`.

**Tech Stack:** Node 22, standard library only, `node:test`. Git 2.50. Java 21 and Maven 3.9 for the sample repo.

**Spec:** `docs/DESIGN.md` (sections 7, 8.1, 8.4, 9, 10), `docs/CONTEXT.md` (glossary), `docs/TENSIONS.md` (rows S1–S61). The plan before this one is `docs/superpowers/plans/2026-10-01-orchestra-walking-skeleton.md`.

## Scope of this plan

This is plan 3 of 5 for phase 1. The order is 1, 3, 4, 2, 5 (row S61).

In this plan:
- The stages `spec`, `plan`, `plan-check` and a chunked `code` stage in `next.js`.
- Decide handling for stages. Only plan-check returns `decide` among the stages.
- The config key `tasks-per-coder` in the workflow declaration.
- The skills `spec`, `plan`, `plan-check`. Updates to `code` and `logic-review`.
- `orc-java-stack:plan-guide` and `orc-java-stack:code-guide`, declared in `guides`.
- One manual run that stops on `decide` and resumes to `done` (done criterion 4 of DESIGN §13).

Not in this plan: java-stack gates, fix guides for tool gates and the `select` step (plan 4). `orchestra check`, schemas, `orchestra:init` (plan 2). Codex (plan 5).

## Decisions taken for this plan (new row S62)

- A missing business fact stops the run at plan-check, before any code. spec writes each open business fact as a line that starts with `business fact:` in the brief's assumptions. plan-check raises each one as Decide. The coder placeholder and the logic-review Decide of S60 stay as a safety net for a business fact that shows up only during the code.
- One code subagent gets `tasks-per-coder` plan tasks. The workflow declares this config key with default 2. A project overrides it in `.orchestra/config.json` under `workflow`.
- `run.json` `spec` points to `<notes>/brief.md` from the start. `brief.md` and `plan.md` are in the notes folder, because a human reads them.
- Among the stages only plan-check returns `decide`. The answer is a `## plan-check` section in `decisions.md`. On resume plan-check runs again with `decisions`, applies the answers and its Patch findings, and does not review again (same rule as S55 for gates).

## Global Constraints

- Node, standard library only (S11). No `package.json` dependencies.
- `SKILL.md` frontmatter has only `name` and `description` (S33).
- Skill text names actions ("dispatch a subagent", "invoke the X skill"), never tool names: no `Task tool`, `subagent_type`, `TodoWrite`, `Skill tool`, `claude -p` (S33).
- Each plugin has `plugin.json` and `.claude-plugin/plugin.json` with the same version (S33).
- Run folder `tmp/runs/<branch>/` (git-ignored). Notes folder `docs/runs/<branch>/` (committed) (S58).
- The workflow never pushes and never opens a PR (S17).
- No skill pipes a test or build command, so the exit code stays visible (S60).
- A guide is on when the Stack Skills declares it, unless `disable` lists it (S53, S40).
- Plan coordinates (`T3`, `AC2`) never appear in code, comments or commit messages.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A stale Decide answer.** A `## plan-check` section that was already used must not start plan-check again on the next call. Only a new section does. Test in Task 2.
2. **An answer for another step.** A `## logic-review` section must not restart plan-check, and a `## plan-check` section must not restart logic-review. Test in Task 2.
3. **A plan with no tasks, or a bad task count.** plan-check reports `tasks: 0`, or no number. The run must fail with a reason, not loop or crash. Test in Task 3.
4. **A bad `tasks-per-coder` value.** `0`, `-1`, `1.5` or `"2"` in the config must fail with the key name, not loop for ever. Test in Task 3.
5. **Report order with chunks.** `code-1`, `code-3`, `plan-check`, `plan`, `spec` sort wrong by name. The report must show them in run order. Test in Task 4.

---

## File structure

```
plugins/orc-standard-workflow/
  orchestra.json              + config key tasks-per-coder
  bin/next.js                 stages spec, plan, plan-check, code chunks; generic stage(); decide
  skills/spec/SKILL.md        new
  skills/plan/SKILL.md        new
  skills/plan-check/SKILL.md  new
  skills/code/SKILL.md        reads brief + plan, implements one chunk
  skills/logic-review/SKILL.md  business facts answered earlier are not raised again
plugins/orchestra/
  bin/drive.js                records stage dispatch order in <runDir>/stages.json
  lib/report.js               orders stage results by stages.json
plugins/orc-java-stack/
  orchestra.json              + guides
  skills/plan-guide/SKILL.md  new
  skills/code-guide/SKILL.md  new
test/orc-standard-workflow/next.test.js
test/orchestra/drive.test.js
test/packaging.test.js
docs/TENSIONS.md, docs/DESIGN.md
```

## Shared formats

**Stage result files** (in the run folder, `tmp/runs/<branch>/<name>.result.json`):

| Stage | Result |
|---|---|
| `spec` | `{ "stage": "spec", "status": "ok", "assumptions": [...], "files": ["<notes>/brief.md"] }` |
| `plan` | `{ "stage": "plan", "status": "ok", "files": ["<notes>/plan.md"] }` |
| `plan-check` | `{ "stage": "plan-check", "status": "ok", "tasks": 3, "decide": [], "counts": {...}, "evaluate": [...], "files": ["<notes>/plan-check.md"] }` |
| `code-<from>` | `{ "stage": "code", "status": "ok", "assumptions": [...], "files": [...] }` |

`status` is `ok`, `decide` (plan-check only) or `failed`. A failed result has `reason`.

**Dispatch inputs** (the keys the skills read):

| Stage | Inputs |
|---|---|
| `spec` | `task`, `base`, `notes` |
| `plan` | `spec`, `notes`, `guide`? |
| `plan-check` | `spec`, `plan`, `notes`, `guide`?, `decisions`? |
| `code` | `spec`, `plan`, `from`, `to`, `base`, `build`, `notes`, `guide`? |

`spec` is always `<notes>/brief.md`, the file with the acceptance criteria. `guide` is absent when no guide is on. `decisions` is present when `decisions.md` has a section for that stage.

---

### Task 1: The planning stages in `next.js`

**Files:**
- Modify: `plugins/orc-standard-workflow/orchestra.json`
- Modify: `plugins/orc-standard-workflow/bin/next.js`
- Test: `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Consumes: `.orchestra/resolved.json` with `slots.workflow.declaration.config['tasks-per-coder'].default` and `slots['stack-skills']`.
- Produces: `next(project, taskFile)` returns the actions in the Shared formats table. `run.json` `spec` = `<notes>/brief.md`. Internal helpers `settings(project)` → `{ build, perCoder, guide(kind) }` and `stage(ctx, name, inputs, skill = name)` → action or `null`. Task 2 and Task 3 extend these.

- [ ] **Step 1: Declare the config key**

`plugins/orc-standard-workflow/orchestra.json`:

```json
{
  "slot": "workflow",
  "params": [],
  "config": {
    "tasks-per-coder": { "type": "number", "default": 2 }
  },
  "gates": [
    { "name": "logic-review", "phase": "implementation-check", "kind": "agent", "skill": "logic-review", "always": true }
  ]
}
```

- [ ] **Step 2: Update the test fixture and write the failing tests**

In `test/orc-standard-workflow/next.test.js`, replace `project()` so the resolved file has a workflow slot and the config can carry workflow keys:

```js
function project({ guides, disable, workflow = {} } = {}) {
  const dir = makeRepo();
  writeJson(path.join(dir, '.orchestra/config.json'), { workflow: { plugin: 'orc-standard-workflow', ...workflow }, 'stack-skills': { plugin: 'st', ...(disable ? { disable } : {}) } });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  writeJson(path.join(dir, '.orchestra/resolved.json'), {
    orchestra: { dir: '/orc' },
    slots: {
      workflow: { plugin: 'orc-standard-workflow', dir: '/p/wf', declaration: { config: { 'tasks-per-coder': { type: 'number', default: 2 } } } },
      'stack-skills': { plugin: 'st', dir: '/p/st', declaration: { build: { run: '{plugin}/mvnw -B verify' }, ...(guides ? { guides } : {}) } },
    },
  });
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n\nOrders over 100 get 10%.\n');
  return dir;
}

// Writes an ok result for the dispatched stage and returns the next action.
function pass(dir, a, extra = {}) {
  writeJson(path.join(dir, a.result), { stage: a.skill.split(':')[1], status: 'ok', ...extra });
  return next(dir);
}
```

Replace the test `prepare makes the task branch and the run folder, then dispatches code` with:

```js
test('prepare makes the task branch and the run folder, then dispatches spec', () => {
  const dir = project();
  const base = git(dir, 'rev-parse', 'HEAD');
  const a = next(dir, '.orchestra/task.txt');
  const runDir = 'tmp/runs/task/add-a-discount';
  const docs = 'docs/runs/task/add-a-discount';
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, runDir, 'run.json'), 'utf8')), { base, branch: 'task/add-a-discount', spec: `${docs}/brief.md`, docs });
  assert.match(fs.readFileSync(path.join(dir, docs, 'task.md'), 'utf8'), /Orders over 100/);
  assert.deepEqual(a, {
    action: 'dispatch',
    skill: 'orc-standard-workflow:spec',
    inputs: { task: `${docs}/task.md`, base, notes: docs },
    result: `${runDir}/spec.result.json`,
    runDir,
  });
});

test('spec, plan and plan-check run in order with their inputs', () => {
  const dir = project();
  const docs = 'docs/runs/task/add-a-discount';
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.skill, 'orc-standard-workflow:plan');
  assert.deepEqual(plan.inputs, { spec: `${docs}/brief.md`, notes: docs });
  const check = pass(dir, plan);
  assert.equal(check.skill, 'orc-standard-workflow:plan-check');
  assert.deepEqual(check.inputs, { spec: `${docs}/brief.md`, plan: `${docs}/plan.md`, notes: docs });
  assert.equal(pass(dir, check, { tasks: 1 }).skill, 'orc-standard-workflow:code');
});

test('plan and plan-check get the plan guide, code gets the code guide, unless disabled', () => {
  const guides = { plan: 'plan-guide', code: 'code-guide' };
  const dir = project({ guides });
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  assert.equal(plan.inputs.guide, 'st:plan-guide');
  const check = pass(dir, plan);
  assert.equal(check.inputs.guide, 'st:plan-guide');
  assert.equal(pass(dir, check, { tasks: 1 }).inputs.guide, 'st:code-guide');

  const off = project({ guides, disable: ['plan-guide', 'code-guide'] });
  const plan2 = pass(off, next(off, '.orchestra/task.txt'));
  assert.equal(plan2.inputs.guide, undefined);
});
```

Delete the old test `the code guide is passed when declared and not disabled` (the new guide test replaces it).

Replace `after code, the three phases follow in order, then done` with:

```js
test('after code, the three phases follow in order, then done', () => {
  const dir = project();
  const code = pass(dir, pass(dir, pass(dir, next(dir, '.orchestra/task.txt'))), { tasks: 1 });
  const runDir = code.runDir;
  writeJson(path.join(dir, code.result), { stage: 'code', status: 'ok' });
  for (const phase of ['implementation-check', 'conventions-check', 'finish']) {
    assert.deepEqual(next(dir), { action: 'phase', name: phase, runDir });
    writeJson(path.join(dir, runDir, `phase-${phase}.result.json`), { stage: `phase-${phase}`, status: 'ok' });
  }
  assert.deepEqual(next(dir), { action: 'done', runDir });
});
```

Replace the three tests `a failed code stage fails the run`, `a failed code stage is reported once, then a resume dispatches code again` and `a malformed code result names the file` with the same checks on the first stage, `spec`:

```js
test('a failed stage is reported once, then a resume dispatches it again', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  writeJson(path.join(dir, a.result), { stage: 'spec', status: 'failed', reason: 'no idea' });
  const f = next(dir);
  assert.equal(f.action, 'failed');
  assert.equal(f.reason, 'no idea');
  assert.equal(next(dir).skill, 'orc-standard-workflow:spec');
});

test('a malformed stage result names the file', () => {
  const dir = project();
  const a = next(dir, '.orchestra/task.txt');
  fs.writeFileSync(path.join(dir, a.result), 'not json');
  const r = next(dir);
  assert.equal(r.action, 'failed');
  assert.match(r.reason, /Invalid result JSON in .*spec\.result\.json/);
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: FAIL. `prepare makes the task branch…` fails on `spec` (`task.md` ≠ `brief.md`) and the skill name (`code` ≠ `spec`).

- [ ] **Step 4: Rewrite `next.js`**

Replace everything from `const STAGES = [` up to (not including) `function git(` with:

```js
const PHASES = ['implementation-check', 'conventions-check', 'finish'];
```

Replace `codeInputs` and `next` with:

```js
function settings(project) {
  const resolved = readJson(path.join(project, '.orchestra', 'resolved.json'));
  const config = readJson(path.join(project, '.orchestra', 'config.json')) || {};
  const stack = resolved && resolved.slots['stack-skills'];
  if (!stack) throw new Error('No resolved stack-skills slot. orchestra run resolves the slots first.');
  const disabled = (config['stack-skills'] || {}).disable || [];
  const guide = kind => {
    const name = (stack.declaration.guides || {})[kind];
    return name && !disabled.includes(name) ? { guide: `${stack.plugin}:${name}` } : {};
  };
  return { build: stack.declaration.build.run.replace(/\{plugin\}/g, stack.dir), guide };
}

// One step of the workflow: dispatch it, or stop on its result. Returns null when the step is done.
function stage(ctx, name, inputs, skill = name) {
  const result = `${ctx.runDir}/${name}.result.json`;
  const file = path.join(ctx.project, result);
  let res = readResult(file);
  if (res && res.status === 'failed' && !reportOnce(file, res)) {
    fs.rmSync(file);
    res = null;
  }
  if (!res) return { action: 'dispatch', skill: `orc-standard-workflow:${skill}`, inputs, result, runDir: ctx.runDir };
  if (res.status === 'failed') return { action: 'failed', reason: res.reason || `Stage ${name} failed. See ${result}.`, runDir: ctx.runDir };
  return null;
}

function next(project, taskFile) {
  const s = settings(project);
  if (taskFile !== undefined) {
    const failed = prepare(project, fs.readFileSync(path.resolve(project, taskFile), 'utf8'));
    if (failed) return failed;
  }
  const branch = git(project, 'branch', '--show-current');
  const runDir = `tmp/runs/${branch}`;
  const run = branch.startsWith('task/') ? readJson(path.join(project, runDir, 'run.json')) : null;
  if (!run) return { action: 'failed', reason: `No run on branch "${branch}". Start a run with a task.` };
  const ctx = { project, runDir, run };
  const notes = run.docs;
  const plan = `${notes}/plan.md`;
  const steps = [
    ['spec', { task: `${notes}/task.md`, base: run.base, notes }],
    ['plan', { spec: run.spec, notes, ...s.guide('plan') }],
    ['plan-check', { spec: run.spec, plan, notes, ...s.guide('plan') }],
    ['code', { spec: run.spec, plan, base: run.base, build: s.build, notes, ...s.guide('code') }],
  ];
  for (const [name, inputs] of steps) {
    const a = stage(ctx, name, inputs);
    if (a) return a;
  }
  for (const phase of PHASES) {
    const res = readJson(path.join(project, runDir, `phase-${phase}.result.json`));
    if (!res || res.status !== 'ok') return { action: 'phase', name: phase, runDir };
  }
  return { action: 'done', runDir };
}
```

In `prepare`, change the `run` line to:

```js
  const run = { base, branch, spec: `${docs}/brief.md`, docs };
```

The `code` step here is temporary: Task 3 turns it into chunks.

- [ ] **Step 5: Run the tests to see them pass**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-standard-workflow test/orc-standard-workflow
git commit -m "feat(workflow): spec, plan and plan-check stages before code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`test/orchestra/drive.test.js` fails after this commit, because its full run expects `code` first. Task 4 fixes it.

---

### Task 2: Decide for stages

**Files:**
- Modify: `plugins/orc-standard-workflow/bin/next.js`
- Test: `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Consumes: `stage()` from Task 1.
- Produces: `next()` returns `{ action: 'decide', gate: '<stage>', questions: [...], runDir }` when a stage result has `status: 'decide'`. `drive.js` already passes `gate` and `questions` to the report, so the report says "under the heading `## plan-check`". A stage dispatch gets `decisions: '<notes>/decisions.md'` when `decisions.md` has a `## <stage>` section.

- [ ] **Step 1: Write the failing tests**

Add to `test/orc-standard-workflow/next.test.js`:

```js
function toPlanCheck(dir) {
  return pass(dir, pass(dir, next(dir, '.orchestra/task.txt')));
}

function answer(dir, heading, text) {
  const file = path.join(dir, 'docs/runs/task/add-a-discount/decisions.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `## ${heading}\n\n${text}\n\n`);
}

test('a plan-check Decide stops the run until decisions.md answers plan-check', () => {
  const dir = project();
  const check = toPlanCheck(dir);
  const q = 'business fact: the VIP rate? — options: 5% | 10%';
  writeJson(path.join(dir, check.result), { stage: 'plan-check', status: 'decide', decide: [q], tasks: 2 });
  assert.deepEqual(next(dir), { action: 'decide', gate: 'plan-check', questions: [q], runDir: check.runDir });
  assert.equal(next(dir).action, 'decide');

  answer(dir, 'logic-review', 'not for plan-check');
  assert.equal(next(dir).action, 'decide');

  answer(dir, 'plan-check', '10%');
  const again = next(dir);
  assert.equal(again.skill, 'orc-standard-workflow:plan-check');
  assert.equal(again.inputs.decisions, 'docs/runs/task/add-a-discount/decisions.md');
});

test('a used answer does not start plan-check again after a second Decide', () => {
  const dir = project();
  const check = toPlanCheck(dir);
  writeJson(path.join(dir, check.result), { stage: 'plan-check', status: 'decide', decide: ['a?'] });
  next(dir);
  answer(dir, 'plan-check', 'a');
  next(dir);
  writeJson(path.join(dir, check.result), { stage: 'plan-check', status: 'decide', decide: ['b?'] });
  assert.deepEqual(next(dir).questions, ['b?']);
  assert.deepEqual(next(dir).questions, ['b?']);
  answer(dir, 'plan-check', 'b');
  assert.equal(next(dir).action, 'dispatch');
});

test('a stage with no answer for it gets no decisions input', () => {
  const dir = project();
  const plan = pass(dir, next(dir, '.orchestra/task.txt'));
  answer(dir, 'logic-review', 'x');
  assert.equal(pass(dir, plan).inputs.decisions, undefined);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: FAIL. The decide result is treated as done, so `next` dispatches code instead of `decide`.

- [ ] **Step 3: Add Decide to `stage()`**

Add above `stage`:

```js
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// Same rule as the gate runner: an answer is a `## <step>` section in decisions.md.
function countAnswers(docsAbs, name) {
  const file = path.join(docsAbs, 'decisions.md');
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(line => line.trim() === `## ${name}`).length;
}
```

Change `reportOnce` to use `writeJson`:

```js
function reportOnce(file, res) {
  if (res.reported) return false;
  writeJson(file, { ...res, reported: true });
  return true;
}
```

Replace `stage` with:

```js
// One step of the workflow: dispatch it, or stop on its result. Returns null when the step is done.
// A Decide result records how many answers existed when it stopped (`seen`). Only a new answer starts the step again.
function stage(ctx, name, inputs, skill = name) {
  const result = `${ctx.runDir}/${name}.result.json`;
  const file = path.join(ctx.project, result);
  const answers = countAnswers(path.join(ctx.project, ctx.run.docs), name);
  let res = readResult(file);
  const retry = res && ((res.status === 'failed' && !reportOnce(file, res)) || (res.status === 'decide' && res.seen !== undefined && answers > res.seen));
  if (retry) {
    fs.rmSync(file);
    res = null;
  }
  if (!res) {
    const decisions = answers > 0 ? { decisions: `${ctx.run.docs}/decisions.md` } : {};
    return { action: 'dispatch', skill: `orc-standard-workflow:${skill}`, inputs: { ...inputs, ...decisions }, result, runDir: ctx.runDir };
  }
  if (res.status === 'failed') return { action: 'failed', reason: res.reason || `Stage ${name} failed. See ${result}.`, runDir: ctx.runDir };
  if (res.status === 'decide') {
    if (res.seen === undefined) writeJson(file, { ...res, seen: answers });
    return { action: 'decide', gate: name, questions: res.decide || [], runDir: ctx.runDir };
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-standard-workflow/bin/next.js test/orc-standard-workflow/next.test.js
git commit -m "feat(workflow): a stage can stop on decide and resume from decisions.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The code stage in chunks

**Files:**
- Modify: `plugins/orc-standard-workflow/bin/next.js`
- Test: `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Consumes: `stage()` and `settings()` from Tasks 1 and 2. `tasks` (a whole number) in `plan-check.result.json`.
- Produces: one dispatch of `orc-standard-workflow:code` per chunk, with result file `code-<from>.result.json` and inputs `from`, `to`. `settings()` also returns `perCoder`.

- [ ] **Step 1: Write the failing tests**

Add to `test/orc-standard-workflow/next.test.js`:

```js
test('the code stage runs in chunks of tasks-per-coder, default 2', () => {
  const dir = project();
  const c1 = pass(dir, toPlanCheck(dir), { tasks: 3 });
  assert.equal(c1.result, `${c1.runDir}/code-1.result.json`);
  assert.equal(c1.inputs.from, 1);
  assert.equal(c1.inputs.to, 2);
  const c3 = pass(dir, c1);
  assert.equal(c3.result, `${c1.runDir}/code-3.result.json`);
  assert.equal(c3.inputs.from, 3);
  assert.equal(c3.inputs.to, 3);
  assert.equal(pass(dir, c3).action, 'phase');
});

test('the project config overrides tasks-per-coder', () => {
  const dir = project({ workflow: { 'tasks-per-coder': 1 } });
  let a = pass(dir, toPlanCheck(dir), { tasks: 2 });
  assert.deepEqual([a.inputs.from, a.inputs.to], [1, 1]);
  a = pass(dir, a);
  assert.deepEqual([a.inputs.from, a.inputs.to], [2, 2]);
});

test('a bad tasks-per-coder value fails with the key name', () => {
  for (const bad of [0, -1, 1.5, '2']) {
    assert.throws(() => next(project({ workflow: { 'tasks-per-coder': bad } }), '.orchestra/task.txt'), /tasks-per-coder/);
  }
});

test('a plan-check result with no task count fails the run', () => {
  for (const tasks of [0, undefined, '3']) {
    const dir = project();
    const a = pass(dir, toPlanCheck(dir), { tasks });
    assert.equal(a.action, 'failed');
    assert.match(a.reason, /plan-check reported no plan tasks/);
  }
});
```

Update the earlier tests that write a plan-check result with `{ tasks: 1 }`: they stay as they are. The `after code…` test writes to `code.result`; that path is now `code-1.result.json`, which `code.result` already holds, so it needs no change.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: FAIL. `c1.result` ends in `code.result.json`, and the bad values do not throw.

- [ ] **Step 3: Implement the chunks**

In `settings`, read the key and check it. Replace its `return` line with:

```js
  const declared = resolved.slots.workflow.declaration.config['tasks-per-coder'].default;
  const perCoder = (config.workflow || {})['tasks-per-coder'] ?? declared;
  if (!Number.isInteger(perCoder) || perCoder < 1) {
    throw new Error(`workflow.tasks-per-coder in .orchestra/config.json must be a whole number of 1 or more, not ${JSON.stringify(perCoder)}.`);
  }
  return { build: stack.declaration.build.run.replace(/\{plugin\}/g, stack.dir), guide, perCoder };
```

In `next`, remove the `code` line from `steps`, and add this between the `steps` loop and the `PHASES` loop:

```js
  const checked = readJson(path.join(project, runDir, 'plan-check.result.json'));
  const total = checked.tasks;
  if (!Number.isInteger(total) || total < 1) {
    return { action: 'failed', reason: `plan-check reported no plan tasks. See ${runDir}/plan-check.result.json and ${plan}.`, runDir };
  }
  for (let from = 1; from <= total; from += s.perCoder) {
    const to = Math.min(from + s.perCoder - 1, total);
    const a = stage(ctx, `code-${from}`, { spec: run.spec, plan, from, to, base: run.base, build: s.build, notes, ...s.guide('code') }, 'code');
    if (a) return a;
  }
```

`checked` is never null here: `stage('plan-check', …)` returned `null`, so its result exists.

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add plugins/orc-standard-workflow/bin/next.js test/orc-standard-workflow/next.test.js
git commit -m "feat(workflow): code runs in chunks of tasks-per-coder plan tasks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Run order in the report, and the driver tests

**Files:**
- Modify: `plugins/orchestra/bin/drive.js`
- Modify: `plugins/orchestra/lib/report.js`
- Test: `test/orchestra/drive.test.js`

**Interfaces:**
- Consumes: the stage dispatches of Tasks 1–3.
- Produces: `<runDir>/stages.json`, a JSON array of result file names in the order `drive.js` first dispatched them. `writeReport` lists stage results in that order.

- [ ] **Step 1: Update the driver tests**

In `test/orchestra/drive.test.js`, add after `project()`:

```js
// Walks spec, plan and plan-check with ok results, and returns the first code dispatch.
function toCode(dir, tasks = 1) {
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  for (const stage of ['spec', 'plan']) {
    assert.equal(a.skill, `orc-standard-workflow:${stage}`);
    writeJson(path.join(dir, a.result), { stage, status: 'ok' });
    a = drive(dir);
  }
  assert.equal(a.skill, 'orc-standard-workflow:plan-check');
  writeJson(path.join(dir, a.result), { stage: 'plan-check', status: 'ok', tasks, counts: { patch: 1 } });
  return drive(dir);
}
```

In `a run goes from task to done…`, replace the line `const code = drive(dir, ['--task-file', '.orchestra/task.txt']);` with `const code = toCode(dir);`. Replace the `order` array with:

```js
  const order = ['| spec |', '| plan |', '| plan-check |', '| code-1 |', '| implementation-check.build |', '| implementation-check.logic-review |',
    '| phase-implementation-check |', '| phase-conventions-check |', '| finish.build |', '| phase-finish |'].map(row => report.indexOf(row));
```

and change `/## Assumptions\n\n- code: The limit/` to `/## Assumptions\n\n- code-1: The limit/`.

In `a Decide ends the call…` and `work a subagent left uncommitted…`, replace `drive(dir, ['--task-file', '.orchestra/task.txt'])` with `toCode(dir)`.

Add two tests:

```js
test('a plan-check Decide ends the call before any code, with how to answer', () => {
  const dir = project();
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  writeJson(path.join(dir, a.result), { stage: 'spec', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(dir, a.result), { stage: 'plan', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(dir, a.result), { stage: 'plan-check', status: 'decide', decide: ['business fact: the rate? — options: 5% | 10%'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.match(fs.readFileSync(path.join(dir, stop.report), 'utf8'), /under the heading `## plan-check`/);
});

test('chunked code steps keep run order in the report', () => {
  const dir = project();
  const c1 = toCode(dir, 3);
  writeJson(path.join(dir, c1.result), { stage: 'code', status: 'ok' });
  const c3 = drive(dir);
  assert.match(c3.result, /code-3\.result\.json$/);
  writeJson(path.join(dir, c3.result), { stage: 'code', status: 'ok' });
  const review = drive(dir);
  writeJson(path.join(dir, review.result), { stage: 'logic-review', status: 'ok' });
  const report = fs.readFileSync(path.join(dir, drive(dir).report), 'utf8');
  const order = ['| spec |', '| plan |', '| plan-check |', '| code-1 |', '| code-3 |'].map(row => report.indexOf(row));
  assert.ok(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), `rows out of run order: ${order}`);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/orchestra/drive.test.js`
Expected: FAIL in the order checks: `| code-1 |` comes before `| plan |` and `| spec |`, because the report sorts stage results by name.

- [ ] **Step 3: Record the dispatch order in `drive.js`**

Add above `step`:

```js
// Result names sort wrong (code-1, code-3, plan-check, plan, spec), so the report takes the dispatch order from here.
function remember(project, a) {
  const file = path.join(project, a.runDir, 'stages.json');
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const name = path.basename(a.result);
  if (!list.includes(name)) fs.writeFileSync(file, JSON.stringify([...list, name]) + '\n');
}
```

In `step`, change `if (a.action === 'dispatch') return withPrompt(a);` to:

```js
    if (a.action === 'dispatch') {
      remember(project, a);
      return withPrompt(a);
    }
```

- [ ] **Step 4: Use the order in `report.js`**

In `runOrder`, replace the line
`results.filter(f => !f.startsWith('phase-') && !PHASES.some(p => f.startsWith(`${p}.`))).forEach(take);`
with:

```js
  if (files.includes('stages.json')) readJson(path.join(abs, 'stages.json')).forEach(take);
  results.filter(f => !f.startsWith('phase-') && !PHASES.some(p => f.startsWith(`${p}.`))).forEach(take);
```

`take` ignores a name with no result file, so a dispatch that never got a result does not break the report.

- [ ] **Step 5: Run all tests to see them pass**

Run: `npm test`
Expected: PASS, all tests in all files.

- [ ] **Step 6: Commit**

```bash
git add plugins/orchestra test/orchestra/drive.test.js
git commit -m "feat(orchestra): the report lists workflow stages in dispatch order" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The workflow skills

**Files:**
- Create: `plugins/orc-standard-workflow/skills/spec/SKILL.md`
- Create: `plugins/orc-standard-workflow/skills/plan/SKILL.md`
- Create: `plugins/orc-standard-workflow/skills/plan-check/SKILL.md`
- Modify: `plugins/orc-standard-workflow/skills/code/SKILL.md`
- Modify: `plugins/orc-standard-workflow/skills/logic-review/SKILL.md`
- Test: `test/packaging.test.js`

**Interfaces:**
- Consumes: the dispatch inputs and result formats in Shared formats.
- Produces: the skills `orc-standard-workflow:spec`, `:plan`, `:plan-check`; the files `<notes>/brief.md`, `<notes>/plan.md`, `<notes>/plan-check.md`, `<notes>/implementation-log.md`.

- [ ] **Step 1: Write the failing test**

In `test/packaging.test.js`, change `REFERENCED` to:

```js
const REFERENCED = ['orchestra/run', 'orchestra/fixer', 'orc-standard-workflow/manifest', 'orc-standard-workflow/spec',
  'orc-standard-workflow/plan', 'orc-standard-workflow/plan-check', 'orc-standard-workflow/code',
  'orc-standard-workflow/logic-review', 'orc-java-stack/manifest', 'orc-java-stack/fix-build'];
```

Run: `node --test test/packaging.test.js`
Expected: FAIL with `missing skill orc-standard-workflow/spec`.

- [ ] **Step 2: Write `skills/spec/SKILL.md`**

````markdown
---
name: spec
description: Turns the task of one orc-standard-workflow run into a brief with given-when-then acceptance criteria. Dispatched by orchestra; not for direct use.
---

# Spec

You turn a task into a brief that a planner and a reviewer can work from. You do not write code
and you do not ask the user.

## Inputs

- `task`: the task as the user wrote it.
- `base`: the commit before any work.
- `notes`: the run's notes folder. You write `brief.md` here.

## Procedure

1. Read `task`. Read `AGENTS.md` in the project root and in the folders the task touches.
2. Read the code the task touches: entry points, services, data classes, tests. Everything you
   write must come from code that exists, not from guesses.
3. When the task depends on something outside this project (an endpoint, a field name, a library's
   behaviour), read it at its source if you can reach it. If you cannot, record it as an
   assumption.
4. For each question you would ask a human, take a default and record it. Tell two kinds apart:
   - A **technical choice** has a sensible default: rounding mode, null handling, the order of two
     steps. Take the boring, minimal default.
   - A **business fact** never has a default: a rate, a price, a limit value, who qualifies. Do not
     invent one. Write the line with `business fact:` at the start. plan-check asks the human.
5. Write `<notes>/brief.md` with the sections below.
6. Write the result JSON.

## `brief.md`

```markdown
# Brief

## Goal
<the task as a concrete outcome that a test can check>

## Acceptance criteria
- AC1: Given <state>, when <action>, then <observable result>
- AC2: …

## Scope
In: <…>
Out: <…>

## Affected files
- `<path>` — <why>

## Patterns to reuse
- `<path>` — <the pattern the plan must follow>

## Assumptions
- <question> — <the default you took, and why>
- business fact: <what is missing> — options: <a> | <b>
```

Rules:
- Restate criteria the task gives in the given-when-then form. When the task gives none, derive
  them from the goal. A criterion describes behaviour a test can see, never the implementation.
- An acceptance criterion that depends on a missing business fact names the fact, for example
  "then the price is reduced by the VIP rate".
- Keep the brief short. No code.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "spec",
  "status": "ok",
  "assumptions": ["Rounding is half up to 2 decimals."],
  "files": ["<notes>/brief.md"]
}
```

`assumptions` holds the technical choices only. Business facts stay in `brief.md`; plan-check
raises them. Use `"status": "failed"` and add `"reason"` only if the task cannot be understood at
all.

## Permitted actions

Read the project. Write `<notes>/brief.md`. Do not change code. Do not commit. Do not ask the user.
````

- [ ] **Step 3: Write `skills/plan/SKILL.md`**

````markdown
---
name: plan
description: Writes the task plan of one orc-standard-workflow run from its brief, with no code. Dispatched by orchestra; not for direct use.
---

# Plan

You split the brief into small, ordered tasks for the coder. You do not write code and you do not
ask the user.

## Inputs

- `spec`: the brief, with the acceptance criteria.
- `notes`: the run's notes folder. You write `plan.md` here.
- `guide` (optional): a skill with short rules for planning in this stack.

## Procedure

1. Read `spec`. If `guide` is given, invoke it and follow its rules.
2. Read the files the brief names under "Affected files" and "Patterns to reuse". Check that they
   exist as the brief says.
3. Write `<notes>/plan.md` in the format below.
4. Write the result JSON.

## `plan.md`

```markdown
# Plan

## Approach
<one paragraph: how the change fits this code, which patterns it reuses, what it does not do>

## Tasks

### T1 — <title>
- Files: create `<path>`; modify `<path>`
- Does: <the task's job, in prose>
- Tests: `<TestClass#method>` covers AC1; `<TestClass#method>` covers AC2
- Notes: <optional: a signature, a class to copy, at most ten lines of pseudo-code>

### T2 — …
```

Rules:
- Order the tasks so each one builds on the one before.
- One task is about four files at most and has one job. Split a bigger one.
- Every acceptance criterion is in at least one Tests line, with a named test.
- Decide here where the code lives. The coder follows the plan.
- No code: no class bodies, no method bodies, no build commands. A signature or ten lines of
  pseudo-code under Notes is the limit.
- Plan only what the brief has in scope. Do not reopen its assumptions.
- A `business fact:` assumption stays open. Plan the code around it and name it in Notes.

## Result

Write to the path given in the prompt:

```json
{ "stage": "plan", "status": "ok", "files": ["<notes>/plan.md"] }
```

Use `"status": "failed"` and add `"reason"` only if the brief cannot be planned.

## Permitted actions

Read the project. Write `<notes>/plan.md`. Do not change code. Do not commit. Do not ask the user.
````

- [ ] **Step 4: Write `skills/plan-check/SKILL.md`**

````markdown
---
name: plan-check
description: Checks the brief and the plan of one orc-standard-workflow run against the real code, fixes them in place, and stops for a human on a real fork or a missing business fact. Dispatched by orchestra; not for direct use.
---

# Plan check

You did not write the brief or the plan. You check both, with the focus on the plan, while
problems are still cheap. You fix what you can in the two files. You do not write code.

## Inputs

- `spec`: the brief.
- `plan`: the plan.
- `notes`: the run's notes folder. Your findings file goes here.
- `guide` (optional): a skill with short rules for planning in this stack.
- `decisions` (optional): the human's answers to your earlier questions.

## If `decisions` is given

You ran before and stopped on a question. Do not review again.

1. Read `<notes>/plan-check.md` (your earlier findings) and the `## plan-check` sections of
   `decisions`.
2. Write each answer into the brief: a business fact moves from Assumptions into the acceptance
   criterion it belongs to, as a fact. Change the plan where the answer needs it.
3. Fix the Patch findings of `plan-check.md`.
4. Add a section "Answered" to `plan-check.md`. Write the result JSON with `"status": "ok"`.

## Procedure

1. Read `spec` and `plan`. If `guide` is given, invoke it and use its rules as the reference.
2. Check against the real code. Read the code; do not trust the plan.
   - **Coverage**: every acceptance criterion is in at least one task's Tests line, with a named test.
   - **Code facts**: every file, signature and pattern the plan names exists as it says.
   - **Scope**: no task goes beyond the brief's scope.
   - **Size**: a task with more than about four files or two jobs is split.
   - **No code**: Notes hold at most a signature or ten lines of pseudo-code.
   - **Over-building**: no abstraction, layer or new library the goal does not need.
   - **Business facts**: every `business fact:` line in the brief, and every rate, price, limit
     value or rule of who qualifies that the plan uses with no source.
3. Put each finding into one bucket:
   - **Decide**: stop for a human. Every business fact the brief does not give is Decide. A design
     fork is Decide only when you can name two or more real options and no sensible default exists.
     Write it as one line: `<question> — options: <a> | <b>`.
   - **Patch**: you can fix it in the brief or the plan now.
   - **Evaluate**: real, but not for you to fix. A technical choice with a sensible default is
     Evaluate, never Noise.
   - **Noise**: not a real problem. Drop it.
4. Write all findings to `<notes>/plan-check.md`, by bucket.
5. If there is a Decide finding, stop here. Do not change the brief or the plan. Write the result
   with `"status": "decide"`.
6. Otherwise fix every Patch finding in the brief and the plan. When you split a task, number the
   tasks again. Keep the `AC` numbers.
7. Write the result JSON.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "plan-check",
  "status": "ok",
  "tasks": 3,
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 1, "noise": 0 },
  "evaluate": ["plan.md T2 — the plan keeps the old null check; the brief does not say"],
  "files": ["<notes>/plan-check.md"]
}
```

`tasks` is the number of `### T<n>` sections in `plan.md` after your changes. Always write it,
also on `decide`. `status` is `ok`, `decide` or `failed`. `decide` lists each question as one line
with its options.

## Permitted actions

Read the project. Edit `<notes>/brief.md`, `<notes>/plan.md` and `<notes>/plan-check.md`. Do not
change code. Do not commit. Do not ask the user; a question goes into `decide`.
````

- [ ] **Step 5: Rewrite `skills/code/SKILL.md`**

````markdown
---
name: code
description: Implements a range of plan tasks of one orc-standard-workflow run, with tests, one commit per task. Dispatched by orchestra; not for direct use.
---

# Code

## Inputs

- `spec`: the brief, with the acceptance criteria.
- `plan`: the plan, with tasks `T1`, `T2`, ….
- `from`, `to`: the plan tasks you implement, both included. Do no other task.
- `base`: the commit before any work.
- `build`: the command that builds the project and runs all tests. orchestra runs it after you.
- `notes`: the run's notes folder.
- `guide` (optional): a skill with short rules for writing code in this stack.

## Procedure

1. If `guide` is given, invoke it and follow its rules.
2. If `<notes>/implementation-log.md` exists, read it. It says what earlier coders did.
3. For each task from `T<from>` to `T<to>`, in order:
   1. Read the task in `plan`, and the acceptance criteria it covers in `spec`. Read the code it
      touches.
   2. Do the task where the plan says. Write every test the task's Tests line names. Each test
      checks the behaviour of its criterion.
   3. Run only the tests for the code you changed, and fix until they pass. Do not run the full
      `build`: orchestra runs it after you. Run `build` yourself only when you cannot run the
      affected tests on their own. Never pipe a test or build command through `tail`, `head` or
      `grep`: the pipe hides the exit code. Write the output to a file, check the exit code, then
      read the end of the file.
   4. Commit once, with a message like `feat: <summary>`. Plan names such as `T3` or `AC2` never
      go into code, comments or commit messages. orchestra commits `notes` itself, and `tmp/` is
      never committed: do not stage files under `docs/runs/` or `tmp/`.
   5. Add to `<notes>/implementation-log.md`:

      ```
      ## T<n> — <commit sha>
      - Files: …
      - Tests: …
      - Deviations: none, or what and why
      ```
4. Change the plan's design only where the plan is wrong about the code. Make the smallest correct
   change and write it under Deviations. Never add scope.
5. When a question is still open, do not stop. A **technical choice** has a sensible default:
   take it. A **business fact** (a rate, a price, a limit value, who qualifies) should be in the
   brief already. If it is not, use a clear placeholder value and start its line with
   `business fact:`, so the review asks the human. Write each choice as one line in `assumptions`,
   and add the same lines to `<notes>/code.md`.
6. Write the result JSON.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "code",
  "status": "ok",
  "assumptions": ["The 50.00 limit applies to the amount before rounding."],
  "files": ["<changed file>"]
}
```

Use `"status": "failed"` and add `"reason"` if the tests do not pass, or if a task cannot be done
against the real code. Never delete or disable a test to get a pass.

## Permitted actions

Edit code and tests. Run tests and the build. Commit. Do not push. Do not change branches. Do not
ask the user.
````

- [ ] **Step 6: Update `skills/logic-review/SKILL.md`**

Replace the line

```
   - A business fact (recorded with `business fact:` or not) is Decide.
```

with

```
   - A business fact (recorded with `business fact:` or not) is Decide, unless the brief or
     `decisions` already gives its value. A value from the brief is not asked again.
```

Replace the line `- `spec`: the task and its acceptance criteria. This is your answer key.` with
`- `spec`: the brief, with the acceptance criteria. This is your answer key.`

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 8: Commit**

```bash
git add plugins/orc-standard-workflow/skills test/packaging.test.js
git commit -m "feat(workflow): spec, plan and plan-check skills; code implements a task range" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The java-stack guides

**Files:**
- Create: `plugins/orc-java-stack/skills/plan-guide/SKILL.md`
- Create: `plugins/orc-java-stack/skills/code-guide/SKILL.md`
- Modify: `plugins/orc-java-stack/orchestra.json`
- Test: `test/packaging.test.js`

**Interfaces:**
- Consumes: `settings().guide(kind)` from Task 1, which reads `declaration.guides.plan` and `.code`.
- Produces: the skills `orc-java-stack:plan-guide` and `orc-java-stack:code-guide`.

The guides are generic Java, not ship.cars (S3): no Lombok, no Commons Lang rules. They follow R3: 5–15 short rules per area, each one a rule a reviewer can check.

- [ ] **Step 1: Write the failing test**

In `test/packaging.test.js`, add `'orc-java-stack/plan-guide', 'orc-java-stack/code-guide'` to `REFERENCED`. Add:

```js
test('every guide a stack declares is a skill in that plugin', () => {
  for (const p of plugins) {
    const file = path.join(PLUGINS, p, 'orchestra.json');
    if (!fs.existsSync(file)) continue;
    for (const name of Object.values(JSON.parse(fs.readFileSync(file, 'utf8')).guides || {})) {
      assert.ok(fs.existsSync(path.join(PLUGINS, p, 'skills', name, 'SKILL.md')), `${p}: guide ${name} has no skill`);
    }
  }
});
```

Run: `node --test test/packaging.test.js`
Expected: FAIL with `missing skill orc-java-stack/plan-guide`.

- [ ] **Step 2: Write `skills/plan-guide/SKILL.md`**

````markdown
---
name: plan-guide
description: Short Java rules for planning a change and for checking a plan. Invoked by the plan and plan-check stages of an orchestra workflow; can also be invoked by hand.
---

# Java plan guide

Use these rules when you write or check a plan for a Java project. Each rule is short on purpose.
The project's own code wins over a rule: when the project does it another way, follow the project.

## Where code lives

1. Put new code in the package of the feature it belongs to. Do not make a new top-level package
   for one class.
2. Keep the layers the project has (for example web, service, repository). A controller calls a
   service; a service never calls a controller.
3. Business rules go in plain classes that the tests can call with no framework, no database and
   no network.
4. Reuse the class that already does the job. Name it in the task's Notes.

## Shape of the change

5. No interface with one implementation, no factory for one product, no new config for a value
   that never changes.
6. A data holder with no behaviour is a `record`, unless the project uses another form for it.
7. Money and rates use `BigDecimal`, never `double` or `float`. The plan states the scale and the
   rounding mode.
8. A new library is a finding for plan-check. Use the JDK or a library the project already has.

## Tests

9. Every acceptance criterion has a unit test with a name that says the behaviour, for example
   `appliesDiscountAboveLimit`.
10. Plan a test for each edge the brief names: the limit value itself, zero, null when the input
    can be null.
11. Test classes mirror the package of the class they test.
````

- [ ] **Step 3: Write `skills/code-guide/SKILL.md`**

````markdown
---
name: code-guide
description: Short Java rules for writing code and tests. Invoked by the code stage of an orchestra workflow; can also be invoked by hand.
---

# Java code guide

Use these rules when you write Java code and tests. The project's own code wins over a rule: when
the project does it another way, follow the project.

## Build and tests

1. Use the Maven wrapper `./mvnw` with `-B`, never a global `mvn`. If the project has
   `.mvn/settings.xml`, add `-s .mvn/settings.xml`.
2. Run one test class with `./mvnw -B test -Dtest=<TestClass>`. In a multi-module project add
   `-pl <module> -am`.
3. Write the output to a log file and check the exit code. Read the end of the log for the result.
4. In the Surefire summary, `Failures` means an assertion failed. `Errors` means the test did not
   run to its assertions. Fix an error before you judge the code.

## Code

5. Names say what a thing is or does: nouns for classes, verbs for methods. No `Manager` or
   `Helper` with no context.
6. Keep a method short and on one job. Pass a small object, not a long list of parameters.
7. Money uses `BigDecimal` with an explicit scale and `RoundingMode`. Compare with `compareTo`,
   never `equals`.
8. Check arguments at the public entry of a class. Throw an exception that names the bad value.
9. Keep fields `private final` where you can. Prefer a `record` for a data holder.

## Tests

10. Use JUnit 5. Use AssertJ when the project has it; otherwise use JUnit's assertions.
11. One behaviour per test. Arrange, act, assert, in that order.
12. Use `@ParameterizedTest` for the same check over many values, for example the values around
    a limit.
13. Never delete or disable a test to get a pass.
````

- [ ] **Step 4: Declare the guides**

`plugins/orc-java-stack/orchestra.json`:

```json
{
  "slot": "stack-skills",
  "params": [],
  "config": {},
  "build": { "run": "./mvnw -B verify", "guide": "fix-build", "max_rounds": 3 },
  "guides": { "plan": "plan-guide", "code": "code-guide" },
  "gates": []
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add plugins/orc-java-stack test/packaging.test.js
git commit -m "feat(java-stack): plan and code guides" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Docs and versions

**Files:**
- Modify: `docs/TENSIONS.md`
- Modify: `docs/DESIGN.md`
- Modify: `docs/CONTEXT.md`
- Modify: `plugins/*/plugin.json`, `plugins/*/.claude-plugin/plugin.json` (six files)
- Modify: `test/orchestra/drive.test.js` (the version in one assertion)

- [ ] **Step 1: Add row S62 to `docs/TENSIONS.md`**

Add after row S61:

```markdown
| S62 | Plan 3: a missing business fact stops the run at plan-check, before any code. spec writes it as a `business fact:` line in the brief; plan-check raises it as Decide; S60 stays as a safety net during the code. Among the stages only plan-check returns `decide`; its answer is a `## plan-check` section, and plan-check then applies the answers with no new review. One code subagent gets `tasks-per-coder` plan tasks, a config key the workflow declares (default 2). `run.json` `spec` points to `<notes>/brief.md`. `brief.md`, `plan.md` and `plan-check.md` are in the notes folder. | User decision |
```

- [ ] **Step 2: Update `docs/DESIGN.md`**

1. In section 7, row "State", change "`spec` (the path of the file that holds the acceptance criteria)" to "`spec` (`<notes>/brief.md`, the file that holds the acceptance criteria)".
2. In section 8.1, replace the stage rows 1–4 with:

```markdown
| 1 | spec | subagent | `task.md` | `brief.md` | Given-when-then acceptance criteria. An open business fact is a `business fact:` line |
| 2 | plan | subagent | `brief.md` | `plan.md` | No code. Loads the stack's plan guide |
| 3 | plan-check | subagent | `brief.md`, `plan.md` | both patched, `plan-check.md` | Fresh agent (S26). Checks the brief and the plan together. Loads the stack's plan guide. Raises every open business fact as Decide (S62) |
| 4 | code | subagent per chunk of `tasks-per-coder` tasks | `brief.md`, `plan.md` | commits, `implementation-log.md`, `code.md` | One commit per task. Loads the stack's code guide |
```

   Add below the table: "`brief.md`, `plan.md` and the review notes are in the notes folder. The workflow declares the config key `tasks-per-coder` (default 2)."
3. In section 8.4, after "When a stage or a phase returns `decide`…", add: "Among the stages only plan-check returns `decide` (S62)."
4. In section 15, delete the line "How many plan tasks one code subagent gets (be-coding-agent uses 2)."

- [ ] **Step 3: Update `docs/CONTEXT.md`**

In the row **Notes folder**, change "`task.md`, `decisions.md`, review notes, `report.md`" to "`task.md`, `brief.md`, `plan.md`, `decisions.md`, review notes, `report.md`". In the row **Run folder**, change "results, checkpoints, logs, `run.json`" to "results, checkpoints, logs, `run.json`, `stages.json`".

- [ ] **Step 4: Bump all plugins to 0.5.0**

Change `"version": "0.4.0"` to `"version": "0.5.0"` in the six manifest files. In `test/orchestra/drive.test.js`, change `/orc-standard-workflow 0\.4\.0/` to `/orc-standard-workflow 0\.5\.0/`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add docs plugins test
git commit -m "docs: record plan 3 decisions; bump to 0.5.0" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: A run that stops on decide and resumes (manual)

This task needs a human, because it runs a new Claude Code session. It covers done criterion 4 of DESIGN §13 and the full stage list on a real repo.

- [ ] **Step 1: Update the plugins**

In any Claude Code session:

```
/plugin marketplace update depitropov-plugins
```

Expected: `orchestra`, `orc-standard-workflow` and `orc-java-stack` at 0.5.0. Restart Claude Code.

- [ ] **Step 2: Put the sample repo on a clean default branch**

The sample repo may still be on a task branch of an earlier run. Check, then switch:

```bash
cd ~/Projects-other/orchestra-sample-java
git status --porcelain
git checkout main && git branch --show-current
```

Expected: the status is empty, and the branch is `main`. If the status is not empty, stop and clean it by hand first.

- [ ] **Step 3: Start a run with a missing business fact**

Open a new Claude Code session in `~/Projects-other/orchestra-sample-java` and type:

```
orchestra run: VIP customers get a discount on every order. Round the result to 2 decimals, half up.
```

Expected, in order:
1. Resolution, then a `dispatch` for `orc-standard-workflow:spec`, then `:plan`, then `:plan-check`.
2. `drive.js` prints `decide`. A question names the VIP discount rate, with options.
3. No `feat:` commit exists: `git log --oneline main..HEAD` shows only `orchestra: run notes (decide)`.
4. `docs/runs/task/<branch>/` has `brief.md`, `plan.md`, `plan-check.md` and `report.md`. The report says to answer under `## plan-check`.

- [ ] **Step 4: Answer and resume**

Write `docs/runs/task/<branch>/decisions.md`:

```markdown
## plan-check

The VIP rate is 15%.
```

Then type `orchestra run` with no task.

Expected, in order:
1. A `dispatch` for `orc-standard-workflow:plan-check` with `decisions`. `brief.md` now has 15% in an acceptance criterion.
2. One or more `dispatch` actions for `orc-standard-workflow:code`, each with a `from` and a `to`.
3. The build, `logic-review` and the final build. Then `done` with a report path.

- [ ] **Step 5: Check the outcome**

```bash
cd ~/Projects-other/orchestra-sample-java
git log --oneline main..HEAD
cat docs/runs/task/*/report.md
./mvnw -B verify
git status --porcelain
```

Expected: one `feat:` commit per plan task, and a last commit `orchestra: run notes (done)`. The report says `- Status: done`, lists `spec`, `plan`, `plan-check`, `code-1` and the phases in run order, and has no `business fact:` assumption left. The build passes. The status output is empty.

- [ ] **Step 6: Record the result**

Write in `docs/TENSIONS.md`, as a new row under "Open (phase 1)", every step that did not behave as expected: which step, what you saw, and the `report.md` path. If all steps passed, write nothing. Then commit in this repo:

```bash
cd ~/Projects-other/depitropov-plugins && git branch --show-current
git add docs/TENSIONS.md
git commit -m "docs: record the decide-and-resume run" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage.** DESIGN §8.1 stages 1–4: Tasks 1, 3, 5. §8.4 triage and Decide for stages: Tasks 2, 5. §7 `run.json` `spec`: Task 1. §9 and §10 guides: Task 6. §8.5 report in run order: Task 4. §13 done criterion 4: Task 8. Criteria 3 and 5 stay in plans 5 and 2.
- **Names across tasks.** `settings`, `stage`, `countAnswers`, `writeJson` (in `next.js`), `remember` (in `drive.js`), `pass`, `toPlanCheck`, `answer` (in `next.test.js`) and `toCode` (in `drive.test.js`) are each defined once. Result names: `spec`, `plan`, `plan-check`, `code-<from>`. Inputs: as in Shared formats.
- **Known gap.** `next.js` copies `countAnswers` from the gate runner, because a workflow must not load orchestra's code. If a second workflow needs it, move it into the protocol.
