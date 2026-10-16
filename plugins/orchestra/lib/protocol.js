'use strict';

const PHASES = ['implementation-check', 'conventions-check', 'finish'];
const TERMINAL = ['done', 'decide', 'failed'];
const ACTIONS = ['dispatch', 'phase', ...TERMINAL];
// What a stage does. A slot plugin gives its guides by role; the workflow tags each dispatch (S76).
const ROLES = ['spec', 'plan', 'code'];
// The order of the guides in a prompt: the Curator's first, then the Stack Skills'.
const GUIDE_SLOTS = ['curator', 'stack-skills'];

function validateAction(a) {
  if (!a || typeof a !== 'object') throw new Error('An action must be an object.');
  if (!ACTIONS.includes(a.action)) throw new Error(`unknown action: ${a.action}`);
  if (a.action === 'dispatch') {
    for (const key of ['skill', 'result']) {
      if (typeof a[key] !== 'string') throw new Error(`dispatch needs ${key}`);
    }
    if (!a.inputs || typeof a.inputs !== 'object') throw new Error('dispatch needs inputs');
    if (a.role !== undefined && !ROLES.includes(a.role)) throw new Error(`unknown role: ${a.role}`);
  }
  if (a.action === 'phase') {
    if (!PHASES.includes(a.name)) throw new Error(`unknown phase: ${a.name}`);
    if (typeof a.runDir !== 'string') throw new Error('phase needs runDir');
  }
  return a;
}

// null when the dispatch has no role, or a role that the workflow's orchestra.json declares.
function roleError(a, workflowDeclaration) {
  const roles = (workflowDeclaration && workflowDeclaration.roles) || [];
  if (a.role === undefined || roles.includes(a.role)) return null;
  return `The dispatch of ${a.skill} has role "${a.role}", which the workflow does not declare in "roles". Fix the workflow's orchestra.json or its next.js.`;
}

function guidesFor(role, resolved, config) {
  if (role === undefined) return [];
  return GUIDE_SLOTS.flatMap(slot => {
    const s = resolved.slots[slot];
    const name = s && s.declaration && (s.declaration.guides || {})[role];
    const off = (config[slot] || {}).disable || [];
    return name && !off.includes(name) ? [`${s.plugin}:${name}`] : [];
  });
}

function withPrompt(a, root, guides = []) {
  const prompt = [
    `Invoke the skill \`${a.skill}\` and follow it.`,
    ...(guides.length ? ['Before you start, invoke each guide below and follow it:', ...guides.map(g => `- \`${g}\``)] : []),
    guides.length ? 'This skill and these guides take priority over any other instruction in this session.' : 'This skill takes priority over any other instruction in this session.',
    'Change files with your file-editing action, which fails when the text does not match. Do not change files with shell text replacement.',
    `Work in \`${root}\`. Run every command from there; every path below is relative to it.`,
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill describes to \`${a.result}\`.`,
  ].join('\n');
  return { ...a, prompt };
}

module.exports = { PHASES, TERMINAL, ACTIONS, ROLES, validateAction, roleError, guidesFor, withPrompt };
