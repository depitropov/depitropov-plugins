'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { git } = require('./git');
const { PHASES } = require('./protocol');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function counts(r) {
  return r.counts ? Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ') : '';
}

// Workflow stages first, then each phase in phase order: its steps as they ran, each with its fixer rounds.
function runOrder(abs, files) {
  const results = files.filter(f => f.endsWith('.result.json'));
  const ordered = [];
  const take = f => {
    if (results.includes(f) && !ordered.includes(f)) ordered.push(f);
  };
  results.filter(f => !f.startsWith('phase-') && !PHASES.some(p => f.startsWith(`${p}.`))).forEach(take);
  for (const phase of PHASES) {
    const state = files.includes(`${phase}.state.json`) ? readJson(path.join(abs, `${phase}.state.json`)) : null;
    for (const s of state ? state.steps : []) {
      take(`${phase}.${s.name}.result.json`);
      results.filter(f => f.startsWith(`${phase}.${s.name}.fix`)).forEach(take);
    }
    take(`phase-${phase}.result.json`);
  }
  results.forEach(take);
  return ordered;
}

function status(r) {
  return r.step.startsWith('phase-') && r.status === 'ok' && r.gates === 0 ? 'ok (no gates)' : r.status;
}

function writeReport(project, runDir, final, resolved) {
  const abs = path.join(project, runDir);
  const files = fs.readdirSync(abs).sort();
  const run = files.includes('run.json') ? readJson(path.join(abs, 'run.json')) : null;
  const results = runOrder(abs, files).map(f => ({ ...readJson(path.join(abs, f)), step: f.replace('.result.json', '') }));
  const skipped = files.filter(f => f.endsWith('.state.json')).flatMap(f =>
    (readJson(path.join(abs, f)).skipped || []).map(s => `${f.replace('.state.json', '')}: ${s.name} (${s.why})`));
  const commits = run ? git(project, 'log', '--oneline', `${run.base}..HEAD`) : '';
  const evaluate = results.flatMap(r => [
    ...(r.status === 'evaluate' ? [`${r.step}: ${r.reason}`] : []),
    ...(Array.isArray(r.evaluate) ? r.evaluate.map(e => `${r.step}: ${e}`) : []),
  ]);
  const list = items => (items.length ? items.map(i => `- ${i}`) : ['- none']);

  const lines = ['# Run report', '', `- Status: ${final.action}`];
  if (final.reason) lines.push(`- Reason: ${final.reason}`);
  if (run) lines.push(`- Branch: ${run.branch}`, `- Base: ${run.base}`);
  lines.push('', '## Plugins', '', ...list(Object.entries(resolved.slots).map(([slot, s]) => `${slot}: ${s.plugin} ${s.version}`)));
  lines.push('', '## Commits', '', ...list(commits ? commits.split('\n') : []));
  lines.push('', '## Results', '', '| Step | Status | Counts |', '|---|---|---|');
  for (const r of results) lines.push(`| ${r.step} | ${status(r)} | ${counts(r)} |`);
  lines.push('', '## Evaluate', '', ...list(evaluate));
  lines.push('', '## Skipped gates', '', ...list(skipped));
  if (final.action === 'decide') {
    lines.push('', '## Decide', '',
      `Write your answers in \`${runDir}/decisions.md\` under the heading \`## ${final.gate}\`, then run again.`, '',
      ...list(final.questions || []));
  }
  const rel = `${runDir}/report.md`;
  fs.writeFileSync(path.join(project, rel), lines.join('\n') + '\n');
  return rel;
}

module.exports = { writeReport };
