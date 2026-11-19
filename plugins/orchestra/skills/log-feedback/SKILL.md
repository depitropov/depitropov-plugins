---
name: log-feedback
description: Use when the user notices something off in any session — a bug, a bad design, a rule a gate missed, a thought about the process — and wants it logged as a feedback note for orchestra's plugins or a project.
---

# Log feedback

You turn one observation into one self-contained note. A later session, with no memory of this one,
reads the note, finds where the rule belongs and proves it with an eval. So the note carries the
rule, the evidence and the expected result. It works in any repo, with or without orchestra.

## 1. Collect

1. Take what the user describes. When the user describes several problems, write one note for each.
2. Collect the evidence from the repo yourself: the project's absolute path, the repo name, the
   branch, the commit or commit range, the PR link when you can find it, the file paths.
3. Copy the code into the note. For a code problem: the relevant code before the change and the bad
   diff. The note must not depend on the branch still existing. Copy only what the problem needs,
   but do not cut it short to save space.
4. A problem with no code (a build fact, a config fact) gets the fact and the file where it shows.
   Never invent code to fill the section.
5. Replace every secret in what you copy (keys, tokens, passwords, connection strings) with
   `<redacted>`. The note may later be committed.
6. Read `.orchestra/resolved.json` when it exists: the plugin in each slot and its version. When it
   does not exist, the origin says "no orchestra plugins".
7. Ask the user only for what you cannot find: usually the expected result, sometimes the origin.

## 2. Write

Write the note outside the repo: in the session's scratch folder when the harness gives one, else in
the system temp folder. Name it `<YYYY-MM-DD>-<slug>.md`. Use this template:

````markdown
# <the rule in one line> (<repo>, <ticket when there is one>)

## The rule

- **What to look for:** <the concrete signs in code or in a plan>
- **Why it is a problem:** <what goes wrong, and for whom>
- **What to do instead:** <the rule, in numbered steps when there are several>
- **What is not this issue:** <the cases that look alike but are fine>

## The evidence

- Project: <absolute path>, repo <name>, branch <branch>, PR <link or none>, commits <range>
- Files: <paths>

<the code before the change, and the bad diff, in fenced blocks>

**Expected result:** <what a correct review or a correct implementation does with this code>

## The origin

<a manual review, a normal session, or an orchestra run. For a run: the branch, the notes folder
`docs/runs/<branch>/`, and the step or gate that let the problem through, when known. The plugins
from `.orchestra/resolved.json`, with versions, or "no orchestra plugins".>

## Proposed level

<one of `project`, `stack`, `workflow`, `core`, `process`>: <one line of reason>
````

The levels: `project` is a rule of this project only; `stack` is a rule of one language or framework;
`workflow` is how a step works; `core` is a rule for every workflow and stack; `process` is about
orchestra itself. The level is a proposal; `process-feedback` decides.

## 3. Report

Show the full path of each note. Commit nothing, and change no file of the repo.
