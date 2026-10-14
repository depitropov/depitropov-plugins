'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { git } = require('./git');

// Every run works in its own worktree inside the project, so it never touches the user's checkout (S74).
// The folder is git-ignored by `.orchestra/*` and lies inside the session's folder, so subagents edit
// it without a prompt.
const DIR = '.orchestra/worktrees';

const firstLine = e => String(e.stderr || e.message).trim().split('\n')[0];

function create(project) {
  // Read before the fetch: git fetch recreates a missing origin/HEAD, which would hide the hint.
  let branch;
  try {
    branch = git(project, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
  } catch {
    return { failed: 'The default branch is unknown: origin/HEAD is not set. Run `git remote set-head origin -a`, then run again.' };
  }
  try {
    git(project, 'fetch', 'origin');
  } catch (e) {
    return { failed: `git fetch origin failed: ${firstLine(e)}. Check the remote and the network, then run again.` };
  }
  const root = path.join(project, DIR, `.new-${process.pid}`);
  git(project, 'worktree', 'add', '--detach', root, `origin/${branch}`);
  return { root: fs.realpathSync(root), base: `origin/${branch}` };
}

// The folder takes the branch's name once prepare has made the branch. If git cannot move it, the run
// goes on under the temporary name: find() reads git's list, not folder names.
function rename(project, root, branch) {
  const to = path.join(fs.realpathSync(project), DIR, branch);
  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    git(project, 'worktree', 'move', root, to);
    return to;
  } catch {
    return root;
  }
}

// git prints real paths (/private/var on macOS), so both sides are compared after realpath.
function find(project) {
  const dir = path.join(project, DIR);
  if (!fs.existsSync(dir)) return [];
  const prefix = fs.realpathSync(dir) + path.sep;
  return git(project, 'worktree', 'list', '--porcelain').split('\n\n').flatMap(block => {
    const at = (block.match(/^worktree (.+)$/m) || [])[1];
    const branch = (block.match(/^branch refs\/heads\/(.+)$/m) || [])[1];
    if (!at || !branch || !branch.startsWith('task/') || !fs.existsSync(at)) return [];
    const root = fs.realpathSync(at);
    return root.startsWith(prefix) && fs.existsSync(path.join(root, 'tmp', 'runs', branch, 'run.json')) ? [{ root, branch }] : [];
  });
}

// Never --force: a refusal means the worktree holds work that is not committed.
function remove(project, root) {
  try {
    git(project, 'worktree', 'remove', root);
    git(project, 'worktree', 'prune');
    return null;
  } catch (e) {
    return firstLine(e);
  }
}

module.exports = { DIR, create, rename, find, remove };
