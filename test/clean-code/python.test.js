'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// The clean-code scripts are Python; their tests run under unittest, from npm test.
test('the clean-code Python tests pass', () => {
  const r = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', __dirname, '-p', 'test_*.py'], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});
