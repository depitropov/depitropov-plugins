# A workflow built on Superpowers (O8)

Date: 2026-10-22. Research: `docs/research/R10-superpowers-workflow.md`. Decision: S81.

## Goal

A second workflow, `orc-superpowers-workflow`, that plans with Superpowers `writing-plans` and codes
with Superpowers `subagent-driven-development` (SDD), and then runs orchestra's three gate phases like
any workflow. It depends on Superpowers directly, as `orc-curator` depends on `mattpocock-skills`
(S79). It wraps the Superpowers skills; it does not copy or translate them.

Success: on the sample repo, `orchestra:run` with this workflow takes one task to `done`: a plan in
the notes folder, SDD's commits on the task branch, the three phases green, and `report.md` with
SDD's rulings. No Superpowers skill asks the human, merges, pushes or opens a PR.

## Decisions taken in the conversation

| # | Question | Choice |
|---|---|---|
| 1 | How to depend on Superpowers | `"dependencies": ["superpowers@claude-plugins-official"]`, bare. A version range cannot resolve: Superpowers tags `v7.0.0`, and Claude Code needs `superpowers--v7.0.0` (R10). Revisit when a release breaks a run. |
| 2 | Brainstorming | Not inside a run. The user runs `/brainstorming` if they want to, as `/wayfinder` for the Curator. The task (a sentence, or the design doc as a file) is the spec. |
| 3 | The code executor | SDD, not `executing-plans`: a review after every task. |
| 4 | Where SDD runs | In the main session, through an `inline` action that the workflow's `next.js` prints. Its subagents are then one level deep, as the coders of `orc-standard-workflow` are (S21, R4). |
| 5 | The human hand-offs of Superpowers | Stopped by prose in the wrapper skills. Tried first; changed if a run shows it fails. |
| 6 | The SessionStart hook of Superpowers | Accepted as it is. |
| 7 | Gates | None of its own. `logic-review` and `plan-conformance` are gates of `orc-standard-workflow`; SDD's task and final reviews cover what they check. The global and stack gates run as for any workflow. |
| 8 | `tasks-per-coder` | Not declared. It is a key of `orc-standard-workflow` only; SDD sizes its own dispatches. |

## The flow

```
orchestra:run "<task>"            (main session)
  drive.js → next.js
    prepare                       task/<slug>, run.json, task.md          (code)
    plan       dispatch           subagent: orc-superpowers-workflow:plan → superpowers:writing-plans
    code       inline             main session: orc-superpowers-workflow:code → superpowers:subagent-driven-development
                                    → implementer and reviewer subagents, one level deep
    implementation-check          phase: build, global gates, stack gates
    conventions-check             phase
    finish                        phase
    done                          (curate, if the Curator is set up)
```

### prepare

As in `orc-standard-workflow`: create `task/<slug>` from the detached HEAD, write `run.json` and
`task.md`. `run.json` has `spec: <notes>/task.md`: the task is the spec, read as it is (O8). Global
gates read it through `spec` (S80).

### plan (`dispatch`, role `plan`)

Inputs: `spec`, `notes`, `decisions` (when it exists). The wrapper skill `plan`:

1. Follows the guides in the dispatch prompt.
2. Invokes `superpowers:writing-plans` on `spec`, with three overrides: save the plan to
   `<notes>/plan.md`; skip the **Execution Handoff** (do not ask for a review or an execution method;
   orchestra executes the plan with SDD); do not commit (orchestra commits the notes).
3. Writes the result JSON `{ "stage": "plan", "status": "ok", "files": ["plan.md"] }`. When the spec
   is too thin to plan from and no default holds, `status: decide` with the questions.

`next.js` then checks that `plan.md` has `### Task 1`, `### Task 2`, … in order. If not, it marks the
plan result failed and reported, so the next call plans again (as `orc-standard-workflow` does with
plan-check, S32).

### code (`inline`, role `code`)

Inputs: `spec`, `plan`, `base`, `build`, `notes`, `decisions` (when it exists). The main session
carries out the `inline` action. The wrapper skill `code`:

1. Invokes `superpowers:subagent-driven-development` on `plan`, with these overrides:
   - The worktree exists already; do not create one.
   - Add the guides of the dispatch prompt to every implementer and fixer dispatch, as paths to read
     and follow.
   - Tell each implementer: never stage files under `docs/runs/` or `tmp/`; never push.
   - Do not ask the user. SDD's own stop ("every path forward is a guess") ends the stage with
     `status: decide` and the question. The other three SDD stops (destructive, security-sensitive,
     side effects outside the worktree) do not apply: never do them.
   - Stop after the final review and its fix wave. Before SDD deletes its workspace: copy the ledger
     to `<notes>/sdd-ledger.md`, and write the result JSON. Never invoke
     `finishing-a-development-branch`.
2. Result JSON:

```json
{
  "stage": "code",
  "status": "ok",
  "assumptions": ["<each Ruling: line of the ledger>"],
  "evaluate": ["<each deferred minor and parked finding, with file:line>"],
  "files": ["sdd-ledger.md"]
}
```

A run that stops inside SDD resumes through the same `inline` action: `next.js` finds no result file
and prints it again, and SDD resumes from its ledger in `.superpowers/sdd/` (which ignores itself in
git). An answer to `decide` is a `## code` section in `decisions.md`, as for every stage.

### The phases

`next.js` prints `implementation-check`, `conventions-check`, `finish`, as `orc-standard-workflow`
does. With no workflow gates, the phases run the build, the global gates and the stack gates.

## Changes

### orchestra: a workflow may print `inline`

| File | Change |
|---|---|
| `lib/protocol.js` | `validateAction` accepts `inline` with the same keys as `dispatch` (`skill`, `inputs`, `result`, optional `role`). `inlinePrompt` adds the role's guides, as `withPrompt` does. |
| `bin/drive.js` | `step` handles an `inline` from `next.js` like a `dispatch`: the role check, `remember` in `stages.json`, return it. Today any action that is not `dispatch` or `phase` ends the run. `answer` passes the guides to `inlinePrompt`. |
| `lib/check.js` | The dry run accepts `inline` as a first action (it goes through `validateAction`). No new rule. |
| `skills/run/SKILL.md` | The `inline` paragraph names both senders: the Curator, and a workflow stage that runs in the main session. |
| `skills/writing-plugins/SKILL.md` | The `next.js` actions list `inline`: the main session runs the skill, which may dispatch subagents of its own. Drop "a workflow's `next.js` never does" from the Curator section. |
| `docs/DESIGN.md` | §3 (the driver loop), §7 (the workflow contract), §2 and §12 (the new plugin). |

### The new plugin `plugins/orc-superpowers-workflow/`

```
.claude-plugin/plugin.json   name, version, description, dependencies
plugin.json                  the same (both manifests carry dependencies)
orchestra.json               slot: workflow, roles: [plan, code], config: {}, gates: []
bin/next.js                  prepare, plan, the plan check, code, the three phases
skills/manifest/SKILL.md
skills/plan/SKILL.md
skills/code/SKILL.md
```

`next.js` reuses the shape of `orc-standard-workflow/bin/next.js` (`stage`, `noResult`,
`reportOnce`, `prepare`); `stage` takes the action name, `dispatch` or `inline`. It is a copy, not a
shared module: each workflow ships its own `next` (S10).

Both catalogs list the plugin: `.claude-plugin/marketplace.json` already allows
`claude-plugins-official`. All plugin versions move together.

### Tests

- `test/orchestra/`: `validateAction` accepts `inline`; `drive.js` returns an `inline` from `next.js`
  with the guides in its prompt and records it in `stages.json`; a role the workflow does not
  declare fails.
- `test/orc-superpowers-workflow/`: `next.js` prints `dispatch` for plan, fails on a plan with no
  tasks in order, prints `inline` for code, stops on a code `decide` until a `## code` answer, then
  prints the three phases and `done`; both manifests carry the dependency; `orchestra check` passes
  on the plugin.

## Out of scope

- Brainstorming inside a run.
- `executing-plans` as a second code executor.
- A Superpowers review as a gate.
- Pinning the Superpowers version, and silencing its SessionStart hook.
- Codex: `dependencies` is a Claude Code field; on Codex the user installs Superpowers by hand.

## Risks

- The wrapper prose may not stop the Execution Handoff or `finishing-a-development-branch`. The first
  run shows it.
- A Superpowers release can rename what the wrappers name (the Execution Handoff, the ledger, the
  `### Task N` heading). Nothing pins it.
- SDD's controller turns stay in the driver's context, before the three phases run. Both sides
  survive a compaction: SDD through its ledger, orchestra through its files.
- SDD rules on plan problems instead of stopping, so fewer runs stop on `decide`. The rulings reach
  the human through `report.md`.
