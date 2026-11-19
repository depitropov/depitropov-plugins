'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contractsFor, validateAction, withPrompt, guidesFor, stageError, sharedRoles, PHASES, STAGES } = require('../../plugins/orchestra/lib/protocol');

const dispatch = { action: 'dispatch', skill: 'wf:code', inputs: { spec: 'a/task.md' }, result: 'a/code.result.json', runDir: 'a' };

test('accepts the known actions', () => {
  assert.equal(validateAction(dispatch), dispatch);
  assert.ok(validateAction({ action: 'phase', name: 'finish', runDir: 'a' }));
  assert.ok(validateAction({ action: 'done', runDir: 'a' }));
  assert.deepEqual(PHASES, ['implementation-check', 'conventions-check', 'finish']);
});

test('rejects unknown actions, incomplete dispatches and unknown phases', () => {
  assert.throws(() => validateAction({ action: 'jump' }), /unknown action/);
  assert.throws(() => validateAction({ ...dispatch, result: undefined }), /dispatch needs result/);
  assert.throws(() => validateAction({ action: 'phase', name: 'lint', runDir: 'a' }), /unknown phase/);
  assert.throws(() => validateAction(null), /must be an object/);
});

test('withPrompt names the skill, every input and the result path', () => {
  const a = withPrompt(dispatch, '/r');
  assert.match(a.prompt, /Invoke the skill `wf:code`/);
  assert.match(a.prompt, /Work in `\/r`\. Run every command from there/);
  assert.match(a.prompt, /- spec: a\/task\.md/);
  assert.match(a.prompt, /`a\/code\.result\.json`/);
});

test('the prompt puts the skill first and asks for file edits that fail loudly', () => {
  const a = withPrompt(dispatch, '/r');
  assert.match(a.prompt, /This skill takes priority over any other instruction in this session\./);
  assert.match(a.prompt, /Change files with your file-editing action, which fails when the text does not match\. Do not change files with shell text replacement\./);
  assert.doesNotMatch(a.prompt, /\b(Edit|Write|Bash|Task|Skill) tool\b/);
  assert.doesNotMatch(a.prompt, /guides\/|Before you start, read each guide/);
  assert.match(a.prompt, /that the skill or its guides describe to/);
});

test('the stages are spec, plan and code, and a dispatch may name one of them', () => {
  assert.deepEqual(STAGES, ['spec', 'plan', 'code']);
  assert.ok(validateAction({ ...dispatch, stage: 'code' }));
  assert.throws(() => validateAction({ ...dispatch, stage: 'review' }), /unknown stage: review/);
});

test('guidesFor lists the curator guide first, then the stack guide, and leaves out disabled ones', () => {
  const resolved = { slots: {
    workflow: { plugin: 'wf', declaration: {} },
    'stack-skills': { plugin: 'st', dir: '/s', declaration: { guides: { plan: 'guides/plan.md', code: 'guides/code.md' } } },
    curator: { plugin: 'cur', dir: '/c', declaration: { guides: { plan: 'guides/plan.md' } } },
    project: { plugin: 'project', dir: '.orchestra/project', declaration: { guides: { code: 'guides/code.md' } } },
  } };
  assert.deepEqual(guidesFor('plan', resolved, {}), ['/c/guides/plan.md', '/s/guides/plan.md']);
  assert.deepEqual(guidesFor('code', resolved, {}), ['/s/guides/code.md', '.orchestra/project/guides/code.md']);
  assert.deepEqual(guidesFor('spec', resolved, {}), []);
  assert.deepEqual(guidesFor(undefined, resolved, {}), []);
  assert.deepEqual(guidesFor('plan', resolved, { curator: { disable: ['guides/plan.md'] } }), ['/s/guides/plan.md']);
});

test('withPrompt lists the guides before the inputs and gives them the priority', () => {
  const a = withPrompt(dispatch, '/r', ['/c/guides/plan.md', '/s/guides/plan.md']);
  assert.match(a.prompt, /Before you start, read each guide below and follow it:\n- `\/c\/guides\/plan\.md`\n- `\/s\/guides\/plan\.md`/);
  assert.match(a.prompt, /This skill and these guides take priority over any other instruction in this session\./);
  assert.ok(a.prompt.indexOf('/c/guides/plan.md') < a.prompt.indexOf('Inputs:'));
});

test('withPrompt names the guide input in the priority sentence', () => {
  const a = withPrompt({ ...dispatch, inputs: { ...dispatch.inputs, guide: 'fix-build' } }, '/r');
  assert.match(a.prompt, /This skill, and the `guide` input, take priority over any other instruction in this session\./);
});

test('stageError names a stage that the workflow did not declare', () => {
  const d = { stages: ['spec', 'plan'] };
  assert.equal(stageError({ ...dispatch, stage: 'plan' }, d), null);
  assert.equal(stageError(dispatch, d), null);
  assert.match(stageError({ ...dispatch, stage: 'code' }, d), /wf:code has stage "code", which the workflow does not declare in "stages"/);
  assert.match(stageError({ ...dispatch, stage: 'code' }, {}), /does not declare in "stages"/);
});

test('withPrompt reads a project skill by its path', () => {
  const { prompt } = withPrompt({ ...dispatch, skill: '.agents/skills/check-money/SKILL.md' }, '/r');
  assert.ok(prompt.startsWith('Read the skill file `.agents/skills/check-money/SKILL.md` and follow it.'), prompt);
  assert.doesNotMatch(prompt, /Invoke the skill/);
});

const core = { plugin: 'orc-core', dir: '/p/core', declaration: { slot: 'core', 'shared-roles': { triage: 'triage', 'writing-style': 'style' } } };
test('sharedRoles maps the core roles, and a project skill or guide overrides or amends one', () => {
  assert.deepEqual(sharedRoles({ slots: {} }, {}), {});
  assert.deepEqual(sharedRoles({ slots: { core } }, { core: { plugin: 'orc-core' } }),
    { 'shared-role.triage': 'orc-core:triage', 'shared-role.writing-style': 'orc-core:style' });
  const project = { plugin: 'project', dir: '.orchestra/project', declaration: { slot: 'project', 'shared-roles': { triage: 'our-triage' }, guides: { 'writing-style': 'guides/writing-style.md', code: 'guides/code.md' } } };
  assert.deepEqual(sharedRoles({ slots: { core, project } }, { core: { plugin: 'orc-core' } }), {
    'shared-role.triage': '.agents/skills/our-triage/SKILL.md',
    'shared-role.writing-style': 'orc-core:style',
    'shared-role.writing-style.guide': '.orchestra/project/guides/writing-style.md',
  });
});
test('withPrompt states how to load a shared role only when one is given', () => {
  assert.doesNotMatch(withPrompt(dispatch, '/r').prompt, /Put a question in `decide`/);
  assert.doesNotMatch(withPrompt(dispatch, '/r').prompt, /shared-role/);
  const a = withPrompt({ ...dispatch, inputs: { ...dispatch.inputs, 'shared-role.triage': 'orc-core:triage' } }, '/r');
  assert.match(a.prompt, /A `shared-role\.<role>` input names a skill.*invoke it by name, or read it when it is a SKILL\.md path.*`\.guide` input/s);
});

test('contractsFor gives every dispatch dispatch.md first, then the contracts of its kind', () => {
  const gate = contractsFor({ ...dispatch, gate: true });
  assert.deepEqual(gate.map(p => path.basename(p)), ['dispatch.md', 'judging.md', 'agent-gate.md']);
  for (const p of gate) assert.ok(fs.existsSync(p), p);
  assert.deepEqual(contractsFor({ ...dispatch, judging: true }).map(p => path.basename(p)), ['dispatch.md', 'judging.md']);
  assert.deepEqual(contractsFor(dispatch).map(p => path.basename(p)), ['dispatch.md']);
});

test('withPrompt names the guides and the guide input in the priority sentence', () => {
  const a = withPrompt({ ...dispatch, inputs: { ...dispatch.inputs, guide: 'fix-build' } }, '/r', ['/o/contract/dispatch.md']);
  assert.match(a.prompt, /This skill, these guides and the `guide` input take priority over any other instruction in this session\./);
});

test('a workflow dispatch may set judging, never gate', () => {
  assert.ok(validateAction({ ...dispatch, judging: true }));
  assert.throws(() => validateAction({ ...dispatch, judging: 'yes' }), /judging must be true or false/);
  assert.throws(() => validateAction({ ...dispatch, gate: true }), /dispatch key "gate" is set by orchestra only/);
});

test('withPrompt says that relative paths are relative to the work folder', () => {
  assert.match(withPrompt(dispatch, '/r').prompt, /Run every command from there; every relative path below is relative to it\./);
});

test('sections must be an object of string lists', () => {
  assert.doesNotThrow(() => validateAction({ action: 'done', runDir: 'a', sections: { A: ['x'] } }));
  assert.throws(() => validateAction({ action: 'done', runDir: 'a', sections: { A: 'x' } }), /sections/);
});
