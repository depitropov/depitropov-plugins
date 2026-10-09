# R6: How should we instruct the planner and the coder, and how much?

Researched 2026-10-09 by a research agent with web search.
Feeds: the Java port (plan 4), `plan-guide` and `code-guide`.

[opened] means the agent read the page or its abstract. [snippet] means it saw the source only in
search results or in a secondary write-up. Strength labels follow R3:
- **Strong**: peer-reviewed, or a controlled study with clear numbers.
- **Medium**: a preprint with a controlled setup, or vendor data from real deployments.
- **Weak**: a vendor or practitioner claim with no published method, or a single small eval.

This note builds on R3. R3 already covers: instruction count and context rot (IFScale, Chroma),
the CLAUDE.md "under 200 lines" advice, the ETH and Lulla studies of `AGENTS.md`, review-time
agents, and the thin path-scoped write-time layer. This note does not repeat them.

## The question

A stack plugin may give two write-time skills. `plan-guide` is loaded by the planner and the plan
checker. `code-guide` is loaded by the coder. Both are empty today. What should go in them, and how
much? In detail:

1. Do generic design principles ("use Clean Architecture", "follow SOLID", "apply DDD", "write
   clean code", "use design patterns") help, do nothing, or harm?
2. Do persona prompts ("you are a senior Java engineer") change code quality?
3. Which kind of content works best: concrete rules, prohibitions, positive instructions, code
   examples, pointers to existing code, checklists?
4. How much, beyond what R3 found?
5. Does the planner gain from architecture rules, or should it read the repo and follow it?
6. What do the vendors (Anthropic, OpenAI, Google, Cursor) and the practitioners advise?

## Short answer

Keep both guides almost empty. Generic design principles and personas show no measured gain on
code, and several studies show cost or harm. Prompts that ask for quality make the first version
cleaner but do not change correctness or the later decay. Newer models follow instructions
literally and already over-build, so each extra instruction is acted on, for good or bad. What
does help: a few specific, house-only facts the model cannot guess, written as positive rules with
a reason, plus a pointer to a real file in the repo to copy. Everything else goes to the reviewers
and the linters. Confidence: **medium**. The evidence against generic content is fairly
consistent. The evidence for the small positive core is mostly vendor advice, not measured.

---

## 1. Generic design principles

No study we found gives an agent "follow SOLID" or "use Clean Architecture" in a real repository
and measures the result against no such line. The closest evidence is below. It all points the
same way: asking for "quality" in general terms does little for correctness, and the main risk of
LLM code is too much code, not too little design.

- **Quality prompts set a cleaner start, not a better result (medium).** SlopCodeBench gave agents
  iterative coding tasks with three prompts: "just-solve", "anti-slop" (forbids verbose patterns
  and needless abstractions) and "plan-first". Anti-slop cut initial verbosity by 34.5% on GPT 5.4
  and 33.2% on GPT 5.3 Codex. But "the degradation lines for Anti-Slop and Plan-First track the
  baseline slope almost exactly". No pass-rate subtype improved (all p > 0.05). Anti-slop cost
  47.9% more on GPT 5.4 ($450 vs $304). Orlanski et al., arXiv 2603.24755, 2026.
  https://arxiv.org/abs/2603.24755 [opened]
- **Detailed prompting does not stop structural decay (medium).** Across models and agents, code
  volume was "a near perfect predictor of structural degradation". More capable models wrote more
  bloated and more coupled code. A structured prompt with explicit coding standards gave "no
  meaningful improvement in code hygiene". More prompt specificity across four stages had no
  significant effect on any smell category (p > 0.8). Zhu, Tsantalis, Rigby, *AI-Generated Smells*,
  arXiv 2605.02741, 2026. https://arxiv.org/abs/2605.02741 [opened]
- **Naming a pattern is not enough, and forcing it can cost correctness (weak to medium).** Thirteen
  LLMs were asked to use Singleton. "Direct instruction" alone did not meet the pattern's
  requirements. Feedback from a tool did best. Where the pattern was enforced, one model gained
  32.9 points on the pattern score but lost up to 26.2 points of test pass rate. Kjellberg,
  Fotrousi, Staron, arXiv 2605.26898, 2026. https://arxiv.org/html/2605.26898v1 [opened]
- **More roles and more planning make heavier code, not better code (medium, small models).** On
  HumanEval with GPT-4o-family models, setups with an analyst-coder planning split produced 50–130%
  more complexity, with no pass@1 gain. Ashrafi, arXiv 2606.00308, 2026.
  https://arxiv.org/html/2606.00308v1 [opened]. HumanEval is function-level, so this transfers
  only weakly to repo work.
- **Architecture rules can be followed when the model is strong (weak).** In one task (a
  Hexagonal Architecture microservice), GPT-5.1 had 0% violations, Claude 4.5 20%, Llama 3 80%.
  This shows a strong model can honour a named architecture. It does not show the instruction
  helped: there was no no-instruction arm. Slater, arXiv 2512.04273, 2025.
  https://arxiv.org/abs/2512.04273 [opened abstract]; the Claude 4.5 figure is [snippet].
- **"Unwarranted abstraction" is a named failure mode (weak).** An incident taxonomy of agentic
  coding failures lists "over-engineering of trivial tasks by injecting unnecessary design". It
  gives no count for this sub-type. arXiv 2605.30777, 2026. https://arxiv.org/html/2605.30777v3
  [opened]. Reviewers also delete a "notable portion" of AI-written methods. Watanabe et al., arXiv
  2602.17091. https://arxiv.org/abs/2602.17091 [opened abstract]

**Vendor view.** Claude Code's best practices list "Self-evident practices like 'write clean code'"
and "Standard language conventions Claude already knows" under *Exclude*.
https://code.claude.com/docs/en/best-practices [opened]. Anthropic's skill guide: "Only add context
Claude doesn't already have." https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
[opened]. One caveat: Anthropic's own sample prompt against test-hardcoding does say "follows best
practices and software design principles" and "robust, maintainable, and extendable". So the vendor
does not ban such words. It uses them as a counterweight to one named failure, not as a style.
https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
[opened]

**Reading.** SOLID, Clean Architecture and DDD are in every model's training data. A line that
names them adds no new fact. With literal, eager models (section 6), it can push toward more
interfaces, layers and classes, which is the failure the evidence already shows. We found no
evidence that the line raises correctness. Absence of a direct test is itself a gap.

## 2. Persona prompts

- **Personas do not improve performance (strong).** 162 roles, 2,410 factual questions, four
  model families. "Adding personas in system prompts does not improve model performance" compared
  with no persona. The effect of each persona "can be largely random". Note: v1 (2023) claimed a
  gain; the final version reversed it. Zheng et al., Findings of EMNLP 2024, arXiv 2311.10054.
  https://arxiv.org/abs/2311.10054 [opened]
- **Expert personas: small or no gain, high fragility (strong).** Nine LLMs, 27 tasks. Expert
  personas gave "positive or non-significant" changes. Irrelevant persona details caused drops of
  "almost 30 percentage points". de Araujo et al., EMNLP 2025, arXiv 2508.19764.
  https://arxiv.org/abs/2508.19764 [opened]
- **On code: no correctness effect (strong).** CodePromptEval, 7,072 prompts, GPT-4o, Llama3,
  Mistral. The persona ("a software developer who focuses on practices and standards…") had no
  significant effect on correctness for any model. Persona, CoT and package lists lowered pass
  rates somewhat but improved maintainability. Combining techniques did not help. Khojah et al.,
  TSE, arXiv 2412.20545. https://arxiv.org/abs/2412.20545 [opened]
- **On code, newer models: model-dependent and small (medium).** 18 personas, 35,000+ programs,
  Gemini 2.5 Pro and GPT-OSS-120B. Gemini lost 1.54 points on average (up to 3.6). GPT-OSS gained
  3.4–5.7. Effects on maintainability and style were significant but negligible. Gupta et al.,
  arXiv 2609.22102, 2026. https://arxiv.org/abs/2609.22102 [opened]
- **Persona combined with other constraints can hurt (medium).** HumanEval+, five OpenAI models.
  JSON output plus expert persona plus urgency cost GPT-4o-mini 12.2 points beyond the additive
  prediction. GPT-4.1 was largely resistant. Jadhav et al., arXiv 2609.03156, 2026.
  https://arxiv.org/abs/2609.03156 [opened]
- **No effect on quality metrics in the wild (medium).** 7,583 ChatGPT-made files: prompt patterns
  showed no significant difference in maintainability, security or reliability. Della Porta et
  al., arXiv 2504.13656, 2025. https://arxiv.org/abs/2504.13656 [opened]
- **Vendors.** Anthropic still says "Give Claude a role… Even a single sentence makes a difference"
  (for behaviour and tone) [opened, page above]. OpenAI's GPT-5.5 guidance separates
  "personality" (user experience) from "collaboration" (task behaviour)
  https://developers.openai.com/api/docs/guides/prompt-guidance?model=gpt-5.5 [opened]. Google's
  Gemini 3 guide warns the model may "ignore instructions in order to maintain adherence to the
  described persona" [snippet], https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide

**Reading.** A persona line is noise at best for code quality. Our subagents already have a task
role from the orchestra skill. The stack guide should not add one.

## 3. Which kind of content works

### Specific, non-default facts beat general advice

- **Constraint type matters more than format (medium).** 11 models, 16 tasks. Compact or verbose
  encoding made no significant difference to compliance. "Counter-intuitive constraints opposing
  model defaults" failed far more often than conventional ones (99%+ compliance). Effort should go
  to "constraint design", not formatting. Tang, arXiv 2604.07192, 2026.
  https://arxiv.org/abs/2604.07192 [opened abstract]. The paper's claim that positive constraints
  ("use X") are easier than negative ones ("do not use Y") is [snippet] only.
- **Context files help mainly for non-standard practices (strong-medium, see R3).** The ETH study
  adds: context files make agents "run more tests", read and search more files, and think more
  (+22% reasoning tokens on GPT-5.2), without higher success. Files "should only contain specific
  additional instructions beyond what is already available in the codebase". Gloaguen et al., arXiv
  2602.11988. https://arxiv.org/html/2602.11988 [opened]
- **Explain the reason (weak, vendor).** Anthropic: give "context or motivation behind your
  instructions"; "Claude is smart enough to generalize from the explanation." [opened, prompting
  best practices]
- **Specificity predicts usable code (medium, observational).** In 265 developer-ChatGPT exchanges
  tied to PRs, specificity was most linked to actionable code. Verification cues were the main
  predictor of adoption. Sserunjogi et al., arXiv 2606.19644, 2026.
  https://arxiv.org/abs/2606.19644 [opened]

### Positive vs negative instructions

The evidence for code is thin.
- Anthropic: "Tell Claude what to do instead of what not to do", and for Opus 4.8 and 5, positive
  examples "tend to be more effective than negative examples or instructions that tell the model
  what not to do." (weak, vendor) [opened]
- Google, Gemini 3: broad negative constraints such as "do not infer" may make the model
  "over-index on that instruction"; put critical restrictions at the end. (weak, vendor) [snippet]
- OpenAI, GPT-5.5: use ALWAYS, NEVER, must, only "for true invariants"; "For judgment calls, prefer
  decision rules instead." (weak, vendor) [opened]
- Opus 4.8 shows the flip side: "Generic instructions ('don't use cream'…) tend to shift the model
  to a different fixed palette". A concrete alternative works reliably. (weak, vendor, about design
  not code) https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8 [opened]
- Negation research outside code shows framing swings in small open models (up to 76 points) and
  less in large commercial ones. Elkins & Chun, arXiv 2601.21433. [opened abstract] Low relevance.

**Reading.** Write a prohibition only for a true invariant (never edit an applied migration). For
everything else, name the thing to do instead.

### Examples vs instructions vs pointers to the repo

- **Examples alone are weak and do not hold (medium, one model).** Gemini 2.5 Pro, 160 paired
  programs. Against a control of 2,560 tokens: instructions cut length 56%, examples 20%, both
  together 70%. Under a later "improve readability, maintainability and error handling" request,
  example-only code grew as fast as the control. Combined prompts held best. Bohr, arXiv
  2511.13972, 2025. https://arxiv.org/abs/2511.13972 [opened]
- **Few-shot examples raise correctness but carry their smells (strong).** In CodePromptEval,
  few-shot and signatures had "a significant positive impact on correctness" but produced more code
  smells. Khojah et al. (above) [opened]
- **Pasted examples did not fix hygiene (medium).** In Zhu et al. (above), structured few-shot
  examples did not reduce Long Method smells; the authors suggest extra context reads as a signal to
  write more. [opened]
- **Point to real files (weak, vendor and practitioner).** Claude Code best practices: "Reference
  existing patterns… HotDogWidget.php is a good example. follow the pattern". Cursor: "Reference
  files instead of copying their contents. This keeps rules short and prevents them from becoming
  stale"; "point to canonical examples instead". https://cursor.com/docs/context/rules [opened].
  OpenAI's Codex guide: "Follow existing patterns, helpers, naming, formatting… if you must diverge,
  state why", and "search for prior art and reuse".
  https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide [opened]. The GPT-5
  guide: code should "'blend in' to the codebase", and GPT-5 "already searches for reference
  context". https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide [opened]
- **Agents often find conventions themselves (weak).** One vendor reports an agent found an
  existing test and followed its conventions in over 75% of cases, with lower reliability than
  explicit context. EclipseSource, 2025 [snippet],
  https://eclipsesource.com/blogs/2025/05/06/enhancing-ai-coding-with-project-info/

**Reading.** No study compares "follow the pattern in file X" with a pasted example. The pointer
wins on cost and staleness, and the code in the repo is the example the model will copy anyway.
A pasted example in the guide earns its place only where the repo has no good instance yet.

### Checklists

Anthropic recommends copyable checklists for multi-step workflows (skill guide, [opened]). We found
no evidence that a checklist of style or design items improves code. A checklist of design items
for the coder is a review list in the wrong place. It belongs to the reviewer.

## 4. How much (additions to R3)

- **Structure of the rules file did not matter; session length did (medium).** 1,650 Claude Code
  sessions on two TypeScript repos, mainly Sonnet 4.6. File size, position, file layout and
  contradictions between adjacent files had no detectable effect after correction. Each extra
  function written in a session lowered compliance odds by about 5.6% (OR 0.944). McMillan, arXiv
  2605.10039, 2026. https://arxiv.org/abs/2605.10039 [opened abstract]. This supports R3's fresh
  coder per chunk more than it supports a hard rule count.
- **Instruction following decays over multi-turn coding (medium).** About 7 turns and 91
  constraints per instance; performance degrades "rapidly as the interaction session grows longer".
  Wen et al., MTAC-IFBench, arXiv 2609.14992, 2026. https://arxiv.org/abs/2609.14992 [opened abstract]
- **Prompt dimensions explain little of code readability (medium).** Style descriptions and
  constraints help a little; the model explains R² < 0.3. Ye et al., arXiv 2605.13280, 2026.
  https://arxiv.org/html/2605.13280v2 [opened]
- **Vendor ceilings.** Skills and Cursor rules: under 500 lines. Cursor: "Start simple. Add rules
  only when you notice Agent making the same mistake repeatedly." Anthropic: build evaluations
  first, then "write minimal instructions" that close observed gaps. Böckeler: build rules files up
  "gradually". [all opened]

**Reading.** The 2026 evidence moves the question from "how many lines" to "which lines". Length
up to a few hundred lines is not the main risk with current models (R3, McMillan). Each rule is
followed, so each wrong or generic rule is followed too (section 6). The right count is the number
of observed, house-specific failures, not a target.

## 5. Plan-time guidance

- **A bad plan is worse than no plan (medium-strong).** 21,120 SWE-agent trajectories, four LLMs,
  eight plan variants. A good standard plan raised resolution. "A subpar plan hurts performance even
  more than no plan at all." Adding phases that "do not align with the model's internal
  problem-solving strategy" made outcomes worse. Liu et al., arXiv 2604.12147, 2026.
  https://arxiv.org/abs/2604.12147 [opened]
- **Models follow wrong instructions even when they see they are wrong (medium).** Code LLMs
  "correctly identify an incorrect instruction as wrong, then follow it anyway"; self-repair does
  not recover. Jaiswal et al., arXiv 2607.04537, 2026. https://arxiv.org/abs/2607.04537 [opened]
- **Plan files in the wild hold steps, files and tests (descriptive).** 85 agent plan files;
  most common content: implementation steps, files and locations, testing. "Whether plan files affect
  outcomes" is open. Abubakar et al., arXiv 2608.04661, 2026. https://arxiv.org/html/2608.04661v2
  [opened]
- **Repo overviews do not help agents find files (strong-medium, R3).** ETH study.
- **Vendors.** Anthropic: explore first, then plan; "If you could describe the diff in one sentence,
  skip the plan"; the best specs "name the files and interfaces involved". [opened] OpenAI GPT-5.5:
  "Describe the destination rather than every step"; over-specified process can "narrow the model's
  search space". [opened]
- **Practitioner (weak).** Böckeler on spec-kit's "constitution" and specs: "I frequently saw the
  agent ultimately not follow all the instructions", and elsewhere "the agent go way overboard
  because it was too eagerly following instructions". She asks whether this is a "false sense of
  control". https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html [opened]

**Reading.** We found no study that gives a planner architecture rules and measures the plan. The
indirect evidence says the planner does best when it reads the repo and names concrete files,
classes and tests. A wrong rule in `plan-guide` propagates: the plan carries it, the coder obeys
it, and plan-conformance then enforces it. So `plan-guide` should hold only facts the planner
cannot read from the repo and that change the shape of the plan.

## 6. Vendor guidance on newer models: literalness and over-eagerness

All [opened] unless marked.
- **Anthropic, prompting best practices.** "Claude Opus 4.5 and Claude Opus 4.6 have a tendency to
  overengineer by creating extra files, adding unnecessary abstractions, or building in flexibility
  that wasn't requested." The sample fix: "Don't create helpers, utilities, or abstractions for
  one-time operations. Don't design for hypothetical future requirements. The right amount of
  complexity is the minimum needed for the current task." Also: "dial back any aggressive
  language. Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more
  normal prompting". And: "If your prompts previously encouraged the model to be more thorough…
  dial back that guidance."
- **Anthropic, Opus 4.8.** "Claude Opus 4.8 interprets prompts literally and explicitly… It does not
  silently generalize an instruction from one item to another, and it does not infer requests you
  didn't make." State scope explicitly when a rule must apply broadly.
- **Anthropic, Opus 5.** "Claude Opus 5 can also expand the scope of a task, adding steps that
  weren't requested". Remove explicit verification instructions: they "cause over-verification".
  Avoid "double-check your answer": it adds cost "without improving results".
  https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- **Anthropic, Claude Code.** "If you emphasize many lines, none of them stands out." A reviewer
  that hunts gaps over-reports, and "Chasing every finding leads to over-engineering". [opened]
- **OpenAI, GPT-5.** Contradictory or vague instructions are "more damaging to GPT-5 than to other
  models". Cursor found "Be THOROUGH" style prompts "counterproductive with GPT-5". [opened]
- **OpenAI, GPT-5-Codex.** "Less is more": the model has coding best practices built in, and
  "over-prompting can reduce quality". [snippet; the guide URL now 404s]
  https://cookbook.openai.com/examples/gpt-5-codex_prompting_guide
- **OpenAI, GPT-5.5.** "Start with the smallest prompt that preserves the product contract." For
  coding agents, "be explicit about reuse, … test expectations, acceptance criteria".

**Reading.** Every vendor now says: current models already know general good practice, follow
instructions literally, and over-do emphasised or open-ended quality demands. The one quality
instruction vendors still recommend for code is the opposite of SOLID-style advice: keep it
minimal, no speculative abstraction, reuse what exists. That line belongs in the orchestra `code`
skill once, not in each stack guide.

---

## Recommendation

### `code-guide` (loaded by the coder)

- **Default: empty or near-empty.** Add a rule only when a run shows the coder making the same
  house-specific mistake that a linter cannot catch and a reviewer fix is costly. Target 0–10
  rules, well under one screen. This is tighter than R3's 5–15, because R6 finds no gain from the
  general rules that would fill the gap.
- **What a rule looks like.** One line, positive form, with the reason. Name the concrete thing to
  do (the annotation, the base class, the helper). Use NEVER only for true invariants, such as
  "never edit an applied Flyway migration; add a new one, because applied checksums are verified".
  Scope it to the paths it governs.
- **Pointers, not pasted code.** "New REST DTOs follow `<path>/SomeDto.java`." Paste a short
  example only where the repo has no good instance yet.
- **Keep out:** SOLID, Clean Architecture, DDD, design patterns, "clean code", "best practices";
  any persona; "be thorough", "double-check", "verify again"; capitals for emphasis; standard Java
  conventions; anything Spotless, Checkstyle, Error Prone or ArchUnit can check; logging, comment,
  Javadoc and naming detail.
- **The anti-over-engineering line** ("minimum complexity, no single-use abstractions, reuse
  existing helpers, follow the nearest existing pattern") goes in the stack-neutral orchestra `code`
  skill once. The stack guide does not repeat it.

### `plan-guide` (loaded by the planner and the plan checker)

- **Default: empty.** Hold only facts that change the shape of a plan and that the planner cannot
  read from the repo. Examples: modules or packages that must not be touched; the rule that schema
  changes need a new migration task; where each kind of test lives and which base class it uses;
  the build or test command if non-standard. Target 0–5 items.
- **No architecture style.** Do not tell the planner to apply a layering or a pattern. Ask it (in
  the orchestra `plan` skill) to name, per task, the existing file it will follow. The plan checker
  verifies that the file exists and fits.
- If the house architecture really must be stated, state it as checkable facts ("controllers call
  services, never repositories"), and back it with an ArchUnit test. A fact the build enforces
  cannot mislead a plan for long.

### What goes to reviewers and checks instead

The long tail: naming, logging, comments, Javadoc, test style, DTO details beyond the structural
core, layering violations. Deterministic checks first, then the focused area reviewer, as in R3.
Reviewer findings that repeat across runs are the input for promoting one rule into `code-guide`
or, better, into a linter.

## Conditions that flip it

- **Toward more write-time content:**
  - Our own A/B run (same tasks, guide on and off, scored by reviewer violation counts and fix
    rounds) shows a rule removes a costly fix round.
  - A weaker or cheaper coder model is used (for example a Haiku-class model). Anthropic's skill
    guide notes such models may need more guidance.
  - A greenfield module, or a repo where the existing code is the pattern to leave behind (a
    migration to a new style). Then "follow the repo" copies the wrong thing, and an explicit rule
    plus one example is needed.
  - Knowledge that is new or not in training data (in-house libraries, new framework APIs; see
    Vercel in R3).
- **Toward even less:** reviewers and linters already catch a rule's violations cheaply, or the
  coder breaks the rule no more often with it than without it.
- **Generic principles back in:** only if a controlled study on agentic repo work shows that a
  principle line raises correctness or lowers review findings without raising code size.

## Evidence gaps

- No study gives an agent "follow SOLID / Clean Architecture / DDD" in a real repository and
  compares it with no such line. Section 1 rests on adjacent evidence.
- Persona studies on code are mostly function-level and on 2024–2025 models. None uses Claude 4.x
  or 5.x in an agent loop.
- No study compares "follow the pattern in file X" with a pasted example, or measures how often
  agents copy a guide example verbatim into the wrong place.
- No measured evidence on architecture guidance for planners. Liu et al. test plans given to the
  agent, not guidance given to a planner.
- Positive vs negative instruction evidence for code is a single [snippet] claim plus vendor advice.
- The OpenAI GPT-5-Codex guide could not be opened (redirect then 404); its "less is more" quote
  comes from search snippets. The Gemini 3 guide also returned 404; its quotes are [snippet].
- Most 2026 papers here are preprints, several by single authors with small task sets.
