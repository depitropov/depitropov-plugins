# Orchestra runs in a git worktree (O9)

Date: 2026-10-14. Research: `docs/research/R8-worktrees.md`. Decision: S74.

## Goal

A run never moves the user's branch and never touches their files. The user keeps working in their
checkout while a run goes. One run at a time per project, but each run has its own folder and is
found by its own branch, so parallel runs later need no redesign.

Success: on the sample repo, a run started from a checkout on `main` with uncommitted edits ends
`done` on a task branch, and the checkout is still on `main` with the same edits.

## Decisions taken in the brainstorm

| # | Question | Choice |
|---|---|---|
| 1 | Goal | Isolation only; parallel-ready by design. |
| 2 | Where the worktree lives | `.orchestra/worktrees/<branch>` inside the project. Ignored by the existing `.orchestra/*` line; inside the session's folder on Claude Code and Codex, so no permission prompts. |
| 3 | On `done` | Remove the worktree, keep the branch. Keep it on `decide` and `failed`. |
| 4 | The base | `origin/<default>` after `git fetch origin`. Local unpushed commits on the default branch are not in the run. |
| 5 | Who creates the worktree | orchestra. The workflow keeps the branch name, `run.json` and `task.md`. |

## The flow

Two roots:
- The **project root** is the user's checkout, where `orchestra:run` and `drive.js` start. It holds
  `.orchestra/config.json` and `.orchestra/resolved.json`.
- The **run root** is the worktree. Everything else happens there: `next.js`, the gate runner, the
  subagents, the build, the commits, the run folder and the notes folder.

### Start (`drive.js --task-file <file>`)

1. Read the task file, from the project root.
2. `git fetch origin`. Read the default branch from `origin/HEAD`. A missing `origin/HEAD` or a failed
   fetch gives `failed` with the reason, as today.
3. `git worktree add --detach .orchestra/worktrees/.new-<pid> origin/<default>`.
4. Call `next.js --project <run root> --task-file <absolute task file>`. `prepare` creates
   `task/<slug>` from the detached HEAD and writes `run.json` (`base` = that HEAD) and `task.md`.
   The branch must be new across all worktrees: `prepare` already adds `-2`, `-3` when a branch
   exists, and branches are shared by all worktrees.
5. Create the parent folder, then `git worktree move` the folder to `.orchestra/worktrees/<branch>`.
   If the move fails, the run goes on under the temporary name; nothing depends on the name.
6. Continue the loop in the run root, as today.

If step 4 returns `failed`, orchestra removes the new worktree (it holds no work) and returns the
failure.

The user's tree does not need to be clean: a worktree holds only committed files.

### Finding the run (every call without a task)

`git worktree list --porcelain` from the project root. A run is an entry whose path is under
`<project root>/.orchestra/worktrees/`, whose branch starts with `task/`, and which has
`tmp/runs/<branch>/run.json`.
- One run: continue it.
- No run: `failed`, "No run to resume. Start a run with a task."
- Several: `failed`, listing the branches; `drive.js --branch <name>` picks one. The `orchestra:run`
  skill passes `--branch` when the user names a branch.

Paths are compared after `fs.realpathSync` on both sides (macOS `/tmp` symlink, R8).

The resume check for files changed since the stop (S63) now looks at the run root.

### Dispatch

`withPrompt` adds one line before the inputs: "Work in `<absolute run root>`. Run every command from
there; every path below is relative to it." `result` and `inputs` stay relative to the run root.

### End

- `done`: commit the notes (as today), then `git worktree remove <run root>` without `--force`, then
  `git worktree prune`. If the remove refuses, keep the worktree and add a line to the action:
  "The worktree `<path>` was kept: <git's message>." The branch always stays.
- `decide`, `failed`: keep the worktree.
- Every action's `report` path, and the `decisions.md` path that the skill shows, are relative to the
  project root (`.orchestra/worktrees/task/x/docs/runs/task/x/report.md`), so the user opens them from
  their checkout. The action also carries `worktree`, the run root relative to the project root.

## Changes

### Code

- `orchestra/lib/worktree.js` (new): `create(project, base)`, `rename(project, from, branch)`,
  `find(project, branch?)`, `remove(project, dir)`. Each wraps git commands; no state file.
- `orchestra/bin/drive.js`: the two roots; start, find, end as above; the `--branch` argument.
- `orchestra/lib/protocol.js`: the "Work in" line in `withPrompt`.
- `orc-standard-workflow/bin/next.js`: `prepare` drops the dirty check, the checkout and the pull. It
  keeps the slug, the branch, `run.json` and `task.md`.
- The runner, the report and `lib/git.js` are unchanged: they take a folder and get the run root.

### Contracts

- DESIGN §7 and §8.3: a workflow's `next.js` starts in a fresh worktree on a detached HEAD at the
  base. It creates its branch there, and never checks out, pulls or switches branches.
- `orchestra/lib/check.js`:
  - the dry run calls `next.js` on a detached HEAD at the base, as a real run does;
  - a new `--project` rule: `.orchestra/worktrees/` is ignored by git (`git check-ignore -q
    .orchestra/worktrees/x`). Fix: add `.orchestra/*` and `!.orchestra/config.json` to `.gitignore`,
    or run orchestra init.
- `orchestra:writing-plugins`: the workflow rule above.
- `orchestra:run`: the start message says it fetches `origin/<default>` and starts `task/<name>` in
  `.orchestra/worktrees/<branch>`; the `decide` text names the `decisions.md` path from the action; a
  named branch on a resume is passed as `--branch`.

### Versions

All three plugins move to 0.11.0, because the workflow contract changes.

## Known limits

- A run started before this change, on a task branch in the user's checkout, cannot resume. Finish or
  delete it before the upgrade. No migration.
- A fresh worktree has no build output and no untracked files (`.env`). The first build compiles
  everything; `~/.m2` is shared. A project that needs untracked local files cannot run yet.
- IDEs that do not read `.gitignore` may index a second copy of the code. Exclude the folder in the IDE.
- Not run on Codex (plan 5 is paused).

## Tests

- `test/orchestra/drive.test.js`:
  - a run leaves the checkout's branch and an uncommitted edit untouched, commits only in the
    worktree, and removes the worktree on `done`;
  - a `decide` keeps the worktree, and the resume finds it from the project root;
  - two open runs give `failed` with both branches, and `--branch` picks one;
  - a dirty checkout does not block a start;
  - a failed `prepare` leaves no worktree.
- `test/orchestra/check.test.js`: the dry run on a detached HEAD; the ignore rule fails without the
  `.gitignore` lines and passes with them.
- The `orc-standard-workflow` tests: `prepare` no longer checks out or pulls.
- A real run on the sample repo, as in the success line above.

## Docs

- R8 (done), S74 in `docs/TENSIONS.md` and `docs/DECISIONS.md`; O9 leaves "Later".
- `docs/DESIGN.md` §6.6, §7, §8.3; `docs/CONTEXT.md`: **worktree**, **project root**, **run root**.
- `docs/guide.html`: the sections this changes, the version and the last S number.

## Amendments (planning)

1. **The `report` path stays relative to the run root,** as today. A kept worktree is named by the new action key `worktree` (relative to the project root), so the user opens `<worktree>/<report>`. On `done` the worktree is gone, so the skill shows `git show <branch>:<report>`. The spec said "relative to the project root", which fails on `done`.
2. **The config comes from the base commit.** `next.js` and the runner read `.orchestra/config.json` inside the worktree, which is the committed version at `origin/<default>`. `drive.js` copies only `.orchestra/resolved.json` (git-ignored) from the project root into the run root on every call. A config that is not on `origin/<default>` stops the start with a clear message.
