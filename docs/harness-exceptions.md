# Harness exceptions

The plugins aim to run on more than one harness: Claude Code today, Codex in plan 5 (S71). This file
lists every place where a plugin uses a feature of one harness that another harness does not give.
Each row is a shortcut we take for now. It must be explicit, and the user must permit it.

## Rules

- Add a row in the same change that adds the exception. A harness-specific feature with no row here
  is a bug.
- A row names who permitted it and when: an `S` decision, or the user's word with a date. A row
  with no permission is an open question for the user, not a permission.
- Remove the row in the same change that removes the exception.

## Exceptions

| # | Exception | Where | What breaks on another harness | Workaround there | Permitted |
|---|---|---|---|---|---|
| H1 | Plugin `dependencies`: `orc-curator` needs `mattpocock-skills` | `plugins/orc-curator/plugin.json`, `.claude-plugin/plugin.json`; `.claude-plugin/marketplace.json` (`allowCrossMarketplaceDependenciesOn`) | The dependency is not installed with the plugin (R10: Claude Code feature; inferred, medium) | The user installs `mattpocock-skills` by hand | S79, user decision |
| H2 | Plugin `dependencies`: `orc-core` needs `clean-code` | `plugins/orc-core/plugin.json`, `.claude-plugin/plugin.json` | `clean-code` is not installed with the core plugin. The clean-code gate then writes the result `failed` with the reason "the clean-code plugin is not installed": its rules and its measurement live only in `clean-code` (S92) | The user installs `clean-code` by hand | S85, S92, user 2026-10-23 and 2026-11-19 |
| H3 | The `CLAUDE_PLUGIN_ROOT` variable in commands | `plugins/clean-code/README.md`, `skills/clean-code/SKILL.md`, `skills/clean-code/measurement.md`, `skills/clean-code-python/SKILL.md`, `skills/clean-code-typescript/SKILL.md` | The variable is empty, so the command looks for `/skills/...` | The `clean-code` skill says: when it is empty, use the folder of the `SKILL.md` | Open: inherited from the mentorano copy (S75); not yet confirmed by the user |
