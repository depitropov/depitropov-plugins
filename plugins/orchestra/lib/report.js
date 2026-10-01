'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { git } = require('./git');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function counts(r) {
  return r.counts ? Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ') : '';
}

function writeReport(project, runDir, final, resolved) {
  const abs = path.join(project, runDir);
  const files = fs.readdirSync(abs).sort();
  const run = files.includes('run.json') ? readJson(path.join(abs, 'run.json')) : null;
  const results = files.filter(f => f.endsWith('.result.json'))
    .map(f => ({ ...readJson(path.join(abs, f)), step: f.replace('.result.json', '') }));
  const skipped = files.filter(f => f.endsWith('.state.json')).flatMap(f =>
    (readJson(path.join(abs, f)).skipped || []).map(s => `${f.replace('.state.json', '')}: ${s.name} (${s.why})`));
  const commits = run ? git(project, 'log', '--oneline', `${run.base}..HEAD`) : '';
  const evaluate = results.filter(r => r.status === 'evaluate');
  const list = items => (items.length ? items.map(i => `- ${i}`) : ['- none']);

  const lines = ['# Run report', '', `- Status: ${final.action}`];
  if (final.reason) lines.push(`- Reason: ${final.reason}`);
  if (run) lines.push(`- Branch: ${run.branch}`, `- Base: ${run.base}`);
  lines.push('', '## Plugins', '', ...list(Object.entries(resolved.slots).map(([slot, s]) => `${slot}: ${s.plugin} ${s.version}`)));
  lines.push('', '## Commits', '', ...list(commits ? commits.split('\n') : []));
  lines.push('', '## Results', '', '| Step | Status | Counts |', '|---|---|---|');
  for (const r of results) lines.push(`| ${r.step} | ${r.status} | ${counts(r)} |`);
  lines.push('', '## Evaluate', '', ...list(evaluate.map(r => `${r.step}: ${r.reason}`)));
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
