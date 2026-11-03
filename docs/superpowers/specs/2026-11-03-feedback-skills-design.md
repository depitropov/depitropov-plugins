# Feedback skills — design

Date: 2026-11-03. Status: agreed in brainstorming, not yet built. Decision: next S number (S88).

## Intent

While we work, we see things that are wrong: a bug, a bad design, a rule that a gate missed, a
thought about the process. Some of it comes from an orchestra run. Some comes from a manual review
or from a session that has nothing to do with orchestra. The rules are still useful, because
orchestra's knowledge (Stack Skills, workflow, core, Project Customization) applies to every project.

Today these observations stay as loose notes. They lose their context: the branch is merged, the
code has moved, and nobody remembers which gate let the problem through. So they are never turned
into a rule, and we cannot later prove that a rule works.

Two skills close this loop:

- **`log-feedback`** turns "something is off" into one self-contained note, at the moment we see it.
- **`process-feedback`** takes notes, finds where each rule belongs, proposes the change, and after
  approval writes it into the plugin or the project.

The shared-roles design (S87) named "feedback logging" as a separate project. This is that project.

## Goals

- A note is self-contained. A later session with no memory of the original one can act on it.
- A note carries enough evidence to build a red/green eval later: the code before the change, the
  bad change, and what a correct result looks like.
- `process-feedback` prefers to extend an existing gate, guide or skill over adding a new one.
- `process-feedback` changes both plugins and projects, in place, after the user approves.

## Non-goals

- An eval runner. The research (below) found candidates, but the runner is a later project.
  For now the notes are kept as eval material.
- A feedback inbox or automatic collection. The user collects notes by hand.
- The port of these skills to `sc-orchestra`. That follows `docs/PORTING.md` later.

## Anti-goals

- A note that only makes sense to the session that wrote it ("the facade bug we saw").
- A note with a rule and no evidence. Without the code, nobody can test the rule later.
- `process-feedback` that adds a new instruction line for each note. This goes against the
  project's rule to keep stage instructions lean: prefer a gate, prefer to extend, prefer removal.
- Edits to an installed plugin copy (the plugin cache). They are lost on update and cannot be
  committed.

## Where the skills live

Both skills go into the `orchestra` plugin: `plugins/orchestra/skills/log-feedback/SKILL.md` and
`plugins/orchestra/skills/process-feedback/SKILL.md`. They are not in the core slot. They follow the
plugin conventions: frontmatter with only `name` and `description`, and skill text that names
actions, never a harness's tool names.

## The note

One Markdown file per observation. The sections, in this order:

1. **Title.** One line that states the rule, plus the repo and the ticket when there is one.
   Example: "Every reference column gets a foreign key (posting-backend, LITE-8943)".
2. **The rule.** What to look for (concrete signs), why it is a problem, what to do instead, and
   what is not this issue. The user's existing notes already have this shape; keep it.
3. **The evidence.**
   - The project's absolute path, the repo name, the branch, the PR link when there is one, and
     the commit or commit range.
   - The file paths and the code itself, copied into the note. For a code problem: the relevant code
     before the change, and the bad diff. The note must not depend on the branch still existing.
   - The expected result: what a correct review or a correct implementation does with this code.
     This becomes the grader of a later eval.
4. **The origin.**
   - A manual review, a normal session, or an orchestra run.
   - For a run: the branch, the notes folder (`docs/runs/<branch>/`), and the stage or gate that
     let the problem through, when known.
   - When `.orchestra/resolved.json` exists: the plugin in each slot, with its version.
5. **Proposed level.** One of `project`, `stack`, `workflow`, `core`, `process`, with one line of
   reason. This is a proposal; `process-feedback` decides.

Some notes have no code, for example "posting-be does not run ITs". The evidence is then the fact
and where it shows (a build file, a CI config). The skill does not invent code to fill the section.

## `log-feedback`

Runs in any session, in any repo, with or without orchestra.

1. Take what the user describes. Ask only for what is missing and cannot be found: usually the
   expected result, and sometimes the origin.
2. Collect the evidence from the repo: the branch, the commits, the PR link (when a tool for it is
   available), the code before and after. Copy the code; do not only link it.
3. Read `.orchestra/resolved.json` when it exists, for the origin section.
4. Write the note to a scratch folder outside the repo: the session's scratch folder when the
   harness gives one, else the system temp folder. File name: `<YYYY-MM-DD>-<slug>.md`.
5. Show the full path. The skill commits nothing and changes no file of the repo.

## `process-feedback`

Runs in a plugins repo, for example `depitropov-plugins` or `sc-agent-plugins`. It writes plugin
changes there. It writes project changes directly into the project, at the path the note gives.

1. **Read.** Take one or more notes, as pasted text or as file paths. Read the repo's own
   instructions (`CLAUDE.md` and the docs it names) and follow them for every change.
2. **Decide the level** of each note. The level decides the target:
   - `project`: the Project Customization of that project (`.orchestra/project/`,
     `.agents/skills/`, `.orchestra/config.json`), written the way `orchestra:project` writes it.
   - `stack`: the Stack Skills plugin of the note's stack.
   - `workflow`: the workflow plugin.
   - `core`: the core plugin.
   - `process`: orchestra itself.
   The target is the plugin **of this repo** that fills the level's slot for the note's stack: the
   skill writes where it runs. The plugin names in the note are a hint, not a requirement. The
   skill knows nothing about who owns a repo; the user runs it only where the project and the
   plugins belong together. When the note names no plugin, the stack comes from the
   evidence (the languages and build files of the code) or from the project's
   `.orchestra/config.json`. A plugin-level note with no matching plugin in this repo (for example
   a Python rule and no Python stack here) is skipped, with a line that says what it needs.
3. **Find the home.** For each note, find the existing gate, guide or skill that should have caught
   the problem: the one named in the note's origin first, then the others of that plugin. Check that
   the rule is not already there. Propose to extend the closest one. Propose a new gate or guide only
   when nothing fits, and say why.
4. **Propose.** One short proposal per note: the level, the target file, the change in a few
   lines, and the eval material (step 6). Stop for the user's approval. The user may approve, change
   or drop each one.
5. **Implement** the approved proposals. Follow the target repo's rules: in `depitropov-plugins`,
   for example, a `docs/TENSIONS.md` row and the guide offer, and `check.js` plus `writing-plugins`
   when a contract changes. Commit nothing unless the repo's rules or the user say so.
6. **Eval material.**
   - When part of the rule can be checked by a command (a grep, a config fact), add a `node --test`
     test with fixtures, as `test/orc-java-stack/comments-grep.test.js` does. In a project, only when
     the project has a test setup for it.
   - Copy the note, with a line that names the change it produced, to `evals/pending/<slug>.md` in
     the plugin that changed (`plugins/<plugin>/evals/pending/`). For a project change:
     `.orchestra/project/evals/pending/<slug>.md` in the project.
7. **Report.** Per note: done (with the files), skipped (with the reason and the repo it needs),
   or dropped by the user.

## Research on evals

The research during brainstorming is to be written to `docs/research/R12-skill-evals.md`, in the
format of the existing notes, as the first step of the build and before S88 is recorded. The
sources: https://code.claude.com/docs/en/plugin-evals.md, the local `claude plugin eval --help`
(CLI 2.1.316), https://www.promptfoo.dev/docs/providers/claude-agent-sdk/,
https://www.promptfoo.dev/docs/providers/openai-codex-sdk/,
https://meridianlabs-ai.github.io/inspect_swe/ and its `claude_code` page. Short answer: no eval exists in orchestra today; `npm test` runs code tests,
pattern tests on fixtures, and text tests on skills, and none of them runs a model. Candidates for the
later runner:

- `claude plugin eval`: Claude Code only. Fixtures by a scaffold script, graders `regex` and `llm`,
  no custom-code grader. Its with/without arm removes the whole plugin, so old-skill against
  new-skill needs two runs on two checkouts.
- promptfoo: Claude Agent SDK and Codex SDK providers, a local plugin by path, several providers in
  one config (old and new plugin folder side by side, not yet confirmed by a spike), custom
  JavaScript assertions. Works with a subscription: Codex documented, Claude by
  `apiKeyRequired: false`, with an open doubt on Anthropic's terms for the Agent SDK.
- Inspect AI with inspect_swe: the widest harness choice (Claude Code, Codex, Gemini CLI and
  others), Python and Docker, no documented plugin or A/B support.

## Decisions to record

- `docs/TENSIONS.md`: row S88 for the two skills, the note format, the place each skill runs, and
  the eval material in `evals/pending/`.
- `docs/DECISIONS.md`: entry S88. Options weighed: where `process-feedback` runs (the plugins repo,
  the project, or the project with a path to each plugin's source); evals now or later; which eval
  suite. Choice and reasons as above.

## Builder's calls

- The skill text must not hold company names or ticket keys (`test/packaging.test.js` checks
  skills for them). Examples in the skills are generic. The notes in `evals/pending/` are data, not
  skills, and are kept as they are.

- The exact wording of the two skills, within the steps above.
- Whether the skills get text tests like `test/orc-curator/curate.test.js`. Keep them few.
- The version bump, following the repo's pattern.
