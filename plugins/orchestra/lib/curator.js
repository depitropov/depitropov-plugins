'use strict';
const fs = require('node:fs');
const path = require('node:path');

// The Curator runs in the main session, not in a subagent, so it can ask the user (S76): setup once,
// before the first stage, while its flag file is missing; curate when the workflow is done.

function readResult(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { status: 'failed', reason: `Invalid result JSON in ${file}: ${e.message}` };
  }
}

function inline(c, skill, name, runDir, inputs) {
  return { action: 'inline', skill: `${c.plugin}:${skill}`, inputs, result: `${runDir}/${name}.result.json`, runDir };
}

// No result: run the skill. ok: done. failed: stop this call once; the next call runs it again (S32).
function settle(project, a) {
  const file = path.join(project, a.result);
  const res = readResult(file);
  if (!res) return a;
  if (res.status === 'ok') return null;
  if (res.reported) {
    fs.rmSync(file);
    return a;
  }
  fs.writeFileSync(file, JSON.stringify({ ...res, status: 'failed', reported: true }, null, 2) + '\n');
  return { action: 'failed', reason: res.reason || `${a.skill} failed. See ${a.result}.`, runDir: a.runDir };
}

function setup(project, runDir, resolved) {
  const c = resolved.slots.curator;
  if (!c) return null;
  const { skill, done } = c.declaration.setup;
  if (fs.existsSync(path.join(project, done))) return null;
  const a = inline(c, skill, 'setup', runDir, { done });
  const res = readResult(path.join(project, a.result));
  // The flag, not the result, says that setup is done. An ok with no flag runs setup again, never loops.
  if (res && res.status === 'ok') {
    fs.rmSync(path.join(project, a.result));
    return { action: 'failed', reason: `${a.skill} ended ok but did not write ${done}. It runs again on the next call.`, runDir };
  }
  return settle(project, a);
}

function curate(project, runDir, resolved) {
  const c = resolved.slots.curator;
  if (!c) return null;
  const run = JSON.parse(fs.readFileSync(path.join(project, runDir, 'run.json'), 'utf8'));
  return settle(project, inline(c, c.declaration.curate, 'curate', runDir, { base: run.base, brief: run.spec, notes: run.docs }));
}

module.exports = { setup, curate };
