'use strict';

const PHASE_ORDER = {
  'implementation-check': ['build', 'tool', 'agent'],
  'conventions-check': ['tool', 'agent'],
  finish: ['agent', 'tool', 'build'],
};
const PROVIDERS = ['workflow', 'stack-skills'];

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
  return text.replace(/\{plugin\}/g, dir).replace(/\{config\.([\w-]+)\}/g, (match, key) => {
    if (values[key] === undefined) throw new Error(`Unknown config key "${key}" in "${text}".`);
    return String(values[key]);
  });
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
    for (const g of slot.declaration.gates || []) {
      if (g.phase !== phase || disabled.includes(g.name)) continue;
      const fix = g.fix || (g.kind === 'agent' ? 'self' : 'none');
      if (fix === 'fixer' && !g.guide) {
        throw new Error(`Gate "${g.name}" in ${slot.plugin} uses the fixer but names no guide.`);
      }
      gates.push({
        ...g,
        provider,
        plugin: slot.plugin,
        fix,
        run: g.run && expand(g.run, slot.dir, values),
        grep: g.grep && expand(g.grep, slot.dir, values),
        max_rounds: (overrides[g.name] || {}).max_rounds ?? g.max_rounds ?? 2,
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
      const re = globToRegExp(g.files);
      files = files.filter(f => re.test(f));
      if (!files.length) return { name: g.name, selected: false, why: `no changed file matches ${g.files}` };
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

function buildStep(resolved) {
  const stack = resolved.slots['stack-skills'];
  const build = stack && stack.declaration.build;
  if (!build) throw new Error('The stack-skills plugin declares no build.');
  return {
    name: 'build',
    kind: 'tool',
    build: true,
    run: build.run.replace(/\{plugin\}/g, stack.dir),
    fix: 'fixer',
    guide: build.guide,
    max_rounds: build.max_rounds ?? 2,
    plugin: stack.plugin,
  };
}

function plan(phase, gates, build) {
  const order = PHASE_ORDER[phase];
  if (!order) throw new Error(`Unknown phase "${phase}".`);
  return order.flatMap(kind => (kind === 'build' ? [build] : gates.filter(g => g.kind === kind)));
}

module.exports = { PHASE_ORDER, globToRegExp, collect, select, buildStep, plan };
