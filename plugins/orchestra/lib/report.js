'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { git, EXCLUDE } = require('./git');
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
  if (files.includes('stages.json')) readJson(path.join(abs, 'stages.json')).forEach(take);
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

// The `- ` lines under the brief's `## Integration points`: what other repos must change.
function integrationPoints(file) {
  if (!fs.existsSync(file)) return [];
  let inside = false;
  return fs.readFileSync(file, 'utf8').split('\n').flatMap(line => {
    if (line.startsWith('## ')) inside = line.trim() === '## Integration points';
    return inside && line.startsWith('- ') ? [line.slice(2).trim()] : [];
  });
}

function writeReport(project, runDir, final, resolved) {
  const abs = path.join(project, runDir);
  const files = fs.readdirSync(abs).sort();
  const run = files.includes('run.json') ? readJson(path.join(abs, 'run.json')) : null;
  const results = runOrder(abs, files).map(f => ({ ...readJson(path.join(abs, f)), step: f.replace('.result.json', '') }));
  const skipped = files.filter(f => f.endsWith('.state.json')).flatMap(f =>
    (readJson(path.join(abs, f)).skipped || []).map(s => `${f.replace('.state.json', '')}: ${s.name} (${s.why})`));
  const commits = run ? git(project, 'log', '--oneline', `${run.base}..HEAD`) : '';
  const assumptions = results.flatMap(r => (Array.isArray(r.assumptions) ? r.assumptions.map(a => `${r.step}: ${a}`) : []));
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
  // Not git(): its trim would drop the leading space of the first stat line.
  const stat = run ? execFileSync('git', ['diff', '--stat', `${run.base}..HEAD`, '--', '.', ...EXCLUDE], { cwd: project, encoding: 'utf8' }).trimEnd() : '';
  if (stat) lines.push('', '```', stat, '```');
  lines.push('', '## Results', '', '| Step | Status | Counts |', '|---|---|---|');
  for (const r of results) lines.push(`| ${r.step} | ${status(r)} | ${counts(r)} |`);
  lines.push('', '## Assumptions', '', ...list(assumptions));
  lines.push('', '## Deviations', '', ...list(deviations(path.join(project, run ? run.docs : runDir, 'implementation-log.md'))));
  lines.push('', '## Integration points', '', ...list(integrationPoints(path.join(project, run && run.spec ? run.spec : `${runDir}/brief.md`))));
  lines.push('', '## Evaluate', '', ...list(evaluate));
  lines.push('', '## Skipped gates', '', ...list(skipped));
  const docs = run ? run.docs : runDir;
  const decisionsFile = path.join(project, docs, 'decisions.md');
  if (fs.existsSync(decisionsFile)) {
    // One level down, so the answers' `## <gate>` headings stay inside this section.
    lines.push('', '## Decisions', '', fs.readFileSync(decisionsFile, 'utf8').trim().replace(/^#/gm, '##'));
  }
  if (final.action === 'decide') {
    lines.push('', '## Decide', '',
      `Add a new section \`## ${final.gate}\` at the end of \`${docs}/decisions.md\` with your answers, then run again. ` +
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
