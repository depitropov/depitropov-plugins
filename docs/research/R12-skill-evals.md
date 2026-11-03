# R12: How can a rule from feedback be proven by a red/green eval?

Researched 2026-11-03 from the Claude Code docs page "Test plugins with evals"
(https://code.claude.com/docs/en/plugin-evals.md), the local `claude plugin eval --help` (Claude Code
2.1.316), the promptfoo provider pages for the Claude Agent SDK
(https://www.promptfoo.dev/docs/providers/claude-agent-sdk/) and the OpenAI Codex SDK
(https://www.promptfoo.dev/docs/providers/openai-codex-sdk/), the inspect_swe docs
(https://meridianlabs-ai.github.io/inspect_swe/ and its `claude_code.html` page), and this repo's
`test/` folder.

## Question

`process-feedback` turns a feedback note into a rule in a gate, a guide or a skill. We want to prove
each rule with a red/green eval: a case that fails without the new instruction and passes with it.
Does orchestra have such evals, and which runner fits, on more than one harness?

## Short answer

Orchestra has no eval today: no test runs a model. Three runners fit in part. `claude plugin eval` is
built in but works only on Claude Code, has no custom-code grader, and its with/without arm removes
the whole plugin. promptfoo runs Claude and Codex agents, loads a local plugin by path and takes
custom JavaScript assertions. Inspect AI with inspect_swe has the widest harness choice but needs
Python and Docker. We build no runner now: each processed note is kept as eval material, and a
rule that a command can check gets a `node --test` test.

## Findings

1. **No eval in the repo.** `npm test` runs code tests of orchestra's JavaScript, pattern tests on
   fixtures (`test/orc-java-stack/comments-grep.test.js` runs the `review-comments` grep patterns on
   good and bad lines) and text tests on skills (`test/orc-curator/curate.test.js` asserts phrases).
   None runs a model, so none proves that a skill changes what an agent does. The pattern tests are
   red/green, but only for the part of a gate that is a command. Source: the repo, strong.

2. **`claude plugin eval`.** A case is a folder in `evals/` with `prompt.md` or `case.yaml` and
   `graders/*.md`. Each case runs 3 times by default (`--runs`), on the user's own credential.
   Fixtures come from `context.scaffold_script`, a bash script that runs in the empty workspace
   before the agent, only with `--scaffold`; it can build a git repo and apply a patch. Six graders:
   `regex`, `tool_used`, `tool_order`, `file_exists`, `llm` (a judge with a rubric, 2 of 3 votes) and
   `baseline`. The docs say "There are no custom-code graders." `--ablation with-without` runs a
   second arm "with no plugin at all": it removes the whole plugin, so comparing the old and the new
   text of one skill needs `--ablation none` on two checkouts and a diff of the result files. The
   docs do not say how to force a named skill or pass it structured inputs. Claude Code only.
   Source: the docs page and the CLI help, strong.

3. **promptfoo.** The provider `anthropic:claude-agent-sdk` runs an agent in a `working_dir`, loads
   a local plugin by path (`plugins: [{type: local, path}]`), and `copy_working_dir: true` gives each
   run a fresh copy. The provider `openai:codex-sdk` runs Codex in a `working_dir`. One config takes
   several providers, so an old and a new plugin folder could run side by side on the same cases.
   Assertions include `contains`, `regex`, `llm-rubric` and custom `javascript`. Login: Codex reuses
   `codex login` when no API key is set; Claude takes an API key by default, or a local Claude Code
   session with `apiKeyRequired: false` ("Claude Code monthly plans"). Source: the provider docs,
   strong for the keys. Two versions of one plugin in one config: inference, no spike, weak.

4. **Inspect AI with inspect_swe.** One interface wraps Claude Code, Codex CLI, Gemini CLI, Kimi
   Code, OpenCode and Mini SWE Agent, with a `skills` option. It is Python, and every example runs
   the agent in a Docker sandbox. The docs show no plugin loading and no A/B of two skill versions.
   Source: the docs, medium.

5. **Single-harness skill A/B tools.** opencode-skill-eval, skill-forge-eval and Rashomon compare two
   skill versions, but each is tied to one harness. Source: listings and READMEs, weak.

## Recommendation

No runner now. `process-feedback` keeps every processed note, with its evidence and expected result,
in `evals/pending/` of the plugin (or `.orchestra/project/evals/pending/` of the project) that it
changed. A rule that a command can check gets a `node --test` fixture test now, as finding 1
describes. When the runner is built, start with a promptfoo spike: two plugin folders side by side,
one fixture repo, a subscription login.

## Evidence gaps

- promptfoo with two versions of one plugin in one config: not tried.
- promptfoo's Claude provider on a subscription in practice, and whether Anthropic's terms for the
  Agent SDK allow a personal login for one's own evals.
- Whether a Codex agent can load orchestra skills, since Codex has no plugin in the Claude sense.
- How a gate skill that expects orchestra's inputs (`base`, `spec`, `notes`) is called outside a run.
