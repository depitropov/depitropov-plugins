---
name: setup
description: Use when a project has no docs/curator/ yet — "set up the curator", "what are we even building" — or when orchestra run asks for the Curator's setup. Creates docs/curator/ from the templates and records the present once: on a project with code it transcribes the tech and asks about what the product is, who it is for, why it exists and what it deliberately is not. It writes no decision, no row and no constraint, and it ends with a nudge to /wayfinder.
---

# Curator setup

You record the **present** of the project, once. You write what is true today: never code, never a
brief, never a plan, never a direction. You run in the main session and may ask the user.

`<plugin>` is the folder two levels above this skill's folder.

## Step 1: Inputs

- **From orchestra, on its own branch:** the input `done` (`docs/curator/.setup`) and the path of the
  result file. Work in the worktree that the prompt names, on the branch `curator/setup`. The user is
  in the session.
- **By hand**, or from `orchestra:run` on the default branch: nothing, or an idea. An idea is not
  recorded here. Keep it for the nudge in Step 6.

Setup never runs inside a feature run, so there is no task.

## Step 2: Bootstrap

1. For each of `BACKLOG.md`, `PRODUCT.md`, `DIRECTION.md`, `DECISIONS.md`, `QUESTIONS.md` and
   `TECH.md`: when `docs/curator/<FILE>` does not exist, copy `<plugin>/templates/<FILE>` there.
   Never overwrite a file that exists. Do not copy `GLOSSARY.md`: `orc-curator:curate` creates it at the
   repo root on the first domain term.
2. Create `docs/curator/research/` and `docs/curator/maps/`, each with an empty `.gitkeep`, when they
   do not exist.
3. Add the line `.scratch/` to `.gitignore` when it is not there. Create the file when needed.

## Step 3: Already set up

When the flag `docs/curator/.setup` exists, the project is already set up. Step 2 added only the
files that were missing. Write nothing else: no `Dn`, no row, and no step of the present. Commit what Step 2 added, if anything
(`docs(curator): setup`). Say:

"To change the present or the plan, run `curate` with a change in words. To set the direction, run `/wayfinder <topic>`."

When orchestra runs you, write the result `ok` (Step 6). Stop.

## Step 4: The present

A project **has code** when it has source files outside `docs/`. Ignore configuration and lock files.

- **No source files outside `docs/`:** ask nothing. The templates stay as they are. Go to Step 5.
- **With code:**
  1. **Transcribe `TECH.md`** from the code, by `<plugin>/references/tech.md`. Write only what the
     code already shows, and give it no `Dn`: nothing was decided. A dimension the code does not
     show stays out: do not ask about it, do not guess.
  2. **Ask about the present**, by `<plugin>/references/product.md`. Read the README and the code
     first. Ask one at a time, only what the code cannot show:
     what it is, who it is for, why it exists, what it deliberately is not.
     Write each answer to its section of `PRODUCT.md` as true today. When the user defers a
     question, leave that section empty. Do not invent a row, and do not write a `Qn`.

## Step 5: Commit and the flag

1. Commit what you wrote with `docs(curator): setup`. Nothing to commit is not an error.
2. Write the empty file `docs/curator/.setup` and commit it with `docs(curator): setup done`. Write the flag last: a setup that
   stops before this step runs again.

## Step 6: Result and the nudge

When orchestra runs you on its own branch, write the result JSON to the path that the prompt names:
`{ "status": "ok" }` when the flag is written or already existed. On an error, write
`{ "status": "failed", "reason": "<what failed>" }`.

Tell the user which files you wrote and, on the setup branch, that the docs are on `curator/setup`
until it is merged. Then end with this line, never as a step that you take:

"To set the direction of the project, run `/wayfinder <your idea>`."

When the user gave an idea in Step 1, use it for `<your idea>`.

## Hard gate

<HARD-GATE>
**The present only.** You write what is true today. You write no `Dn`, no row in `BACKLOG.md`, no
`Cn`, no `Qn`, and nothing to `DECISIONS.md`, `DIRECTION.md` or `QUESTIONS.md`. You never invoke `direction`:
the files it reads are empty. You do not explore, you do not research and you do not
compare products. Only the user starts `/wayfinder`.

An unknown stays unknown. Only `curate` writes a `Dn` or a `Qn`.
</HARD-GATE>

## Permitted actions

Write files under `docs/curator/` only, plus the line in `.gitignore` and the result file that the
prompt names. Do not change other files. Do not push.
