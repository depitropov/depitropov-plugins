'use strict';
const fs = require('node:fs');
const path = require('node:path');
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
// Commit the tool's edits to the files in `keep`; revert its edits to every other modified tracked file.
// Untracked files are left alone, and the excluded folders are never listed.
function commitKeeping(cwd, message, keep) {
  const out = git(cwd, 'diff', '--name-only', 'HEAD', '--', '.', ...EXCLUDE);
  const dirty = out ? out.split('\n') : [];
  const stray = dirty.filter(f => !keep.includes(f));
  if (stray.length) git(cwd, 'checkout', '--', ...stray);
  const kept = dirty.filter(f => keep.includes(f));
  // An empty pathspec would make `git add -A --` stage the whole tree.
  return kept.length > 0 && commitPaths(cwd, message, kept);
}

const commitRunDir = (cwd, runDir, message) => commitPaths(cwd, message, [runDir]);

// A repo with a bare remote and one commit. orchestra check's dry run uses it, and so do the tests.
function scratchRepo(root) {
  const origin = path.join(root, 'origin.git');
  const dir = path.join(root, 'work');
  git(root, 'init', '--bare', '-b', 'main', origin);
  git(root, 'clone', origin, dir);
  git(dir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(dir, 'config', 'user.email', 'orchestra@example.com');
  git(dir, 'config', 'user.name', 'orchestra');
  git(dir, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, '.gitignore'), '.orchestra/*\n!.orchestra/config.json\ntmp/\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'sample\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'init');
  git(dir, 'push', '-u', 'origin', 'main');
  git(dir, 'remote', 'set-head', 'origin', 'main');
  return dir;
}

module.exports = { EXCLUDE, git, changedFiles, dirtyFiles, isClean, commitAll, commitKeeping, commitRunDir, scratchRepo };
