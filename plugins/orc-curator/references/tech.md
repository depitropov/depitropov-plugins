# Tech — the rules for TECH.md

> Rules only. The file is `docs/curator/TECH.md`. The shape is the template `templates/TECH.md`.
> It is a thin index of what the system must do and what it is built on. Keep it to 50 lines or less.

## The capabilities

Each row is one dimension. Write a row only when it is settled. Delete a row that does not apply.

| Need | Shape |
|---|---|
| runs as | CLI, web app, service, library |
| deploys to | where it runs in production |
| persists | what state, and where |
| integrates with | the external systems it must talk to |
| authenticates | how |
| hard constraints | offline, scale, latency, compliance |

## The spine

The few choices that all else rests on. The **minimum spine** is the choices without which the first
file cannot be written: the language, the runtime and the test runner. It also holds one line: architecture style, citing a `hard:` `Dn`.
Module boundaries are contexts in `GLOSSARY-MAP.md`, never paths.

## One place

Each dimension lives in one place.

| Outcome | Where it goes |
|---|---|
| settled | a row in `TECH.md` and a `Dn` in `DECISIONS.md` for the why. The row cites the `Dn` |
| not settled | a `Qn` in `QUESTIONS.md` |
| does not apply | nowhere |

Never write one dimension to both `TECH.md` and `QUESTIONS.md`. `TECH.md` has no `decided` column.

## The evidence gate

| Evidence | What you may write |
|---|---|
| no code | the minimum spine only. All else is a `Qn`. Pick no persistence, auth or deploy target before one acceptance criterion needs it |
| existing code | what the code already settles. Remember: a transcription has no `Dn`, because nothing was decided. A transcribed choice invents no row |
| a call the user just made | the full record: the what in `TECH.md`, the why in `DECISIONS.md` |

## Never

- Never write a layer or where a convention lives. It is never a path: a wrong path gives no error. Search the tree.
- Never copy a convention into this file. It lives in `CLAUDE.md`, `.claude/rules/` or a skill.
- Never write a `Cn` or a backlog row here.
