#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PHASES = ['implementation-check', 'conventions-check', 'finish'];

// The formats of the two documents this workflow writes. Every step that writes or checks one gets its path.
const SPEC_FORMAT = path.join(__dirname, '..', 'formats', 'spec.md');
const PLAN_FORMAT = path.join(__dirname, '..', 'formats', 'plan.md');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function slugify(text) {
  const firstLine = text.split('\n').find(line => line.trim()) || '';
  return firstLine.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 40).replace(/-+$/, '') || 'task';
}

function branchExists(cwd, branch) {
  try {
    git(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

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
  const run = { base, branch, spec: `${docs}/spec.md`, docs };
  fs.writeFileSync(path.join(project, runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
}

// The engine module, loaded from the folder the engine passes as --orchestra.
let wf;

function settings(project) {
  const { build, config } = wf.settings(project);
  const perCoder = config['tasks-per-coder'];
  if (!Number.isInteger(perCoder) || perCoder < 1) {
    throw new Error(`workflow.tasks-per-coder in .orchestra/config.json must be a whole number of 1 or more, not ${JSON.stringify(perCoder)}.`);
  }
  return { build, perCoder };
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// The answer lines (`- <question> → <answer>`) in every `## <name>` section of decisions.md.
function answerLines(docsAbs, name) {
  const file = path.join(docsAbs, 'decisions.md');
  if (!fs.existsSync(file)) return 0;
  let inSection = false;
  return fs.readFileSync(file, 'utf8').split('\n').filter(line => {
    if (line.startsWith('## ')) inSection = line.trim() === `## ${name}`;
    return inSection && line.startsWith('- ');
  }).length;
}

// One step of the workflow: dispatch it, or stop on its result. Returns null when the step is done.
// A Decide result starts the step again only on a new `## <step>` section in decisions.md.
function step(ctx, name, inputs, { skill = name, stage, judging } = {}) {
  const result = `${ctx.runDir}/${name}.result.json`;
  const file = path.join(ctx.project, result);
  let res = wf.readResult(file);
  const retry = res && ((res.status === 'failed' && !wf.reportOnce(file, res)) || (res.status === 'decide' && wf.newAnswer(file, res, path.join(ctx.project, ctx.run.docs), name)));
  if (retry) {
    // A coder that runs again reads its last failure from the log (the code skill reads this file).
    if (res.status === 'failed' && name.startsWith('code-')) {
      const log = path.join(ctx.project, ctx.run.docs, 'implementation-log.md');
      fs.mkdirSync(path.dirname(log), { recursive: true });
      fs.appendFileSync(log, `\n## T${inputs.from} — failed\n- Blockers: ${(res.reason || 'no reason given').replace(/\s*\n\s*/g, ' ')}\n`);
    }
    fs.rmSync(file);
    fs.rmSync(`${file}.sent`, { force: true });
    res = null;
  }
  if (!res) {
    const lost = wf.noResult(file, `Step ${name}`);
    if (lost) return { action: 'failed', reason: lost.reason, runDir: ctx.runDir };
    const decisionsFile = `${ctx.run.docs}/decisions.md`;
    const decisions = fs.existsSync(path.join(ctx.project, decisionsFile)) ? { decisions: decisionsFile } : {};
    return { action: 'dispatch', skill: `orc-standard-workflow:${skill}`, ...(stage ? { stage } : {}), ...(judging ? { judging: true } : {}), inputs: { ...inputs, ...decisions }, result, runDir: ctx.runDir };
  }
  if (res.status === 'failed') return { action: 'failed', reason: res.reason || `Step ${name} failed. See ${result}.`, runDir: ctx.runDir };
  if (res.status === 'decide') return { action: 'decide', step: name, questions: res.decide || [], runDir: ctx.runDir };
  return null;
}

// A business fact has no default (S60), so the run asks before anything is planned around a guess.
function openFacts(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return [...text.matchAll(/^\s*-\s*(business fact:.*)$/gm)].map(m => m[1].trim());
}

// The plan's task headings, not a count a model writes, decide which code chunks run.
function planTasks(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const numbers = [...text.matchAll(/^### T(\d+)\b/gm)].map(m => Number(m[1]));
  return numbers.length && numbers.every((n, i) => n === i + 1) ? numbers.length : 0;
}

function route(project, taskFile) {
  const s = settings(project);
  if (taskFile !== undefined) {
    prepare(project, fs.readFileSync(path.resolve(project, taskFile), 'utf8'));
  }
  const branch = git(project, 'branch', '--show-current');
  const runDir = `tmp/runs/${branch}`;
  const run = branch.startsWith('task/') ? readJson(path.join(project, runDir, 'run.json')) : null;
  if (!run) return { action: 'failed', reason: `No run on branch "${branch}". Start a run with a task.` };
  const ctx = { project, runDir, run };
  const notes = run.docs;
  const plan = `${notes}/plan.md`;
  const specStep = step(ctx, 'spec', { task: `${notes}/task.md`, notes, 'spec-format': SPEC_FORMAT }, { stage: 'spec' });
  if (specStep) return specStep;
  const facts = openFacts(path.join(project, run.spec));
  if (facts.length) {
    // A result file gives the stop its own row in the report, in run order.
    const result = `${runDir}/business-facts.result.json`;
    // Every question needs its own answer line; a partial answer stops the run again.
    const answered = answerLines(path.join(project, notes), 'business-facts') >= facts.length;
    writeJson(path.join(project, result), { status: answered ? 'ok' : 'decide', decide: facts });
    if (!answered) return { action: 'decide', step: 'business-facts', questions: facts, result, runDir };
  }
  const steps = [
    ['plan', { spec: run.spec, notes, 'spec-format': SPEC_FORMAT, 'plan-format': PLAN_FORMAT }],
    ['plan-check', { spec: run.spec, plan, notes, 'spec-format': SPEC_FORMAT, 'plan-format': PLAN_FORMAT }, { judging: true }],
  ];
  for (const [name, inputs, opts] of steps) {
    const a = step(ctx, name, inputs, { stage: 'plan', ...opts });
    if (a) return a;
  }
  const total = planTasks(path.join(project, plan));
  if (!total) {
    // Marked failed and reported, so the next call runs plan-check again (S32).
    const reason = `${plan} has no tasks numbered T1, T2, … in order. plan-check runs again on the next call.`;
    const checkFile = path.join(project, runDir, 'plan-check.result.json');
    writeJson(checkFile, { ...readJson(checkFile), status: 'failed', reason, reported: true });
    return { action: 'failed', reason, runDir };
  }
  for (let from = 1; from <= total; from += s.perCoder) {
    const to = Math.min(from + s.perCoder - 1, total);
    const a = step(ctx, `code-${from}`, { spec: run.spec, plan, from, to, base: run.base, build: s.build, notes, 'spec-format': SPEC_FORMAT }, { skill: 'code', stage: 'code' });
    if (a) return a;
  }
  for (const phase of PHASES) {
    if (!wf.phaseDone(project, runDir, phase)) return { action: 'phase', name: phase, runDir };
  }
  return { action: 'done', runDir };
}

// The `- Deviations:` lines of the coders' log that say something, each with its `## T<n>` heading.
function deviations(file) {
  if (!fs.existsSync(file)) return [];
  let task = '';
  return fs.readFileSync(file, 'utf8').split('\n').flatMap(line => {
    const h = line.match(/^## (T\d+)/);
    if (h) task = h[1];
    const d = line.match(/^- Deviations:\s*(.*)$/);
    return d && d[1].trim() && !/^none\b/i.test(d[1].trim()) ? [`${task}: ${d[1].trim()}`] : [];
  });
}

// The `- ` lines under the spec's `## Integration points`: what other repos must change.
function integrationPoints(file) {
  if (!fs.existsSync(file)) return [];
  let inside = false;
  return fs.readFileSync(file, 'utf8').split('\n').flatMap(line => {
    if (line.startsWith('## ')) inside = line.trim() === '## Integration points';
    return inside && line.startsWith('- ') ? [line.slice(2).trim()] : [];
  });
}

// The technical choices the steps recorded, in run order, each with its step.
function assumptions(project, runDir) {
  const order = name => ({ spec: 0, plan: 1, 'plan-check': 2 })[name] ?? 3 + Number(name.slice('code-'.length));
  return fs.readdirSync(path.join(project, runDir))
    .map(f => f.match(/^(spec|plan|plan-check|code-\d+)\.result\.json$/))
    .filter(Boolean)
    .map(m => m[1])
    .sort((a, b) => order(a) - order(b))
    .flatMap(name => {
      const res = wf.readResult(path.join(project, runDir, `${name}.result.json`));
      return res && Array.isArray(res.assumptions) ? res.assumptions.map(a => `${name}: ${a}`) : [];
    });
}

// Every action carries the report sections, because the engine writes the report on a failed phase too.
function next(project, taskFile, orchestraDir) {
  if (!orchestraDir) throw new Error('next.js needs --orchestra <dir>: the folder of the orchestra engine.');
  wf = require(path.resolve(orchestraDir, 'lib', 'workflow.js'));
  const a = route(project, taskFile);
  const run = a.runDir ? readJson(path.join(project, a.runDir, 'run.json')) : null;
  if (!run) return a;
  return {
    ...a,
    sections: {
      Assumptions: assumptions(project, a.runDir),
      Deviations: deviations(path.join(project, run.docs, 'implementation-log.md')),
      'Integration points': integrationPoints(path.join(project, run.spec)),
    },
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    console.log(JSON.stringify(next(opt('--project') || process.cwd(), opt('--task-file'), opt('--orchestra'))));
  } catch (e) {
    console.log(JSON.stringify({ action: 'failed', reason: e.message }));
  }
}

module.exports = { next, slugify };
