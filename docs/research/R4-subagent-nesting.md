# R4: Can a subagent dispatch its own subagents?

Researched 2026-09-24. Every claim has a source. Anything I could not confirm is marked UNVERIFIED.

## Short answer

Only Claude Code allows nesting by default and documents it as a supported pattern.
Codex CLI, VS Code Copilot and Cursor allow at most one extra layer, and Codex and VS Code have it off by default.
Copilot CLI allows deep nesting (default depth 4).
If the chain must be portable, the stack-review stage should not rely on nesting. Run it in the main session, or let the main session fan out the reviewers directly.

## Claude Code

- Nesting is allowed by default. "By default, a subagent can spawn subagents of its own, up to three layers below the main conversation." https://code.claude.com/docs/en/sub-agents
- At the limit, Claude Code removes the `Agent` tool from the subagent, so it does the work itself. https://code.claude.com/docs/en/sub-agents
- The env var `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` sets the depth. `1` turns nesting off. https://code.claude.com/docs/en/sub-agents
- To stop a single agent from spawning, leave `Agent` out of its `tools` list or add it to `disallowedTools`. https://code.claude.com/docs/en/sub-agents
- The default has changed several times. v2.1.172 to v2.1.216 allowed 5 layers. v2.1.217 and v2.1.218 defaulted to 1. v2.1.219 raised it to 3. Pin a minimum version if you rely on this. https://code.claude.com/docs/en/sub-agents
- Parallel runs are supported. The docs name "a reviewer subagent that dispatches a verifier per finding" as a good use of nesting. https://code.claude.com/docs/en/sub-agents
- At most 20 subagents can run at once. `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` changes this (v2.1.217+). https://code.claude.com/docs/en/sub-agents
- Caveat: in `-p` mode and the Agent SDK, the launching subagent does not wait for nested background subagents. Late results go to the main conversation instead. https://code.claude.com/docs/en/sub-agents
- Agent teams cannot nest. "Teammates cannot spawn their own teammates. Only the lead can manage the team." An in-process teammate's own subagents run in the foreground only. https://code.claude.com/docs/en/agent-teams
- Documented alternatives: chain subagents from the main conversation, or use Skills, which run in the main context. https://code.claude.com/docs/en/sub-agents

## OpenAI Codex CLI

- The official subagents page does not say whether a subagent can spawn subagents. https://learn.chatgpt.com/docs/agent-configuration/subagents
- The source code does. `agents.max_depth` defaults to `1` (`DEFAULT_AGENT_MAX_DEPTH: i32 = 1`). https://github.com/openai/codex/blob/main/codex-rs/core/src/config/mod.rs
- The root session is depth 0. A child is depth 1. A spawn is blocked when the new depth is greater than `max_depth`. So by default the main session can spawn children, but children cannot spawn grandchildren. https://github.com/openai/codex/blob/main/codex-rs/core/src/agent/registry.rs
- In multi-agent V1, the spawn tools are hidden from any agent at the depth limit. https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/spec_plan.rs
- Setting `agents.max_depth = 2` lets a depth-1 child spawn once more (a test covers this). https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/multi_agents_tests.rs
- The config comment says: "Maximum nesting depth for V1 agent threads. Ignored by V2." https://github.com/openai/codex/blob/main/codex-rs/config/src/config_toml.rs
- Multi-agent V2 is the feature flag `multi_agent_v2`. It is marked stable but is off by default. https://github.com/openai/codex/blob/main/codex-rs/features/src/lib.rs
- UNVERIFIED: the real depth limit under V2. A test shows V2 allows a depth-1 child to spawn even with `max_depth = 1`. https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/multi_agents_tests.rs
- UNVERIFIED: a user-reported bug says `max_depth` is not enforced in 0.155.1. https://github.com/openai/codex/issues/46704
- Parallel runs are supported. "Codex runs parallel agents and combines their results." https://learn.chatgpt.com/docs/agent-configuration/subagents
- `agents.max_concurrent_threads_per_session` limits how many agents run at once. `agents.max_threads` still works as an older name. The V1 default is 6 and the V2 default is 4. https://learn.chatgpt.com/docs/agent-configuration/subagents , https://github.com/openai/codex/blob/main/codex-rs/core/src/config/mod.rs
- `agents.enabled = false` turns multi-agent tools off. https://learn.chatgpt.com/docs/agent-configuration/subagents
- Documented pattern: the parent spawns "one agent per point, wait for all of them, and summarize the result". The parent fans out; nothing is said about nesting. https://learn.chatgpt.com/docs/agent-configuration/subagents

## GitHub Copilot CLI

- Nesting is allowed. The default maximum depth dropped from 6 to 4 in 1.0.71 (2026-07-16). https://github.com/github/copilot-cli/blob/main/changelog.md
- `subagents.maxDepth` changes the limit, up to 128. Only usage-based billing users can change it. https://github.com/github/copilot-cli/blob/main/changelog.md
- Depth and concurrency limits can be set in `/settings` (1.0.66). https://github.com/github/copilot-cli/blob/main/changelog.md
- "Custom agents keep their tool filters in nested subagents." https://github.com/github/copilot-cli/blob/main/changelog.md
- UNVERIFIED: the exact settings key and default for concurrency. The official config-directory docs do not list subagent keys. https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference
- Parallel runs are supported through `/fleet`. "Where possible, the orchestrator agent will run the subagents in parallel." https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet
- Subagents do not see the orchestrator's chat history. https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet
- The model decides whether to delegate to a custom agent. It may do the work itself. https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/invoke-custom-agents
- UNVERIFIED: a third-party issue reports that, on some versions, a delegated sub-agent cannot call a plugin-defined custom agent. https://github.com/ThomasMichon/copilot-extensions/issues/2762

## GitHub Copilot in VS Code (agent mode)

- Nesting is off by default. "By default, subagents cannot spawn further subagents." https://code.visualstudio.com/docs/copilot/agents/subagents
- `chat.subagents.allowInvocationsFromSubagents` turns it on. Maximum depth is then 5. https://code.visualstudio.com/docs/copilot/agents/subagents
- The `agents` frontmatter field limits which custom agents can be used as subagents. https://code.visualstudio.com/docs/copilot/agents/subagents
- Parallel runs are supported. https://code.visualstudio.com/docs/copilot/agents/subagents
- UNVERIFIED: an open issue says calls at depth 3 or more are rejected. https://github.com/microsoft/vscode/issues/335257
- UNVERIFIED: the cloud Copilot coding agent. I found no primary source about nesting there.

## Cursor

- Nesting is allowed since Cursor 2.5, one extra layer only. "The main agent and its direct subagents can launch subagents, but a subagent launched by another subagent can't launch further ones." https://cursor.com/docs/subagents
- There is no setting to change the depth. Nested launches need Task tool access in the current mode. Hooks or tool policies can block spawning. https://cursor.com/docs/subagents
- Parallel runs are supported. The agent sends several Task calls in one message. `is_background: true` runs a subagent without blocking the parent. https://cursor.com/docs/subagents

## What this means for the stack-review stage

- The chain is: main → stage subagent (depth 1) → reviewer subagents (depth 2).
- Default depth 2 works in Claude Code, Copilot CLI and Cursor.
- It fails by default in Codex CLI (V1, `max_depth = 1`) and VS Code Copilot (setting off).
- Every client documents the main session fanning out as the normal case. Claude Code also says to chain subagents from the main conversation. https://code.claude.com/docs/en/sub-agents , https://learn.chatgpt.com/docs/agent-configuration/subagents
- Portable choice: run the stack-review stage as a skill in the main session. It then dispatches the reviewers itself at depth 1, which works in every client.
- Alternative: the stage subagent returns a list of reviewer jobs, and the orchestrator dispatches them.

## Table

| Client | Nesting allowed | Max depth (default) | Parallel | Config |
|---|---|---|---|---|
| Claude Code | Yes, by default | 3 layers below main (was 5, then 1, in older versions) | Yes, 20 running at once | `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (1 = off), `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, drop `Agent` from `tools` / add to `disallowedTools` |
| Claude Code agent teams | No | Teammates cannot spawn teammates | Yes | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` |
| Codex CLI | Off by default (V1) | `max_depth = 1`: children only, no grandchildren. V2 ignores it (V2 limit UNVERIFIED) | Yes, 6 (V1) / 4 (V2) | `[agents] max_depth`, `max_concurrent_threads_per_session` (alias `max_threads`), `enabled`; `[features] multi_agent_v2` |
| Copilot CLI | Yes | 4 (was 6) | Yes, `/fleet` | `subagents.maxDepth` (max 128, usage-based billing only), `/settings`; concurrency key UNVERIFIED |
| Copilot in VS Code | Off by default | 5 when enabled | Yes | `chat.subagents.allowInvocationsFromSubagents`, `agents` frontmatter |
| Cursor (2.5+) | Yes, one extra layer | 2 (main → sub → sub), fixed | Yes, `is_background` | None for depth; needs Task tool in the mode; hooks/policies can block |
