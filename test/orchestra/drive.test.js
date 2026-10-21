'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, writeJson, git, writePlugin } = require('../helpers');
const { resolve } = require('../../plugins/orchestra/lib/resolved');
const { drive } = require('../../plugins/orchestra/bin/drive');

const PLUGINS = path.join(__dirname, '../../plugins');

// The run root of a live action, and the report of a finished run (its worktree is gone).
const wt = (dir, a) => path.join(dir, a.worktree);
const doneReport = (dir, a) => git(dir, 'show', `${a.branch}:${a.report}`);

function project({ curator } = {}) {
  const dir = makeRepo();
  const st = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  writePlugin(st, 'st', { slot: 'stack-skills', build: { run: 'node -e "process.exit(0)"', guide: 'fix-build' }, gates: [] });
  const config = { workflow: { plugin: 'orc-standard-workflow' }, 'stack-skills': { plugin: 'st' } };
  const dirs = { workflow: path.join(PLUGINS, 'orc-standard-workflow'), 'stack-skills': st };
  config['global-gates'] = { plugin: 'orc-global-gates' };
  dirs['global-gates'] = path.join(PLUGINS, 'orc-global-gates');
  if (curator) {
    const cur = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-'));
    writePlugin(cur, 'cur', { slot: 'curator', curate: 'curate', setup: { skill: 'setup', done: 'docs/curator/.setup' }, guides: { plan: 'guides/plan.md' } });
    config.curator = { plugin: 'cur' };
    dirs.curator = cur;
  }
  writeJson(path.join(dir, '.orchestra/config.json'), config);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  resolve(dir, dirs, path.join(PLUGINS, 'orchestra'));
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n');
  return dir;
}

// Passes plan-conformance and returns the logic-review dispatch.
function toReview(dir) {
  const pc = drive(dir);
  assert.equal(pc.skill, 'orc-standard-workflow:plan-conformance');
  writeJson(path.join(wt(dir, pc), pc.result), { stage: 'plan-conformance', status: 'ok' });
  return drive(dir);
}

// Passes the clean-code gate, which follows logic-review, and returns the next action.
function afterReview(dir) {
  const cc = drive(dir);
  assert.equal(cc.skill, 'orc-global-gates:clean-code');
  writeJson(path.join(wt(dir, cc), cc.result), { stage: 'clean-code', status: 'ok' });
  return drive(dir);
}

// Walks spec, plan and plan-check with ok results, and returns the first code dispatch.
function toCode(dir, tasks = 1) {
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  for (const stage of ['spec', 'plan']) {
    assert.equal(a.skill, `orc-standard-workflow:${stage}`);
    writeJson(path.join(wt(dir, a), a.result), { stage, status: 'ok' });
    a = drive(dir);
  }
  assert.equal(a.skill, 'orc-standard-workflow:plan-check');
  const tasks_ = Array.from({ length: tasks }, (_, i) => `### T${i + 1} — a task\n`).join('\n');
  fs.writeFileSync(path.join(wt(dir, a), a.inputs.plan), `# Plan\n\n${tasks_}`);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan-check', status: 'ok', counts: { patch: 1 } });
  return drive(dir);
}

test('a run goes from task to done: code, logic-review, report, committed run files', () => {
  const dir = project();
  const code = toCode(dir);
  assert.equal(code.skill, 'orc-standard-workflow:code');
  assert.equal(code.branch, 'task/add-a-discount');
  assert.match(code.prompt, /Invoke the skill `orc-standard-workflow:code`/);
  fs.writeFileSync(path.join(wt(dir, code), 'Discount.java'), 'class Discount {}\n');
  git(wt(dir, code), 'add', 'Discount.java');
  git(wt(dir, code), 'commit', '-m', 'feat: discount');
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok', assumptions: ['The limit applies before rounding.'] });

  const review = toReview(dir);
  assert.equal(review.skill, 'orc-standard-workflow:logic-review');
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok', counts: { patch: 1, evaluate: 1 }, evaluate: ['PriceCalculator.java:9 — null now throws; before it returned null'] });

  const done = afterReview(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.branch, 'task/add-a-discount');
  assert.equal(done.report, 'docs/runs/task/add-a-discount/report.md');
  assert.match(git(dir, 'ls-tree', '-r', '--name-only', done.branch, 'docs/runs'), /report\.md/);
  assert.match(git(dir, 'ls-tree', '-r', '--name-only', done.branch, 'docs/runs'), /task\.md/);
  assert.equal(git(dir, 'ls-tree', '-r', '--name-only', done.branch, 'tmp'), '');
  assert.ok(fs.existsSync(path.join(dir, 'tmp/runs/task/add-a-discount/run.json')), 'the run folder is copied to the checkout');
  assert.equal(git(dir, 'status', '--porcelain'), '');
  const report = doneReport(dir, done);
  assert.match(report, /- Status: done/);
  assert.match(report, /feat: discount/);
  const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '../../plugins/orc-standard-workflow/plugin.json'), 'utf8'));
  assert.ok(report.includes(`orc-standard-workflow ${version}`), report);
  assert.match(report, /\| implementation-check\.logic-review \| ok \| patch 1, evaluate 1 \|/);
  assert.equal(git(dir, 'log', '-1', '--format=%s', done.branch), 'orchestra: run notes (done)');
  assert.match(report, /- implementation-check\.logic-review: PriceCalculator\.java:9 — null now throws/);
  assert.match(report, /## Assumptions\n\n- code-1: The limit applies before rounding\./);
  assert.match(report, /\| phase-conventions-check \| ok \(no gates\) \|/);
  const order = ['| spec |', '| plan |', '| plan-check |', '| code-1 |', '| implementation-check.build |', '| implementation-check.plan-conformance |', '| implementation-check.logic-review |',
    '| phase-implementation-check |', '| phase-conventions-check |', '| finish.build |', '| phase-finish |'].map(row => report.indexOf(row));
  assert.ok(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), `rows out of run order: ${order}`);
});

test('a gate that skips itself is listed under Skipped gates', () => {
  const dir = project();
  const code = toCode(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const pc = drive(dir);
  writeJson(path.join(wt(dir, pc), pc.result), { stage: 'plan-conformance', status: 'skipped' });
  const review = drive(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const report = doneReport(dir, afterReview(dir));
  assert.match(report, /## Skipped gates\n\n- implementation-check: plan-conformance \(the gate found nothing in scope\)/);
});

test('a Decide ends the call with the questions and a report that says how to answer', () => {
  const dir = project();
  const code = toCode(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'decide', decide: ['Half up or half even? — options: up | even'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.deepEqual(stop.questions, ['Half up or half even? — options: up | even']);
  assert.match(fs.readFileSync(path.join(wt(dir, stop), stop.report), 'utf8'), /Add a new section `## logic-review`/);
});

test('drive throws when resolved.json is missing; the CLI prints that as failed', () => {
  const dir = makeRepo();
  assert.throws(() => drive(dir), /No \.orchestra\/resolved\.json/);
});

test('work a subagent left uncommitted is committed before the next step', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(wt(dir, code), 'Discount.java'), 'class Discount {}\n');
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  drive(dir);
  assert.match(git(wt(dir, code), 'log', '--format=%s'), /orchestra: commit work left uncommitted/);
  assert.equal(git(wt(dir, code), 'status', '--porcelain', '--', 'Discount.java'), '');
});

test('a call with no task and no run fails, and leaves the checkout alone', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'mine.txt'), 'x');
  const a = drive(dir);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /No run to resume\. Start a run with a task\./);
  assert.match(git(dir, 'status', '--porcelain'), /mine\.txt/);
});

test('a plan-check Decide ends the call before any code, with how to answer', () => {
  const dir = project();
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'spec', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan-check', status: 'decide', decide: ['business fact: the rate? — options: 5% | 10%'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  const text = fs.readFileSync(path.join(wt(dir, stop), stop.report), 'utf8');
  assert.match(text, /Add a new section `## plan-check` at the end of `docs\/runs\/task\/add-a-discount\/decisions\.md`/);
  assert.match(text, /Text added to an old section is not read as an answer/);
});

test('chunked code steps keep run order in the report', () => {
  const dir = project();
  const c1 = toCode(dir, 3);
  writeJson(path.join(wt(dir, c1), c1.result), { stage: 'code', status: 'ok' });
  const c3 = drive(dir);
  assert.match(c3.result, /code-3\.result\.json$/);
  writeJson(path.join(wt(dir, c3), c3.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const report = doneReport(dir, afterReview(dir));
  const order = ['| spec |', '| plan |', '| plan-check |', '| code-1 |', '| code-3 |'].map(row => report.indexOf(row));
  assert.ok(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), `rows out of run order: ${order}`);
});

test('the report copies decisions.md, with its headings one level down', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(wt(dir, code), 'docs/runs/task/add-a-discount/decisions.md'), '## business-facts\n\nThe VIP rate is 10%.\n');
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const report = doneReport(dir, afterReview(dir));
  assert.match(report, /## Decisions\n\n### business-facts\n\nThe VIP rate is 10%\./);
  assert.doesNotMatch(report, /^## business-facts$/m);
});

test('a resume with changed files stops and names them, and commits nothing', () => {
  const dir = project();
  const code = toCode(dir);
  const head = git(wt(dir, code), 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(wt(dir, code), 'mine.txt'), 'x');
  const a = drive(dir, [], { resume: true });
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /mine\.txt/);
  assert.match(a.reason, /If a stopped subagent left them, commit them/);
  assert.equal(git(wt(dir, code), 'rev-parse', 'HEAD'), head);
});

test('a resume with only notes changed goes on', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(wt(dir, code), 'docs/runs/task/add-a-discount/decisions.md'), '## plan-check\n\nok\n');
  assert.equal(drive(dir, [], { resume: true }).skill, code.skill);
});

test('the business-facts stop has a row between spec and plan', () => {
  const dir = project();
  const spec = drive(dir, ['--task-file', '.orchestra/task.txt']);
  fs.writeFileSync(path.join(wt(dir, spec), 'docs/runs/task/add-a-discount/brief.md'), '- business fact: the rate — options: 5% | 10%\n');
  writeJson(path.join(wt(dir, spec), spec.result), { stage: 'spec', status: 'ok' });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  const report = fs.readFileSync(path.join(wt(dir, stop), stop.report), 'utf8');
  assert.match(report, /\| business-facts \| decide \|/);
  assert.ok(report.indexOf('| spec |') < report.indexOf('| business-facts |'));
  assert.match(report, /- <question> → <your answer>/);
  fs.writeFileSync(path.join(wt(dir, stop), 'docs/runs/task/add-a-discount/decisions.md'), '## business-facts\n\n- business fact: the rate — options: 5% | 10% → 10%\n');
  const plan = drive(dir, [], { resume: true });
  assert.equal(plan.skill, 'orc-standard-workflow:plan');
});

test('a plan-conformance Decide stops the phase before logic-review', () => {
  const dir = project();
  const code = toCode(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const pc = drive(dir);
  writeJson(path.join(wt(dir, pc), pc.result), { stage: 'plan-conformance', status: 'decide', decide: ['Task 2 changed the API — options: keep | revert'] });
  const stop = drive(dir);
  assert.equal(stop.action, 'decide');
  assert.equal(stop.gate, 'plan-conformance');
});

test('the report lists real deviations, not "none", and the files changed', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(wt(dir, code), 'Price.java'), 'class Price {}\n');
  fs.writeFileSync(path.join(wt(dir, code), 'docs/runs/task/add-a-discount/implementation-log.md'),
    '## T1 — a task\n- Deviations: None. Used the plan as written.\n\n## T2 — a task\n- Deviations: used BigDecimal, not double\n');
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const report = doneReport(dir, afterReview(dir));
  assert.match(report, /## Deviations\n\n- T2: used BigDecimal, not double\n/);
  assert.doesNotMatch(report, /T1: none/);
  assert.match(report, /## Integration points\n\n- none\n/);
  assert.ok(report.indexOf('## Assumptions') < report.indexOf('## Deviations'));
  assert.match(report, /## Commits\n(?:(?!## Results)[\s\S])*```\n Price\.java \|/);
});

test('the report copies the brief\'s Integration points, or says none', () => {
  const dir = project();
  const code = toCode(dir);
  fs.writeFileSync(path.join(wt(dir, code), 'docs/runs/task/add-a-discount/brief.md'),
    '# Brief\n\n## Integration points\n- pricing API — needs a discount field — assumption\n\n## Assumptions\n- x\n');
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const report = doneReport(dir, afterReview(dir));
  assert.match(report, /## Deviations\n\n- none\n\n## Integration points\n\n- pricing API — needs a discount field — assumption\n\n## Evaluate/);
});

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
  const done = afterReview(dir);
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
  const done = afterReview(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.worktree, '.orchestra/worktrees/task/add-a-discount');
  assert.match(done.kept, /untracked|modified/);
});

test('a start with a local config that differs from origin fails and leaves no worktree', () => {
  const dir = project();
  const file = path.join(dir, '.orchestra/config.json');
  writeJson(file, { ...JSON.parse(fs.readFileSync(file, 'utf8')), gates: {} });
  const a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /differs from the one on origin\/main\. Commit and push it/);
  assert.equal(git(dir, 'worktree', 'list').split('\n').length, 1);
});

test('a resume with a local config that differs from the run\'s fails and keeps the worktree', () => {
  const dir = project();
  const first = drive(dir, ['--task-file', '.orchestra/task.txt']);
  const file = path.join(dir, '.orchestra/config.json');
  writeJson(file, { ...JSON.parse(fs.readFileSync(file, 'utf8')), gates: {} });
  const a = drive(dir);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /differs from the one on the run's base commit/);
  assert.ok(fs.existsSync(wt(dir, first)));
});

// The Curator's flag, committed and pushed on main, as setup on main leaves it.
function setUpOnMain(dir) {
  fs.mkdirSync(path.join(dir, 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/curator/.setup'), '');
  git(dir, 'add', 'docs/curator');
  git(dir, 'commit', '-m', 'docs(curator): setup done');
  git(dir, 'push');
}

// Writes and commits the flag in a setup worktree, with an ok result.
function finishSetup(dir, a) {
  const root = wt(dir, a);
  fs.mkdirSync(path.join(root, 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/curator/.setup'), '');
  git(root, 'add', 'docs/curator');
  git(root, 'commit', '-m', 'docs(curator): setup done');
  writeJson(path.join(root, a.result), { status: 'ok' });
}

test('with a curator not set up: the start makes no branch and no worktree, and says setup is needed', () => {
  const dir = project({ curator: true });
  const a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.deepEqual(a, { action: 'setup', skill: 'cur:setup', base: 'origin/main', reason: 'The Curator is configured, but it is not set up on origin/main: docs/curator/.setup is missing.' });
  assert.equal(git(dir, 'branch', '--list', 'task/*'), '');
  assert.equal(git(dir, 'worktree', 'list').split('\n').length, 1);
});

test('setup on its own branch: inline setup in a worktree, then the branch stays and the worktree goes', () => {
  const dir = project({ curator: true });
  const a = drive(dir, [], { setup: true });
  assert.equal(a.action, 'inline');
  assert.equal(a.skill, 'cur:setup');
  assert.equal(a.branch, 'curator/setup');
  assert.equal(a.worktree, '.orchestra/worktrees/curator/setup');
  assert.equal(a.result, 'tmp/runs/curator/setup/setup.result.json');
  assert.match(a.prompt, /in this session/);
  finishSetup(dir, a);
  const done = drive(dir);
  assert.deepEqual(done, { action: 'setup-done', branch: 'curator/setup' });
  assert.equal(git(dir, 'worktree', 'list').split('\n').length, 1);
  assert.match(git(dir, 'log', '--oneline', 'curator/setup'), /docs\(curator\): setup done/);
  assert.equal(drive(dir, [], { setup: true }).branch, 'curator/setup-2');
});

test('a failed setup on its branch stops once, then runs again', () => {
  const dir = project({ curator: true });
  const a = drive(dir, [], { setup: true });
  writeJson(path.join(wt(dir, a), a.result), { status: 'failed', reason: 'user said no' });
  const failed = drive(dir);
  assert.equal(failed.action, 'failed');
  assert.equal(failed.reason, 'user said no');
  assert.equal(drive(dir).action, 'inline');
  assert.match(drive(dir, [], { setup: true }).reason, /A Curator setup is open on curator\/setup\. Run orchestra run with no task to go on with it\./);
});

test('setup on its own branch fails when the Curator is set up or not configured', () => {
  const dir = project({ curator: true });
  setUpOnMain(dir);
  assert.equal(drive(dir, [], { setup: true }).reason, 'The Curator is already set up on origin/main.');
  assert.equal(drive(project(), [], { setup: true }).reason, 'No Curator is configured in .orchestra/config.json.');
});

test('a run that goes on without setup skips curate and says so in the report', () => {
  const dir = project({ curator: true });
  let a = drive(dir, ['--task-file', '.orchestra/task.txt'], { skipSetup: true });
  assert.equal(a.skill, 'orc-standard-workflow:spec');
  writeJson(path.join(wt(dir, a), a.result), { stage: 'spec', status: 'ok' });
  a = drive(dir);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan', status: 'ok' });
  a = drive(dir);
  fs.writeFileSync(path.join(wt(dir, a), a.inputs.plan), '# Plan\n\n### T1 — a task\n');
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan-check', status: 'ok' });
  const code = drive(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });
  const done = afterReview(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.note, 'curate skipped: the Curator is not set up');
  assert.match(doneReport(dir, done), /^- Note: curate skipped: the Curator is not set up$/m);
});

test('with a curator set up: plan gets the curator guide, curate runs on done and is last in the report', () => {
  const dir = project({ curator: true });
  setUpOnMain(dir);
  let a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(a.skill, 'orc-standard-workflow:spec');
  assert.doesNotMatch(a.prompt, /guides\/plan\.md/);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'spec', status: 'ok' });
  a = drive(dir);
  assert.equal(a.skill, 'orc-standard-workflow:plan');
  assert.match(a.prompt, /read each guide below and follow it:\n- `.*\/guides\/plan\.md`/);
  assert.doesNotMatch(a.prompt, /orc-curator:plan-guide|cur:plan-guide/);
  assert.ok(a.prompt.includes(`- \`${path.join(JSON.parse(fs.readFileSync(path.join(dir, '.orchestra/resolved.json'), 'utf8')).slots.curator.dir, 'guides/plan.md')}\``));
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan', status: 'ok' });
  a = drive(dir);
  fs.writeFileSync(path.join(wt(dir, a), a.inputs.plan), '# Plan\n\n### T1 — a task\n');
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan-check', status: 'ok' });
  const code = drive(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });

  const curate = afterReview(dir);
  assert.equal(curate.action, 'inline');
  assert.equal(curate.skill, 'cur:curate');
  assert.equal(curate.inputs.brief, 'docs/runs/task/add-a-discount/brief.md');
  fs.writeFileSync(path.join(wt(dir, curate), 'docs/curator/BACKLOG.md'), '# half done\n');
  const dirty = drive(dir, [], { resume: true });
  assert.match(dirty.reason, /If a stopped curate left them, discard them; it runs again\./);
  fs.rmSync(path.join(wt(dir, curate), 'docs/curator/BACKLOG.md'));
  writeJson(path.join(wt(dir, curate), curate.result), { status: 'ok' });

  const done = drive(dir);
  assert.equal(done.action, 'done');
  assert.equal(done.note, undefined);
  const rows = doneReport(dir, done).split('\n').filter(l => /^\| (spec|curate|phase-finish) \|/.test(l)).map(l => l.split(' | ')[0].slice(2));
  assert.deepEqual(rows, ['spec', 'phase-finish', 'curate']);
});

test('without a curator no action is inline', () => {
  const dir = project();
  const a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(a.action, 'dispatch');
  assert.equal(a.skill, 'orc-standard-workflow:spec');
});
