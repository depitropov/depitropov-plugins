'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DECL = path.join(__dirname, '../../plugins/orc-java-stack/orchestra.json');
const run = () => JSON.parse(fs.readFileSync(DECL, 'utf8')).gates.find(g => g.name === 'spotless').run;

function project(pom) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotless-'));
  fs.writeFileSync(path.join(dir, 'mvnw'), '#!/bin/sh\necho "$@" > ran\n', { mode: 0o755 });
  if (pom !== null) fs.writeFileSync(path.join(dir, 'pom.xml'), pom);
  return dir;
}
const exec = dir => spawnSync(run(), { cwd: dir, shell: true, encoding: 'utf8' });

test('spotless runs spotless:apply when the pom has the plugin', () => {
  const dir = project('<plugin><artifactId>spotless-maven-plugin</artifactId></plugin>');
  assert.equal(exec(dir).status, 0);
  assert.match(fs.readFileSync(path.join(dir, 'ran'), 'utf8'), /spotless:apply/);
});

test('spotless passes and does nothing without the plugin, or without a pom', () => {
  for (const pom of ['<project></project>', null]) {
    const dir = project(pom);
    assert.equal(exec(dir).status, 0);
    assert.ok(!fs.existsSync(path.join(dir, 'ran')));
  }
});

test('the build skips the format check only when the pom has the plugin', () => {
  const build = JSON.parse(fs.readFileSync(DECL, 'utf8')).build.run;
  for (const [pom, skips] of [['<artifactId>spotless-maven-plugin</artifactId>', true], ['<project></project>', false]]) {
    const dir = project(pom);
    assert.equal(spawnSync(build, { cwd: dir, shell: true }).status, 0);
    assert.equal(/-Dspotless\.check\.skip=true/.test(fs.readFileSync(path.join(dir, 'ran'), 'utf8')), skips);
  }
});
