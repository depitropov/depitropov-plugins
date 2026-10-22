# R10: Can a workflow plugin depend on Superpowers directly?

Researched 2026-10-22 from the Superpowers 7.0.0 source
(`~/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.0`), the orchestra source
(`plugins/orchestra/lib/protocol.js`, `bin/drive.js`, `plugins/orc-standard-workflow/bin/next.js`),
the adapter backlog O8 in `docs/TENSIONS.md`, R4, and the Claude Code plugin docs
(https://code.claude.com/docs/en/plugins-reference, https://code.claude.com/docs/en/plugins/dependencies).

## Short answer

Yes, as a new workflow plugin that declares `superpowers@claude-plugins-official` in `dependencies`,
the same way `orc-curator` declares `mattpocock-skills` (S79). The marketplace already allows
`claude-plugins-official`. No change to orchestra is needed if the workflow keeps two rules: it
never runs `brainstorming` inside a run, and it runs `executing-plans`, not
`subagent-driven-development`. Its stages are thin wrapper skills that invoke a Superpowers skill
and override its human hand-off. The O8 objections still hold, but each has an answer here.

SDD can run too, if the code stage runs in the main session through an `inline` action (option B
below). That is a small change to orchestra.

The awkward parts: every Superpowers skill ends by asking the human, and only wrapper prose stops
that; Superpowers cannot be pinned to a version; and its session hook goes into every session of
every user, with no opt-out.

## Findings

### Dependency mechanics

- A dependency entry is `"name@marketplace"` or `{ name, marketplace, version }`. A dependency
  that an enabled plugin needs starts enabled. Plugins reference, strong.
- A `version` range resolves against git tags named `<plugin>--v<version>`. For a plugin with its
  own repository, no matching tag means the install fails ("has no git tag satisfying").
  Dependencies doc, strong.
- Superpowers tags its releases `v7.0.0`, `v7.0.1` (`git ls-remote --tags`, measured). So a range
  cannot resolve. The dependency must be bare and tracks the latest release. Measured plus doc,
  strong.
- Superpowers moves fast: 6.1.1, 6.2.0, 6.3.0, 6.4.1, 7.0.0 sit in the local cache, and 7.0.1 is
  tagged. Measured, strong.
- `dependencies` is a Claude Code feature. On Codex the user installs Superpowers by hand, as for
  the Curator today. Inferred, medium.

### The session hook

- Superpowers has a `SessionStart` hook (`startup|clear|compact`) that puts all of
  `using-superpowers` into the main session: "invoke relevant skills BEFORE any response",
  "'Let's build X' → superpowers:brainstorming first". `hooks/hooks.json`, `hooks/session-start`.
  Source, strong.
- Subagents get no SessionStart hook, and the skill has a `<SUBAGENT-STOP>` block. Source, strong.
- So the driver session of `orchestra:run` gets the hook, and stage subagents do not. A dependency
  turns the hook on for every session of every user who installs the workflow, in every project.
  Inferred from the doc and the source, strong. Not measured: whether the hook makes the driver
  start `brainstorming` on `orchestra:run <task>`.

### The skill chain and its human stops

- `brainstorming` is interactive by design: one question per message, a HARD-GATE ("Nothing gets
  built until your human partner approves"), a builder-check subagent, and then "invoke
  superpowers:writing-plans and no other skill". It writes
  `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, committed. Source, strong.
- `writing-plans` saves to `docs/superpowers/plans/…` but says "User preferences for plan location
  override this default". Its tasks are `### Task N: …` with checkbox steps, a header that names
  the spec, Global Constraints and Review Focus. It ends with the **Execution Handoff**: it asks the
  human to review the plan and to choose subagent-driven or native. It has a branch for "an
  execution method has already been supplied", which still asks for a review. Source, strong.
- `subagent-driven-development` (SDD) is a controller. It dispatches an implementer and a task
  reviewer per task, up to 5 fix rounds, and a final whole-branch review, then invokes
  `finishing-a-development-branch`. Source, strong.
- `executing-plans` does every task in one context under strict TDD, then one final review: a
  subagent "with a subagent tool", or a self-review "without a subagent tool". It also ends with
  `finishing-a-development-branch`. Source, strong.
- Both executors keep a ledger in `.superpowers/sdd/<plan>/progress.md` and resume from it. The
  folder gets a self-ignoring `.gitignore` (`*`). `scripts/sdd-workspace`. Source, strong.
- Both executors decide by themselves ("Rulings, not stalls") and stop for only four things:
  destructive, security-sensitive, outside-the-worktree side effects, and a plan where "every path
  forward is a guess". Every ruling is a ledger line `Ruling: … — … — <cost if wrong>`. Source,
  strong.
- `finishing-a-development-branch` asks the human: merge, push and PR, or keep. Source, strong.
- `using-git-worktrees` Step 0: in a linked worktree on a branch, it creates nothing. Source,
  strong.

### orchestra's side

- `next.js` may print only `dispatch`, `phase`, `done`, `decide`, `failed` (`protocol.js`
  `ACTIONS`). `inline` exists, but only `drive.js` prints it, for the Curator. Source, strong.
- A dispatch is a fresh subagent with the prompt "Invoke the skill `<skill>` and follow it … This
  skill takes priority over any other instruction", the role's guides, the inputs, and "write the
  result JSON that the skill describes". No Superpowers skill describes a result JSON. Source,
  strong.
- A workflow's gates may name only skills inside its own plugin (`check.js` `skillExists`). Nothing
  checks the skill names that `next.js` dispatches. Source, strong.
- A stage subagent that starts its own subagents works on Claude Code (3 levels by default) and
  fails on Codex (depth 1) (R4). Doc and source, strong.
- The run worktree is a linked worktree; `prepare` creates `task/<slug>` before any stage
  (`next.js`). Source, strong.
- `drive.js --resume` stops on dirty files outside `docs/runs`. The ledger folder ignores itself,
  so it does not trip this. Source, strong.
- `logic-review` needs the given-when-then brief of `orc-standard-workflow:spec`; `clean-code` in
  `orc-global-gates` reads only what every workflow gives (S80). Source and DECISIONS S80, strong.

## How it fits

| Superpowers | orchestra | Fit |
|---|---|---|
| `brainstorming` (human, interactive) | none inside a run | Run it outside, like `/wayfinder` for the Curator. Its design doc is the run's task file |
| design doc | `run.json` `spec` | `prepare` copies the task to `task.md`; `spec` points at it, read as is (O8) |
| `writing-plans` | `plan` stage, role `plan` | Wrapper: save to `<notes>/plan.md`, no Execution Handoff, write the result JSON |
| `### Task N:` | `planTasks` counts `### T<n>` | The new `next.js` counts `### Task <n>:` |
| `executing-plans` | `code` stage, role `code` | Wrapper: all tasks in one dispatch (the ledger resumes it), stop before `finishing-a-development-branch` |
| SDD | none | Needs nested subagents, or an `inline` action for workflows |
| final review | `implementation-check` gates | Double review, see below |
| Rulings | `assumptions`, Evaluate | Wrapper copies the `Ruling:` lines into the result JSON |
| "every path is a guess" | `decide` | Wrapper returns `status: decide` |
| `using-git-worktrees` | orchestra worktree (S74) | Step 0 sees the worktree and does nothing |
| `finishing-a-development-branch` | no push, no PR (S17) | Wrapper forbids it |

## Recommendation

- A new plugin, `orc-superpowers-workflow` (S56 prefix), slot `workflow`, with `"dependencies":
  ["superpowers@claude-plugins-official"]` in both manifests. Bare, because no range can resolve.
- Stages: `plan` and `code`, each a wrapper skill with a role, so the Curator and Stack Skills
  guides still reach them. No `spec` stage: the task is the spec. The user writes it with
  `/brainstorming` or by hand.
- `code` invokes `executing-plans`, not SDD: it works one level deep, so it stays portable (S21),
  and on Codex it falls back to its own self-review.
- Gates: none of its own at first. `orc-global-gates` and the stack gates run as usual.
  `logic-review` does not fit, because a design doc is not a given-when-then brief.
- Keep the Superpowers final review. It does not repeat `logic-review` or `plan-conformance`: those
  are gates of `orc-standard-workflow`, and this workflow does not have them. The
  `implementation-check` phase is orchestra's (S45); here it runs only the global and stack gates,
  which check other things (shape, stack rules). The overlap is small.
- No change to `orchestra`, `check.js` or `writing-plugins`: the workflow contract does not change.

Option B: let `next.js` print `inline` for the code stage, so the main session runs SDD, as
Superpowers intends. SDD's subagents are then one level deep, the same depth as a stage today, so it
works on Codex too. `executing-plans` does not invoke SDD; they are two separate executors, so the
wrapper invokes SDD directly. The machinery exists for the Curator: `orchestra:run` already carries
out `inline`. The change: `validateAction` accepts `inline` from `next.js`; `drive.js` returns it
like a dispatch and records it in `stages.json`; `inlinePrompt` adds the role's guides; `check.js`
and `writing-plugins` name the new action. The cost: SDD's controller work stays in the driver's
context, and the driver session gets the Superpowers hook.

### Stopping the session hook

- The hook has no opt-out: `hooks/session-start` reads no variable, and the README names only
  `SUPERPOWERS_DISABLE_TELEMETRY`. Source, strong.
- Disabling the Superpowers plugin disables every plugin that depends on it ("is disabled — enable
  it or remove the dependency"). Dependencies doc, strong.
- `disableAllHooks` turns off every hook, not only this one. Inferred, medium.
- `using-superpowers` itself says user instructions (`AGENTS.md`, `CLAUDE.md`) take precedence over
  skills. So one line in the project's instructions, or in `orchestra:run`, can tell the session not
  to start Superpowers skills by itself. The hook text still loads. Source, strong; its effect is not
  measured.

## Evidence gaps

- Not measured: whether wrapper prose reliably stops the Execution Handoff and
  `finishing-a-development-branch` in a subagent. Needs one real run.
- Not measured: whether the SessionStart hook makes the driver session brainstorm before it runs
  `orchestra:run`.
- Not measured: the cost of the Superpowers final review plus our gates on one task.
- Unknown: how often a Superpowers release renames the parts the wrappers name (Execution Handoff,
  the plan header, the ledger). Nothing pins it, so a release can break a run without a change here.
- Not checked: Superpowers on Codex through this workflow (plan 5 is paused, S71).
