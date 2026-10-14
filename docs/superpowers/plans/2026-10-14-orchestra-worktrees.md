# Orchestra Worktrees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every orchestra run works in its own git worktree at `.orchestra/worktrees/<branch>`, so a run never moves the user's branch or touches their files (O9).

**Architecture:** `drive.js` gets two roots: the project root (the user's checkout, where it starts) and the run root (the worktree). A new `lib/worktree.js` creates, renames, finds and removes worktrees with plain git commands. The workflow's `prepare` shrinks to "create the branch from HEAD and write the run files". Everything downstream (runner, report, git helpers) already takes a folder and gets the run root.

**Tech Stack:** Node 22, standard library only, `node:test`, git ≥ 2.17 (`git worktree move`).

**Spec:** `docs/superpowers/specs/2026-10-14-orchestra-worktrees-design.md`. Research: `docs/research/R8-worktrees.md`.

## Amendments to the spec (found while planning)

1. **The `report` path stays relative to the run root,** as today. A kept worktree is named by the new action key `worktree` (relative to the project root), so the user opens `<worktree>/<report>`. On `done` the worktree is gone, so the skill shows `git show <branch>:<report>`. The spec said "relative to the project root", which fails on `done`.
2. **The config comes from the base commit.** `next.js` and the runner read `.orchestra/config.json` inside the worktree, which is the committed version at `origin/<default>`. `drive.js` copies only `.orchestra/resolved.json` (git-ignored) from the project root into the run root on every call. A config that is not on `origin/<default>` stops the start with a clear message.

## Global Constraints

- Node, standard library only (S11). No new dependency.
- The user's checkout is never switched, pulled into, committed in or cleaned (S74).
- Worktree folder: `.orchestra/worktrees/<branch>`; temporary name before the branch exists: `.orchestra/worktrees/.new-<pid>`.
- `git worktree remove` is never called with `--force`.
- Every `check.js` failure line has the form `<where>: <problem>. Fix: <fix>.`
- Run state stays derived from the branch inside the run root (S15, S22).
- Run all tests with `npm test` from the repo root.

## Review Focus

1. **Paths through the macOS `/tmp` symlink.** `os.tmpdir()` is `/var/...`, git prints `/private/var/...`. A run must still be found, and `worktree` must not come out as `../../private/...`. Pinned: `drive` calls `fs.realpathSync(project)` first, `find` compares real paths, and every drive test runs under `os.tmpdir()`.
2. **The user has uncommitted work in their checkout when the run starts.** Expected: the run starts, the file is never committed, and it is still there afterwards. Pinned in Task 3.
3. **A project whose `.gitignore` does not ignore `.orchestra/*`.** Expected: `orchestra check --project` fails with a fix, and a `done` run keeps its worktree with a message instead of forcing. Pinned in Task 3 (kept) and Task 4 (check rule).
4. **The config was never committed or pushed.** Expected: `failed` with "is not on origin/<default>", and no worktree left behind. Pinned in Task 3.
5. **Two runs open at once.** Expected: a call with no task names both branches and asks for `--branch`; `--branch` picks one. Pinned in Task 3.

---

### Task 1: The workflow starts in a worktree

`prepare` no longer checks the tree, checks out or pulls. The dry run of `orchestra check` calls `next.js` on a detached HEAD, as a real run will. The contract text changes with it (CLAUDE.md rule).

**Files:**
- Modify: `plugins/orc-standard-workflow/bin/next.js` (`prepare`, lines 62-93)
- Modify: `plugins/orchestra/lib/check.js` (`dryRun`)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` ("A workflow: bin/next.js")
- Test: `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `next(project, taskFile)` unchanged in signature. On a task it creates `task/<slug>` from the current HEAD, attached or detached. `run.json.base` is that HEAD.

- [ ] **Step 1: Write the failing test, delete the obsolete ones**

In `test/orc-standard-workflow/next.test.js`, delete these tests: `a dirty tree stops the run before any branch is made`, `the dirty-tree failure names the dirty files`, `the dirty-tree failure names a changed tracked file in full`, and the test that removes `origin/HEAD` and expects `/git remote set-head origin -a/` (it moves to the drive tests in Task 3). Then add:

```js
test('prepare starts the branch from a detached HEAD and never switches or pulls', () => {
  const dir = project();
  const base = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'checkout', '--detach');
  fs.writeFileSync(path.join(dir, 'README.md'), 'local edit\n');
  const a = next(dir, '.orchestra/task.txt');
  assert.equal(a.skill, 'orc-standard-workflow:spec');
  assert.equal(git(dir, 'branch', '--show-current'), 'task/add-a-discount');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'tmp/runs/task/add-a-discount/run.json'), 'utf8')).base, base);
  assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), 'local edit\n');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: the new test FAILS (prepare stops on the dirty `README.md`).

- [ ] **Step 3: Shrink `prepare`**

Replace `prepare` in `plugins/orc-standard-workflow/bin/next.js` with:

```js
// orchestra starts every run in a fresh worktree on a detached HEAD at the base (S74). prepare only
// names the branch and writes the run files; it never checks out, pulls or switches.
function prepare(project, taskText) {
  const base = git(project, 'rev-parse', 'HEAD');
  const slug = slugify(taskText);
  let branch = `task/${slug}`;
  for (let n = 2; branchExists(project, branch); n++) branch = `task/${slug}-${n}`;
  git(project, 'checkout', '-b', branch);
  // Orchestration state stays in git-ignored tmp/; only the human-readable files go to docs/ (S58).
  const runDir = `tmp/runs/${branch}`;
  const docs = `docs/runs/${branch}`;
  // tmp/ is git-ignored, so a deleted branch leaves its run folder behind. A new branch starts clean.
  fs.rmSync(path.join(project, runDir), { recursive: true, force: true });
  fs.mkdirSync(path.join(project, runDir), { recursive: true });
  fs.mkdirSync(path.join(project, docs), { recursive: true });
  fs.writeFileSync(path.join(project, docs, 'task.md'), taskText.endsWith('\n') ? taskText : `${taskText}\n`);
  const run = { base, branch, spec: `${docs}/brief.md`, docs };
  fs.writeFileSync(path.join(project, runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
}
```

In `next()`, the call becomes `prepare(project, fs.readFileSync(path.resolve(project, taskFile), 'utf8'));` with no `failed` check. `execFileSync` is still used by `git()`; keep the import.

- [ ] **Step 4: The dry run on a detached HEAD**

In `plugins/orchestra/lib/check.js` `dryRun`, add one more git command to the loop that commits the config, so the scratch repo ends detached:

```js
      for (const args of [['add', CONFIG], ['-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'config'], ['checkout', '-q', '--detach']]) {
```

- [ ] **Step 5: The contract text**

In `plugins/orchestra/skills/writing-plugins/SKILL.md`, after the paragraph that starts "Node, standard library only. orchestra calls", add:

```markdown
Every run starts in its own git worktree, on a detached HEAD at the base. On the first call, create
the task branch from HEAD and record HEAD as `base`. Never check out another ref, pull or switch
branches: the worktree is the run's, and the user's checkout is never touched.
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS. The `next.test.js` tests that start on `main` still pass, because `prepare` branches from any HEAD. `packaging.test.js` runs the dry run on the real workflow.

- [ ] **Step 7: Commit**

```bash
git add plugins/orc-standard-workflow/bin/next.js plugins/orchestra/lib/check.js plugins/orchestra/skills/writing-plugins/SKILL.md test/orc-standard-workflow/next.test.js
git commit -m "feat(workflow): prepare starts from a detached HEAD and never switches (S74)"
```

---

### Task 2: `lib/worktree.js`

Four functions, one git command each, no state file.

**Files:**
- Create: `plugins/orchestra/lib/worktree.js`
- Test: `test/orchestra/worktree.test.js`

**Interfaces:**
- Consumes: `git(cwd, ...args)` from `plugins/orchestra/lib/git.js`.
- Produces:
  - `DIR` = `'.orchestra/worktrees'`
  - `create(project) → { root: string, base: string } | { failed: string }`: fetches, adds a detached worktree at `origin/<default>` under `DIR/.new-<pid>`. `root` is absolute and real; `base` is `origin/<default>`.
  - `rename(project, root, branch) → string`: moves to `DIR/<branch>`, returns the new root, or `root` when the move fails.
  - `find(project) → [{ root, branch }]`: worktrees under `DIR` on a `task/` branch that have `tmp/runs/<branch>/run.json`. `root` is real.
  - `remove(project, root) → null | string`: plain `git worktree remove`, then `prune`. `null` when removed, else git's first error line.

- [ ] **Step 1: Write the failing tests**

Create `test/orchestra/worktree.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeJson, git } = require('../helpers');
const wt = require('../../plugins/orchestra/lib/worktree');

test('create adds a detached worktree at origin/<default> and leaves the checkout alone', () => {
  const dir = makeRepo();
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const { root, base } = wt.create(dir);
  assert.equal(base, 'origin/main');
  assert.equal(root, fs.realpathSync(path.join(dir, wt.DIR, `.new-${process.pid}`)));
  assert.equal(git(root, 'branch', '--show-current'), '');
  assert.equal(git(root, 'rev-parse', 'HEAD'), git(dir, 'rev-parse', 'origin/main'));
  assert.equal(git(dir, 'branch', '--show-current'), 'main');
  assert.ok(fs.existsSync(path.join(dir, 'mine.txt')));
  assert.equal(fs.existsSync(path.join(root, 'mine.txt')), false);
});

test('create fails with a hint when origin/HEAD is not set', () => {
  const dir = makeRepo();
  git(dir, 'remote', 'set-head', 'origin', '-d');
  assert.match(wt.create(dir).failed, /git remote set-head origin -a/);
});

test('rename moves the worktree under the branch name, and find lists runs only', () => {
  const dir = makeRepo();
  const { root } = wt.create(dir);
  git(root, 'checkout', '-b', 'task/x');
  writeJson(path.join(root, 'tmp/runs/task/x/run.json'), {});
  const moved = wt.rename(dir, root, 'task/x');
  assert.equal(moved, path.join(fs.realpathSync(dir), wt.DIR, 'task/x'));
  const other = wt.create(dir).root;
  git(other, 'checkout', '-b', 'task/no-run');
  assert.deepEqual(wt.find(dir), [{ root: moved, branch: 'task/x' }]);
});

test('remove deletes a clean worktree and keeps the branch; it refuses untracked work', () => {
  const dir = makeRepo();
  const { root } = wt.create(dir);
  git(root, 'checkout', '-b', 'task/x');
  fs.mkdirSync(path.join(root, 'tmp'));
  fs.writeFileSync(path.join(root, 'tmp', 'state'), 'ignored');
  assert.equal(wt.remove(dir, root), null);
  assert.equal(fs.existsSync(root), false);
  assert.match(git(dir, 'branch', '--list', 'task/x'), /task\/x/);

  const kept = wt.create(dir).root;
  fs.writeFileSync(path.join(kept, 'work.txt'), 'x');
  assert.match(wt.remove(dir, kept), /untracked|modified/);
  assert.ok(fs.existsSync(path.join(kept, 'work.txt')));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/orchestra/worktree.test.js`
Expected: FAIL with "Cannot find module '../../plugins/orchestra/lib/worktree'".

- [ ] **Step 3: Write `lib/worktree.js`**

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { git } = require('./git');

// Every run works in its own worktree inside the project, so it never touches the user's checkout (S74).
// The folder is git-ignored by `.orchestra/*` and lies inside the session's folder, so subagents edit
// it without a prompt.
const DIR = '.orchestra/worktrees';

const firstLine = e => String(e.stderr || e.message).trim().split('\n')[0];

function create(project) {
  try {
    git(project, 'fetch', 'origin');
  } catch (e) {
    return { failed: `git fetch origin failed: ${firstLine(e)}. Check the remote and the network, then run again.` };
  }
  let branch;
  try {
    branch = git(project, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
  } catch {
    return { failed: 'The default branch is unknown: origin/HEAD is not set. Run `git remote set-head origin -a`, then run again.' };
  }
  const root = path.join(project, DIR, `.new-${process.pid}`);
  git(project, 'worktree', 'add', '--detach', root, `origin/${branch}`);
  return { root: fs.realpathSync(root), base: `origin/${branch}` };
}

// The folder takes the branch's name once prepare has made the branch. If git cannot move it, the run
// goes on under the temporary name: find() reads git's list, not folder names.
function rename(project, root, branch) {
  const to = path.join(fs.realpathSync(project), DIR, branch);
  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    git(project, 'worktree', 'move', root, to);
    return to;
  } catch {
    return root;
  }
}

// git prints real paths (/private/var on macOS), so both sides are compared after realpath.
function find(project) {
  const dir = path.join(project, DIR);
  if (!fs.existsSync(dir)) return [];
  const prefix = fs.realpathSync(dir) + path.sep;
  return git(project, 'worktree', 'list', '--porcelain').split('\n\n').flatMap(block => {
    const at = (block.match(/^worktree (.+)$/m) || [])[1];
    const branch = (block.match(/^branch refs\/heads\/(.+)$/m) || [])[1];
    if (!at || !branch || !branch.startsWith('task/') || !fs.existsSync(at)) return [];
    const root = fs.realpathSync(at);
    return root.startsWith(prefix) && fs.existsSync(path.join(root, 'tmp', 'runs', branch, 'run.json')) ? [{ root, branch }] : [];
  });
}

// Never --force: a refusal means the worktree holds work that is not committed.
function remove(project, root) {
  try {
    git(project, 'worktree', 'remove', root);
    git(project, 'worktree', 'prune');
    return null;
  } catch (e) {
    return firstLine(e);
  }
}

module.exports = { DIR, create, rename, find, remove };
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/orchestra/worktree.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/orchestra/lib/worktree.js test/orchestra/worktree.test.js
git commit -m "feat(orchestra): create, rename, find and remove run worktrees (S74)"
```

---

### Task 3: `drive.js` runs in the worktree

**Files:**
- Modify: `plugins/orchestra/bin/drive.js`
- Modify: `plugins/orchestra/lib/protocol.js` (`withPrompt`)
- Test: `test/orchestra/drive.test.js`, `test/orchestra/protocol.test.js`

**Interfaces:**
- Consumes: `create`, `rename`, `find`, `remove`, `DIR` from Task 2; `FILE` from `lib/resolved.js` (`'.orchestra/resolved.json'`; check the export name before use).
- Produces:
  - `drive(project, extraArgs = [], { resume = false, branch } = {})`. Every action of a live run carries `branch` and `worktree` (the run root relative to the real project root). A `done` action carries `worktree` only when the worktree was kept, with `kept: "<git's message>"`. `result`, `runDir`, `report` and `inputs` stay relative to the run root.
  - CLI: `node drive.js [--task-file <file>] [--resume] [--branch <name>]`.
  - `withPrompt(a, root)`: the prompt gains the line ``Work in `<root>`. Run every command from there; every path below is relative to it.`` before `Inputs:`.

- [ ] **Step 1: Move the existing drive tests to the run root**

In `test/orchestra/drive.test.js`, add after `PLUGINS`:

```js
// The run root of a live action, and the report of a finished run (its worktree is gone).
const wt = (dir, a) => path.join(dir, a.worktree);
const doneReport = (dir, a) => git(dir, 'show', `${a.branch}:${a.report}`);
```

Then apply these rewrites in every existing test:
- `path.join(dir, X.result)` → `path.join(wt(dir, X), X.result)`; in `toReview` and `toCode`, the same with their local action.
- Writes to `docs/runs/task/add-a-discount/...` → `path.join(wt(dir, <the last action>), 'docs/runs/...')`.
- `fs.readFileSync(path.join(dir, done.report), 'utf8')` where the action is `done` → `doneReport(dir, done)`; where it is `decide` → `fs.readFileSync(path.join(wt(dir, stop), stop.report), 'utf8')`.
- In the first test: `git(dir, 'ls-files', ...)`, `git(dir, 'log', ...)` and `git(dir, 'status', ...)` about the run → `git(dir, 'ls-tree', '-r', '--name-only', done.branch, 'docs/runs')`, `git(dir, 'log', '-1', '--format=%s', done.branch)`; drop the `status --porcelain` line (the worktree is gone; the new test below checks the checkout).
- `work a subagent left uncommitted` and `a resume with changed files`: create the stray file in `wt(dir, code)` (keep the action of `toCode`), and run `git` on that root.
- `leftover changes on a branch without a run are not committed` becomes:

```js
test('a call with no task and no run fails, and leaves the checkout alone', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const a = drive(dir);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /No run to resume\. Start a run with a task\./);
  assert.match(git(dir, 'status', '--porcelain'), /mine\.txt/);
});
```

- [ ] **Step 2: Write the new failing tests**

Append to `test/orchestra/drive.test.js`:

```js
test('a run works in its worktree and leaves the checkout, its branch and its edits alone', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const code = toCode(dir);
  assert.equal(code.worktree, '.orchestra/worktrees/task/add-a-discount');
  assert.match(code.prompt, new RegExp(`Work in \`${fs.realpathSync(dir)}/\\.orchestra/worktrees/task/add-a-discount\``));
  fs.writeFileSync(path.join(wt(dir, code), 'Discount.java'), 'class Discount {}\n');
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const done = drive(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.worktree, undefined);
  assert.equal(fs.existsSync(path.join(dir, '.orchestra/worktrees/task/add-a-discount')), false);
  assert.equal(git(dir, 'branch', '--show-current'), 'main');
  assert.equal(git(dir, 'status', '--porcelain'), '?? mine.txt');
  assert.match(git(dir, 'ls-tree', '-r', '--name-only', 'task/add-a-discount'), /Discount\.java/);
  assert.doesNotMatch(git(dir, 'ls-tree', '-r', '--name-only', 'task/add-a-discount'), /mine\.txt/);
});

test('a decide keeps the worktree, and a call from the checkout resumes it', () => {
  const dir = project();
  const code = toCode(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'decide', decide: ['Up or even? — options: up | even'] });
  const stop = drive(dir);
  assert.equal(stop.worktree, '.orchestra/worktrees/task/add-a-discount');
  assert.ok(fs.existsSync(path.join(wt(dir, stop), stop.report)));
  fs.writeFileSync(path.join(wt(dir, stop), 'docs/runs/task/add-a-discount/decisions.md'), '## logic-review\n\n- Up or even? — options: up | even → up\n');
  assert.equal(drive(dir, [], { resume: true }).skill, 'orc-standard-workflow:logic-review');
});

test('two open runs need --branch, which picks one', () => {
  const dir = project();
  drive(dir, ['--task-file', '.orchestra/task.txt']);
  fs.writeFileSync(path.join(dir, '.orchestra/other.txt'), 'Fix the tax\n');
  drive(dir, ['--task-file', '.orchestra/other.txt']);
  const a = drive(dir);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /Several runs are open: .*task\/add-a-discount.*task\/fix-the-tax.*--branch/);
  const b = drive(dir, [], { branch: 'task/fix-the-tax' });
  assert.equal(b.branch, 'task/fix-the-tax');
  assert.equal(b.skill, 'orc-standard-workflow:spec');
});

test('a config that is not on origin stops the start and leaves no worktree', () => {
  const dir = project();
  git(dir, 'rm', '-q', '--cached', '.orchestra/config.json');
  git(dir, 'commit', '-q', '-m', 'untrack config');
  git(dir, 'push', '-q');
  const a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /\.orchestra\/config\.json is not on origin\/main/);
  assert.equal(git(dir, 'worktree', 'list').split('\n').length, 1);
});

test('a start without origin/HEAD fails with a hint', () => {
  const dir = project();
  git(dir, 'remote', 'set-head', 'origin', '-d');
  assert.match(drive(dir, ['--task-file', '.orchestra/task.txt']).reason, /git remote set-head origin -a/);
});

test('a done run keeps a worktree that git refuses to remove, and says why', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, '.gitignore'), 'tmp/\n');
  git(dir, 'commit', '-q', '-am', 'ignore only tmp');
  git(dir, 'push', '-q');
  const code = toCode(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const done = drive(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.worktree, '.orchestra/worktrees/task/add-a-discount');
  assert.match(done.kept, /untracked|modified/);
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `node --test test/orchestra/drive.test.js`
Expected: the new tests and the rewritten ones FAIL (no `worktree` key; the run still happens in the checkout).

- [ ] **Step 4: `withPrompt` names the run root**

In `plugins/orchestra/lib/protocol.js`, change the signature to `function withPrompt(a, root)` and insert before `'Inputs:'`:

```js
    `Work in \`${root}\`. Run every command from there; every path below is relative to it.`,
```

In `test/orchestra/protocol.test.js`, both calls become `withPrompt(dispatch, '/r')`, and the test `withPrompt names the skill, every input and the result path` adds `assert.match(a.prompt, /Work in `\/r`\. Run every command from there/);`.

- [ ] **Step 5: Rewrite `drive.js`**

Replace the `drive` function and the `step` returns in `plugins/orchestra/bin/drive.js`:

```js
const worktree = require('../lib/worktree');
```

In `step`, both `return withPrompt(a);` and `return withPrompt(r);` become `return a;` and `return r;`. `step(project, …)` is now always called with the run root.

```js
// Starts or finds the run's worktree, then drives the run there. The checkout is never touched (S74).
function drive(project, extraArgs = [], { resume = false, branch } = {}) {
  project = fs.realpathSync(project);
  load(project);
  if (extraArgs.length) return start(project, path.resolve(project, extraArgs[1]));
  const runs = worktree.find(project).filter(r => !branch || r.branch === branch);
  if (!runs.length) return { action: 'failed', reason: branch ? `No run on branch "${branch}".` : 'No run to resume. Start a run with a task.' };
  if (runs.length > 1) return { action: 'failed', reason: `Several runs are open: ${runs.map(r => r.branch).join(', ')}. Name one with --branch <name>.` };
  const root = runs[0].root;
  copyResolved(project, root);
  return answer(project, root, step(root, [], resume));
}

function start(project, taskFile) {
  const made = worktree.create(project);
  if (made.failed) return { action: 'failed', reason: made.failed };
  let root = made.root;
  if (!fs.existsSync(path.join(root, '.orchestra', 'config.json'))) {
    worktree.remove(project, root);
    return { action: 'failed', reason: `.orchestra/config.json is not on ${made.base}. Commit and push it, then run again.` };
  }
  copyResolved(project, root);
  const first = step(root, ['--task-file', taskFile], false);
  const name = git(root, 'branch', '--show-current');
  if (!name) {
    worktree.remove(project, root);
    return first;
  }
  root = worktree.rename(project, root, name);
  return answer(project, root, first);
}

// resolved.json is git-ignored, so the worktree has none. Resolution runs in the checkout on every call.
function copyResolved(project, root) {
  fs.mkdirSync(path.join(root, '.orchestra'), { recursive: true });
  fs.copyFileSync(path.join(project, '.orchestra', 'resolved.json'), path.join(root, '.orchestra', 'resolved.json'));
}

// The model is told the branch and the worktree on every action, so it never guesses where the commits went.
function answer(project, root, action) {
  const out = { ...(action.action === 'dispatch' ? withPrompt(action, root) : action), branch: git(root, 'branch', '--show-current'), worktree: path.relative(project, root) };
  if (action.action !== 'done') return out;
  const kept = worktree.remove(project, root);
  if (kept) return { ...out, kept };
  delete out.worktree;
  return out;
}
```

`step` keeps calling `load(project)` and reading `.orchestra/config.json` from the folder it gets, which is now the run root (the config of the base commit, the copied `resolved.json`).

Replace the CLI block:

```js
if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = name => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  try {
    const task = opt('--task-file');
    console.log(JSON.stringify(drive(process.cwd(), task ? ['--task-file', task] : [], { resume: argv.includes('--resume'), branch: opt('--branch') })));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
    process.exitCode = 1;
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add plugins/orchestra/bin/drive.js plugins/orchestra/lib/protocol.js test/orchestra/drive.test.js test/orchestra/protocol.test.js
git commit -m "feat(orchestra): every run works in its own worktree (S74)"
```

---

### Task 4: The ignore rule, the run skill and the versions

**Files:**
- Modify: `plugins/orchestra/lib/check.js` (`checkProject`)
- Modify: `plugins/orchestra/skills/run/SKILL.md`
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` (the project config section)
- Modify: `plugins/*/plugin.json`, `plugins/*/.claude-plugin/plugin.json` (six files) → `"version": "0.11.0"`
- Test: `test/orchestra/check.test.js`

**Interfaces:**
- Consumes: `DIR` from `lib/worktree.js`.
- Produces: one new `checkProject` failure: `.gitignore: .orchestra/worktrees/ is not ignored. Fix: add the lines .orchestra/* and !.orchestra/config.json to .gitignore, or run orchestra init.`

- [ ] **Step 1: Write the failing test**

Append to `test/orchestra/check.test.js`:

```js
test('the project must ignore the run worktrees', () => {
  const both = { workflow: wf, 'stack-skills': st };
  const dir = project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, both);
  fs.writeFileSync(path.join(dir, '.gitignore'), 'tmp/\n');
  const out = checkProject(dir);
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /^\.gitignore: \.orchestra\/worktrees\/ is not ignored\. Fix: .+\.$/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/orchestra/check.test.js`
Expected: FAIL, `out.length` is 0.

- [ ] **Step 3: The rule**

In `checkProject`, just before the final `return out;`, add:

```js
  // A run's worktree lives in the project (S74). Not ignored, it shows in the user's git status.
  try {
    execFileSync('git', ['check-ignore', '-q', `${DIR}/x`], { cwd: project, stdio: 'ignore' });
  } catch {
    out.push(`.gitignore: ${DIR}/ is not ignored. Fix: add the lines .orchestra/* and !.orchestra/config.json to .gitignore, or run orchestra init.`);
  }
```

Import `DIR` with `const { DIR } = require('./worktree');`. `execFileSync` is already imported in `check.js`.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS. The other `checkProject` tests use `makeRepo()`, whose `.gitignore` already has `.orchestra/*`.

- [ ] **Step 5: The run skill**

In `plugins/orchestra/skills/run/SKILL.md`, section "3. Drive":
- Replace the sentence "When the user gave a task, tell them first what the start does: it checks out the default branch, pulls it from the remote with `git pull --rebase`, and switches to a new branch `task/<name>`." with: "When the user gave a task, tell them first what the start does: it fetches `origin/<default>` and starts a new branch `task/<name>` in its own worktree, `.orchestra/worktrees/<branch>`. Their checkout, its branch and its files are not touched."
- Replace "If the user gave no task, this is a resume. Run `node <orchestra>/bin/drive.js --resume`." with: "If the user gave no task, this is a resume. Run `node <orchestra>/bin/drive.js --resume`, with `--branch <name>` when the user names a branch. When it fails because several runs are open, show the branches and ask which one."
- Replace "It always names the current `branch`. Tell the user the branch once, when the run starts." with: "It names the run's `branch`, and `worktree`, the run's folder, while the run is open. Tell the user both once, when the run starts. Every path in the action is relative to `worktree`."
- `done`: "tell the user the run is done, on which `branch`, and that they read the report with `git show <branch>:<report>`. If the action has `kept`, say the worktree `<worktree>` was kept and show `kept`."
- `failed`: "show the `reason`, the `branch`, and `<worktree>/<report>`, if there is one."
- `decide`: "the notes folder" becomes "the notes folder inside `<worktree>`"; and "show … the `report` path" becomes "show … `<worktree>/<report>`".
- Under "Permitted actions", the first line becomes: "Do not edit project files yourself. Subagents do the work in the run's worktree. The one exception: the user's answers to a `decide`, written to `decisions.md` inside the worktree as above."

- [ ] **Step 6: writing-plugins, the project config**

In `plugins/orchestra/skills/writing-plugins/SKILL.md`, section "The project config", add: "`.gitignore` must ignore `.orchestra/*` except `.orchestra/config.json`: each run works in a worktree under `.orchestra/worktrees/`. orchestra check fails otherwise."

- [ ] **Step 7: Versions**

Set `"version": "0.11.0"` in `plugins/orchestra/plugin.json`, `plugins/orchestra/.claude-plugin/plugin.json`, and the same two files of `orc-standard-workflow` and `orc-java-stack`. Run `npm test` (the packaging test checks that each pair agrees).

- [ ] **Step 8: Commit**

```bash
git add plugins test/orchestra/check.test.js
git commit -m "feat(orchestra): the worktree ignore rule, the run skill; plugins 0.11.0 (S74)"
```

---

### Task 5: The docs

**Files:**
- Modify: `docs/TENSIONS.md`, `docs/DECISIONS.md`, `docs/DESIGN.md`, `docs/CONTEXT.md`, `docs/guide.html`
- Modify: `docs/superpowers/specs/2026-10-14-orchestra-worktrees-design.md` (the two amendments)

- [ ] **Step 1: The decision**

`docs/TENSIONS.md`: add after S73:

```markdown
| S74 | Every run works in its own git worktree at `.orchestra/worktrees/<branch>`, inside the project and git-ignored, so a run never switches, pulls into or commits in the user's checkout. orchestra creates it detached at `origin/<default>` after a fetch; the workflow only creates its branch from that HEAD. Runs are found with `git worktree list`, with no state file; `--branch` picks one when several are open. On `done` the worktree is removed without force and the branch stays; on `decide` and `failed` it stays. The config comes from the base commit; only `resolved.json` is copied in. This narrows S17 and §8.3 (`prepare`) and closes O9. Research: R8. Full record: `docs/DECISIONS.md`. | User decision, R8 |
```

Remove the O9 row from the "Later" table.

`docs/DECISIONS.md`: append an `## S74: Runs work in a git worktree` entry in the file's format. Question: how a run stays out of the user's checkout. Options, each with its trade-off, from the brainstorm: (1) where: in the project / sibling folder / home folder; (2) on done: remove / keep / keep with a clean command; (3) base: `origin/<default>` / fast-forwarded local / local as is; (4) owner: orchestra / workflow / config option. Evidence: R8, the scratch-repo measurements in it. Decision: as the S74 row, plus the two plan amendments (report path, config from the base commit). Cost and risk: unpushed local commits are not in a run; no untracked files (`.env`) and no build output in a fresh worktree; an old in-place run cannot resume after the upgrade; IDEs may index the worktree; not run on Codex. Where it lives: `orchestra/lib/worktree.js`, `orchestra/bin/drive.js`, `orchestra/lib/protocol.js`, `orchestra/lib/check.js`, `orc-standard-workflow/bin/next.js`, the skills `orchestra:run` and `orchestra:writing-plugins`.

- [ ] **Step 2: DESIGN and CONTEXT**

- `docs/DESIGN.md` §8.3: replace steps 1-3 with: "1. orchestra has already created the run's worktree, detached at `origin/<default>` (S74). 2. Create `task/<slug>` from HEAD. The slug comes from the task text. Never check out, pull or switch." Renumber step 4 to 3.
- §7, row "State": append "Both folders are inside the run's worktree (S74)."; add a row "Worktree": "orchestra starts every run in `.orchestra/worktrees/<branch>`, detached at the base. The workflow creates its branch there and never checks out, pulls or switches (S74)."
- §6.6: append "A stopped run keeps its worktree; a call without a task finds it with `git worktree list` (S74)."
- `docs/CONTEXT.md`: add rows **Worktree** ("The git worktree of one run, `.orchestra/worktrees/<branch>`. Git-ignored. Removed when the run is done; the branch stays."), **Project root** ("The user's checkout. orchestra reads `.orchestra/` there and never changes anything else.") and **Run root** ("The run's worktree. Every stage, gate, build and commit of the run happens there."). In **Run folder** and **Notes folder**, add "inside the run root".

- [ ] **Step 3: The spec**

Add a section "Amendments (planning)" to the spec with the two amendments at the top of this plan.

- [ ] **Step 4: The guide**

In `docs/guide.html`:
- The rail (`Field guide · plugins … · decisions to …`) and the footer ("This guide matches plugin version …"): `0.11.0` and `S74`.
- `#setup` ("Set up and start"): the start fetches `origin/<default>` and works in `.orchestra/worktrees/<branch>`; the user's checkout is not touched.
- `#answer` ("Answer a question"): `decisions.md` is inside the worktree.
- `#readreport`: on `done`, read the report with `git show <branch>:docs/runs/<branch>/report.md`.
- `#guards` ("Guardrails"): add a row: "The run works in its own worktree." / "A run that moves your branch or touches your files."
- `#files`: the run folder and the notes folder are inside the worktree.
- `#ctrl-map` ("Code map"): add `lib/worktree.js`.
- `#status`: the "runs in a separate worktree" item moves out of the "later" row into its own row, `built`.
- `#key-decisions`: a row `S74`: "Every run works in its own git worktree." / "From the first real run: a run moved the user's branch (O9)."

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: runs work in a git worktree (S74)"
```

---

### Task 6: A real run (the human)

The success line of the spec. On `~/Projects-other/orchestra-sample-java`:

1. `git switch main`, commit `.orchestra/config.json` if needed, and push it.
2. Make an uncommitted edit, for example `echo x >> README.md`.
3. In a new Claude Code session there: `orchestra run: Add a minimum order check to PriceCalculator: total(amount) rejects an amount below 1.00 with an IllegalArgumentException.`
4. Expected: the run ends `done`; `git branch --show-current` is still `main`; `git diff` still shows the `README.md` edit; `.orchestra/worktrees/` is empty; `git log --oneline main..task/<name>` shows the run's commits.
