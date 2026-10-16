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

// Starts or finds the run's worktree, then drives the run there. The checkout is never touched (S74).
function drive(project, extraArgs = [], { resume = false, branch } = {}) {
  project = fs.realpathSync(project);
  load(project);
  if (extraArgs.length) return start(project, path.resolve(project, extraArgs[1]));
  const runs = worktree.find(project).filter(r => !branch || r.branch === branch);
  if (!runs.length) return { action: 'failed', reason: branch ? `No run on branch "${branch}".` : noRun(project) };
  if (runs.length > 1) return { action: 'failed', reason: `Several runs are open: ${runs.map(r => r.branch).join(', ')}. Name one with --branch <name>.` };
  const root = runs[0].root;
  if (configDiffers(project, root)) return { action: 'failed', reason: configReason("the run's base commit") };
  copyResolved(project, root);
  return answer(project, root, step(root, [], resume));
}

function noRun(project) {
  const current = git(project, 'branch', '--show-current');
  if (current.startsWith('task/') && fs.existsSync(path.join(project, 'tmp', 'runs', current, 'run.json'))) {
    return `The run on ${current} started in your checkout before orchestra 0.11.0 and cannot resume in a worktree. Finish it with orchestra 0.10, or start it again.`;
  }
  return 'No run to resume. Start a run with a task.';
}

// orchestra check validated the checkout's config; the run reads the worktree's, which is the one on origin.
const readConfig = dir => JSON.parse(fs.readFileSync(path.join(dir, '.orchestra', 'config.json'), 'utf8'));
const configDiffers = (project, root) => !isDeepStrictEqual(readConfig(project), readConfig(root));
const configReason = base => `.orchestra/config.json in your checkout differs from the one on ${base}. Commit and push it, then run again.`;

function start(project, taskFile) {
  const made = worktree.create(project);
  if (made.failed) return { action: 'failed', reason: made.failed };
  let root = made.root;
  if (!fs.existsSync(path.join(root, '.orchestra', 'config.json'))) {
    worktree.remove(project, root);
    return { action: 'failed', reason: `.orchestra/config.json is not on ${made.base}. Commit and push it, then run again.` };
  }
  if (configDiffers(project, root)) {
    worktree.remove(project, root);
    return { action: 'failed', reason: configReason(made.base) };
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
  const prompts = {
    dispatch: a => withPrompt(a, root, guidesFor(a.role, load(root), readConfig(root))),
    inline: a => ({ ...a, prompt: inlinePrompt(a, root) }),
  };
  const prompted = prompts[action.action] ? prompts[action.action](action) : action;
  const out = { ...prompted, branch: git(root, 'branch', '--show-current'), worktree: path.relative(project, root) };
  if (action.action !== 'done') return out;
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

function setupAction(project, runDir, resolved) {
  const held = curator.setup(project, runDir, resolved);
  if (!held) return null;
  if (held.action === 'failed') return finish(project, held, resolved);
  remember(project, held);
  return held;
}

function step(project, extraArgs, resume) {
  const resolved = load(project);
  if (resume) {
    // Between two calls of orchestra run, only the user changes files. Never commit them into the task.
    const dirty = dirtyFiles(project);
    if (dirty.length) {
      const files = dirty.slice(0, 5).join(', ') + (dirty.length > 5 ? ', …' : '');
      return { action: 'failed', reason: `Files changed since the run stopped: ${files}. If a stopped subagent left them, commit them; if they are yours, stash them. Then run again.` };
    }
  } else if (!extraArgs.length) {
    commitLeftovers(project);
  }
  const config = JSON.parse(fs.readFileSync(path.join(project, '.orchestra', 'config.json'), 'utf8'));
  const nextJs = path.join(resolved.slots.workflow.dir, 'bin', 'next.js');
  // On a running run, setup is checked before next.js, so a held-back dispatch never uses up the stage's dispatch count.
  const runDir = path.join('tmp', 'runs', git(project, 'branch', '--show-current'));
  if (!extraArgs.length && fs.existsSync(path.join(project, runDir, 'run.json'))) {
    const held = setupAction(project, runDir, resolved);
    if (held) return held;
  }
  let args = extraArgs;
  for (;;) {
    const a = validateAction(callNext(nextJs, project, args));
    args = [];
    if (a.action === 'dispatch') {
      const bad = roleError(a, resolved.slots.workflow.declaration);
      if (bad) return finish(project, { action: 'failed', reason: bad, runDir: a.runDir }, resolved);
      // ponytail: on the start call only, the held-back dispatch counts as one of the workflow's two dispatches of that stage; once per project.
      const held = setupAction(project, a.runDir, resolved);
      if (held) return held;
      remember(project, a);
      return a;
    }
    if (a.action === 'done') {
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
    console.log(JSON.stringify(drive(process.cwd(), task ? ['--task-file', task] : [], { resume: argv.includes('--resume'), branch: opt('--branch') })));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
    process.exitCode = 1;
  }
}

module.exports = { drive };
