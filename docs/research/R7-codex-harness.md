# R7: What must change for orchestra to run on Codex?

Researched 2026-10-14 from the Codex source code (`github.com/openai/codex` master, commit `7a08c5f`).
Paths are under `codex-rs/`. Nothing was run: the local Codex install has no native binary.
Anything read only from code, or inferred, is marked.

## Short answer

Almost nothing. Codex reads the Claude Code plugin layout (`.claude-plugin/plugin.json`,
`.claude-plugin/marketplace.json`) when its own files are missing. It names plugin skills
`plugin:skill`, gives the model each `SKILL.md` path, dispatches subagents by default, and lets a
long build run by polling. The open risks need a real run: whether a subagent can invoke a plugin
skill, and how the model handles a 10-minute `drive.js`.

## Findings

### Skill names

- A plugin skill is named `<manifest name>:<skill>`; an empty manifest name falls back to the folder
  name. `ext/skills/src/loader/namespace.rs:179`, `utils/plugins/src/plugin_namespace.rs:90-119`.
  Source code, strong.
- Two plugins that each ship `manifest` show as `a:manifest` and `b:manifest`. The loader removes
  duplicates only by path. `ext/skills/src/loader/host_merge.rs:228`. Source code, strong.
- Two plugins with the same manifest name: not settled.

### Skill folder

- The skills list gives each skill as `- plugin:skill: description (file: <path>)`, sometimes through
  a "Skill roots" alias table. The prompt says to resolve relative paths against the `SKILL.md`
  folder. `ext/skills/src/render.rs:258-267`, `ext/skills/src/catalog_prompt.rs:24-32`. Source
  code, strong. So "two folders up" in orchestra's skills works.

### Subagents

- The `multi_agent` feature is stable and on by default; no config line is needed.
  `features/src/lib.rs:1471-1476`. Source code, strong. This corrects the sc-agent-plugins README.
- V1 tool: `spawn_agent`, all parameters optional (`message` or `items`, `agent_type`,
  `fork_context`, `model`, `reasoning_effort`), plus `wait_agent`, `send_input`, `close_agent`.
  `core/src/tools/handlers/multi_agents_spec.rs:70-106`. Source code, strong.
- V2 (`multi_agent_v2`, off by default; some models force it): `spawn_agent` needs `task_name` and
  `message`, and takes `fork_turns` = `all` | `none`. `multi_agents_spec.rs:108-164`. Source code,
  strong.
- A subagent cannot start its own by default (`agent_max_depth = 1`). `core/src/config/mod.rs:265`,
  `tools/spec_plan.rs:728-734`. Source code, strong. Agrees with R4.
- A subagent sees the same skills list: the skills extension runs per thread with the host config,
  and the child config filters nothing. `ext/skills/src/extension.rs:145`,
  `core/src/agent/child_config.rs`. Inference from code, medium.

### Install

- Manifest order in a plugin folder: `plugin.json` with the Agent Plugins `$schema`, then
  `.codex-plugin/plugin.json`, then `.claude-plugin/plugin.json`, then `.cursor-plugin/plugin.json`.
  `utils/plugins/src/plugin_namespace.rs:43-80`. Source code, strong. orchestra's root
  `plugin.json` has no `$schema`, so Codex uses `.claude-plugin/plugin.json`.
- Catalog order: `.agents/plugins/marketplace.json`, `.agents/plugins/api_marketplace.json`,
  `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`.
  `core-plugins/src/marketplace.rs:20-25`. Source code, strong. The second catalog of DESIGN §11 is
  not needed for Codex.
- Catalog fields: `name`, `plugins[]` (`name`, `source`, `policy`, `category`). A local `source` path
  starts with `./`. `policy.installation`: `NOT_AVAILABLE`, `AVAILABLE` (default),
  `INSTALLED_BY_DEFAULT`; `policy.authentication`: `ON_INSTALL` (default), `ON_USE`.
  `marketplace.rs:157-184, 677-702, 995-1070`. Source code, strong.
- Commands: `codex plugin marketplace add <owner/repo[@ref] | URL | ./path>`, then
  `codex plugin add PLUGIN@MARKETPLACE`. `cli/src/marketplace_cmd.rs`, `cli/src/plugin_cmd.rs`.
  Source code, strong.

### Long commands

- `exec_command` returns after `yield_time_ms` (default 10 s, 250 ms–30 s) with a `session_id`; the
  process keeps running and the model polls with `write_stdin`, up to 300 s per poll. No kill
  timeout. `core/src/unified_exec/mod.rs:68-72`, `config/src/config_toml.rs:345`. Source code,
  strong. A 10-minute build works if the model keeps polling.
- A one-shot variant takes `timeout_ms` (default 10 s) and kills the process. Maximum not found.

### Project instructions

- Codex reads `AGENTS.md` (and `AGENTS.override.md` first) from the project root down to the working
  folder, plus `~/.codex/AGENTS.md`. It reads `CLAUDE.md` only if
  `project_doc_fallback_filenames` names it. `core/src/agents_md.rs`. Source code, strong. Agrees
  with S8.

## Recommendation

When Codex is available: install from `.claude-plugin/marketplace.json` as it is, add no second
catalog and no `$schema` until a harness needs them, and prove the run on the sample repo (S34).
Check first that a dispatched subagent invokes a plugin skill, and that the model polls `drive.js`
to the end.

## Evidence gaps

- Nothing was run.
- A subagent's skills list: inferred, not seen.
- Two plugins with the same manifest name.
- The maximum of the one-shot `timeout_ms`, and the legacy `shell_command` timeouts.
- Docs were not compared with the source. The local desktop app may differ from master.
