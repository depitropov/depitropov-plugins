'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { git, EXCLUDE } = require('./git');
const { PHASES } = require('./protocol');
const { phaseResultName } = require('./workflow');
const { readJson } = require('./resolved');

const isPhaseResult = f => PHASES.some(p => f === phaseResultName(p));

const BUCKETS = ['decide', 'fix', 'report', 'noise'];

// The size of each bucket of a result, or empty when the result has none of the four lists.
function found(r) {
  if (!BUCKETS.some(b => Array.isArray(r[b]))) return '';
  return BUCKETS.map(b => `${b} ${Array.isArray(r[b]) ? r[b].length : 0}`).join(', ');
}

// Workflow steps first, then each phase in phase order: its steps as they ran, each with its fixer rounds.
function runOrder(abs, files) {
  const results = files.filter(f => f.endsWith('.result.json'));
  const ordered = [];
  const take = f => {
    if (results.includes(f) && !ordered.includes(f)) ordered.push(f);
  };
  if (files.includes('stages.json')) readJson(path.join(abs, 'stages.json')).forEach(take);
  results.filter(f => f !== 'curate.result.json' && !isPhaseResult(f) && !PHASES.some(p => f.startsWith(`${p}.`))).forEach(take);
  for (const phase of PHASES) {
    const state = files.includes(`${phase}.state.json`) ? readJson(path.join(abs, `${phase}.state.json`)) : null;
    for (const s of state ? state.steps : []) {
      take(`${phase}.${s.name}.result.json`);
      results.filter(f => f.startsWith(`${phase}.${s.name}.fix`)).forEach(take);
    }
    take(phaseResultName(phase));
  }
  results.forEach(take);
  return ordered;
}

function status(r) {
  return isPhaseResult(`${r.step}.result.json`) && r.status === 'ok' && r.gates === 0 ? 'ok (no gates)' : r.status;
}

// `sections` are the workflow's own report sections: title → lines.
function writeReport(project, runDir, final, resolved, sections = {}) {
  const abs = path.join(project, runDir);
  const files = fs.readdirSync(abs).sort();
  const run = files.includes('run.json') ? readJson(path.join(abs, 'run.json')) : null;
  const results = runOrder(abs, files).map(f => ({ ...readJson(path.join(abs, f)), step: f.replace('.result.json', '') }));
  // Gates the runner did not select, then gates that ran and skipped themselves.
  const skipped = [
    ...files.filter(f => f.endsWith('.state.json')).flatMap(f =>
      (readJson(path.join(abs, f)).skipped || []).map(s => `${f.replace('.state.json', '')}: ${s.name} (${s.why})`)),
    ...results.filter(r => r.status === 'skipped' && PHASES.some(p => r.step.startsWith(`${p}.`))).map(r => {
      const [phase, name] = r.step.split('.');
      return `${phase}: ${name} (${r.reason || 'the gate found nothing in scope'})`;
    }),
  ];
  const commits = run ? git(project, 'log', '--oneline', `${run.base}..HEAD`) : '';
  const reported = results.flatMap(r => [
    ...(r.status === 'report' ? [`${r.step}: ${r.reason}`] : []),
    ...(Array.isArray(r.report) ? r.report.map(e => `${r.step}: ${e}`) : []),
  ]);
  const list = items => (items.length ? items.map(i => `- ${i}`) : ['- none']);

  const lines = ['# Run report', '', `- Status: ${final.action}`];
  if (final.reason) lines.push(`- Reason: ${final.reason}`);
  if (final.note) lines.push(`- Note: ${final.note}`);
  if (run) lines.push(`- Branch: ${run.branch}`, `- Base: ${run.base}`);
  lines.push('', '## Plugins', '', ...list(Object.entries(resolved.slots).map(([slot, s]) => `${slot}: ${s.plugin} ${s.version}`)));
  lines.push('', '## Commits', '', ...list(commits ? commits.split('\n') : []));
  // Not git(): its trim would drop the leading space of the first stat line.
  const stat = run ? execFileSync('git', ['diff', '--stat', `${run.base}..HEAD`, '--', '.', ...EXCLUDE], { cwd: project, encoding: 'utf8' }).trimEnd() : '';
  if (stat) lines.push('', '```', stat, '```');
  lines.push('', '## Results', '', '| Step | Status | Found | Notes |', '|---|---|---|---|');
  for (const r of results) lines.push(`| ${r.step} | ${status(r)} | ${found(r)} | ${r.notes || ''} |`);
  for (const [title, items] of Object.entries(sections)) lines.push('', `## ${title}`, '', ...list(items));
  lines.push('', '## Report', '', ...list(reported));
  lines.push('', '## Skipped gates', '', ...list(skipped));
  const docs = run ? run.docs : runDir;
  const decisionsFile = path.join(project, docs, 'decisions.md');
  if (fs.existsSync(decisionsFile)) {
    // One level down, so the answers' `## <step>` headings stay inside this section.
    lines.push('', '## Decisions', '', fs.readFileSync(decisionsFile, 'utf8').trim().replace(/^#/gm, '##'));
  }
  if (final.action === 'decide') {
    lines.push('', '## Decide', '',
      `Add a new section \`## ${final.step}\` at the end of \`${docs}/decisions.md\` with your answers, then run again. ` +
      'Text added to an old section is not read as an answer.', '',
      'Write one line per question: `- <question> → <your answer>`.', '',
      ...list(final.questions || []));
  }
  fs.mkdirSync(path.join(project, docs), { recursive: true });
  const rel = `${docs}/report.md`;
  fs.writeFileSync(path.join(project, rel), lines.join('\n') + '\n');
  return rel;
}

module.exports = { writeReport };
