#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateAction, withPrompt, inlinePrompt, guidesFor, roleError } = require('../lib/protocol');
const { load } = require('../lib/resolved');
const runner = require('../lib/runner');
const { writeReport } = require('../lib/report');
const worktree = require('../lib/worktree');
const curator = require('../lib/curator');
const { git, dirtyFiles, commitAll, commitRunDir } = require('../lib/git');

function callNext(nextJs, project, args) {
  const out = execFileSync(process.execPath, [nextJs, '--project', project, ...args], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

function finish(project, action, resolved) {
  if (!action.runDir) return action;
  const report = writeReport(project, action.runDir, action, resolved);
  commitRunDir(project, path.dirname(report), `orchestra: run notes (${action.action})`);
  return { ...action, report };
}

// Subagents should commit their work. When one does not, commit it here, so the gates review it.
function commitLeftovers(project) {
  const branch = git(project, 'branch', '--show-current');
  if (!branch.startsWith('task/') || !fs.existsSync(path.join(project, 'tmp', 'runs', branch, 'run.json'))) return;
  commitAll(project, 'orchestra: commit work left uncommitted');
}

// A Curator setup that runs on its own branch, apart from any feature run (S77).
const SETUP = 'curator/setup';

// Starts or finds the run's worktree, then drives the run there. The checkout is never touched (S74).
function drive(project, extraArgs = [], { resume = false, branch, setup = false, skipSetup = false } = {}) {
  project = fs.realpathSync(project);
  load(project);
  if (setup) return startSetup(project);
  if (extraArgs.length) return start(project, path.resolve(project, extraArgs[1]), skipSetup);
  const runs = [...worktree.find(project), ...worktree.find(project, SETUP, '')].filter(r => !branch || r.branch === branch);
  if (!runs.length) return { action: 'failed', reason: branch ? `No run on branch "${branch}".` : 'No run to resume. Start a run with a task.' };
  if (runs.length > 1) return { action: 'failed', reason: `Several runs are open: ${runs.map(r => r.branch).join(', ')}. Name one with --branch <name>.` };
  const root = runs[0].root;
  if (configDiffers(project, root)) return { action: 'failed', reason: configReason("the run's base commit") };
  copyResolved(project, root);
  if (runs[0].branch.startsWith(SETUP)) return answer(project, root, setupStep(root, runs[0].branch));
  return answer(project, root, step(root, [], resume));
}

// orchestra check validated the checkout's config; the run reads the worktree's, which is the one on origin.
const readConfig = dir => JSON.parse(fs.readFileSync(path.join(dir, '.orchestra', 'config.json'), 'utf8'));
const configDiffers = (project, root) => !isDeepStrictEqual(readConfig(project), readConfig(root));
const configReason = base => `.orchestra/config.json in your checkout differs from the one on ${base}. Commit and push it, then run again.`;

// A detached worktree on origin/<default> whose config matches the checkout's, or a failed action.
function open(project) {
  const made = worktree.create(project);
  if (made.failed) return { failed: { action: 'failed', reason: made.failed } };
  const reason = !fs.existsSync(path.join(made.root, '.orchestra', 'config.json'))
    ? `.orchestra/config.json is not on ${made.base}. Commit and push it, then run again.`
    : configDiffers(project, made.root) ? configReason(made.base) : null;
  if (reason) {
    worktree.remove(project, made.root);
    return { failed: { action: 'failed', reason } };
  }
  copyResolved(project, made.root);
  return made;
}

function start(project, taskFile, skipSetup) {
  const made = open(project);
  if (made.failed) return made.failed;
  let root = made.root;
  // Setup never runs inside a feature run (S77): with no flag on the base, no task branch is made.
  const resolved = load(root);
  if (!skipSetup && curator.setUp(root, resolved) === false) {
    worktree.remove(project, root);
    const c = resolved.slots.curator;
    return { action: 'setup', skill: `${c.plugin}:${c.declaration.setup.skill}`, base: made.base, reason: `The Curator is configured, but it is not set up on ${made.base}: ${c.declaration.setup.done} is missing.` };
  }
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

function startSetup(project) {
  const busy = worktree.find(project, SETUP, '');
  if (busy.length) return { action: 'failed', reason: `A Curator setup is open on ${busy[0].branch}. Run orchestra run with no task to go on with it.` };
  const made = open(project);
  if (made.failed) return made.failed;
  const set = curator.setUp(made.root, load(made.root));
  if (set !== false) {
    worktree.remove(project, made.root);
    return { action: 'failed', reason: set ? `The Curator is already set up on ${made.base}.` : 'No Curator is configured in .orchestra/config.json.' };
  }
  const taken = git(project, 'for-each-ref', '--format=%(refname:lstrip=-2)', 'refs/heads/curator', 'refs/remotes/origin/curator').split('\n');
  let name = SETUP;
  for (let n = 2; taken.includes(name); n++) name = `${SETUP}-${n}`;
  git(made.root, 'switch', '-q', '-c', name);
  fs.mkdirSync(path.join(made.root, 'tmp', 'runs', name), { recursive: true });
  const root = worktree.rename(project, made.root, name);
  return answer(project, root, setupStep(root, name));
}

// The setup branch has no run: inline setup until the flag is written, then the worktree goes and the branch stays.
function setupStep(root, branch) {
  return curator.setup(root, path.join('tmp', 'runs', branch), load(root)) || { action: 'setup-done' };
}

// The run folder is git-ignored, so it would go with the worktree. A copy in the checkout keeps the logs for local debugging.
function keepRunFolder(project, root, branch) {
  const to = path.join(project, 'tmp', 'runs', branch);
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'tmp', 'runs', branch), to, { recursive: true });
}

// The model is told the branch and the worktree on every action, so it never guesses where the commits went.
function answer(project, root, action) {
  const prompts = {
    dispatch: a => withPrompt(a, root, guidesFor(a.role, load(root), readConfig(root))),
    inline: a => ({ ...a, prompt: inlinePrompt(a, root) }),
  };
  const prompted = prompts[action.action] ? prompts[action.action](action) : action;
  const out = { ...prompted, branch: git(root, 'branch', '--show-current'), worktree: path.relative(project, root) };
  if (action.action !== 'done' && action.action !== 'setup-done') return out;
  if (action.action === 'done') keepRunFolder(project, root, out.branch);
  const kept = worktree.remove(project, root);
  if (kept) return { ...out, kept };
  delete out.worktree;
  return out;
}

// Result names sort wrong (code-1, code-3, plan-check, plan, spec), so the report takes the dispatch order from here.
function remember(project, a) {
  const file = path.join(project, a.runDir, 'stages.json');
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const name = path.basename(a.result);
  if (!list.includes(name)) fs.writeFileSync(file, JSON.stringify([...list, name]) + '\n');
}

function step(project, extraArgs, resume) {
  const resolved = load(project);
  if (resume) {
    // Between two calls of orchestra run, only the user changes files. Never commit them into the task.
    const dirty = dirtyFiles(project);
    if (dirty.length) {
      const files = dirty.slice(0, 5).join(', ') + (dirty.length > 5 ? ', …' : '');
      return { action: 'failed', reason: `Files changed since the run stopped: ${files}. If a stopped subagent left them, commit them. If a stopped curate left them, discard them; it runs again. If they are yours, stash them. Then run again.` };
    }
  } else if (!extraArgs.length) {
    commitLeftovers(project);
  }
  const config = JSON.parse(fs.readFileSync(path.join(project, '.orchestra', 'config.json'), 'utf8'));
  const nextJs = path.join(resolved.slots.workflow.dir, 'bin', 'next.js');
  let args = extraArgs;
  for (;;) {
    const a = validateAction(callNext(nextJs, project, args));
    args = [];
    if (a.action === 'dispatch') {
      const bad = roleError(a, resolved.slots.workflow.declaration);
      if (bad) return finish(project, { action: 'failed', reason: bad, runDir: a.runDir }, resolved);
      remember(project, a);
      return a;
    }
    // A run that went on without setup (S77) has no Curator docs to curate.
    if (a.action === 'done' && curator.setUp(project, resolved) === false) a.note = 'curate skipped: the Curator is not set up';
    else if (a.action === 'done') {
      const c = curator.curate(project, a.runDir, resolved);
      if (c) return c.action === 'failed' ? finish(project, c, resolved) : c;
    }
    if (a.action === 'decide' && a.result) remember(project, a);
    if (a.action !== 'phase') return finish(project, a, resolved);
    const r = runner.step({ project, runDir: a.runDir, phase: a.name, resolved, config });
    if (r.action === 'dispatch') return r;
    const phaseResult = path.join(project, a.runDir, `phase-${a.name}.result.json`);
    fs.writeFileSync(phaseResult, JSON.stringify({ stage: `phase-${a.name}`, ...r }, null, 2) + '\n');
    if (r.status !== 'ok') {
      return finish(project, { action: r.status, runDir: a.runDir, reason: r.reason, gate: r.gate, questions: r.questions }, resolved);
    }
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = name => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  try {
    const task = opt('--task-file');
    console.log(JSON.stringify(drive(process.cwd(), task ? ['--task-file', task] : [], { resume: argv.includes('--resume'), branch: opt('--branch'), setup: argv.includes('--setup'), skipSetup: argv.includes('--skip-setup') })));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
    process.exitCode = 1;
  }
}

module.exports = { drive };
