# depitropov-plugins

The orchestra plugins: `plugins/orchestra`, `plugins/orc-standard-workflow`, `plugins/orc-java-stack`.
The design is in `docs/DESIGN.md`, the decisions in `docs/TENSIONS.md` (one row each) and
`docs/DECISIONS.md` (the full record), the names in `docs/CONTEXT.md`.

**Porting.** Before you plan, write or review anything that comes from a source plugin
(be-coding-agent, java-stack, minions, sc-agent-plugins), read `docs/PORTING.md` and follow its
steps. Work from the source files themselves. `docs/PILLARS.md`, `docs/DESIGN.md` and earlier plans
are summaries: they leave content out.

**Research.** When research (papers, docs, vendor guidance, measurements) drives a framework
decision, write it to `docs/research/R<n>-<topic>.md` before the decision is recorded: the question,
the short answer, each finding with its source and how strong it is, the recommendation, and the
evidence gaps. Follow the format of the existing notes.

**Decisions.** Every settled decision gets one row in `docs/TENSIONS.md`. A deliberate decision that
weighed options (after research, after a run's feedback, or when a port changes the source) also gets
a full entry in `docs/DECISIONS.md` under the same `S` number, in the format that file defines. Write
both in the same commit as the change they decide.

**Contracts.** When a change adds, renames or removes something a plugin may declare, or something
orchestra reads from a declaration or the project config, update `plugins/orchestra/lib/check.js`
and the skill `plugins/orchestra/skills/writing-plugins/SKILL.md` in the same change.

**Guide.** `docs/guide.html` explains orchestra to people, in levels from the idea down to the code.
At the end of every change to `plugins/` or to the docs above, tell the user which sections of the
guide the change makes out of date, and offer to update them. When you update it, also update the
version and the last `S` number in its rail and its footer.

**Shortcuts.** Sometimes we take a shortcut for now: a feature of one harness, a copy instead of a
shared file, a manual step. Each shortcut must be explicit and permitted by the user; never take
one silently. A shortcut that would not run on another harness gets a row in
`docs/harness-exceptions.md`, in the same change, with who permitted it.
