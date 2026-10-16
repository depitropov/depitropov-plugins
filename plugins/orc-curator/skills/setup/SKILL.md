---
name: setup
description: Use when a project has no Curator docs yet — "set up the curator", or when orchestra run asks for the Curator's setup. Creates docs/curator/ from the templates. A minimal version; the interview comes later.
---

# Curator setup

You create the Curator's docs in the project. This version copies the templates; it does not
interview the user.

`<plugin>` is the folder two levels above this skill's folder. When orchestra runs you, work in the
worktree that the prompt names, and read `done` from the inputs (`docs/curator/.setup`).

1. For each of `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md`
   and `TECH.md`: when `docs/curator/<FILE>` does not exist, copy
   `<plugin>/templates/<FILE>` there. Never overwrite a file that exists. Do not copy `CONTEXT.md`: `orc-curator:curate`
   creates it on the first domain term.
2. Create `docs/curator/research/` with an empty `.gitkeep` when it does not exist.
3. Tell the user which files you created. Tell the user that the files are on the run's task branch
   (in its worktree) until it is merged, and that they can fill `PRODUCT.md` and the backlog rows
   after the merge, or by hand at any time.
4. Commit the new files: `docs(curator): setup`.
5. Write the empty file `docs/curator/.setup` last, and commit it: `docs(curator): setup done`.
   A setup that stops before this step runs again.
6. When orchestra runs you, write the result JSON `{ "status": "ok" }` to the path the prompt
   names. On an error, write `{ "status": "failed", "reason": "<what failed>" }`.

## Permitted actions

Create files under `docs/curator/` only, except the result file that the prompt names. Do not change other files. Do not push.
