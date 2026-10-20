'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeJson } = require('../helpers');
const curator = require('../../plugins/orchestra/lib/curator');
const { inlinePrompt } = require('../../plugins/orchestra/lib/protocol');

const RUN = 'tmp/runs/task/x';
const resolved = { slots: { curator: { plugin: 'cur', declaration: { curate: 'curate', setup: { skill: 'setup', done: 'docs/curator/.setup' } } } } };

function root() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-'));
  writeJson(path.join(dir, RUN, 'run.json'), { base: 'abc', branch: 'task/x', spec: 'docs/runs/task/x/brief.md', docs: 'docs/runs/task/x' });
  return dir;
}

test('no curator slot: nothing to do', () => {
  const dir = root();
  assert.equal(curator.setup(dir, RUN, { slots: {} }), null);
  assert.equal(curator.curate(dir, RUN, { slots: {} }), null);
});

test('setUp: null without a curator, else whether the flag exists', () => {
  const dir = root();
  assert.equal(curator.setUp(dir, { slots: {} }), null);
  assert.equal(curator.setUp(dir, resolved), false);
  fs.mkdirSync(path.join(dir, 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/curator/.setup'), '');
  assert.equal(curator.setUp(dir, resolved), true);
});

test('a missing flag gives an inline setup; the flag ends it', () => {
  const dir = root();
  assert.deepEqual(curator.setup(dir, RUN, resolved), { action: 'inline', skill: 'cur:setup', inputs: { done: 'docs/curator/.setup' }, result: `${RUN}/setup.result.json`, runDir: RUN });
  fs.mkdirSync(path.join(dir, 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/curator/.setup'), '');
  assert.equal(curator.setup(dir, RUN, resolved), null);
});

test('a setup that ends ok but writes no flag fails once, then runs again', () => {
  const dir = root();
  writeJson(path.join(dir, RUN, 'setup.result.json'), { status: 'ok' });
  const a = curator.setup(dir, RUN, resolved);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /cur:setup ended ok but did not write docs\/curator\/\.setup/);
  assert.equal(curator.setup(dir, RUN, resolved).action, 'inline');
});

test('curate on done gives an inline curate with base, brief and notes; ok ends it', () => {
  const dir = root();
  const a = curator.curate(dir, RUN, resolved);
  assert.deepEqual(a, { action: 'inline', skill: 'cur:curate', inputs: { base: 'abc', brief: 'docs/runs/task/x/brief.md', notes: 'docs/runs/task/x' }, result: `${RUN}/curate.result.json`, runDir: RUN });
  writeJson(path.join(dir, a.result), { status: 'ok' });
  assert.equal(curator.curate(dir, RUN, resolved), null);
});

test('a failed curate stops the call once, then runs again', () => {
  const dir = root();
  writeJson(path.join(dir, RUN, 'curate.result.json'), { status: 'failed', reason: 'BACKLOG.md is not valid' });
  assert.deepEqual(curator.curate(dir, RUN, resolved), { action: 'failed', reason: 'BACKLOG.md is not valid', runDir: RUN });
  assert.equal(curator.curate(dir, RUN, resolved).action, 'inline');
});

test('a result that is not JSON is a failure', () => {
  const dir = root();
  fs.writeFileSync(path.join(dir, RUN, 'curate.result.json'), '{ not json');
  assert.match(curator.curate(dir, RUN, resolved).reason, /Invalid result JSON/);
});

test('the inline prompt says to work in this session, in the worktree, and names the result', () => {
  const p = inlinePrompt({ skill: 'cur:curate', inputs: { base: 'abc' }, result: `${RUN}/curate.result.json` }, '/r');
  assert.match(p, /^Invoke the skill `cur:curate` in this session and follow it\. It may ask the user questions; ask them\./);
  assert.match(p, /Work in `\/r`\./);
  assert.match(p, /- base: abc/);
  assert.match(p, /write the result JSON that the skill describes to `tmp\/runs\/task\/x\/curate\.result\.json`/);
  assert.doesNotMatch(p, /subagent|priority/);
});
