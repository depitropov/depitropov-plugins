'use strict';

const PHASE_ORDER = {
  'implementation-check': ['build', 'tool', 'agent'],
  'conventions-check': ['tool', 'agent'],
  finish: ['agent', 'tool', 'build'],
};
const PROVIDERS = ['workflow', 'core', 'stack-skills', 'project'];

// A project skill is read by its path in the run root, so it runs on every harness (S86). A plugin skill is invoked by name.
function skillRef(provider, plugin, name) {
  return provider === 'project' ? `.agents/skills/${name}/SKILL.md` : `${plugin}:${name}`;
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') {
        i++;
        re += '(?:.*/)?';
      } else {
        re += '.*';
      }
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function slotValues(declaration, section) {
  const values = {};
  for (const [key, spec] of Object.entries(declaration.config || {})) {
    values[key] = section[key] !== undefined ? section[key] : spec.default;
  }
  return values;
}

function expand(text, dir, values) {
  return text.replace(/\{plugin\}/g, () => dir).replace(/\{config\.([\w-]+)\}/g, (match, key) => String(values[key]));
}

function collect(resolved, config, phase) {
  const gates = [];
  for (const provider of PROVIDERS) {
    const slot = resolved.slots[provider];
    if (!slot) continue;
    const section = config[provider] || {};
    const disabled = section.disable || [];
    const overrides = section.gates || {};
    const values = slotValues(slot.declaration, section);
    for (const declared of slot.declaration.gates || []) {
      if (declared.phase !== phase || disabled.includes(declared.name)) continue;
      const g = { ...declared, ...overrides[declared.name] };
      const fix = g.fix || (g.kind === 'agent' ? 'self' : 'none');
      gates.push({
        ...g,
        provider,
        plugin: slot.plugin,
        fix,
        skill: g.skill && skillRef(provider, slot.plugin, g.skill),
        guide: g.guide && skillRef(provider, slot.plugin, g.guide),
        run: g.run && expand(g.run, slot.dir, values),
        grep: g.grep && expand(g.grep, slot.dir, values),
        max_rounds: g.max_rounds ?? 2,
        config: values,
      });
    }
  }
  return gates;
}

function select(gates, changed, readFile) {
  return gates.map(g => {
    if (g.always) return { name: g.name, selected: true, why: 'always' };
    if (!g.files && !g.grep && !g.when) return { name: g.name, selected: false, why: 'no selection rule' };
    let files = changed;
    if (g.files) {
      const globs = [].concat(g.files);
      const res = globs.map(globToRegExp);
      files = files.filter(f => res.some(re => re.test(f)));
      if (!files.length) return { name: g.name, selected: false, why: `no changed file matches ${globs.join(' or ')}` };
    }
    if (g.grep) {
      const re = new RegExp(g.grep);
      const hit = files.some(f => {
        const text = readFile(f);
        return text !== null && re.test(text);
      });
      if (!hit) return { name: g.name, selected: false, why: `no changed file contains ${g.grep}` };
    }
    // ponytail: a `when` rule is not judged yet; the select step comes in plan 4.
    return { name: g.name, selected: true, why: g.when ? 'when rule not judged yet' : 'matched' };
  });
}

// The project may override the build in its config; its own fix guide is a project skill (S86).
function buildStep(resolved, config) {
  const stack = resolved.slots['stack-skills'];
  const declared = stack && stack.declaration.build;
  if (!declared) throw new Error('The stack-skills plugin declares no build.');
  const own = (config['stack-skills'] || {}).build || {};
  const build = { ...declared, ...own };
  return {
    name: 'build',
    kind: 'tool',
    build: true,
    run: build.run.replace(/\{plugin\}/g, () => stack.dir),
    fix: 'fixer',
    guide: own.guide ? skillRef('project', 'project', own.guide) : skillRef('stack-skills', stack.plugin, declared.guide),
    max_rounds: build.max_rounds ?? 2,
    plugin: stack.plugin,
  };
}

function plan(phase, gates, build) {
  const order = PHASE_ORDER[phase];
  if (!order) throw new Error(`Unknown phase "${phase}".`);
  return order.flatMap(kind => (kind === 'build' ? [build] : gates.filter(g => g.kind === kind)));
}

module.exports = { PHASE_ORDER, skillRef, globToRegExp, slotValues, collect, select, buildStep, plan };
