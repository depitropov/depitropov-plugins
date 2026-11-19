'use strict';
// What a workflow's next.js may use from the engine. The engine passes its folder as --orchestra.
const fs = require('node:fs');
const path = require('node:path');
const { load, readJson } = require('./resolved');
const { buildStep, slotValues } = require('./gates');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// The build the engine runs, with the project's override, and the workflow slot's config values.
function settings(project) {
  const resolved = load(project);
  const config = readJson(path.join(project, '.orchestra', 'config.json')) || {};
  const declaration = resolved.slots.workflow.declaration;
  return { build: buildStep(resolved, config).run, config: slotValues(declaration, config.workflow || {}) };
}

// A result file is written by a subagent, so it can be malformed. Treat that as a failed step.
function readResult(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { status: 'failed', reason: `Invalid result JSON in ${file}: ${e.message}` };
  }
}

// A failed step stops the call once. When the run is called again, the step runs again (S32).
function reportOnce(file, res) {
  if (res.reported) return false;
  writeJson(file, { ...res, reported: true });
  return true;
}

// A subagent that writes no result is dispatched once more. Then the step fails (S69).
function noResult(file, name) {
  const sent = `${file}.sent`;
  const count = fs.existsSync(sent) ? Number(fs.readFileSync(sent, 'utf8')) : 0;
  if (count < 2) {
    fs.writeFileSync(sent, String(count + 1));
    return null;
  }
  fs.rmSync(sent);
  const res = { status: 'failed', reason: `${name} wrote no result after 2 dispatches.`, reported: true };
  writeJson(file, res);
  return res;
}

// An answer is a `## <name>` section in decisions.md.
function countAnswers(docsAbs, name) {
  const file = path.join(docsAbs, 'decisions.md');
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(line => line.trim() === `## ${name}`).length;
}

// For a decide result: the first read records how many answers exist (`seen`). Only a later answer is new.
function newAnswer(file, res, docsAbs, name) {
  const answers = countAnswers(docsAbs, name);
  if (res.seen === undefined) {
    writeJson(file, { ...res, seen: answers });
    return false;
  }
  return answers > res.seen;
}

// The one place that names the result file of a phase.
const phaseResultName = phase => `phase-${phase}.result.json`;
const phaseFile = (project, runDir, phase) => path.join(project, runDir, phaseResultName(phase));

function writePhaseResult(project, runDir, phase, result) {
  writeJson(phaseFile(project, runDir, phase), result);
}

function phaseDone(project, runDir, phase) {
  const res = readResult(phaseFile(project, runDir, phase));
  return Boolean(res && res.status === 'ok');
}

module.exports = { phaseResultName, settings, readResult, reportOnce, noResult, countAnswers, newAnswer, writePhaseResult, phaseDone };
