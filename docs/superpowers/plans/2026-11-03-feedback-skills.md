# Feedback Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the skills `log-feedback` and `process-feedback` to the `orchestra` plugin, with the research note R12 and the decision S88.

**Architecture:** Two Markdown skills in `plugins/orchestra/skills/`. No code in `lib/` or `bin/`, and no contract change (nothing a plugin declares), so `check.js` and `writing-plugins` stay as they are. A small text test pins the parts of each skill that the design fixes.

**Tech Stack:** Markdown skills; `node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-03-feedback-skills-design.md`

## Global Constraints

- Each `SKILL.md` has only `name` and `description` in its frontmatter.
- Skill text names actions ("dispatch a subagent", "ask the user"), never a harness's tool names.
- Skill text holds no `LITE-`, `cars.ship`, `scValue` or `SC…Utils` (`test/packaging.test.js`), and no `PriceCalculator`, `VIP`, `50.00` or `discount`. Examples are generic.
- Write in Simplified Technical English, like the sibling skills. Use the terms of `docs/CONTEXT.md` (Slot, Stack Skills, Core, Project Customization, Gate, Guide, Stage, Notes folder).
- Keep the skills lean: steps, not explanations. The design is the reference; do not copy its prose.
- The decision rows go into the same commit as the skills (repo `CLAUDE.md`).
- All plugin versions move together: `0.23.0` → `0.24.0` in both manifests of every plugin.

## Review Focus

- A note with no code (a config fact, such as "this project does not run integration tests"): `log-feedback` writes the fact and where it shows, and never invents code. Pinned in Task 2.
- No `.orchestra/resolved.json` in the session's repo (a manual review, no orchestra): `log-feedback` still writes the note and says the origin has no plugins. Pinned in Task 2.
- The rule is already in the target gate or guide: `process-feedback` says so and proposes no duplicate. Pinned in Task 2.
- The project at the note's path is on another branch or has uncommitted changes to the files to change: `process-feedback` stops and asks before it writes there. Pinned in Task 2.
- The project path in the note does not exist on this machine: `process-feedback` skips the note and says so. Pinned in Task 2.

---

### Task 1: Research note R12

**Files:**
- Create: `docs/research/R12-skill-evals.md`
- Modify: `docs/TENSIONS.md:5-6` (the list of research notes in the intro: add "R12 skill evals")

**Interfaces:**
- Produces: `docs/research/R12-skill-evals.md`, which Task 2 cites as the evidence of S88.

- [ ] **Step 1: Write the note** in the format of `docs/research/R11-sdd-practices.md`: title `# R12: How can a rule from feedback be proven by a red/green eval?`, a "Researched 2026-11-03 from …" line with the sources below, then `## Question`, `## Short answer`, `## Findings` (each finding with its source and how strong it is), `## Recommendation`, `## Evidence gaps`.

  Sources: https://code.claude.com/docs/en/plugin-evals.md; the local `claude plugin eval --help` (Claude Code 2.1.316); https://www.promptfoo.dev/docs/providers/claude-agent-sdk/; https://www.promptfoo.dev/docs/providers/openai-codex-sdk/; https://meridianlabs-ai.github.io/inspect_swe/ and its `claude_code.html` page; the repo's `test/` folder.

  Findings to record (from the spec's "Research on evals" section):
  1. The repo has no eval. `npm test` holds code tests, pattern tests on fixtures (`test/orc-java-stack/comments-grep.test.js`) and text tests on skills; none runs a model. Strong (the repo).
  2. `claude plugin eval`: cases in `evals/` (`prompt.md` or `case.yaml`, `graders/*.md`); fixtures by `context.scaffold_script` (runs only with `--scaffold`); six graders (`regex`, `tool_used`, `tool_order`, `file_exists`, `llm`, `baseline`), "no custom-code graders"; the with/without arm removes the whole plugin, so old-skill against new-skill needs `--ablation none` on two checkouts; runs on the user's own credential; Claude Code only. Strong (docs and CLI help).
  3. promptfoo: providers `anthropic:claude-agent-sdk` (a local plugin by path, `working_dir`, `copy_working_dir`) and `openai:codex-sdk`; several providers in one config; custom JavaScript assertions; subscription: Codex documented (`codex login`), Claude by `apiKeyRequired: false` with a local Claude Code session. Strong for the keys (docs); weak for two plugin versions side by side (inference, no spike).
  4. Inspect AI with inspect_swe: agents Claude Code, Codex CLI, Gemini CLI, Kimi Code, OpenCode, Mini SWE Agent; a `skills` option; Python; every example uses a Docker sandbox; no documented plugin or A/B support. Medium (docs).
  5. Single-harness skill A/B tools (opencode-skill-eval, skill-forge-eval, Rashomon): exist, but each is tied to one harness. Weak (listings and READMEs).

  Recommendation: no runner now. Keep every processed note as eval material (`evals/pending/`); a rule that a command can check gets a `node --test` fixture test now. When the runner is built, start with a promptfoo spike (two plugin folders side by side, subscription login).

  Evidence gaps: promptfoo with two versions of one plugin in one config; promptfoo Claude auth on a subscription in practice, and Anthropic's terms for the Agent SDK on a personal login; whether a Codex agent can load orchestra skills; how a gate skill that expects orchestra's inputs (`base`, `spec`, `notes`) is called outside a run.

- [ ] **Step 2: Add "R12 skill evals" to the research list** in the intro of `docs/TENSIONS.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/research/R12-skill-evals.md docs/TENSIONS.md
git commit -m "docs(research): R12 skill evals"
```

---

### Task 2: The two skills and the decision S88

**Files:**
- Create: `plugins/orchestra/skills/log-feedback/SKILL.md`
- Create: `plugins/orchestra/skills/process-feedback/SKILL.md`
- Create: `test/orchestra/feedback.test.js`
- Modify: `docs/TENSIONS.md` (row S88 after S87)
- Modify: `docs/DECISIONS.md` (entry S88, in the "Entry format" of that file)
- Modify: `plugins/*/plugin.json` and `plugins/*/.claude-plugin/plugin.json` (version `0.24.0`, 14 files)

**Interfaces:**
- Consumes: `docs/research/R12-skill-evals.md` (Task 1), cited in S88.
- Produces: the skills `orchestra:log-feedback` and `orchestra:process-feedback`.

- [ ] **Step 1: Write the failing test** `test/orchestra/feedback.test.js`, in the style of `test/orc-curator/curate.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '../../plugins/orchestra/skills');
const read = name => fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8');

test('log-feedback writes one self-contained note with the five sections, outside the repo', () => {
  const text = read('log-feedback');
  assert.match(text, /^---\nname: log-feedback\ndescription: .+\n---\n/);
  for (const s of ['## The rule', '## The evidence', '## The origin', '## Proposed level']) assert.ok(text.includes(s), s);
  for (const l of ['`project`', '`stack`', '`workflow`', '`core`', '`process`']) assert.ok(text.includes(l), l);
  assert.match(text, /absolute path/);
  assert.match(text, /\.orchestra\/resolved\.json/);
  assert.match(text, /never invent code/i);
  assert.match(text, /outside the repo/);
  assert.match(text, /commit nothing/i);
});

test('process-feedback extends before it adds, stops for approval, and keeps the note as eval material', () => {
  const text = read('process-feedback');
  assert.match(text, /^---\nname: process-feedback\ndescription: .+\n---\n/);
  assert.match(text, /already/);
  assert.match(text, /approval/);
  assert.match(text, /evals\/pending\//);
  assert.match(text, /\.orchestra\/project\/evals\/pending\//);
  assert.match(text, /node --test/);
  assert.match(text, /skip/i);
  assert.match(text, /uncommitted changes/);
  assert.match(text, /does not exist/);
  assert.doesNotMatch(text, /plugins\/cache|\.claude\/plugins/);
});
```

  The note's section headings in `log-feedback` are a template inside the skill (a fenced Markdown block), so the `## …` lines are present literally. The title section is the template's `# <rule> (<repo>, <ticket>)` line.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/orchestra/feedback.test.js`
Expected: FAIL with `ENOENT` on `log-feedback/SKILL.md`.

- [ ] **Step 3: Write `plugins/orchestra/skills/log-feedback/SKILL.md`**

  Frontmatter: `name: log-feedback`; `description: Use when the user notices something off in any session — a bug, a bad design, a rule a gate missed, a thought about the process — and wants it logged as a feedback note for orchestra's plugins or a project.`

  Body: the steps of the spec's "`log-feedback`" section, and the note template of the spec's "The note" section (title line, `## The rule`, `## The evidence`, `## The origin`, `## Proposed level`). Pin these lines:
  - The evidence holds the project's absolute path, the repo, the branch, the PR link when there is one, the commits, the file paths, the code copied in (the code before the change and the bad diff), and the expected result.
  - A note with no code gives the fact and where it shows; never invent code.
  - Read `.orchestra/resolved.json` when it exists; when it does not, the origin says "no orchestra plugins".
  - Write the note outside the repo: the session's scratch folder when the harness gives one, else the system temp folder; name `<YYYY-MM-DD>-<slug>.md`; show the full path.
  - Commit nothing and change no file of the repo.

- [ ] **Step 4: Write `plugins/orchestra/skills/process-feedback/SKILL.md`**

  Frontmatter: `name: process-feedback`; `description: Use when the user has feedback notes from log-feedback to turn into changes — "process this feedback". Runs in a plugins repo; changes its plugins, and a project's Project Customization at the note's path.`

  Body: steps 1–7 of the spec's "`process-feedback`" section (read, decide the level, find the home, propose, implement, eval material, report), with the target rule as the spec states it (the plugin of this repo for the level's slot and the note's stack; plugin names in the note are a hint). Pin these lines:
  - Check that the rule is not already in the target; when it is, say so and propose nothing new.
  - Stop for the user's approval of each proposal before any edit.
  - Never edit an installed plugin copy; edit only this repo and the project at the note's path.
  - Before writing in a project: when its path does not exist, skip the note. When the project is not on its default branch, or the files to change have uncommitted changes, stop and ask the user.
  - Eval material: a `node --test` fixture test when a command can check part of the rule; the note, with a line naming the change it produced, copied to `plugins/<plugin>/evals/pending/<slug>.md`, or to `.orchestra/project/evals/pending/<slug>.md` in the project.
  - Report per note: done (files), skipped (reason, what it needs), dropped.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including `test/packaging.test.js` (no company names, `checkPlugin` clean for `orchestra`).

- [ ] **Step 6: Record S88**

  `docs/TENSIONS.md`, a row after S87: `| S88 | Feedback skills in orchestra. (1) `log-feedback` writes one self-contained note outside the repo: the rule, the evidence (the project path, the code copied in, the expected result), the origin (stage or gate, plugins from `resolved.json`), a proposed level. (2) `process-feedback` runs in a plugins repo, writes where it runs and into the project at the note's path, extends an existing gate or guide before it adds one, and stops for approval. (3) No eval runner yet; each processed note goes to `evals/pending/`, and a rule a command can check gets a `node --test` test. Research: R12. Full record: `docs/DECISIONS.md`. | User decision 2026-11-03, R12 |`

  `docs/DECISIONS.md`, entry `## S88: Feedback skills` in the file's format. Question: how to turn observations into plugin and project rules, and prove them later. Options: (1) run in the project, with the path of each plugin's source repo asked each time; (2) run in the plugins repo, writing project changes at the note's path (chosen: the user keeps one plugins repo per owner, and Claude knows where the projects are); (3) build evals now with `claude plugin eval`, promptfoo or Inspect AI (deferred: R12). Cost and risk: rules land without a model eval until the runner exists; a note processed in the wrong plugins repo writes to the wrong plugin, which the user prevents by where they run it. Where it lives: the two skill files, `evals/pending/`.

- [ ] **Step 7: Bump the versions** from `0.23.0` to `0.24.0` in both manifests of every plugin.

Run: `grep -rn '"version"' plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json`
Expected: 14 lines, all `0.24.0`. Then `npm test` passes.

- [ ] **Step 8: Commit**

```bash
git add plugins/orchestra/skills/log-feedback plugins/orchestra/skills/process-feedback test/orchestra/feedback.test.js docs/TENSIONS.md docs/DECISIONS.md plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json
git commit -m "feat(orchestra): log-feedback and process-feedback skills; plugins 0.24.0 (S88)"
```

---

### After the tasks

Tell the user which sections of `docs/guide.html` the change makes out of date (the list of orchestra skills, the version and the last `S` number in the rail and the footer), and offer to update them.
