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

// Not through git(): its trim would cut the first character of the first line (` M file`).
function dirtyFiles(cwd) {
  const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', '.', ...EXCLUDE], { cwd, encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map(line => line.slice(3));
}

const isClean = cwd => dirtyFiles(cwd).length === 0;

const commitAll = (cwd, message) => commitPaths(cwd, message, ['.', ...ADD_EXCLUDE]);
const commitRunDir = (cwd, runDir, message) => commitPaths(cwd, message, [runDir]);

module.exports = { git, changedFiles, dirtyFiles, isClean, commitAll, commitRunDir };
