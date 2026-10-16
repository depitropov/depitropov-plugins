---
name: plan-guide
description: A guide for the plan stage of an orchestra run, and for its plan check: how to use the project's direction docs in the plan. Invoked by the stage, not by hand.
---

# Plan guide

Rules for the plan stage and the plan-check stage when the project has `docs/curator/`. When that folder does not exist, do nothing. The plan-check stage checks each point below.

1. Read `docs/curator/DIRECTION.md`. It is binding where it applies. Each `Cn` is a constraint that an earlier decision put on this code, so it is a requirement, not context.
2. For each `Cn` that the task touches, the plan says which task satisfies it and how. List these rows under the approach, each with its task.
3. A `Cn` that the plan cannot satisfy is a `Warning:` line under `## Approach` that names the `Cn` and says why. Never skip it without a word. In the plan-check stage: an applicable `Cn` with neither a task that satisfies it nor a `Warning:` line is a Patch finding.
4. For a row marked `satisfied by <path>`, read that file. Do not derive the shape again.
5. Read BACKLOG (Vision, Now, Next): context, never scope. A later row may make you choose a shape that will not need undoing. It never adds a task. Never read Later.
6. Read `docs/curator/PRODUCT.md` and `docs/curator/TECH.md`.
7. Use the words of `docs/curator/CONTEXT.md` in the approach and in the task titles. Take `_Avoid_` literally. When CONTEXT and the real code clearly disagree, write a `Warning:` line under `## Approach` that names both. Never rename without a word.
8. Plan only this task. No nearby improvement and no task for a later row. A missing cross-task rule is a `Warning:` line that names it.
9. Never write a `Bn`, `Cn`, `Dn` or `Qn` into the plan as a new item, and never edit `docs/curator/DIRECTION.md`. Only a `Cn` that already exists may be named, as a reference.

## Permitted actions

Read the files under `docs/curator/`. Do not change any file under `docs/curator/`; the Curator updates them at the end of the run. Do not ask the user.
