'use strict';
const fs = require('node:fs');
const path = require('node:path');

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

function resolve(project, slotDirs, orchestraDir) {
  const config = readJson(path.join(project, '.orchestra', 'config.json'));
  if (!config) throw new Error('No .orchestra/config.json. Run orchestra init first.');
  for (const slot of Object.keys(slotDirs)) {
    if (!config[slot]) throw new Error(`Slot ${slot} is not in the config.`);
  }
  const slots = {};
  for (const [slot, section] of Object.entries(config)) {
    const dir = slotDirs[slot];
    if (!dir) throw new Error(`Slot ${slot}: no plugin folder given.`);
    const info = pluginInfo(dir);
    if (info.name !== section.plugin) {
      throw new Error(`Slot ${slot}: the config names ${section.plugin}, but ${dir} holds ${info.name}.`);
    }
    const declaration = readJson(path.join(dir, 'orchestra.json'));
    if (!declaration) throw new Error(`Slot ${slot}: ${info.name} has no orchestra.json.`);
    if (declaration.slot !== slot) {
      throw new Error(`Slot ${slot}: ${info.name} declares slot ${declaration.slot}.`);
    }
    slots[slot] = { plugin: info.name, version: info.version, dir: path.resolve(dir), declaration };
  }
  const resolved = { orchestra: { dir: path.resolve(orchestraDir) }, slots };
  fs.writeFileSync(path.join(project, FILE), JSON.stringify(resolved, null, 2) + '\n');
  return resolved;
}

function load(project) {
  const resolved = readJson(path.join(project, FILE));
  if (!resolved) throw new Error('No .orchestra/resolved.json. orchestra run resolves the slots first.');
  return resolved;
}

module.exports = { FILE, readJson, resolve, load };
