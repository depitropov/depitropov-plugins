# Code guide

Rules for the code stage when the project has `docs/curator/`. When that folder does not exist, do nothing.

1. Name new things (classes, methods, tests, variables) in the words of `GLOSSARY.md` at the repo root. Never use a word that its `_Avoid_` lists.
2. A code comment may cite a `Dn`, a decision of `docs/curator/DECISIONS.md`. Decisions are never removed and never renumbered.
3. Never cite a `Cn`, `Bn`, `Tn` or `ACn` in code or in a comment. Those ids change or go away: a `Cn` is retired, a `Bn` ships, and `Tn` and `ACn` live in a run's notes.

## Permitted actions

Read the files under `docs/curator/`. Do not change any file under `docs/curator/`; the Curator updates them at the end of the run. Do not ask the user.
