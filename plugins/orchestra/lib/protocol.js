'use strict';
const path = require('node:path');

const PHASES = ['implementation-check', 'conventions-check', 'finish'];
const TERMINAL = ['done', 'decide', 'failed'];
const ACTIONS = ['dispatch', 'phase', ...TERMINAL];
// What a stage does. A slot plugin gives its guides by stage; the workflow tags each dispatch (S76, S87).
const STAGES = ['spec', 'plan', 'code'];
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
    if (a.role !== undefined) throw new Error('dispatch key "role" is now "stage". Rename it in next.js.');
    if (a.stage !== undefined && !STAGES.includes(a.stage)) throw new Error(`unknown stage: ${a.stage}`);
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

function guidesFor(stage, resolved, config) {
  if (stage === undefined) return [];
  return GUIDE_SLOTS.flatMap(slot => {
    const s = resolved.slots[slot];
    const file = s && s.declaration && (s.declaration.guides || {})[stage];
    const off = (config[slot] || {}).disable || [];
    return file && !off.includes(file) ? [path.join(s.dir, file)] : [];
  });
}

function withPrompt(a, root, guides = []) {
  const prompt = [
    // A project skill is a file in the run root, read by its path (S86).
    a.skill.endsWith('/SKILL.md') ? `Read the skill file \`${a.skill}\` and follow it.` : `Invoke the skill \`${a.skill}\` and follow it.`,
    ...(guides.length ? ['Before you start, read each guide below and follow it:', ...guides.map(g => `- \`${g}\``)] : []),
    guides.length ? 'This skill and these guides take priority over any other instruction in this session.' : a.inputs && a.inputs.guide ? 'This skill, and the `guide` input, take priority over any other instruction in this session.' : 'This skill takes priority over any other instruction in this session.',
    'Change files with your file-editing action, which fails when the text does not match. Do not change files with shell text replacement.',
    `Work in \`${root}\`. Run every command from there; every path below is relative to it.`,
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill describes to \`${a.result}\`.`,
  ].join('\n');
  return { ...a, prompt };
}

// For an inline action: the main session runs the skill itself, so the prompt has no subagent rules.
function inlinePrompt(a, root) {
  return [
    `Invoke the skill \`${a.skill}\` in this session and follow it. It may ask the user questions; ask them.`,
    `Work in \`${root}\`. Run every command from there; every path below is relative to it.`,
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill describes to \`${a.result}\`.`,
  ].join('\n');
}

module.exports = { PHASES, TERMINAL, ACTIONS, STAGES, validateAction, stageError, guidesFor, withPrompt, inlinePrompt };
