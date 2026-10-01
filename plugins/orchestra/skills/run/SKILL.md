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

For each section in the config, take its `plugin` value. Invoke the skill `<plugin>:manifest`. It
answers with one line, `PLUGIN_DIR=<folder>`.

Then run:

```
node <orchestra>/bin/resolve.js <slot>=<folder> <slot>=<folder> …
```

If it exits with an error, show the error and stop.

## 3. Drive

Start the run:
- If the user gave a task as text, write it to `.orchestra/task.txt` and run
  `node <orchestra>/bin/drive.js --task-file .orchestra/task.txt`.
- If the user gave a file path, run `node <orchestra>/bin/drive.js --task-file <path>`.
- If the user gave no task, this is a resume. Run `node <orchestra>/bin/drive.js`.

The command prints one JSON line. Act on its `action`:

- `dispatch`: dispatch a subagent with a clean context. Give it the `prompt` text exactly. Wait
  until it finishes. Then run `node <orchestra>/bin/drive.js` again, with no task.
- `done`: tell the user the run is done. Show the `report` path.
- `failed`: show the `reason` and the `report` path, if there is one.
- `decide`: show each line of `questions`. Tell the user to write the answers in
  `<runDir>/decisions.md` under the heading `## <gate>`, then call orchestra run again.

Stop after `done`, `failed` or `decide`.

## Permitted actions

- Do not edit project files yourself. Subagents do the work.
- Do not change the order, skip a dispatch or run a stage that was not printed.
- Do not push and do not open a pull request.
- If you cannot dispatch a subagent, invoke the skill named in `skill` yourself, follow the
  `prompt`, and continue the loop.
