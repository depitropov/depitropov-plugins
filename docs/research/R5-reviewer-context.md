# R5: What should the logic reviewer see?

Researched 2026-10-08 by a research agent with web search. [opened] means the agent read the page or
its abstract. [snippet] means it saw the source only in search results. I did not open the sources
myself.

## The question

logic-review is a fresh subagent that checks the code against the acceptance criteria, and checks
that each criterion has a test that fails on a wrong version of the code. Should it also see the
plan and the coder's implementation log, or only the brief, the answers and the diff?

The fear: the plan says "this is what the code does, and why". A reviewer that reads it may check
"did the code follow the plan" and take over the plan's blind spots. The counter-argument: without
the plan, the reviewer cannot see undeclared deviations or tasks that were left out.

## Short answer

Keep the plan away from the correctness review. Check conformance to the plan separately. The
evidence that author framing makes reviewers miss bugs is measured. The evidence that the plan
helps a correctness review is not. No study compares "reviewer with the plan" against "reviewer
without it" in a normal coding pipeline: that gap is real.

## 1. Author framing biases LLM reviewers

- **Framing hides bugs (measured, strong).** When the pull-request text said the code was
  "bug-free", vulnerability detection fell sharply: GPT-4o-mini from 97% to 4%, Claude 3.5 Haiku
  from 68% to 9%, DeepSeek V3 from 97% to 54%, Gemini 2.0 Flash from 96% to 79%. The bias causes
  mostly missed bugs, not false alarms (4 to 114 times more). In Claude Code, removing the
  description recovered 69% of the misses; removing it and also telling the model to ignore
  metadata recovered 94%. Caveat: the framing was hostile; a plan is not. Alexopoulos et al.,
  *Measuring and Exploiting Contextual Bias in LLM-Assisted Security Code Review*, 2026.
  https://arxiv.org/html/2603.18740v1 [opened]
- **Reasoning traces help and mislead (measured).** Monitors that read the reasoning caught subtle
  problems that output-only monitors missed, but misleading reasoning fooled them on obvious cases.
  The best result scored reasoning and actions separately, then combined them: twice the detection
  of action-only monitoring on subtle cases. Arnav et al., *CoT Red-Handed*, NeurIPS 2025.
  https://arxiv.org/abs/2505.23575 [opened abstract]
- **The counterpoint (measured).** A monitor that read the chain of thought caught reward hacking in
  agentic coding far better than an action-only monitor. Baker et al. (OpenAI), *Monitoring
  Reasoning Models for Misbehavior*, 2025. https://arxiv.org/abs/2503.11926 [snippet]
- **"Ignore the anchor" does not fully work (measured, mixed quality).** Chain-of-thought and
  ignore-instructions reduce anchoring in LLM judges but do not remove it. *Anchoring Bias in
  LLMs*, arXiv 2412.06593 [snippet]; *Anchoring Bias in LLM-as-a-Judge*, arXiv 2608.25869 [snippet].
- **Self-preference (measured).** Models rate their own outputs higher, in step with how well they
  recognise them. It matters only in part for a fresh subagent of the same model. Panickssery,
  Bowman, Feng, *LLM Evaluators Recognize and Favor Their Own Generations*, NeurIPS 2024.
  https://arxiv.org/abs/2404.13076 [snippet]

## 2. Requirements first, then the code

- **Extract, then audit (measured).** Long "explain and fix" prompts made models reject correct code
  far more often: GPT-4o passed correct code 52% of the time, then 11%. Prompts that first list what
  the requirements oblige, then audit the code against that list, reached 72% and 85%. Jin & Chen,
  *Uncovering Systematic Failures of LLMs in Verifying Code Against NL Specifications*, ASE 2025.
  https://arxiv.org/html/2508.12358v1 [opened]
- **Fresh critics in general.** LLM critics catch more bugs than paid human reviewers. The study does
  not test what context the critic sees. McAleese et al. (OpenAI), CriticGPT, 2024.
  https://arxiv.org/abs/2407.00215 [snippet]

## 3. Tests from the code repeat the bug

- **Oracles follow the code (measured).** Across 24 Java repositories, LLM-written assertions mostly
  capture what the code does, not what it should do. LLMs are better at writing oracles than at
  judging existing ones. Konstantinou, Degiovanni, Papadakis, *Do LLMs generate test oracles that
  capture the actual or the expected program behaviour?*, 2024, revised 2026.
  https://arxiv.org/abs/2410.21136 [opened abstract]
- **Oracles from requirements follow the requirements (measured, small).** Assertions written only
  from the requirements matched the requirements better than the code. Only 10 Defects4J bugs. Ma &
  Eisty, *From Business Requirements to Test Assertions*, 2026. https://arxiv.org/abs/2607.10277
  [opened abstract]
- **For us:** to judge "would this test catch a wrong version?", the reviewer works out the expected
  behaviour from the brief before it reads the code.

## 4. Practitioner guidance (opinion, not measured)

- Anthropic, Claude Code best practices: a fresh reviewer "sees only the diff and the criteria you
  give it, not the reasoning that produced the change", and "a fresh context improves code review
  since Claude won't be biased toward code it just wrote". Plan conformance is described as a
  separate review against `PLAN.md`. It warns that gap-hunting reviewers over-report.
  https://code.claude.com/docs/en/best-practices [opened]
- Cognition, *Don't Build Multi-Agents*, Walden Yan, 2025: share full traces between agents. This is
  about builder agents that must make consistent choices, not about reviewers.
  https://cognition.com/blog/dont-build-multi-agents [opened]
- GitHub Copilot code review uses the pull-request description and linked issues; nothing on bias.
  [snippet]

## Recommendation

1. **Correctness review: brief, answers, diff and code.** No plan and no implementation log. First
   list what each criterion and each behavioural assumption requires, and one likely wrong version
   of the code for each. Then read the code and the tests.
2. **The author's own reasoning comes last.** If the reviewer needs the coder's recorded choices (to
   avoid repeating them), it reads them after it has its findings, and only to drop repeats.
3. **Plan conformance apart.** A separate check compares the plan with the diff: named tests exist,
   no file outside the plan changed, every task is done. It gives no verdict on correctness.
4. **Keep the two results apart** and combine them only in the report.

## Evidence gaps

- Nobody has measured plan exposure in a normal (not hostile) coding pipeline.
- The framing numbers come from hostile framing and mostly from small or older models.
- The requirements-only oracle study is small.
- The cost of hiding the plan (missed undeclared deviations) is reasoned, not measured. The separate
  conformance check is how we cover it.
