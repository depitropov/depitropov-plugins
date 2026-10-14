'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { PHASES, ACTIONS } = require('./protocol');

// The contract of a plugin declaration and of the project config. The skill writing-plugins explains
// every word in these lists; a test fails when one is missing there.
const SLOTS = ['workflow', 'stack-skills'];
const KINDS = ['tool', 'agent'];
const FIXES = ['self', 'fixer', 'none'];
const CONFIG_TYPES = ['string', 'number', 'boolean'];
const DECLARATION_KEYS = { workflow: ['slot', 'config', 'gates'], 'stack-skills': ['slot', 'config', 'build', 'guides', 'gates'] };
const GATE_KEYS = ['name', 'phase', 'kind', 'skill', 'run', 'fix', 'guide', 'max_rounds', 'files', 'grep', 'when', 'always'];
const BUILD_KEYS = ['run', 'guide', 'max_rounds'];
const GUIDE_KINDS = ['plan', 'code'];
const SECTION_KEYS = ['plugin', 'disable', 'gates'];
const CONFIG = '.orchestra/config.json';

const wholeNumber = v => Number.isInteger(v) && v >= 1;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const skillExists = (dir, name) => fs.existsSync(path.join(dir, 'skills', name, 'SKILL.md'));
const PLACEHOLDER = /\{config\.([\w-]+)\}/g;

// undefined when the file is missing, null when it is not valid JSON (and the failure is pushed).
function parseJson(file, label, out) {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    out.push(`${label} is not valid JSON: ${e.message}. Fix: correct the JSON.`);
    return null;
  }
}

function checkDeclaration(d, dir, where) {
  const out = [];
  const fail = (problem, fix) => out.push(`${where}: ${problem}. Fix: ${fix}.`);
  if (!isObject(d)) {
    fail('the declaration is not a JSON object', 'write orchestra.json as an object with a "slot" key');
    return out;
  }
  if (!SLOTS.includes(d.slot)) {
    fail(`"slot" is ${JSON.stringify(d.slot)}`, `set it to one of ${SLOTS.join(', ')}`);
    return out;
  }
  const allowed = DECLARATION_KEYS[d.slot];
  for (const key of Object.keys(d)) {
    if (!allowed.includes(key)) fail(`unknown key "${key}" for slot ${d.slot}`, `remove it; the allowed keys are ${allowed.join(', ')}`);
  }
  const config = isObject(d.config) ? d.config : {};
  for (const [key, spec] of Object.entries(config)) {
    if (SECTION_KEYS.includes(key)) fail(`config key "${key}" is reserved by orchestra`, 'rename it');
    if (!spec || !CONFIG_TYPES.includes(spec.type)) {
      fail(`config key "${key}" has type ${JSON.stringify(spec && spec.type)}`, `set "type" to one of ${CONFIG_TYPES.join(', ')}`);
    } else if (typeof spec.default !== spec.type) {
      fail(`config key "${key}" has no ${spec.type} default`, `add "default" with a ${spec.type} value`);
    }
  }
  const skill = (name, what) => {
    if (typeof name !== 'string') fail(`${what} names no skill`, 'name a skill of this plugin');
    else if (!skillExists(dir, name)) fail(`${what} names skill "${name}", which is not in skills/`, `add skills/${name}/SKILL.md or fix the name`);
  };
  const placeholders = (text, what) => {
    for (const m of String(text).matchAll(PLACEHOLDER)) {
      if (!config[m[1]]) fail(`${what} uses {config.${m[1]}}, which "config" does not declare`, `declare "${m[1]}" under "config" or fix the name`);
    }
  };
  if (d.slot === 'stack-skills') {
    const b = d.build;
    if (!isObject(b) || typeof b.run !== 'string') {
      fail('there is no "build" with a "run" command', 'add "build": { "run": "<full build command>", "guide": "<fix guide skill>" }');
    } else {
      for (const key of Object.keys(b)) {
        if (!BUILD_KEYS.includes(key)) fail(`unknown build key "${key}"`, `remove it; the allowed keys are ${BUILD_KEYS.join(', ')}`);
      }
      skill(b.guide, 'build "guide"');
      if (b.max_rounds !== undefined && !wholeNumber(b.max_rounds)) fail('build "max_rounds" is not a whole number of 1 or more', 'set it to 1 or more');
    }
    for (const [kind, name] of Object.entries(d.guides || {})) {
      if (!GUIDE_KINDS.includes(kind)) fail(`unknown guide "${kind}"`, `use one of ${GUIDE_KINDS.join(', ')}`);
      skill(name, `guide "${kind}"`);
    }
  }
  if (d.gates !== undefined && !Array.isArray(d.gates)) {
    fail('"gates" is not a list', 'make it a list of gate objects');
    return out;
  }
  const names = new Set(['build']);
  for (const g of d.gates || []) {
    if (!isObject(g) || typeof g.name !== 'string' || !g.name) {
      fail('a gate has no "name"', 'give every gate a unique name');
      continue;
    }
    const at = `gate "${g.name}"`;
    if (names.has(g.name)) fail(`${at} is not unique`, 'rename it; "build" and the names of the other gates are taken');
    names.add(g.name);
    for (const key of Object.keys(g)) {
      if (!GATE_KEYS.includes(key)) fail(`${at} has unknown key "${key}"`, `remove it; the allowed keys are ${GATE_KEYS.join(', ')}`);
    }
    if (!PHASES.includes(g.phase)) fail(`${at} has phase ${JSON.stringify(g.phase)}`, `use one of ${PHASES.join(', ')}`);
    if (!KINDS.includes(g.kind)) fail(`${at} has kind ${JSON.stringify(g.kind)}`, `use one of ${KINDS.join(', ')}`);
    if (g.kind === 'agent') skill(g.skill, at);
    if (g.kind === 'tool' && typeof g.run !== 'string') fail(`${at} is a tool gate with no "run" command`, 'add "run"');
    if (g.run !== undefined) placeholders(g.run, at);
    if (g.fix !== undefined && !FIXES.includes(g.fix)) fail(`${at} has fix ${JSON.stringify(g.fix)}`, `use one of ${FIXES.join(', ')}`);
    if (g.fix === 'fixer') {
      if (g.guide === undefined) fail(`${at} uses the fixer but names no guide`, 'add "guide" with its fix guide skill');
      else skill(g.guide, `${at} "guide"`);
    }
    if (g.max_rounds !== undefined && !wholeNumber(g.max_rounds)) fail(`${at} "max_rounds" is not a whole number of 1 or more`, 'set it to 1 or more');
    if (g.files !== undefined && ![].concat(g.files).every(f => typeof f === 'string' && f)) {
      fail(`${at} "files" is not a glob or a list of globs`, 'use a glob such as "**/*.java", or a list of them');
    }
    if (g.grep !== undefined) {
      placeholders(g.grep, at);
      try {
        new RegExp(String(g.grep).replace(PLACEHOLDER, (m, key) => (config[key] ? String(config[key].default) : '')));
      } catch (e) {
        fail(`${at} "grep" is not a valid regular expression: ${e.message}`, 'fix the pattern');
      }
    }
    if (g.when !== undefined && typeof g.when !== 'string') fail(`${at} "when" is not text`, 'write the rule in words');
    if (g.always !== undefined && typeof g.always !== 'boolean') fail(`${at} "always" is not true or false`, 'set it to true, or remove it');
    if (!g.always && g.files === undefined && g.grep === undefined && g.when === undefined) {
      fail(`${at} has no selection rule, so it never runs`, 'add "files", "grep", "when" or "always": true');
    }
  }
  return out;
}

function checkSection(slot, section, s, out) {
  const fail = (problem, fix) => out.push(`${CONFIG}: ${problem}. Fix: ${fix}.`);
  const d = s.declaration;
  if (!isObject(d)) {
    fail(`the ${slot} plugin ${s.plugin} has no orchestra.json`, 'choose a plugin that declares this slot');
    return;
  }
  if (d.slot !== slot) {
    out.push(`${s.plugin}/orchestra.json: "slot" is ${d.slot}, but it fills the ${slot} slot. Fix: choose a ${slot} plugin in ${CONFIG}.`);
    return;
  }
  out.push(...checkDeclaration(d, s.dir, `${s.plugin}/orchestra.json`));
  const declared = isObject(d.config) ? d.config : {};
  const gates = (Array.isArray(d.gates) ? d.gates : []).map(g => g && g.name);
  const turnable = [...gates, ...Object.values(d.guides || {})];
  for (const [key, value] of Object.entries(section)) {
    if (key === 'plugin') continue;
    if (key === 'disable') {
      if (!Array.isArray(value)) {
        fail(`"${slot}.disable" is not a list`, 'make it a list of gate or guide names');
        continue;
      }
      for (const name of value) {
        if (!turnable.includes(name)) fail(`"${slot}.disable" names ${JSON.stringify(name)}, which is no gate or guide of ${s.plugin}`, `use one of: ${turnable.join(', ')}`);
      }
    } else if (key === 'gates') {
      if (!isObject(value)) {
        fail(`"${slot}.gates" is not an object`, 'write { "<gate>": { "max_rounds": <n> } }');
        continue;
      }
      for (const [name, override] of Object.entries(value)) {
        if (!gates.includes(name)) {
          fail(`"${slot}.gates" names "${name}", which is no gate of ${s.plugin}`, `use one of: ${gates.join(', ')}`);
          continue;
        }
        for (const k of Object.keys(override || {})) {
          if (k !== 'max_rounds') fail(`"${slot}.gates.${name}" has unknown key "${k}"`, 'only "max_rounds" is allowed');
        }
        if (!override || !wholeNumber(override.max_rounds)) fail(`"${slot}.gates.${name}.max_rounds" is not a whole number of 1 or more`, 'set it to 1 or more');
      }
    } else if (!declared[key]) {
      const keys = Object.keys(declared);
      fail(`section "${slot}" has unknown key "${key}"`, keys.length ? `remove it or use a key that ${s.plugin} declares: ${keys.join(', ')}` : `remove it; ${s.plugin} declares no config keys`);
    } else if (typeof value !== declared[key].type) {
      fail(`"${slot}.${key}" is not a ${declared[key].type}`, `set it to a ${declared[key].type}, or remove it to take the default ${JSON.stringify(declared[key].default)}`);
    }
  }
}

function checkProject(project) {
  const out = [];
  const config = parseJson(path.join(project, CONFIG), CONFIG, out);
  const resolved = parseJson(path.join(project, '.orchestra', 'resolved.json'), '.orchestra/resolved.json', out);
  if (config === undefined) return [`${CONFIG} is missing. Fix: run orchestra init.`];
  if (resolved === undefined) return ['.orchestra/resolved.json is missing. Fix: start orchestra run or orchestra init; both resolve the plugins first.'];
  if (!config || !resolved) return out;
  const slots = resolved.slots || {};
  for (const [slot, section] of Object.entries(config)) {
    const fail = (problem, fix) => out.push(`${CONFIG}: ${problem}. Fix: ${fix}.`);
    if (!SLOTS.includes(slot)) {
      fail(`unknown section "${slot}"`, `use the slots ${SLOTS.join(', ')}`);
      continue;
    }
    if (!isObject(section) || typeof section.plugin !== 'string') {
      fail(`section "${slot}" names no "plugin"`, `add "plugin": "<the ${slot} plugin>"`);
      continue;
    }
    const s = slots[slot];
    if (!s) {
      fail(`the ${slot} plugin ${section.plugin} is not resolved`, 'install the plugin, check that its manifest skill answers, and run again');
      continue;
    }
    if (s.plugin !== section.plugin) {
      fail(`section "${slot}" names ${section.plugin}, but the resolved folder holds ${s.plugin}`, `give the folder of ${section.plugin}, or name ${s.plugin} in the config`);
      continue;
    }
    checkSection(slot, section, s, out);
  }
  return out;
}

module.exports = {
  SLOTS, KINDS, FIXES, CONFIG_TYPES, DECLARATION_KEYS, GATE_KEYS, BUILD_KEYS, GUIDE_KINDS, SECTION_KEYS, PHASES, ACTIONS,
  parseJson, skillExists, checkDeclaration, checkProject,
};
