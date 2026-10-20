---
name: run
description: Use when the user wants orchestra to take one task to reviewed, committed code — "orchestra run <task>", "run this task with orchestra" — or to resume a stopped orchestra run on a task branch.
---

# orchestra run

You drive one run. Code decides every step. You only do what the printed action says.

`<orchestra>` is the folder two levels above this skill's folder. Run every command from the
project root.

## 1. Read the config

Read `.orchestra/config.json`. If it does not exist, tell the user to run orchestra init, and stop.

## 2. Resolve the slots

Resolve at the start of every call, also on a resume. Never reuse an old `.orchestra/resolved.json`.

For each section in the config, take its `plugin` value. Invoke the skill `<plugin>:manifest`. It
answers with one line, `PLUGIN_DIR=<folder>`.

Then run:

```
node <orchestra>/bin/resolve.js <slot>=<folder> <slot>=<folder> …
```

If it exits with an error, show the error and stop.

## 3. Drive

When the user gave a task, tell them first what the start does: it fetches `origin/<default>` and starts
a new branch `task/<name>` in its own worktree, `.orchestra/worktrees/<branch>`. Their checkout, its
branch and its files are not touched.

Start the run:
- If the user gave a task as text, write it to `.orchestra/task.txt` and run
  `node <orchestra>/bin/drive.js --task-file .orchestra/task.txt`.
- If the user gave a file path, run `node <orchestra>/bin/drive.js --task-file <path>`.
- If the user gave no task, this is a resume. Run `node <orchestra>/bin/drive.js --resume`, with
  `--branch <name>` when the user names a branch. When it fails because several runs are open, show
  the branches and ask which one.

`drive.js` can run the project's full build before it prints, and a build can take many minutes.
Run every `drive.js` command in the background and wait until it ends, or, when that is not
possible, with the longest timeout your shell allows. Never stop it early and never start a second
one while it runs.

The command prints one JSON line. It names the run's `branch`, and `worktree`, the run's folder, while
the run is open. Tell the user both once, when the run starts. Every path in the action is relative to
`worktree`. Act on its `action`:

- `setup`: no run started, and no branch or worktree was made. Show the `reason`. Ask the user to
  choose one of three:
  1. **Set up on the default branch now.** Check that the checkout is on the branch that `base`
     names (without `origin/`), that it is clean, and that it is not behind `base`. If not, say what
     is wrong and stop. Then invoke the skill `skill` in this session, in the checkout, with no
     inputs. It interviews the user and commits on that branch. Tell the user to push, then to start
     the run again.
  2. **Set up on its own branch.** Run `node <orchestra>/bin/drive.js --setup`. It prints an
     `inline` action on a new branch `curator/setup`. Act on it as below.
  3. **Go on without setup.** Run the start command again with `--skip-setup`. The run starts, and
     curate is skipped at the end. The next run asks again.

- `dispatch`: dispatch a general-purpose subagent with a clean context. It must be able to read and
  edit files and run shell commands. Give it the `prompt` text exactly. Wait
  until it finishes. Then run `node <orchestra>/bin/drive.js` again, with no task.
- `inline`: do this one yourself, in this session, not in a subagent. orchestra prints it for a
  Curator skill that may talk to the user. Follow the `prompt` text exactly: invoke the skill it
  names, ask the user its questions, work only in `worktree`, and write the result file. Then run
  `node <orchestra>/bin/drive.js` again, with no task.
- `setup-done`: the Curator setup is committed on `branch`, and its worktree is removed. Tell the
  user to merge `branch` into the default branch, then to start the run again. If the action has
  `kept`, say so as for `done`.
- `done`: tell the user the run is done, on which `branch`, and that they read the report with
  `git show <branch>:<report>`. If the action has `note`, show it. If the action has `kept`, say the worktree `<worktree>` was kept and show `kept`. When the user has dealt with the files, they remove it with `git worktree remove <worktree>`.
- `failed`: show the `reason`, the `branch`, and `<worktree>/<report>` when the action has them.
- `decide`: show each line of `questions` and `<worktree>/<report>`. The user answers in
  `decisions.md` in the notes folder inside `<worktree>`: a **new** section `## <gate>` at the end of the file, with
  one line per question: `- <question> → <answer>`. A `business-facts` stop counts these lines and
  stops again until every question has one. If the user gives the answers to you in the conversation, add that new section
  yourself: one line per question, `- <question> → <their answer>`, with the question copied from
  `questions` and the answer in their words exactly. Then run `node <orchestra>/bin/drive.js --resume`.
  Otherwise tell the user to call orchestra run again after they write it.

Stop after `setup`'s choice is carried out, and after `setup-done`, `done`, `failed` or `decide`.

## Permitted actions

- Do not edit project files yourself. Subagents do the work in the run's worktree. Three exceptions:
  the user's answers to a `decide`, written to `decisions.md` inside the worktree as above, the
  work of an `inline` action, and the setup skill in the checkout when the user chose it at a
  `setup`.
- Do not change the order, skip a dispatch or run a stage that was not printed.
- Do not push and do not open a pull request.
- If you cannot dispatch a subagent, stop the run. Tell the user that orchestra needs subagents:
  each stage runs in a fresh context, so a reviewer never judges work from its own context. Never
  do a stage yourself; an `inline` action is not a stage.
