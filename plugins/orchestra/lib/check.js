'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { PHASES, ACTIONS, ROLES, validateAction } = require('./protocol');
const { scratchRepo, cleanEnv } = require('./git');
const { DIR } = require('./worktree');

// The contract of a plugin declaration and of the project config. The skill writing-plugins explains
// every word in these lists; a test fails when one is missing there.
const SLOTS = ['workflow', 'stack-skills', 'curator'];
// A project may leave the curator slot empty: then it runs with no Curator (S76).
const REQUIRED_SLOTS = ['workflow', 'stack-skills'];
const KINDS = ['tool', 'agent'];
const FIXES = ['self', 'fixer', 'none'];
const CONFIG_TYPES = ['string', 'number', 'boolean'];
const DECLARATION_KEYS = { workflow: ['slot', 'config', 'roles', 'gates'], 'stack-skills': ['slot', 'config', 'build', 'measure', 'guides', 'gates'], curator: ['slot', 'config', 'curate', 'setup', 'guides'] };
const GATE_KEYS = ['name', 'phase', 'kind', 'skill', 'run', 'fix', 'guide', 'max_rounds', 'files', 'grep', 'when', 'always', 'measure'];
const BUILD_KEYS = ['run', 'guide', 'max_rounds'];
const MEASURE_KEYS = ['run', 'rules'];
const SETUP_KEYS = ['skill', 'done'];
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
      if (!Object.hasOwn(config, m[1])) fail(`${what} uses {config.${m[1]}}, which "config" does not declare`, `declare "${m[1]}" under "config" or fix the name`);
    }
  };
  if (d.guides !== undefined && !isObject(d.guides)) fail('"guides" is not an object', 'write { "<role>": "<guide skill>" }');
  for (const [role, name] of Object.entries(isObject(d.guides) ? d.guides : {})) {
    if (!ROLES.includes(role)) fail(`unknown guide role "${role}"`, `use one of ${ROLES.join(', ')}`);
    skill(name, `guide "${role}"`);
  }
  if (d.roles !== undefined && (!Array.isArray(d.roles) || !d.roles.every(r => ROLES.includes(r)) || new Set(d.roles).size !== d.roles.length)) {
    fail(`"roles" is ${JSON.stringify(d.roles)}`, `list the role of each of your stages once, from ${ROLES.join(', ')}`);
  }
  if (d.slot === 'stack-skills') {
    const b = d.build;
    if (!isObject(b) || typeof b.run !== 'string') {
      fail('there is no "build" with a "run" command', 'add "build": { "run": "<full build command>", "guide": "<fix guide skill>" }');
    } else {
      for (const key of Object.keys(b)) {
        if (!BUILD_KEYS.includes(key)) fail(`unknown build key "${key}"`, `remove it; the allowed keys are ${BUILD_KEYS.join(', ')}`);
      }
      skill(b.guide, 'build "guide"');
      for (const m of b.run.matchAll(PLACEHOLDER)) fail(`build "run" uses {config.${m[1]}}, but the build command expands only {plugin}`, 'write the value into the command');
      if (b.max_rounds !== undefined && !wholeNumber(b.max_rounds)) fail('build "max_rounds" is not a whole number of 1 or more', 'set it to 1 or more');
    }
    if (d.measure !== undefined) {
      const m = d.measure;
      if (!isObject(m) || typeof m.run !== 'string') {
        fail('"measure" has no "run" command', 'write "measure": { "run": "<command that measures the changed code against {base}>", "rules": "<rules skill>" }, or remove it');
      } else {
        for (const key of Object.keys(m)) {
          if (!MEASURE_KEYS.includes(key)) fail(`unknown measure key "${key}"`, `remove it; the allowed keys are ${MEASURE_KEYS.join(', ')}`);
        }
        for (const p of m.run.matchAll(PLACEHOLDER)) fail(`measure "run" uses {config.${p[1]}}, but the measure command expands only {plugin} and {base}`, 'write the value into the command');
        if (m.rules !== undefined) skill(m.rules, 'measure "rules"');
      }
    }
  }
  if (d.slot === 'curator') {
    skill(d.curate, '"curate"');
    const s = d.setup;
    if (!isObject(s)) {
      fail('there is no "setup"', 'add "setup": { "skill": "<setup skill>", "done": "<the flag file the skill writes last>" }');
    } else {
      for (const key of Object.keys(s)) {
        if (!SETUP_KEYS.includes(key)) fail(`unknown setup key "${key}"`, `remove it; the allowed keys are ${SETUP_KEYS.join(', ')}`);
      }
      skill(s.skill, 'setup "skill"');
      if (typeof s.done !== 'string' || !s.done || path.isAbsolute(s.done) || s.done.split(/[\\/]/).includes('..')) {
        fail(`setup "done" is ${JSON.stringify(s.done)}`, 'give a file path inside the project, relative to its root, such as "docs/curator/.setup"');
      }
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
        new RegExp(String(g.grep).replace(PLACEHOLDER, (m, key) => (Object.hasOwn(config, key) ? String(config[key].default) : '')));
      } catch (e) {
        fail(`${at} "grep" is not a valid regular expression: ${e.message}`, 'fix the pattern');
      }
    }
    if (g.when !== undefined && typeof g.when !== 'string') fail(`${at} "when" is not text`, 'write the rule in words');
    if (g.always !== undefined && typeof g.always !== 'boolean') fail(`${at} "always" is not true or false`, 'set it to true, or remove it');
    if (g.measure !== undefined && typeof g.measure !== 'boolean') fail(`${at} "measure" is not true or false`, 'set it to true, or remove it');
    else if (g.measure && g.kind !== 'agent') fail(`${at} asks for "measure" but is not an agent gate`, 'remove "measure"; only an agent gate gets the measure command');
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
    } else if (!Object.hasOwn(declared, key)) {
      const keys = Object.keys(declared);
      fail(`section "${slot}" has unknown key "${key}"`, keys.length ? `remove it or use a key that ${s.plugin} declares: ${keys.join(', ')}` : `remove it; ${s.plugin} declares no config keys`);
    } else if (typeof value !== declared[key].type) {
      fail(`"${slot}.${key}" is not a ${declared[key].type}`, `set it to a ${declared[key].type}, or remove it to take the default ${JSON.stringify(declared[key].default)}`);
    }
  }
  // A project value can break a gate's grep that the defaults compile. A grep already broken with the
  // defaults is reported once, by the declaration rule; a value of the wrong type, by the type rule.
  const dflt = k => (Object.hasOwn(declared, k) ? declared[k].default : '');
  const set = k => Object.hasOwn(declared, k) && Object.hasOwn(section, k) && typeof section[k] === declared[k].type;
  for (const g of Array.isArray(d.gates) ? d.gates : []) {
    if (!g || typeof g.grep !== 'string' || !Object.keys(section).some(k => set(k) && g.grep.includes(`{config.${k}}`))) continue;
    const expand = pick => g.grep.replace(PLACEHOLDER, (m, k) => String(pick(k)));
    try {
      new RegExp(expand(dflt));
    } catch {
      continue;
    }
    try {
      new RegExp(expand(k => (set(k) ? section[k] : dflt(k))));
    } catch (e) {
      fail(`the values of section "${slot}" make the "grep" of gate "${g.name}" invalid: ${e.message}`, 'fix the value of the key that the pattern uses');
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
  if (!isObject(config)) return [`${CONFIG} is not a JSON object. Fix: run orchestra init.`];
  for (const slot of REQUIRED_SLOTS) {
    if (!(slot in config)) out.push(`${CONFIG}: section "${slot}" is missing. Fix: add "${slot}": { "plugin": "<the ${slot} plugin>" }, or run orchestra init.`);
  }
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
  // A guide is given by role. A guide for a role the workflow has no stage for never reaches a stage (S76).
  const wf = slots.workflow;
  if (wf && isObject(wf.declaration) && wf.declaration.slot === 'workflow' && isObject(config.workflow) && config.workflow.plugin === wf.plugin) {
    const roles = Array.isArray(wf.declaration.roles) ? wf.declaration.roles : [];
    for (const slot of SLOTS) {
      const s = slots[slot];
      const section = config[slot];
      if (!s || !isObject(section) || section.plugin !== s.plugin || !isObject(s.declaration) || !isObject(s.declaration.guides)) continue;
      const off = Array.isArray(section.disable) ? section.disable : [];
      for (const [role, name] of Object.entries(s.declaration.guides)) {
        if (!ROLES.includes(role) || roles.includes(role) || off.includes(name)) continue;
        out.push(`${CONFIG}: ${s.plugin} declares a "${role}" guide, but the workflow ${wf.plugin} has no ${role} stage. Fix: add "${name}" to "${slot}.disable", or choose a workflow with a ${role} stage.`);
      }
    }
  }
  // A run's worktree lives in the project (S74). Not ignored, it shows in the user's git status.
  try {
    execFileSync('git', ['check-ignore', '-q', `${DIR}/x`], { cwd: project, stdio: 'ignore' });
  } catch {
    out.push(`.gitignore: ${DIR}/ is not ignored. Fix: add the lines .orchestra/* and !.orchestra/config.json to .gitignore, or run orchestra init.`);
  }
  return out;
}

const HARNESS_WORDS = /Task tool|subagent_type|TodoWrite|Skill tool|claude -p/;

function checkSkills(dir, label) {
  const out = [];
  const skillsDir = path.join(dir, 'skills');
  const names = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter(s => fs.existsSync(path.join(skillsDir, s, 'SKILL.md'))).sort() : [];
  for (const s of names) {
    const where = `${label}/skills/${s}/SKILL.md`;
    const text = fs.readFileSync(path.join(skillsDir, s, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
    const m = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) {
      out.push(`${where}: it has no frontmatter. Fix: start it with ---, name, description, ---.`);
    } else {
      const keys = m[1].split('\n').filter(l => /^\S/.test(l)).map(l => l.split(':')[0]);
      if (keys.join() !== 'name,description') out.push(`${where}: the frontmatter has the keys ${keys.join(', ')}. Fix: keep only name and description.`);
      if (!new RegExp(`^name: ${s}$`, 'm').test(m[1])) out.push(`${where}: the frontmatter name is not "${s}". Fix: set name to the folder name.`);
    }
    const word = text.match(HARNESS_WORDS);
    if (word) out.push(`${where}: it names a harness tool (${word[0]}). Fix: name the action instead, such as "dispatch a subagent" or "invoke the skill".`);
  }
  return out;
}

// Runs the workflow's next.js with a task in a throwaway repo, and validates the first action it prints.
function dryRun(dir, label, declaration) {
  const where = `${label}/bin/next.js`;
  const nextJs = path.join(dir, 'bin', 'next.js');
  if (!fs.existsSync(nextJs)) return [`${where} is missing. Fix: add it; it prints the next action of a run as one JSON line.`];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-check-'));
  try {
    let env;
    let project;
    let task;
    try {
      env = cleanEnv();
      project = scratchRepo(root);
      const stack = { plugin: 'check-stack', version: '0.0.0', dir: root, declaration: { slot: 'stack-skills', build: { run: 'true' } } };
      fs.mkdirSync(path.join(project, '.orchestra'));
      fs.writeFileSync(path.join(project, CONFIG), JSON.stringify({ workflow: { plugin: label }, 'stack-skills': { plugin: stack.plugin } }) + '\n');
      for (const args of [['add', CONFIG], ['-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'config'], ['checkout', '-q', '--detach']]) {
        execFileSync('git', args, { cwd: project, env, stdio: 'ignore' });
      }
      const resolved = { orchestra: { dir: path.join(__dirname, '..') }, slots: { workflow: { plugin: label, version: '0.0.0', dir, declaration }, 'stack-skills': stack } };
      fs.writeFileSync(path.join(project, '.orchestra', 'resolved.json'), JSON.stringify(resolved) + '\n');
      task = path.join(root, 'task.txt');
      fs.writeFileSync(task, 'Dry run of orchestra check\n');
    } catch (e) {
      return [`${where}: the dry run could not build its scratch repo: ${e.message.split('\n')[0]}. Fix: check that git is installed and can commit in a new repo.`];
    }
    try {
      const printed = execFileSync(process.execPath, [nextJs, '--project', project, '--task-file', task], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
      const action = validateAction(JSON.parse(printed.trim().split('\n').pop()));
      if (action.action === 'failed') return [`${where}: the dry run ended with failed: ${action.reason}. Fix: make the first call of a new run work.`];
      return [];
    } catch (e) {
      return [`${where}: the dry run did not print a valid action: ${e.message.split('\n')[0]}. Fix: print one action of the orchestra protocol as JSON on the last line.`];
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function checkPlugin(dir) {
  const out = [];
  const a = parseJson(path.join(dir, 'plugin.json'), `${dir}/plugin.json`, out);
  const b = parseJson(path.join(dir, '.claude-plugin', 'plugin.json'), `${dir}/.claude-plugin/plugin.json`, out);
  if (a === undefined) out.push(`${dir}: plugin.json is missing. Fix: add it with "name" and "version".`);
  if (b === undefined) out.push(`${dir}: .claude-plugin/plugin.json is missing. Fix: add it with the same "name" and "version" as plugin.json.`);
  if (a && b && (!a.name || !a.version || a.name !== b.name || a.version !== b.version)) {
    out.push(`${dir}: the two manifests differ or lack a name or version (${a.name} ${a.version}, ${b.name} ${b.version}). Fix: give both the same name and version.`);
  }
  const label = (a && a.name) || path.basename(dir);
  out.push(...checkSkills(dir, label));
  const d = parseJson(path.join(dir, 'orchestra.json'), `${label}/orchestra.json`, out);
  if (d === undefined || d === null) return out;
  const declaration = checkDeclaration(d, dir, `${label}/orchestra.json`);
  out.push(...declaration);
  if (!skillExists(dir, 'manifest')) out.push(`${label}: there is no manifest skill. Fix: add skills/manifest/SKILL.md; it answers PLUGIN_DIR=<folder>.`);
  if (!declaration.length && d.slot === 'workflow') out.push(...dryRun(dir, label, d));
  return out;
}

module.exports = {
  SLOTS, REQUIRED_SLOTS, SETUP_KEYS, KINDS, FIXES, CONFIG_TYPES, DECLARATION_KEYS, GATE_KEYS, BUILD_KEYS, MEASURE_KEYS, ROLES, SECTION_KEYS, PHASES, ACTIONS,
  parseJson, skillExists, checkDeclaration, checkProject, checkPlugin,
};
