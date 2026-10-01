# R1: How clients load AGENTS.md / CLAUDE.md

Researched 2026-09-23. Feeds O5 and O6 in `docs/TENSIONS.md`.
Every claim has a source. UNVERIFIED marks what I could not confirm.

Main sources:

- Claude Code memory docs: https://code.claude.com/docs/en/memory
- Claude Code subagents docs: https://code.claude.com/docs/en/sub-agents
- Claude Code skills docs: https://code.claude.com/docs/en/skills
- Codex AGENTS.md docs: https://learn.chatgpt.com/docs/agent-configuration/agents-md (old URL https://developers.openai.com/codex/guides/agents-md redirects here)
- Codex source, commit `5bae5b5` (2026-09-23): https://github.com/openai/codex
- AGENTS.md spec: https://agents.md/
- Agent Skills spec: https://agentskills.io/specification

## 1. Does Claude Code read AGENTS.md natively?

Yes. Since v2.1.277. Older versions need a `CLAUDE.md` that imports it.
Source: https://code.claude.com/docs/en/memory#agents-md

- It is a built-in plugin called `agents-md`. You can disable it in `/plugin`.
  Source: https://code.claude.com/docs/en/memory#when-agents-md-support-is-unavailable and https://github.com/anthropics/claude-code/tree/main/mods/agents-md
- Before v2.1.281, some sessions (Bedrock, telemetry off) still read only `CLAUDE.md`.
  Source: https://code.claude.com/docs/en/memory#when-agents-md-support-is-unavailable
- The first session after an upgrade from v2.1.276 or earlier may not read it.
  Source: same section.
- Release date of v2.1.277: UNVERIFIED.

How it combines with CLAUDE.md. The setting is **Project instructions** in `/config`.
Source: https://code.claude.com/docs/en/memory#choose-which-instruction-files-load

| Value | What loads |
|---|---|
| `claude-md-or-agents-md` (default) | `CLAUDE.md` files. `AGENTS.md` only if there is no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in the working dir or above it. |
| `claude-md-and-agents-md` | Both. Per directory, `CLAUDE.md` first, then `AGENTS.md`. Duplicates are skipped. |
| `claude-md` | `CLAUDE.md` only. |
| `managed-only` | Only managed `CLAUDE.md` and auto memory at launch. |

Key traps:

- The default is "or", not "and". One root `CLAUDE.md` switches off every `AGENTS.md`, nested ones too.
  Source: https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md
  Field reports of this trap: https://github.com/kibertoad/cat-factory/issues/2257, https://github.com/olafkfreund/nixarchy/issues/836
- `~/.claude/CLAUDE.md`, managed `CLAUDE.md` and `.claude/rules/` do not count for that check. They load alongside `AGENTS.md`.
  Source: https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md
- A `CLAUDE.local.md` does count. Adding one silently turns `AGENTS.md` off.
  Source: same section.
- The setting is only honoured in user, `--settings` or managed settings. Project settings files are ignored. So a repo cannot force "and" mode for its users.
  Source: https://code.claude.com/docs/en/memory#choose-which-instruction-files-load
- Not read: `AGENTS.local.md`, `AGENTS.override.md`, anything under `.agents/`.
  Source: https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md
- `InstructionsLoaded` hooks do not fire for a directly read `AGENTS.md`.
  Source: https://code.claude.com/docs/en/memory#where-agents-md-differs-from-claude-md
- The portable fallback still works: a `CLAUDE.md` with `@AGENTS.md`. It never loads the file twice.
  Source: https://code.claude.com/docs/en/memory#remove-an-earlier-agents-md-workaround

## 2. Nested files: which load, and when

### Claude Code: CLAUDE.md

- At launch: `CLAUDE.md` and `CLAUDE.local.md` in the working dir and every parent.
- Lazily: files in subdirectories below the working dir load "when Claude reads files in those subdirectories".
  Source: https://code.claude.com/docs/en/memory#how-claude-md-files-load
- The hook reason for this is `nested_traversal`. The event carries `trigger_file_path`.
  Source: https://code.claude.com/docs/en/hooks
- After `/compact`, only the root file is re-injected. Nested files come back when Claude reads a matching file again.
  Source: https://code.claude.com/docs/en/memory#instructions-seem-lost-after-compact
- Open bug: in 2.1.273–2.1.274 the nested loader injected a folder's `.claude/rules/` but skipped that folder's `CLAUDE.md`.
  Source: https://github.com/anthropics/claude-code/issues/95104
- Does a write to a new file (no prior Read) trigger the nested load? The docs say "reads". UNVERIFIED for Write/Edit.

### Claude Code: AGENTS.md

- At launch: every `AGENTS.md` and `.claude/AGENTS.md` in the working dir and above.
- Lazily: a subfolder's `AGENTS.md` loads when Claude opens a file there with the Read tool, and only if that subfolder has no `CLAUDE.md` of its own.
  Source: https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md
- Read tool only. Not for IDE-opened files, selections or notebooks.
  Source: https://github.com/anthropics/claude-code/blob/main/mods/agents-md/README.md
- All of this is off in default mode when any `CLAUDE.md` exists up the path (see section 1).

### Claude Code: subagents

- Docs: a non-fork subagent gets "every level of the CLAUDE.md hierarchy the main conversation loads", including project rules and `AGENTS.md`.
  Source: https://code.claude.com/docs/en/sub-agents#what-loads-at-startup
- Built-in Explore and Plan skip all of it. A custom agent with `omitClaudeMd: true` also skips it.
  Source: same section.
- Conflicting field report on v2.1.278: no `.claude/rules/` file (path-scoped or not) reached any subagent.
  Source: https://github.com/yusufkaracaburun/ai-kit/issues/182
- Whether nested files load lazily inside a subagent when it reads files: not documented. UNVERIFIED.
- Deterministic option: the subagent `skills` field injects full skill content at start.
  Source: https://code.claude.com/docs/en/sub-agents

### Codex CLI

- At start of a run: `~/.codex/AGENTS.override.md` or `~/.codex/AGENTS.md`, then each dir from the project root (`.git` by default) down to the cwd. Per dir: `AGENTS.override.md`, then `AGENTS.md`, then fallback names.
  Source: https://learn.chatgpt.com/docs/agent-configuration/agents-md and `codex-rs/core/src/agents_md.rs` header comment in https://github.com/openai/codex
- Files below the cwd are **not** loaded by the harness. The system prompt tells the model to go look: "When working in a subdirectory of CWD, or a directory outside the CWD, check for any AGENTS.md files that may be applicable."
  Source: `codex-rs/protocol/src/prompts/base_instructions/default.md` and `codex-rs/core/gpt_5_2_prompt.md` in https://github.com/openai/codex
- So nested loading in Codex is model-driven, not harness-driven. Reliability of that: UNVERIFIED.
- The loaded set is refreshed when the turn's environment or cwd changes, and replaces the old set.
  Source: `codex-rs/core/src/agents_md_manager.rs`, `codex-rs/core/src/context/world_state/agents_md.rs`
- Subagents: "Subagents inherit applied snapshots" of the instructions.
  Source: doc comment on `SessionInstructions` in `codex-rs/core/src/agents_md_manager.rs`. All agents share one cwd (`multi_agent_role` prompt, same repo).
- Untrusted projects skip project `AGENTS.md`.
  Source: `load_project_instructions` in `codex-rs/core/src/agents_md.rs`

### Gemini CLI

- Reads `GEMINI.md` by default. `context.fileName` can be set to `AGENTS.md`, also as a list.
  Source: https://geminicli.com/docs/cli/gemini-md/
- The docs disagree on subfolders:
  - Config reference: at start it scans subdirectories below the cwd, up to 200 dirs (`context.discoveryMaxDirs`).
    Source: https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md
  - GEMINI.md page: "Just-in-time context": "When a tool accesses a file or directory, the CLI automatically scans for GEMINI.md files in that directory and its ancestors up to a trusted root."
    Source: https://geminicli.com/docs/cli/gemini-md/
  - JIT was built into file tools (read_file, write_file, replace, …): https://github.com/google-gemini/gemini-cli/pull/22082
  - Which one is the default today: UNVERIFIED.
- Subagents: "separate context loop". Whether they get `GEMINI.md`: UNVERIFIED.
  Source: https://geminicli.com/docs/core/subagents/

### Cursor

- "Cursor supports AGENTS.md in the project root and subdirectories." Nested files combine, more specific wins.
  Source: https://cursor.com/docs/context/rules
- Load time: "should auto-load when the agent works in those directories" (Cursor staff). Users reported it unreliable in late 2025.
  Source: https://forum.cursor.com/t/nested-agents-md-files-not-being-loaded/138411
- Current reliability and exact trigger: UNVERIFIED.
- Subagents "start with a clean context". Rules or AGENTS.md in subagents: not documented. UNVERIFIED.
  Source: https://cursor.com/docs/subagents

### GitHub Copilot (CLI and cloud agent)

- `AGENTS.md` "stored anywhere within the repository". "the nearest AGENTS.md file in the directory tree will take precedence." Also reads a root `CLAUDE.md` or `GEMINI.md`.
  Source: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- Copilot CLI finds files in repo root, cwd, dirs between, "and any directories nested in the path of a file it is working on". So nested = lazy, on file work.
  Source: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- Subagents / custom agents: not documented. UNVERIFIED.

## 3. Precedence

No client overrides files. All concatenate. "Precedence" means order or a prompt rule.

- **Claude Code.** Files are concatenated, root first, so closer files are read last. No file overrides another. "if two rules contradict each other, Claude may pick one arbitrarily." User rules come before project rules, and "Neither set overrides the other".
  Source: https://code.claude.com/docs/en/memory#how-claude-md-files-load and #user-level-rules
- **Codex.** Root down to cwd; "Files closer to your current directory override earlier guidance because they appear later". The system prompt says: "More-deeply-nested AGENTS.md files take precedence" and "Direct system/developer/user instructions … take precedence over AGENTS.md instructions."
  Source: https://learn.chatgpt.com/docs/agent-configuration/agents-md and `default.md` prompt in https://github.com/openai/codex
- Codex also says the user's instruction "must take precedence over any guidelines provided in skills or external files."
  Source: `instructions_template` in `codex-rs/models-manager/models.json`
- **AGENTS.md spec.** "The closest AGENTS.md to the edited file wins; explicit user chat prompts override everything."
  Source: https://agents.md/
- **Cursor.** Team Rules → Project Rules → User Rules; earlier wins. Nested AGENTS.md: more specific wins.
  Source: https://cursor.com/docs/context/rules
- **Copilot.** Personal > repository > organization. Nearest AGENTS.md wins. Copilot CLI "does not define a general precedence order between these files."
  Source: both Copilot URLs above.
- **Gemini CLI.** Concatenated with path separators. No precedence rule found. UNVERIFIED.

Is there a documented way to rank sources, such as project rules vs plugin skills?

- No client has a setting for it. None of the specs (AGENTS.md, Agent Skills) define skill-vs-instruction precedence.
  Sources: https://agents.md/, https://agentskills.io/specification
- Claude Code plugins cannot ship a `CLAUDE.md`. "A CLAUDE.md file at the plugin root is not loaded as project context." Plugins speak through skills, agents and hooks.
  Source: https://code.claude.com/docs/en/plugins-reference
- So the only portable tool is plain text: write the rule ("project rules win over skill X") in the project `AGENTS.md` or inside the skill body. Whether models obey such meta-rules reliably: UNVERIFIED. No eval found.
- Order is a weak lever. In Claude Code, instruction files arrive as a user message after the system prompt, "no guarantee of strict compliance".
  Source: https://code.claude.com/docs/en/memory#troubleshoot-memory-issues

## 4. Claude Code `.claude/rules/` with path globs

How it works. Source: https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/

- Any `.md` in `.claude/rules/`, recursive. User-level rules live in `~/.claude/rules/`.
- No `paths` frontmatter: loads at launch, always.
- With `paths:` (YAML list or comma string of globs, brace expansion allowed): loads "when Claude reads files matching the pattern, not on every tool use".
- Budget: 1,000 expanded patterns and 4 MiB per rule's `paths`.
- Nested `.claude/rules/` directories also load on demand.
- Hook reason: `path_glob_match`. Source: https://code.claude.com/docs/en/hooks
- After compaction, path rules reload only when a matching file is read again.
- Subagents: docs say "project rules" load; a field report says none do (section 2).

Portable equivalents:

| Client | Path-scoped mechanism | Source |
|---|---|---|
| Claude Code | `.claude/rules/*.md` + `paths:` | https://code.claude.com/docs/en/memory |
| Cursor | `.cursor/rules` + `globs:` with `alwaysApply: false` | https://cursor.com/docs/context/rules |
| Copilot | `.github/instructions/*.instructions.md` + `applyTo:` | https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions |
| Codex | None. Only nested `AGENTS.md` by folder. | https://learn.chatgpt.com/docs/agent-configuration/agents-md |
| Gemini CLI | None found. Only nested context files by folder. | https://geminicli.com/docs/cli/gemini-md/ |
| AGENTS.md spec | None. Folder scope only. | https://agents.md/ |

- There is no cross-client glob format. Each uses a different key (`paths`, `globs`, `applyTo`).
- The only shared scoping unit is the folder: a nested `AGENTS.md`. It scopes by directory, not by file pattern. A "all `*Dto.java` files" rule cannot be expressed that way.
- Skills are the other portable unit. Their trigger is the `description`, not a path.

## 5. Pointer pattern: "load skill X from plugin Y"

Can a nested `AGENTS.md` say "load skill X" and make it happen? Not reliably. It is a request to the model, not a mechanism.

Evidence:

- Claude Code docs, about a `CLAUDE.md` that tells Claude in words to read `AGENTS.md`: "Claude sees AGENTS.md only if it decides to open the file." The fix they give is a real `@` import.
  Source: https://code.claude.com/docs/en/memory#remove-an-earlier-agents-md-workaround
- Vercel eval (Next.js tasks, 2026-01-27). Baseline 53%. Skill available: 53% (no gain). Per the post, the skill was never invoked in 56% of cases. Skill plus an explicit instruction to use it: 79%. Docs index inline in `AGENTS.md`: 100%. Small wording changes gave "large behavioral swings". Agent and model not named.
  Source: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- Codex skill trigger rule: "If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description … you must use that skill for that turn." It says "the user". Whether a skill named inside `AGENTS.md` counts: UNVERIFIED. Also: "Do not carry skills across turns unless re-mentioned."
  Source: `codex-rs/ext/skills/src/catalog_prompt.rs` in https://github.com/openai/codex
- Codex lists plugin skills as `plugin_name:skill`. Claude Code as `/plugin-name:skill-name`. So the pointer name itself is not portable.
  Sources: Codex prompt snapshot in `codex-rs/core/tests/suite/snapshots/`; https://code.claude.com/docs/en/skills
- The Agent Skills spec only defines progressive loading: metadata at start, body "when the skill is activated". It says nothing about activation from instruction files.
  Source: https://agentskills.io/specification

Compare with `@` imports in CLAUDE.md:

- `@path` is deterministic. The file is expanded into context at launch (or when the parent nested file loads). Max depth four hops. Paths are relative to the importing file.
  Source: https://code.claude.com/docs/en/memory#import-additional-files
- Cost: imports load in full. They do not save context.
- It imports files, not skills. Importing a plugin's `SKILL.md` by path needs the plugin's install path. That path is outside the repo, so it is an external import with an approval dialog. For a directly read `AGENTS.md` it loads only if already approved.
  Source: https://code.claude.com/docs/en/memory#where-agents-md-differs-from-claude-md
- Plugin install path is stable across versions: UNVERIFIED (likely not).
- `@` imports in AGENTS.md work in Claude Code, Gemini CLI and Copilot CLI (not in Copilot `GEMINI.md` or `*.instructions.md`). Copilot refuses paths outside the repo and `~/`.
  Sources: https://code.claude.com/docs/en/memory, https://geminicli.com/docs/cli/gemini-md/, https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- Codex: no `@` import support found in the loader. UNVERIFIED as absent, but not in `agents_md.rs`.

Deterministic options that exist today (client-specific):

- Claude Code subagent `skills:` field preloads full skill content. Source: https://code.claude.com/docs/en/sub-agents
- Hooks (Claude Code) to inject content. Source: https://code.claude.com/docs/en/hooks
- Inline the knowledge (or a short index of it) in the nested `AGENTS.md`. This is what won the Vercel eval.

## 6. Size limits and truncation

| Client | Limit | Source |
|---|---|---|
| Claude Code CLAUDE.md / AGENTS.md | No truncation. Skips a file over 4 MiB. Advice: under 200 lines. | https://code.claude.com/docs/en/memory#claude-md-is-too-large |
| Claude Code auto memory `MEMORY.md` | First 200 lines or 25 KB loaded. | https://code.claude.com/docs/en/memory |
| Claude Code skill listing | `description` + `when_to_use` capped at 1,536 chars. Whole listing ~1% of context window. | https://code.claude.com/docs/en/skills |
| Claude Code skills after compaction | First 5,000 tokens each, 25,000 total. | https://code.claude.com/docs/en/skills |
| Codex | `project_doc_max_bytes`, default 32 KiB for all files combined. Files past the budget are truncated or dropped. | https://learn.chatgpt.com/docs/agent-configuration/agents-md; `DEFAULT_PROJECT_DOC_MAX_BYTES` in `codex-rs/config/src/config_toml.rs` |
| Gemini CLI | Subdir scan capped at 200 dirs. File size limit: UNVERIFIED. | https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md |
| Cursor | Advice: under 500 lines per rule. Hard limit: UNVERIFIED. | https://cursor.com/docs/context/rules |
| Copilot code review | The 4,000-char read limit was removed in June 2026. | https://github.blog/changelog/2026-06-12-copilot-code-review-new-configurations-and-controls/ |
| Agent Skills spec | `description` max 1,024 chars. Body advice: under 500 lines, under 5,000 tokens. | https://agentskills.io/specification |

Note for Codex: the 32 KiB budget is shared, root first. Deep nested files are the first to be cut.

## What this means for O5 / O6 (facts only)

- A nested `AGENTS.md` is the only unit read by all five clients. But in Claude Code it is off by default whenever a `CLAUDE.md` exists up the path, and in Codex it is not loaded by the harness below the cwd.
- Load time differs: lazy on read (Claude Code, Copilot CLI, Gemini JIT, Cursor), model-driven (Codex below cwd), or eager (Gemini config-reference mode).
- No client lets a file rank sources. Precedence is only "closer/later wins" plus a user-over-files rule in Codex and the AGENTS.md spec.
- A pointer to a skill is a soft hint. The one eval found shows skills often go unused without strong wording.

## Summary table

| Client | Reads AGENTS.md | Nested files | Load time of nested | Precedence | Subagents get them |
|---|---|---|---|---|---|
| Claude Code | Yes, v2.1.277+. Default: only if no `CLAUDE.md`/`CLAUDE.local.md` up the path. | Yes: `CLAUDE.md`, `AGENTS.md` (if no local `CLAUDE.md`), `.claude/rules/` | Lazy, on Read of a file in that folder. Path rules on Read of a matching file. | Concatenate, root first. No override. Conflicts: "may pick one arbitrarily". | Docs: yes, full hierarchy (not Explore/Plan, not `omitClaudeMd`). Field report: rules do not reach them. Lazy nested in subagent: UNVERIFIED. |
| Codex CLI | Yes (native format). Plus `AGENTS.override.md`, fallback names. | Root to cwd only. Below cwd: prompt tells model to look. | Start of run; refresh on cwd change. Below cwd: model-driven. | Deeper wins (by order and prompt rule). User prompt beats AGENTS.md and skills. | Yes, inherit the applied snapshot. |
| Gemini CLI | Only if `context.fileName` includes it. | Yes | Docs conflict: startup scan (200 dirs) vs JIT on tool access. UNVERIFIED which is default. | Concatenate. No rule found. | UNVERIFIED |
| Cursor | Yes | Yes | "when the agent works in those directories"; reported unreliable in 2025. | More specific wins; Team > Project > User rules. | UNVERIFIED (clean context) |
| Copilot CLI / cloud agent | Yes (also root `CLAUDE.md`/`GEMINI.md`) | Yes | CLI: dirs "in the path of a file it is working on" (lazy). | Nearest AGENTS.md wins; Personal > Repo > Org. CLI: no general order. | UNVERIFIED |
