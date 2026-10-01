# R2: Portable orchestration

Research date: 2026-09-23. Feeds O1 and O2 in `TENSIONS.md`.
Every claim has a source URL. Claims I could not confirm in a primary source are marked **UNVERIFIED**.

The question behind this note: pillar 1 uses a Claude Code workflow script to fix stage order, retries
and the model per stage. Pillar 4 needs the same plugin to run on Codex and other Agent Skills
clients. Scripts of that kind are Claude-Code-only. What are the portable options?

---

## 1. Subagents today

### Claude Code

- Each subagent runs in its own context window, with its own system prompt, tools and permissions.
  https://code.claude.com/docs/en/sub-agents
- A skill can run itself in a subagent with `context: fork`, pick the agent type with `agent:`, and
  set the model with `model:`. "In both cases the subagent starts without your conversation history."
  https://code.claude.com/docs/en/skills (frontmatter table, "Run skills in a subagent")
- Plugins ship agents in `agents/`. Plugin agents cannot use `hooks`, `mcpServers` or
  `permissionMode`. https://code.claude.com/docs/en/plugins-reference
- Plugins can also ship `workflows/` (the script type pillar 1 uses). A workflow is "a script the
  runtime executes"; the script, not Claude, decides what runs next.
  https://code.claude.com/docs/en/workflows
- Plugins can declare `dependencies` on other plugins, with semver ranges.
  https://code.claude.com/docs/en/plugin-dependencies
- Claude Code is **not** in the Agent Plugins list of compatible clients, and its docs do not mention
  the portable root `plugin.json`.
  https://github.com/agentplugins/agent-plugins-site/blob/main/lib/compatible-clients.ts

### Codex (CLI, IDE, desktop app)

- Codex spawns subagents "when you ask directly or when applicable AGENTS.md or skill instructions
  request it". So a skill can ask for a subagent. https://learn.chatgpt.com/docs/agent-configuration/subagents
- Custom agents are TOML files in `.codex/agents/` (project) or `~/.codex/agents/` (user). Required
  keys: `name`, `description`, `developer_instructions`. Optional: `model`,
  `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config`. Same page.
- Model choice: the file's `model` wins. Otherwise Codex takes the explicit spawn value, then the
  `[agents]` default, then the parent's model. Same page.
- Clean context: the `spawn_agent` tool (v1) has `fork_context`. "False or omitted starts with only
  the initial prompt." The v2 tool has `fork_turns`, which "defaults to `all`" (full history).
  https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/multi_agents_spec.rs
  Which version is the default today is **UNVERIFIED**. If v2 is active, a skill that wants a clean
  context must say so ("start the subagent with no history").
- The v2 tool may hide `model` and `reasoning_effort` from the model
  (`expose_spawn_agent_model_overrides`). Same source file. So a skill cannot rely on picking a
  model per spawn. It can rely on a named custom agent that pins a model.
- Codex plugins ship skills, MCP servers, browser extensions and hooks. The docs list no agents.
  https://learn.chatgpt.com/docs/plugins and https://developers.openai.com/plugins/build/plugins.md
- So on Codex a plugin cannot ship an agent definition. Agents must live in the project's or user's
  `.codex/agents/`.
- Plugin hooks are skipped until the user trusts them. https://developers.openai.com/plugins/build/plugins.md

### GitHub Copilot (CLI, cloud agent, VS Code)

- Custom agents are `*.agent.md` files. When Copilot runs one for part of a task, it runs as a
  subagent with its own context window. https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
- An agent file can set `model`. https://docs.github.com/en/copilot/reference/custom-agents-configuration
- Plugins can ship agents. In an Agent Plugins 1.0 package, agents go under
  `com.github.copilot/agents/`. https://docs.github.com/en/copilot/concepts/agents/about-plugins
- A bug report (2026-08-28) says Copilot CLI 1.0.81 did not discover agents in that folder. It is
  closed; whether it is fixed is **UNVERIFIED**. https://github.com/github/copilot-cli/issues/4655

### Cursor

- Subagents "start with a clean context". The parent must put what they need in the prompt.
  https://cursor.com/docs/subagents
- Agent files are Markdown with `name`, `description` and `model` (`inherit` or a model ID). Same page.
- Cursor also reads `.claude/agents/` and `.codex/agents/` in the project and user folders. Same page.
- Cursor plugins support the Agent Plugins standard and a Cursor format that adds agents,
  commands, hooks and rules. https://cursor.com/docs/plugins

### Portable standard for agents

- Agent Plugins 1.0 defines "exactly two component types: skills and MCP servers". Agents, hooks
  and commands are "too client-specific for a stable portable contract".
  https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md
- Client-specific parts go in reverse-domain folders (for example `com.github.copilot/`) or under
  `extensions` in `plugin.json`. Other clients ignore them. https://agent-plugins.org/plugin-authors/client-extensions
- The spec has no plugin-to-plugin dependencies and no capability discovery. Same spec.
- The Agent Skills spec allows `name`, `description`, `license`, `compatibility`, `metadata` and an
  experimental `allowed-tools`. It has no `model` and no `context` key. https://agentskills.io/specification

### Summary of question 1

| Client | Skill can start a clean subagent | Skill can pick the model | Plugin can ship an agent |
|---|---|---|---|
| Claude Code | Yes (`context: fork`, or by asking) | Yes (agent or skill `model`) | Yes (`agents/`) |
| Codex | Yes, by asking; clean by default only in v1 | Only through a named agent file, or a spawn override if exposed | No (project or user folder only) |
| Copilot | Yes, through a custom agent | Yes (agent `model`) | Yes (`com.github.copilot/agents/`) |
| Cursor | Yes, clean by default | Yes (agent `model`) | Cursor format only; reads `.claude/agents/` |

There is no portable agent format. The one portable move is "a skill asks for a subagent and tells
it which skill to load". That is pillar 4's rule 2.

---

## 2. Fixed stage order without a harness script

### A. File-based state machine (derive the next step from disk)

How it works: each stage writes a result file. The orchestrator skill reads the folder and picks the
first stage whose output is missing or failed.

Prior art:
- OpenSpec computes each artifact's status from whether its `outputPath` exists. Blocked artifacts
  list `missingDeps`. "The first `ready` entry is the artifact to write next."
  https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md
- BMAD tracks progress in the output document's frontmatter (`stepsCompleted`) and says "Update
  `stepsCompleted` in frontmatter before loading next step".
  https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-create-epics-and-stories/SKILL.md
- Superpowers keeps a ledger at `.superpowers/sdd/progress.md`. On start it reads it and resumes at
  the first task not marked done. It notes that controllers that lost their place after compaction
  re-ran finished tasks, "the single most expensive failure observed".
  https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md
- minions' own rule "compute, don't remember" is the same idea (`PILLARS.md`).

Portability: high. It needs only file read and write, which every client has.
Reliability: medium. The model still reads the files and decides. It can skip a step or misread a
result. It does recover well after compaction or a crash, because the state is on disk.
Retries and model per stage: only as prose ("retry at most twice"). The model is not enforced.
Cost: low. One orchestrator context, plus one subagent per stage.

### B. A plain CLI the agent calls to get the next step

How it works: a small script (node, python or bash) reads the state files and prints the next step
as JSON. The skill loop is short: "run `next`, do what it says, write the result, repeat".

Prior art:
- OpenSpec `openspec status --json` and `openspec instructions <artifact> --json`. "Used by AI agents
  to understand what to create next." It supports 30+ tools.
  https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md and https://github.com/Fission-AI/OpenSpec
- Beads `bd ready` returns claimable work from a dependency graph. `bd setup codex|claude|cursor`
  installs the per-client glue. https://github.com/gastownhall/beads
- Spec Kit ships `scripts/bash/check-prerequisites.sh` (and a PowerShell twin) that checks which
  feature files exist. That its command prompts call it before each stage is **UNVERIFIED**.
  https://github.com/github/spec-kit/tree/main/scripts/bash

Portability: high, if the client lets the agent run shell commands (all four above do). The Agent
Skills spec allows `scripts/` inside a skill. https://agentskills.io/specification
Reliability: medium to high. The order, retry count and "done" test live in code. The model can still
ignore the output, but each step's prompt is tiny, which fits pillar 1's "short prompts".
Model per stage: the CLI can print a model hint. Only a client that lets the skill pick a model will
use it (see question 1).
Cost: low. A few extra shell calls.

### C. Headless re-invocation driven by an external script

How it works: an outer script runs one fresh agent process per stage, for example `claude -p`,
`codex exec` or `copilot -p`. It reads each stage's JSON result and chooses the next stage.

Facts:
- `claude -p --output-format json --json-schema ...` returns structured output in
  `structured_output`, plus cost. https://code.claude.com/docs/en/headless
- `codex exec` has `--json`, `--output-schema`, `-o` (last message to a file) and `resume`.
  https://learn.chatgpt.com/docs/non-interactive-mode
- `copilot -p` has `--model`, `--agent`, `--output-format=json`, and needs `--allow-all-tools` for
  scripted use. https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference

Prior art:
- Spec Kit workflows: YAML steps (`command`, `prompt`, `shell`, `gate`, `if`, `while`, `fan-out`,
  `slot`), run by `specify workflow run`. Each step names an `integration` (claude, copilot, gemini,
  codex, ...) and can set `model`. State is saved in `.specify/workflows/runs/<id>/state.json`, and
  runs can resume. https://github.com/github/spec-kit/blob/main/docs/reference/workflows.md
  Its Codex integration builds `codex exec <prompt> --model <m> --json`.
  https://github.com/github/spec-kit/blob/main/src/specify_cli/integrations/codex/__init__.py
- GitHub Agentic Workflows: Markdown workflows with `engine: {id, model}`; engines are copilot,
  claude, codex, gemini and pi. One agent run per job. https://github.github.com/gh-aw/reference/engines/
- OpenAI Symphony: a spec for an orchestrator that polls an issue tracker and runs a Codex agent per
  issue; prompts live in `WORKFLOW.md` in the repo. https://openai.com/index/open-source-codex-orchestration-symphony/

Portability: high across CLIs, but it needs one adapter per CLI (flags differ). It does not run
inside an interactive chat; the user starts it from a terminal or CI.
Reliability: high. Order, retries and model are real code. Each stage is a fresh process, so the
context is clean by construction.
Cost: medium. Each stage pays its own start-up context (system prompt, skills list). No shared cache
between stages. You also own the script and its adapters.

### D. Hooks

How it works: a `Stop` hook runs when the agent tries to finish. It checks the state files and, if a
stage is missing, tells the agent to continue with that stage.

Facts:
- Codex: a `Stop` hook that returns `{"decision":"block","reason":"..."}` makes Codex continue, using
  `reason` as a new user prompt. https://learn.chatgpt.com/docs/hooks
- Claude Code: `Stop` hooks support the same `decision: block` shape. https://code.claude.com/docs/en/hooks
- Copilot and Cursor plugins also support hooks. https://docs.github.com/en/copilot/concepts/agents/about-plugins and https://cursor.com/docs/plugins
- Hooks are not in Agent Plugins 1.0; each client puts them in its own place (`com.openai` in
  `extensions`, `com.github.copilot/hooks/`, Claude's `hooks/`).
  https://developers.openai.com/plugins/build/plugins.md
- Codex skips plugin hooks until the user trusts them. Same page.

Portability: medium. The idea exists on all four clients and the JSON is close between Claude and
Codex. But you ship one hook file per client, and install needs a trust step on Codex.
Reliability: medium to high as a backstop. It cannot choose the model, and it cannot give the next
stage a clean context. It only stops the agent from quitting early.
Cost: low. A script run per stop.

### E. Prose-only orchestrator (option A in O1, for reference)

This is what pillar 1 warns against. Superpowers runs this way on Claude Code, Codex, Cursor and
others. https://github.com/obra/superpowers
Even there, the authors added a ledger file (option A) to fix the most costly failure. Same skill file.

---

## 3. Prior art: portable multi-stage coding agents

| Project | Clients | How order is fixed | How results pass |
|---|---|---|---|
| Spec Kit (GitHub) | Many integrations incl. Claude, Codex, Copilot, Gemini (count **UNVERIFIED**) | Human runs `/speckit-*` skills in order; or `specify workflow run` drives headless steps from YAML | Files per feature (spec, plan, tasks); run state in `state.json` |
| OpenSpec | 30+ tools | Schema lists artifacts and `requires`; CLI derives `ready` from files on disk | Artifact files in a change folder; CLI JSON |
| BMAD | Several IDEs and CLIs (list **UNVERIFIED**) | One step file loaded at a time; each step names the next | `stepsCompleted` in the output doc's frontmatter |
| Superpowers | Claude Code, Codex, Cursor, OpenCode, Gemini CLI, others | Prose skill, plus a progress ledger | Task brief and review package files; ledger |
| Beads | Codex, Claude, Cursor, Factory and others | Dependency graph; `bd ready` | Issue records in a git-backed store |
| gh-aw (GitHub) | copilot, claude, codex, gemini, pi | One agent per Actions job; Actions orders the jobs | Safe outputs, repo state |
| Symphony (OpenAI) | Codex | External service loop per issue | Issue tracker plus the workspace |

Sources: https://github.com/github/spec-kit, https://github.com/Fission-AI/OpenSpec,
https://github.com/bmad-code-org/BMAD-METHOD, https://github.com/obra/superpowers,
https://github.com/gastownhall/beads, https://github.com/github/gh-aw,
https://openai.com/index/open-source-codex-orchestration-symphony/

The shared pattern: **state lives in files, and the next step is computed, not remembered.** The
projects that need hard order and a model per stage (Spec Kit workflows, gh-aw, Symphony) move the
loop out of the chat, into a CLI or CI.

---

## 4. Plugin contracts and capability discovery

The question: how does a workflow plugin find "the review skill of whatever stack plugin this
project uses"?

What the standards give:
- Agent Plugins 1.0: nothing. No dependencies, no registry, no discovery.
  https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md
- Agent Skills: a skill is found by `name` and `description`. `metadata` is a free string map that
  "clients can use" for extra properties. https://agentskills.io/specification
- Claude Code: plugin `dependencies` with semver. Skills are namespaced `plugin:skill`. The project's
  `.claude/settings.json` can list `enabledPlugins`.
  https://code.claude.com/docs/en/plugin-dependencies and https://code.claude.com/docs/en/plugin-marketplaces
- Copilot cloud agent: `.github/copilot/settings.json` has `enabledPlugins`.
  https://docs.github.com/en/copilot/concepts/agents/about-plugins
- Codex: a repo marketplace at `.agents/plugins/marketplace.json`.
  https://developers.openai.com/plugins/build/plugins.md

Prior art for the contract itself:
- **Per-project registry file.** Spec Kit extensions declare hooks such as `before_specify` and
  `after_*` in `extension.yml`. Install writes them to `.specify/extensions.yml`. Each core command
  prompt says "Check if `.specify/extensions.yml` exists" and runs the hooks it lists; mandatory
  hooks are `optional: false`.
  https://github.com/github/spec-kit/blob/main/extensions/git/extension.yml and
  https://github.com/github/spec-kit/blob/main/templates/commands/plan.md
- **Named slots.** Spec Kit workflows declare `type: slot` steps. A slot is skipped when empty, and a
  project overlay fills it by step id. https://github.com/github/spec-kit/blob/main/docs/reference/workflows.md
- **Namespaced names.** Spec Kit extension commands follow `speckit.<extension>.<command>`
  (for example `speckit.git.commit`). Same `extension.yml`.
- **Per-project config naming skill packs.** minions' `config.yml` lists the skill packs each role
  loads (`PILLARS.md`). This is the same shape as Spec Kit's registry.
- **Setup command writes the glue.** Beads `bd init` writes `AGENTS.md` guidance and per-client
  integrations. https://github.com/gastownhall/beads

Options for O2, taken from the above (not a decision):
1. Naming convention only: each stack plugin ships `<stack>-review` and `<stack>-setup`. The workflow
   asks for "the review skill for the stack". Works on any client, but relies on the model to match.
2. Per-project file, for example `.agents/stack.yml`, listing skill names per role
   (`review: [java-review]`). The workflow reads it first. Explicit, and handles several stacks in one repo.
   A stack's `setup` skill writes its own entry, like Spec Kit's install step.
3. Both: the file is the source of truth; the naming convention is the default when the file is missing.

No agent plugin ecosystem I found has a portable registry for "who provides role X". **UNVERIFIED**
that none exists; I found none in the specs above.

---

## What this means for O1 (facts only)

- No portable format fixes order, retries or model. Every portable project either trusts prose or
  moves the loop into a file-derived CLI (inside the chat) or an external runner (outside it).
- Model per stage is the least portable part. Claude Code, Copilot and Cursor pin it in agent files.
  Codex can pin it only in project or user agent files, which a plugin cannot ship.
- Option B in O1 (portable skill plus optional Claude script) and option C (files) are compatible:
  the same state files can feed a prose skill, a `next` CLI, a Claude workflow script, and a
  headless runner.

---

## Comparison of the options in question 2

| Option | Runs inside chat | Portable across clients | Order enforced by | Retries enforced | Model per stage | Clean context per stage | Recovers after crash or compaction | Cost | Prior art |
|---|---|---|---|---|---|---|---|---|---|
| E. Prose only | Yes | High | Model | No | Where client allows | If the model starts a subagent | Poor | Low | Superpowers (before ledger) |
| A. File state machine | Yes | High | Model reading files | No (prose) | Where client allows | If the model starts a subagent | Good | Low | OpenSpec, BMAD, Superpowers ledger |
| B. `next`-step CLI | Yes | High (needs shell) | Code; model follows | Yes, in code | Hint only | If the model starts a subagent | Good | Low | OpenSpec CLI, Beads, Spec Kit scripts |
| C. External headless runner | No (terminal or CI) | High, one adapter per CLI | Code | Yes | Yes (`--model` on each CLI) | Yes, fresh process | Good | Medium (start-up per stage, own the runner) | Spec Kit workflows, gh-aw, Symphony |
| D. Stop hook | Yes | Medium (one hook file per client, trust step on Codex) | Code blocks early stop | Partly | No | No | Good, if it reads files | Low | Codex and Claude `Stop` hooks |
| Claude workflow script (today) | Yes | Claude Code only | Code | Yes | Yes | Yes | Good (resumable in session) | Low | be-coding-agent |
