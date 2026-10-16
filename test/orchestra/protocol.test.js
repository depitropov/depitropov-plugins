'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAction, withPrompt, guidesFor, roleError, PHASES, ROLES } = require('../../plugins/orchestra/lib/protocol');

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
  assert.doesNotMatch(a.prompt, /guide/);
});

test('the roles are spec, plan and code, and a dispatch may name one of them', () => {
  assert.deepEqual(ROLES, ['spec', 'plan', 'code']);
  assert.ok(validateAction({ ...dispatch, role: 'code' }));
  assert.throws(() => validateAction({ ...dispatch, role: 'review' }), /unknown role: review/);
});

test('guidesFor lists the curator guide first, then the stack guide, and leaves out disabled ones', () => {
  const resolved = { slots: {
    workflow: { plugin: 'wf', declaration: {} },
    'stack-skills': { plugin: 'st', declaration: { guides: { plan: 'plan-guide', code: 'code-guide' } } },
    curator: { plugin: 'cur', declaration: { guides: { plan: 'plan-guide' } } },
  } };
  assert.deepEqual(guidesFor('plan', resolved, {}), ['cur:plan-guide', 'st:plan-guide']);
  assert.deepEqual(guidesFor('code', resolved, {}), ['st:code-guide']);
  assert.deepEqual(guidesFor('spec', resolved, {}), []);
  assert.deepEqual(guidesFor(undefined, resolved, {}), []);
  assert.deepEqual(guidesFor('plan', resolved, { curator: { disable: ['plan-guide'] } }), ['st:plan-guide']);
});

test('withPrompt lists the guides before the inputs and gives them the priority', () => {
  const a = withPrompt(dispatch, '/r', ['cur:plan-guide', 'st:plan-guide']);
  assert.match(a.prompt, /Before you start, invoke each guide below and follow it:\n- `cur:plan-guide`\n- `st:plan-guide`/);
  assert.match(a.prompt, /This skill and these guides take priority over any other instruction in this session\./);
  assert.ok(a.prompt.indexOf('cur:plan-guide') < a.prompt.indexOf('Inputs:'));
});

test('roleError names a role that the workflow did not declare', () => {
  const d = { roles: ['spec', 'plan'] };
  assert.equal(roleError({ ...dispatch, role: 'plan' }, d), null);
  assert.equal(roleError(dispatch, d), null);
  assert.match(roleError({ ...dispatch, role: 'code' }, d), /wf:code has role "code", which the workflow does not declare in "roles"/);
  assert.match(roleError({ ...dispatch, role: 'code' }, {}), /does not declare in "roles"/);
});
