'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { checkProject } = require('./check');

const FILE = path.join('.orchestra', 'resolved.json');

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function pluginInfo(dir) {
  for (const manifest of ['plugin.json', path.join('.claude-plugin', 'plugin.json')]) {
    const info = readJson(path.join(dir, manifest));
    if (info) return { name: info.name, version: info.version };
  }
  throw new Error(`No plugin.json in ${dir}.`);
}

// Writes resolved.json from the folders the manifest skills reported, then runs orchestra check on the
// config, so a bad config stops the run before any subagent (S70).
function resolve(project, slotDirs, orchestraDir) {
  if (!readJson(path.join(project, '.orchestra', 'config.json'))) throw new Error('No .orchestra/config.json. Run orchestra init first.');
  const slots = {};
  for (const [slot, dir] of Object.entries(slotDirs)) {
    const info = pluginInfo(dir);
    slots[slot] = { plugin: info.name, version: info.version, dir: path.resolve(dir), declaration: readJson(path.join(dir, 'orchestra.json')) };
  }
  const resolved = { orchestra: { dir: path.resolve(orchestraDir) }, slots };
  fs.writeFileSync(path.join(project, FILE), JSON.stringify(resolved, null, 2) + '\n');
  const failures = checkProject(project);
  if (failures.length) throw new Error(failures.join('\n'));
  return resolved;
}

function load(project) {
  const resolved = readJson(path.join(project, FILE));
  if (!resolved) throw new Error('No .orchestra/resolved.json. orchestra run resolves the slots first.');
  return resolved;
}

module.exports = { FILE, readJson, resolve, load };
