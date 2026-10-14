'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { scratchRepo } = require('../plugins/orchestra/lib/git');

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
  return scratchRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-')));
}

module.exports = { git, writeJson, writePlugin, makeRepo };
