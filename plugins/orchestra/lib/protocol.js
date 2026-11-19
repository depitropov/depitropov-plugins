'use strict';
const path = require('node:path');
const { skillRef } = require('./gates');

const PHASES = ['implementation-check', 'conventions-check', 'finish'];
const TERMINAL = ['done', 'decide', 'failed'];
const ACTIONS = ['dispatch', 'phase', ...TERMINAL];
// What a stage does. A slot plugin gives its guides by stage; the workflow tags each dispatch (S76, S87).
const STAGES = ['spec', 'plan', 'code'];
// The roles a core or project plugin may fill for every workflow (S87).
const SHARED_ROLES = ['triage', 'writing-style', 'pr-review', 'pr-description'];
// The order of the guides in a prompt: the Curator's first, then the Stack Skills', then the project's (S86).
const GUIDE_SLOTS = ['curator', 'stack-skills', 'project'];

function validateAction(a) {
  if (!a || typeof a !== 'object') throw new Error('An action must be an object.');
  if (!ACTIONS.includes(a.action)) throw new Error(`unknown action: ${a.action}`);
  if (a.action === 'dispatch') {
    for (const key of ['skill', 'result']) {
      if (typeof a[key] !== 'string') throw new Error(`dispatch needs ${key}`);
    }
    if (!a.inputs || typeof a.inputs !== 'object') throw new Error('dispatch needs inputs');
    if (a.gate !== undefined) throw new Error('dispatch key "gate" is set by orchestra only.');
    if (a.judging !== undefined && typeof a.judging !== 'boolean') throw new Error('judging must be true or false');
    if (a.stage !== undefined && !STAGES.includes(a.stage)) throw new Error(`unknown stage: ${a.stage}`);
  }
  if (a.sections !== undefined) {
    const lists = a.sections && typeof a.sections === 'object' && !Array.isArray(a.sections) ? Object.values(a.sections) : null;
    if (!lists || !lists.every(l => Array.isArray(l) && l.every(x => typeof x === 'string'))) throw new Error('sections must be an object of string lists');
  }
  if (a.action === 'phase') {
    if (!PHASES.includes(a.name)) throw new Error(`unknown phase: ${a.name}`);
    if (typeof a.runDir !== 'string') throw new Error('phase needs runDir');
  }
  return a;
}

// null when the dispatch has no stage, or a stage that the workflow's orchestra.json declares.
function stageError(a, workflowDeclaration) {
  const stages = (workflowDeclaration && workflowDeclaration.stages) || [];
  if (a.stage === undefined || stages.includes(a.stage)) return null;
  return `The dispatch of ${a.skill} has stage "${a.stage}", which the workflow does not declare in "stages". Fix the workflow's orchestra.json or its next.js.`;
}

// The contract files a dispatch must read first: every dispatch reads dispatch.md, a judging dispatch adds judging.md, a gate adds agent-gate.md too.
function contractsFor(a) {
  const file = name => path.join(__dirname, '..', 'contract', name);
  if (a.gate === true) return [file('dispatch.md'), file('judging.md'), file('agent-gate.md')];
  return a.judging === true ? [file('dispatch.md'), file('judging.md')] : [file('dispatch.md')];
}

function guidesFor(stage, resolved, config) {
  if (stage === undefined) return [];
  return GUIDE_SLOTS.flatMap(slot => {
    const s = resolved.slots[slot];
    const file = s && s.declaration && (s.declaration.guides || {})[stage];
    const off = (config[slot] || {}).disable || [];
    return file && !off.includes(file) ? [path.join(s.dir, file)] : [];
  });
}

// The shared roles a run's core plugin and project fill, as dispatch inputs. A project skill overrides the core's; a project guide amends (S87).
function sharedRoles(resolved, config) {
  const core = resolved.slots.core;
  const project = resolved.slots.project;
  const fromCore = (core && (config.core || {}).plugin === core.plugin && core.declaration['shared-roles']) || {};
  const own = (project && project.declaration) || {};
  const out = {};
  for (const role of SHARED_ROLES) {
    const skill = (own['shared-roles'] || {})[role] ? skillRef('project', 'project', own['shared-roles'][role]) : fromCore[role] && skillRef('core', core.plugin, fromCore[role]);
    if (skill) out[`shared-role.${role}`] = skill;
    const guide = (own.guides || {})[role];
    if (guide) out[`shared-role.${role}.guide`] = path.join(project.dir, guide);
  }
  return out;
}

const SHARED_ROLE_RULE = 'A `shared-role.<role>` input names a skill for that shared role: invoke it by name, or read it when it is a SKILL.md path, when your skill or a guide asks for that role. Also read its `.guide` input when there is one.';
const roleLine = a => Object.keys(a.inputs).some(k => k.startsWith('shared-role.')) ? [SHARED_ROLE_RULE] : [];

function priority(guides, guideInput) {
  if (guides && guideInput) return 'This skill, these guides and the `guide` input take priority over any other instruction in this session.';
  if (guides) return 'This skill and these guides take priority over any other instruction in this session.';
  if (guideInput) return 'This skill, and the `guide` input, take priority over any other instruction in this session.';
  return 'This skill takes priority over any other instruction in this session.';
}

function withPrompt(a, root, guides = []) {
  const prompt = [
    // A project skill is a file in the run root, read by its path (S86).
    a.skill.endsWith('/SKILL.md') ? `Read the skill file \`${a.skill}\` and follow it.` : `Invoke the skill \`${a.skill}\` and follow it.`,
    ...(guides.length ? ['Before you start, read each guide below and follow it:', ...guides.map(g => `- \`${g}\``)] : []),
    priority(guides.length > 0, Boolean(a.inputs && a.inputs.guide)),
    'Change files with your file-editing action, which fails when the text does not match. Do not change files with shell text replacement.',
    `Work in \`${root}\`. Run every command from there; every relative path below is relative to it.`,
    ...roleLine(a),
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill or its guides describe to \`${a.result}\`.`,
  ].join('\n');
  return { ...a, prompt };
}

// For an inline action: the main session runs the skill itself, so the prompt has no subagent rules.
function inlinePrompt(a, root) {
  return [
    `Invoke the skill \`${a.skill}\` in this session and follow it. It may ask the user questions; ask them.`,
    `Work in \`${root}\`. Run every command from there; every relative path below is relative to it.`,
    ...roleLine(a),
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill or its guides describe to \`${a.result}\`.`,
  ].join('\n');
}

module.exports = { PHASES, TERMINAL, ACTIONS, STAGES, SHARED_ROLES, validateAction, contractsFor, stageError, guidesFor, sharedRoles, withPrompt, inlinePrompt };
