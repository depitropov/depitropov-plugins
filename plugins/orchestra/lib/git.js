'use strict';
const { execFileSync } = require('node:child_process');

const EXCLUDE = [':(exclude)docs/runs', ':(exclude).orchestra'];

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function changedFiles(cwd, base) {
  const out = git(cwd, 'diff', '--name-only', base, 'HEAD', '--', '.', ...EXCLUDE);
  return out ? out.split('\n') : [];
}

function commitPaths(cwd, message, paths) {
  git(cwd, 'add', '-A', '--', ...paths);
  if (!git(cwd, 'diff', '--cached', '--name-only')) return false;
  git(cwd, 'commit', '-m', message);
  return true;
}

const commitAll = (cwd, message) => commitPaths(cwd, message, ['.', ...EXCLUDE]);
const commitRunDir = (cwd, runDir, message) => commitPaths(cwd, message, [runDir]);

module.exports = { git, changedFiles, commitAll, commitRunDir };
