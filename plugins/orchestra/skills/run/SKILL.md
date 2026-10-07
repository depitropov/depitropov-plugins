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

When the user gave a task, tell them first what the start does: it checks out the default branch,
pulls it from the remote with `git pull --rebase`, and switches to a new branch `task/<name>`.

Start the run:
- If the user gave a task as text, write it to `.orchestra/task.txt` and run
  `node <orchestra>/bin/drive.js --task-file .orchestra/task.txt`.
- If the user gave a file path, run `node <orchestra>/bin/drive.js --task-file <path>`.
- If the user gave no task, this is a resume. Run `node <orchestra>/bin/drive.js`.

The command prints one JSON line. It always names the current `branch`. Tell the user the branch
once, when the run starts. Act on its `action`:

- `dispatch`: dispatch a general-purpose subagent with a clean context. It must be able to read and
  edit files and run shell commands. Give it the `prompt` text exactly. Wait
  until it finishes. Then run `node <orchestra>/bin/drive.js` again, with no task.
- `done`: tell the user the run is done, on which `branch`, and show the `report` path.
- `failed`: show the `reason`, the `branch`, and the `report` path, if there is one.
- `decide`: show each line of `questions` and the `report` path. The report says where to write the
  answers. Tell the user to call orchestra run again after that.

Stop after `done`, `failed` or `decide`.

## Permitted actions

- Do not edit project files yourself. Subagents do the work.
- Do not change the order, skip a dispatch or run a stage that was not printed.
- Do not push and do not open a pull request.
- If you cannot dispatch a subagent, invoke the skill named in `skill` yourself, follow the
  `prompt`, and continue the loop.
