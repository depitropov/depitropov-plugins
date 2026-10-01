# R3 — Write-time vs review-time stack knowledge

Feeds: O5 in `docs/TENSIONS.md`. Date: 2026-09-23.

**The question.** Take detailed stack conventions, like how to annotate a Java DTO, how to write a
Flyway migration, or rules for the repository layer. Should the coder get them while it writes
(rules files, folder `AGENTS.md`, loaded skills)? Or should the coder's context stay small, with
focused review-and-fix subagents after the code is written, each holding one area's knowledge? Or
both?

**Short answer.** Both, but not evenly. At write time, give a short, path-scoped layer: the few rules
that shape the code and are costly to change later, plus a pointer to the full area unit. After the
code is written, run deterministic checks first, then one focused reviewer per area the diff
touches. That reviewer holds the full unit. Allow one bounded fix round. Confidence: **medium**.
The direct evidence is thin. No study we found measures convention adherence with and without
rules files. Section 5 lists the conditions that would flip the answer.

Evidence labels used below:
- **Strong**: peer-reviewed, or a controlled study with clear numbers.
- **Medium**: a preprint with a controlled setup, or vendor data from real deployments.
- **Weak**: a vendor or practitioner claim with no published method, or a single small eval.

---

## 1. Adherence as instructions and context grow

### What the research shows

- **Lost in the middle (strong).** Models use information best when it sits at the start or end
  of the context. Accuracy drops when the key fact is in the middle, even for long-context models.
  [Liu et al., TACL 2024](https://aclanthology.org/2024.tacl-1.9/)
- **Context rot (medium).** Chroma tested 18 models, including Claude 4 and GPT-4.1. Performance
  fell as input length grew, even on trivial retrieval and copy tasks. A focused input of about 300
  tokens beat the full input of about 113k tokens on the same questions. One distractor already
  lowered accuracy. [Chroma, Context Rot](https://www.trychroma.com/research/context-rot)
- **Instruction count (medium).** IFScale gave models 10 to 500 keyword-inclusion instructions at
  once. The best 2025 models reached only 68% at 500. Models favoured earlier instructions.
  Omission was the main failure mode. [Jaroslawicz et al., arXiv 2507.11538](https://arxiv.org/abs/2507.11538)
- **The ceiling moved in 2026 (weak to medium).** Arize re-ran IFScale on 2026 models. They report
  that GPT 5.5 and Gemini 3.1 Pro hold 99% up to about 5,000 items, and that Claude Opus 4.7
  follows about 50% at 5,000. Arize itself warns that "named-item inclusion" is a proxy. It does not
  show that coding conventions transfer the same way.
  [Arize, 2026](https://arize.com/blog/llm-instruction-following-benchmark-2026/)
- **The "150–200 instructions" figure is weak.** HumanLayer's widely quoted number comes from
  their reading of the 2025 IFScale paper. It is not a separate measurement. HumanLayer also says
  the Claude Code system prompt already holds about 50 instructions.
  [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

**What this means.** Degradation with length is real and well replicated. The size of the effect
at a few hundred lines of rules is unclear. Newer models are much better at counting items. But
coding conventions are not keyword lists. They compete with code, tool output and the task itself.
The coding context is exactly where context rot bites: long, full of similar-looking text
(distractors), and growing over the session.

### What vendors recommend

- **Anthropic, Claude Code memory docs.** "Target under 200 lines per CLAUDE.md file. Longer files
  consume more context and reduce adherence." If a file grows, use path-scoped rules
  (`.claude/rules/` with `paths:` frontmatter) so rules load only when Claude works with matching
  files. Subdirectory `CLAUDE.md` files load on demand, when Claude reads files in that folder.
  Imports do not save context: imported files still load at launch.
  [Claude Code memory](https://code.claude.com/docs/en/memory)
- **Anthropic, Claude Code best practices.** "Bloated CLAUDE.md files cause Claude to ignore your
  actual instructions!" For each line, ask "Would removing this cause Claude to make mistakes?"
  Put knowledge that matters only sometimes in skills. Use hooks for things that "must happen every
  time with zero exceptions", because CLAUDE.md is advisory and hooks are deterministic.
  [Best practices](https://code.claude.com/docs/en/best-practices)
- **Anthropic, context engineering.** Aim for "the smallest possible set of high-signal tokens".
  Prefer a few canonical examples to a "laundry list" of edge cases. Load data just in time through
  file paths and tools. Subagents can burn tens of thousands of tokens and return a 1,000–2,000
  token summary.
  [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **OpenAI, Codex.** Codex joins `AGENTS.md` files from the repo root down to the working folder.
  Files closer to the working folder come later and win. The combined size is capped at 32 KiB by
  default (`project_doc_max_bytes`). The docs suggest splitting into nested folders instead of
  raising the cap. [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **OpenAI, harness engineering.** A single big `AGENTS.md` did not scale, because "context is a
  scarce resource" and a giant file crowds out the task and the code. They moved to a short
  `AGENTS.md` of about 100 lines, used as a "table of contents, not the encyclopedia". It points to
  a structured `docs/` folder. The primary post blocked our fetch (HTTP 403). These points come from
  the search snippet and secondary write-ups that agree with each other.
  [OpenAI](https://openai.com/index/harness-engineering/),
  [ZenML summary](https://www.zenml.io/llmops-database/harness-engineering-structuring-context-and-guardrails-for-ai-coding-agents-in-production)

**The vendors agree:** keep always-loaded files short. Scope the rest by path or load it on demand.
Anything that must always hold belongs in a deterministic check, not in prose.

---

## 2. Do rules files and AGENTS.md improve coding results?

Note first what these studies measure: whether the task passes its tests. None of them measures
whether the code follows house conventions. That gap matters for our question.

| Study | Setup | Result | Strength |
|---|---|---|---|
| [Gloaguen et al., ETH, arXiv 2602.11988](https://arxiv.org/abs/2602.11988) (ICLR 2026 workshop) | SWE-bench with LLM-written files, plus a new set of repos that have developer-written files; several agents and models | LLM-written files: −0.5 to −2 pts (not significant). Developer-written files: +2.4 pts on average (p=0.21). Cost up about 20%, with more steps. Repo overviews did not help agents find files faster. | Strong-medium |
| Same paper, instruction following | Does the agent do what the file says? | Yes. `uv` was used 1.6 times per task when the file mentioned it, versus under 0.01 times when it did not. "Instructions in the context files are well followed." | Medium |
| [Lulla et al., arXiv 2601.20404](https://arxiv.org/abs/2601.20404) | 10 repos, 124 PRs, with and without `AGENTS.md` | Median runtime −28.6%, output tokens −16.6%, task completion about the same | Medium |
| [Khatri, arXiv 2607.27250](https://arxiv.org/abs/2607.27250) | Claude Code and Codex, 17 tasks, 3 repos, 288 runs | Context strategy did not move correctness (any effect is bounded to 10–15 pts or less). Agents failed on design and wiring, not on missing repo facts. | Medium (small n) |
| [Shepard & Albrecht, arXiv 2606.20512](https://arxiv.org/abs/2606.20512) | SWE-bench Verified, Qwen3.5-35B | No guidance 25.5%, static guidance 28.3%, guidance refined by probing 33.0% (p<0.001). How the guidance is made matters most. | Medium |
| [Vercel eval](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) | Next.js 16 APIs that are not in training data | Baseline 53%. Skills 53%: the skill was not invoked in 56% of runs. Skills plus an instruction to use them 79%. An 8 KB docs index in `AGENTS.md` that points to doc files 100%. | Weak-medium (one vendor, one framework) |
| [Chatlatanagulchai et al., arXiv 2511.12884](https://arxiv.org/abs/2511.12884) | 2,303 context files from 1,925 repos | Files hold build commands (62%), implementation details (70%) and architecture (68%). They grow through many small additions and are hard to read. | Descriptive only |

**Reading.**
- Rules files barely move task success on benchmark-style tasks, and they cost 5–20% more tokens.
  Generic overviews and auto-generated files are the weakest content.
- Agents *do* follow specific instructions they are given (the ETH `uv` result). Conventions are
  specific instructions. So write-time rules probably do raise conformance. But the success-rate
  metric cannot see that. **No study we found measured convention adherence directly.** This is
  the biggest gap.
- Knowledge the model cannot guess (new APIs, house helpers, in-house annotations) is where
  write-time context helps most (Vercel). Most ship.cars facts are of this kind (see pillar 2).
- Relying on the model to load a skill by itself is unreliable. In Vercel's eval the skill was not
  loaded in 56% of runs. Always-present context, or loading forced by the orchestrator, beat it.

---

## 3. Post-hoc review-and-fix agents

### Do focused reviewers catch convention violations?

- **Google AutoCommenter (strong, industrial).** An LLM flags violations of best practices, one
  documented practice per comment. It covers 330 practice URLs in C++, Java, Python and Go. 80% of
  rated comments were useful after tuning, and about 40% were resolved by code changes. 66% of the
  top-50 flagged violations were beyond what a linter can check. Lessons: per-practice confidence
  thresholds, removing 22 bad practice docs (which lifted usefulness from 54% to 66%), and
  suppressing outdated practices. Poor or over-complex guideline text hurt usefulness.
  [Vijayvergiya et al., arXiv 2405.13565](https://arxiv.org/html/2405.13565v1)
- **ByteDance BitsAI-CR (medium, industrial).** A taxonomy of review rules, a RuleChecker, then a
  ReviewFilter that verifies each finding. Precision 75%. About 73% of Go comments were acted on.
  Over 12,000 weekly users. [arXiv 2501.15134](https://arxiv.org/abs/2501.15134)
- **Beko with Qodo PR-Agent on GPT-4 Turbo (medium, industrial).** 73.8% of bot comments were
  resolved. But PR closure time rose from 5h52m to 8h20m. Engineers reported faulty, unnecessary and
  off-topic comments. [Cihan et al., arXiv 2412.18531](https://arxiv.org/abs/2412.18531)
- **Open-source PRs (medium).** Across 19,450 AIDev PRs, 12 of 13 review agents had signal ratios
  under 60%. PRs reviewed only by bots merged less often (45% vs 68%).
  [Chowdhury et al., arXiv 2604.03196](https://arxiv.org/abs/2604.03196)
- **Architecture rules (medium).** LLMs checked code against 980 ADRs well for "explicit,
  code-inferable decisions". They did poorly where the rule depends on deployment or organizational
  knowledge. [Su et al., arXiv 2602.07609](https://arxiv.org/abs/2602.07609)
- **Structure beats freedom (medium).** OpenCodeReview uses rule-guided dispatch, grounded
  per-file subagents and a falsification-first filter. It reached about 2.2× the F1 of mainstream
  agents at 5–15× fewer tokens. [Li et al., arXiv 2608.09290](https://arxiv.org/abs/2608.09290)
- **Anthropic Code Review (medium, vendor data).** Several agents each look for one class of issue,
  then a verification step filters false positives. Under 1% of findings were marked incorrect, and
  PRs with substantive comments rose from 16% to 54%.
  [InfoQ](https://www.infoq.com/news/2026/04/claude-code-review/),
  [Help Net Security](https://www.helpnetsecurity.com/2026/03/10/anthropic-claude-code-review/).
  The docs say that rules in the review-only `REVIEW.md` "land more reliably than the same rules in
  a long `CLAUDE.md`", because they reach every finding agent directly. By default, violations of
  CLAUDE.md rules are posted only as nits. [Code Review docs](https://code.claude.com/docs/en/code-review)

**Reading.** Focused reviewers that work from a list of named rules catch many convention
violations. They catch more than linters can see. Precision in the 75–80% range is achievable, but
only after per-rule tuning and a verification or filter step. Unfiltered, generic review bots are
noisy.

### Cost

- Anthropic Code Review averages **$15–25 per PR review** and takes about 20 minutes. Running it on
  every push multiplies that. [Code Review docs](https://code.claude.com/docs/en/code-review)
- Inferential sensors (LLM judges) are "slower and more expensive" and "non-deterministic", so they
  should not run on every change. Deterministic checks are cheap and run first.
  [Böckeler, martinfowler.com](https://martinfowler.com/articles/harness-engineering.html)
- "Never send an LLM to do a linter's job." (weak, practitioner)
  [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- Human time goes up too. The Beko closure times grew by about 40%.
  [arXiv 2412.18531](https://arxiv.org/abs/2412.18531)

### Churn, regressions and fix loops

- **Reviewers always find something.** "A reviewer prompted to find gaps will usually report some,
  even when the work is sound." Chasing every finding leads to extra layers and defensive code.
  Anthropic's advice: flag only gaps that affect correctness or the stated requirements.
  [Best practices](https://code.claude.com/docs/en/best-practices)
- **Re-review loops need a stop rule.** Anthropic suggests "after the first review, suppress new
  nits and post Important findings only". This "stops a one-line fix from reaching round seven on
  style alone". [Code Review docs](https://code.claude.com/docs/en/code-review)
- **Iterating without external checks degrades code (medium).** Over 40 rounds of LLM
  "improvement", critical vulnerabilities rose 37.6% after five rounds.
  [Shukla et al., arXiv 2506.11022](https://arxiv.org/abs/2506.11022)
- **Self-correction without outside feedback does not work reliably (strong).** GPT-3.5 fixed 7.6%
  of wrong answers but broke 8.8% of right ones. External feedback, such as tools or tests, is what
  makes correction work. [Huang et al., ICLR 2024](https://arxiv.org/abs/2310.01798)
- **Judges can veto productively (medium).** At Spotify, an LLM judge compares each diff with the
  original prompt, after the build, test and format checks. It vetoes about 25% of sessions. The
  agent then corrects itself about half the time. The most common cause is the agent going out of
  scope.
  [Spotify Honk part 3](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3)
- **False consensus (medium).** Reviewer and fixer agents can agree without evidence. Structured,
  evidence-grounded disagreement fixed this in one ICML workshop study.
  [Qiu & Gill, arXiv 2608.18167](https://arxiv.org/abs/2608.18167)

**Reading.** Post-hoc fixing works when three things hold: the reviewer checks named rules, each
finding needs evidence (`file:line` plus the rule it breaks), and the loop is bounded and ends with
a deterministic re-verify (build, tests). Open-ended "improve this" loops add churn and risk.

---

## 4. Hybrid patterns

Almost every serious practitioner uses both a feedforward layer and a feedback layer. They differ in
how thin the feedforward layer is.

- **Böckeler / Thoughtworks: guides plus sensors.** "Separately, you get either an agent that keeps
  repeating the same mistakes (feedback-only) or an agent that encodes rules but never finds out
  whether they worked (feed-forward-only)." Each kind comes in two forms: computational (lint,
  types, tests) and inferential (LLM judge). Checks should run as early as possible.
  [martinfowler.com](https://martinfowler.com/articles/harness-engineering.html)
- **OpenAI harness engineering.** A short `AGENTS.md` map, about 100 lines, points to `docs/`.
  Custom linters enforce layering, naming and logging. Their error messages carry the fix, so the
  agent can repair the problem without a human. Agent reviewers comment on the PR until the diff
  meets the baseline. There are no published controlled results. It is a vendor case report (weak).
  [OpenAI](https://openai.com/index/harness-engineering/),
  [ZenML](https://www.zenml.io/llmops-database/harness-engineering-structuring-context-and-guardrails-for-ai-coding-agents-in-production)
- **Factory.ai: lint rules, not suggestions.** Standards are written as custom lint rules and wired
  into the agent loop, so the agent gets automatic feedback and fixes itself. (weak, vendor)
  [Factory](https://factory.ai/news/using-linters-to-direct-agents)
- **Spotify Honk.** Static prompts with a few concrete code examples at write time ("a handful of
  concrete code examples heavily influences the outcome"). Then deterministic verifiers, then an LLM
  judge. 1,500+ merged PRs. Spotify deliberately gives the agent fewer tools, for predictability.
  [Part 2](https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2),
  [Part 3](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3)
- **Anthropic Code Review.** The same `CLAUDE.md` serves the coder and the reviewer, and violations
  become nits. The stricter rules go to reviewers only, through `REVIEW.md`. Nested `CLAUDE.md`
  rules apply only to files under their folder.
  [Code Review docs](https://code.claude.com/docs/en/code-review)
- **Cursor Bugbot.** A separate, reviewer-only rules file, `.cursor/BUGBOT.md`. It can be nested
  per folder and is picked up by walking up from each changed file. So the rules for an area reach
  the reviewer only when the diff touches that area. [Cursor docs](https://cursor.com/docs/bugbot)
- **Vercel.** A compressed pointer index (8 KB, cut down from 40 KB) sits always in context. Full
  docs are read on demand. This scored best in their eval.
  [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- **Loading only what is needed is cheap.** Hybrid or on-demand skill loading cut input tokens by
  27–73% across five benchmarks, with no detected quality loss (equivalence not proven).
  [Nakasuji, arXiv 2608.14943](https://arxiv.org/abs/2608.14943). Progressive disclosure pays off
  as a scaling tool when there is more material than the agent can read directly. A second routing
  level did not help. [He et al., arXiv 2607.17598](https://arxiv.org/abs/2607.17598)

**Results reported for hybrids** are vendor or practitioner claims (OpenAI, Spotify, Factory,
Anthropic). None compares the hybrid against write-time only or review-time only. The pattern is
common. There are no controlled results for it.

---

## 5. Recommendation

**Use both, in this order of preference:**

1. **Deterministic checks first.** Any convention a tool can check becomes a check: ArchUnit for
   layering, Spotless, custom greps, a Flyway naming or checksum check, a Checkstyle or Error Prone
   rule. Write each error message so it tells the agent the fix (OpenAI, Factory). This is the most
   reliable layer and the cheapest per run.
2. **A thin write-time layer, path-scoped.** For each area, give the coder at most 5–15 lines of
   rules. Pick the rules that shape the code's structure and are costly to retrofit. Examples: the
   DTO is a record with the required annotations; never edit an applied migration, always add a new
   one; repositories return domain types and hold no business logic. Add one or two canonical
   examples, and a pointer to the full unit. Load it by path (a folder `AGENTS.md` or `CLAUDE.md`,
   or `.claude/rules` with `paths:`), or have the orchestrator load it. Do not rely on the model
   choosing to invoke a skill.
3. **A focused area reviewer after the code, holding the full unit.** Run it only when the diff
   touches that area's paths. It checks named rules only. Each finding must cite `file:line` and the
   rule broken, and must pass a verification step. It fixes what it finds, in one round, followed by
   a build and test re-verify. No new nits on a second pass.

**Why this split.** Always-loaded context has a cost in tokens and in adherence (section 1). It
gives little gain on task success (section 2). But agents do follow the specific instructions they
get. So a few rules that shape the code are worth their tokens, while the long tail is not.
Reviewers that work from named rules catch convention violations with 75–80% precision at scale
(section 3). That makes them a good home for the long tail. Fixing structure after the fact is where
churn and regressions come from. So structural rules belong at write time.

**Confidence: medium.**
- *For:* the vendors converge on this. Degradation with context length is well replicated.
  Industrial rule-based reviewers (Google, ByteDance) work.
- *Against:* no study measures convention adherence with and without write-time rules. There is no
  controlled comparison of a hybrid against either pure option. The 2026 instruction-following
  gains weaken the "short prompts" premise. Most of the hybrid evidence is vendor self-report.

**Conditions that flip it:**
- **Toward more at write time.** Suppose the whole coder context is already small (a fresh subagent
  per task, as in pillar 1) and an area unit is under about 50–100 lines. Then loading it fully is
  cheap and avoids a fix round. Do it, and keep the reviewer as a check. The same holds when the
  knowledge is novel and cannot be guessed (Vercel). It also holds when retrofitting is expensive or
  unsafe (migrations, public API contracts).
- **Toward more at review time.** Move rules to review time when measurement shows that write-time
  rules do not change the coder's output. Move them when many areas load at once and the coder's
  rules approach several hundred lines, or when the rules are about details that are cheap to fix
  later (logging format, comments, naming).
- **Toward neither.** If a rule can be written as a linter, prose in either place is second best.
- **Drop the reviewer for an area** if its findings are mostly noise (under about 50% acted on),
  or if its cost per PR exceeds what it catches. Measure this the way AutoCommenter and BitsAI-CR do
  (the share of findings resolved or outdated).
- **Revisit** once a study measures convention adherence directly. Or run our own: the same tasks,
  with and without the write-time layer, scored by the area reviewer's violation count.

---

## Notes for O5

- One knowledge unit with two consumers is a sound shape. Both Anthropic (`CLAUDE.md` for everyone,
  `REVIEW.md` for reviewers only) and Cursor (`BUGBOT.md`) split it that way. Practical form: the
  unit holds a short "write-time" head, and the reviewer reads the whole unit.
- Pointer or copy: the evidence favours pointers plus a small copied core. OpenAI's ~100-line map
  and Vercel's 8 KB index are both pointer files. The ETH study warns against broad overviews.
- Load timing is R1's topic. One caveat from the Claude Code docs: a subdirectory `CLAUDE.md` loads
  "when Claude reads files in those subdirectories", and path rules load "when matching files are
  opened". Whether *creating* a new file in an area that has not been read yet triggers the load is
  not stated. Test this before relying on it for new DTO or migration files.
  [Claude Code memory](https://code.claude.com/docs/en/memory)

## Evidence gaps

- No controlled measure of house-convention adherence with and without rules files.
- No head-to-head comparison of write-time, review-time and hybrid on the same tasks.
- Review-bot numbers come mostly from correctness or general review, not from stack-convention
  review specifically. Google AutoCommenter is the closest match.
- We could not fetch OpenAI's harness engineering post directly (HTTP 403). The claims cited here
  rest on the search snippet and secondary summaries.
