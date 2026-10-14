# R8: How should an orchestra run use a git worktree?

Researched 2026-10-14 from the worca-cc source (`~/Projects-other/worca-cc`, `src/core/worktree.mjs`,
`src/core/run-harness.mjs`, `src/core/settings.mjs`, `docs/storage.md`) and from git itself, in a
scratch repo. Paths below are relative to the worca-cc root.

## Short answer

Create one worktree per run from a ref, so the user's checkout is never switched and their
uncommitted work never enters the run. Keep it on a pause or a failure, remove it on success and keep
the branch. worca-cc does all of this. Its worktree lives outside the repo, which does not fit
orchestra: orchestra's subagents run inside the user's session, and that session lets an agent edit
files without a prompt only inside its working folder. So the worktree goes inside the project, in a
git-ignored folder.

## Findings

### Creation

- worca-cc creates the worktree with `git worktree add -b <branch> -- <dir> <source>`, or without `-b`
  when the branch exists. `worktree.mjs:287, 295`. Source code, strong.
- The default folder is outside the repo, `~/.worca-cc/runs/<id>/repos/<project>/`; an older mode used
  `<repo>/.worca-cc/worktrees/<id>`. `settings.mjs:100-114`, `worktree.mjs:30, 255-257`. Source code,
  strong.
- The base folder goes through `realpath`, so paths match what `git worktree list` prints (the macOS
  `/tmp` symlink). `worktree.mjs:259-262`. Source code, strong.
- A ref that starts with `-` is refused, and the feature branch may not equal the source.
  `worktree.mjs:189-199, 251-253`. Source code, strong.

### The user's checkout

- It is never switched. A worktree holds only committed files, so uncommitted work stays out, and no
  clean tree is required. `run-context.mjs:6-8`. Source code, strong.
- Before a run, worca-cc fetches and fast-forwards the base branch, with `merge --ff-only` when it is
  checked out and clean. `git-sync.mjs:419-466`. Source code, strong. That changes the user's files
  when they are on the base branch.

### State and resume

- Run state is a SQLite row that records the worktree folder; a resume reads it and fails with
  "worktree missing" when the folder is gone. `run-harness.mjs:1989-2089, 2021`. Source code, strong.
- `git worktree list --porcelain` is used only to find a branch that is already checked out.
  `worktree.mjs:206-220`. Source code, strong.

### Cleanup

- On done, error or stop (not on pause): commit, then `git worktree remove --force`, an `rm` backstop,
  and `git worktree prune`. The branch stays. `run-harness.mjs:4249-4379`, `worktree.mjs:322-352`.
  Source code, strong.
- It forces because a plain remove refuses an edited tree and would leak the worktree.
  `worktree.mjs:316-338`. Source code, strong.
- A start-up sweep removes the folders of finished runs and quarantines unknown ones.
  `worktree.mjs:550-736`. Source code, strong.

### Agents and set-up

- Agents get the worktree as their process working folder; no environment variable.
  `run-harness.mjs:2470-2472`, `orchestrator.mjs:1340-1343`. Source code, strong.
- Nothing copies `.env` or other untracked files, and nothing installs dependencies during a run.
  Source code and `docs/actions.md`, strong.
- Parallel runs work through one folder and one unique branch per run. `README.md:93-96`. Docs,
  medium.

### git, measured in a scratch repo (git 2.x, macOS)

- A worktree inside the repo that git does not ignore shows in the main checkout as `?? .orchestra/`.
  Measured, strong.
- `git worktree move <from> <to>` fails with "No such file or directory" when the parent of `<to>`
  does not exist; it works once the parent is created. Measured, strong.
- `git worktree remove` without `--force` removes a worktree whose only extra files are ignored (a
  `tmp/` folder). Measured, strong. So a plain remove is enough after a clean finish, and it refuses
  exactly when work would be lost.
- `git worktree list --porcelain` prints each worktree's absolute path and `branch refs/heads/<name>`.
  Measured, strong.

## Recommendation

- Put the worktree at `.orchestra/worktrees/<branch>`: git-ignored by the line `orchestra:init`
  already writes, and inside the session's folder on Claude Code and Codex.
- Start it detached at `origin/<default>` after a fetch; never touch the user's checkout, not even a
  fast-forward.
- Find runs with `git worktree list --porcelain`; add no state file.
- Remove it on `done` with a plain `git worktree remove`, then `git worktree prune`; keep it on
  `decide` and `failed`; keep the branch. If the remove refuses, keep the worktree and say so.

## Evidence gaps

- Not run on Codex: that a Codex subagent works in a nested folder without a prompt is inferred from
  its sandbox's writable roots (R7), not measured.
- No measurement of the first build in a fresh worktree; Maven's `~/.m2` is shared, so only the
  compile is repeated.
- IDE behaviour with a nested worktree (indexing a second copy) is not measured.
