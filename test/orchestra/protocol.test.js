'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAction, withPrompt, PHASES } = require('../../plugins/orchestra/lib/protocol');

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
  const a = withPrompt(dispatch);
  assert.match(a.prompt, /Invoke the skill `wf:code`/);
  assert.match(a.prompt, /- spec: a\/task\.md/);
  assert.match(a.prompt, /`a\/code\.result\.json`/);
});

test('the prompt puts the skill first and asks for file edits that fail loudly', () => {
  const a = withPrompt(dispatch);
  assert.match(a.prompt, /This skill and the `guide` it names come before any other skill or instruction in this session\./);
  assert.match(a.prompt, /Change files with your file-editing action, which fails when the text does not match\. Do not change files with shell text replacement\./);
  assert.doesNotMatch(a.prompt, /\b(Edit|Write|Bash|Task|Skill) tool\b/);
});
