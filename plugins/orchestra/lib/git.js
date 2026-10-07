'use strict';
const { execFileSync } = require('node:child_process');

// tmp/ must be git-ignored by the project (S58). `git add` rejects an exclude for an ignored folder,
// so only the read-only commands name it.
const ADD_EXCLUDE = [':(exclude)docs/runs', ':(exclude).orchestra'];
const EXCLUDE = [...ADD_EXCLUDE, ':(exclude)tmp'];

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

function isClean(cwd) {
  return git(cwd, 'status', '--porcelain', '--', '.', ...EXCLUDE) === '';
}

const commitAll = (cwd, message) => commitPaths(cwd, message, ['.', ...ADD_EXCLUDE]);
const commitRunDir = (cwd, runDir, message) => commitPaths(cwd, message, [runDir]);

module.exports = { git, changedFiles, isClean, commitAll, commitRunDir };
