---
name: init
description: Use when the user wants to set up orchestra in a project — "orchestra init", "set up orchestra here" — or to change which workflow, Stack Skills or Curator plugin the project uses.
---

# orchestra init

You set up orchestra in the project in the current folder. You ask the user which plugins to use,
write one file and three ignore lines, and check the result. You commit nothing.

`<orchestra>` is the folder two levels above this skill's folder. Run every command from the
project root.

## 1. An existing config

If `.orchestra/config.json` exists, show it and ask the user if you may replace it. If not, stop.

## 2. Find the plugins

Look at the list of skills available to you. Each skill named `<plugin>:manifest` belongs to a
plugin that can fill a slot.

If the list shows no manifest skills, ask the user for the name of the workflow plugin and of the
Stack Skills plugin. Offer `orc-standard-workflow` as the default workflow plugin, and `orc-java-stack` and `orc-ts-stack` as the Stack Skills plugins.

For each plugin, invoke the skill `<plugin>:manifest`. It answers with one line,
`PLUGIN_DIR=<folder>`. Read `<folder>/orchestra.json`. Its `slot` is `workflow`, `stack-skills` or `curator`.

## 3. Ask

Ask the user which plugin fills each slot. Offer only the plugins of that slot. When a slot has one
plugin, propose it and ask for a yes. When the `workflow` or the `stack-skills` slot has no plugin, tell the user that orchestra needs one
plugin for each of these two slots, and stop.

The `curator` slot is optional. When a Curator plugin is in the list, ask the user if the project wants it; it keeps the project's backlog and direction docs current, and its setup writes the Curator's docs before the first run. When there is none, leave the slot out.

## 4. Write

Write `.orchestra/config.json` with only `plugin` in each section:

```json
{
  "workflow": { "plugin": "<workflow plugin>" },
  "stack-skills": { "plugin": "<Stack Skills plugin>" }
}
```

Add `"curator": { "plugin": "<Curator plugin>" }` only when the user chose one.

Add each of these lines to `.gitignore` when it is missing. Create the file when there is none.

```
.orchestra/*
!.orchestra/config.json
tmp/
```

## 5. Check

Run:

```
node <orchestra>/bin/resolve.js workflow=<workflow folder> stack-skills=<Stack Skills folder>
```

Add `curator=<Curator folder>` to the command when the config has a curator section.

It resolves the plugins and runs orchestra check on the config. If it fails, show each line: every
line names the rule and its fix. Leave the config in place, so the user can fix it.

When it passes, tell the user:
- The config holds only the plugins. Every other key takes its default from the plugin's
  `orchestra.json`. A project can set those keys, turn gates off with `disable`, and change a gate's
  `max_rounds` under `gates`.
- Commit and push `.orchestra/config.json` and `.gitignore`, so everyone on the project uses the same plugins. A run reads them from `origin/<default>`. init never pushes; the user does.
- Start a run with orchestra run.

## Permitted actions

- Change only `.orchestra/config.json` and `.gitignore`. The check in step 5 also writes
  `.orchestra/resolved.json`, which git ignores.
- Do not commit, push or start a run.
