'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// A plugin folder that passes the packaging rules: both manifests, a manifest skill, and a SKILL.md
// for every skill the declaration names.
function writePlugin(dir, name, declaration) {
  writeJson(path.join(dir, 'plugin.json'), { name, version: '0.0.1' });
  writeJson(path.join(dir, '.claude-plugin', 'plugin.json'), { name, version: '0.0.1' });
  const skills = ['manifest'];
  if (declaration) {
    writeJson(path.join(dir, 'orchestra.json'), declaration);
    const d = declaration;
    skills.push(...[d.build && d.build.guide, ...Object.values(d.guides || {}), ...(d.gates || []).flatMap(g => [g.skill, g.guide])].filter(Boolean));
  }
  for (const s of skills) {
    fs.mkdirSync(path.join(dir, 'skills', s), { recursive: true });
    fs.writeFileSync(path.join(dir, 'skills', s, 'SKILL.md'), `---\nname: ${s}\ndescription: Test skill.\n---\n`);
  }
  return dir;
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-'));
  const origin = path.join(root, 'origin.git');
  const dir = path.join(root, 'work');
  git(root, 'init', '--bare', '-b', 'main', origin);
  git(root, 'clone', origin, dir);
  git(dir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.orchestra/*\n!.orchestra/config.json\ntmp/\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'sample\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'init');
  git(dir, 'push', '-u', 'origin', 'main');
  git(dir, 'remote', 'set-head', 'origin', 'main');
  return dir;
}

module.exports = { git, writeJson, writePlugin, makeRepo };
