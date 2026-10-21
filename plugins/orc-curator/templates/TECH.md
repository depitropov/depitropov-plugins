# Tech — index

> What this system must do and what it is built on, and nothing else. The conventions themselves live
> on the native surfaces of Claude Code (`CLAUDE.md` files, `.claude/rules/`, skills). There they load
> at the right time and help *every* session, also for teammates who do not use the Curator.
> **Where conventions live** below says how to find them. This file never copies a rule into itself.
> Keep it to 50 lines or less. If it is turning into a rulebook, the content belongs on a native
> surface.

## Capabilities

> What this system must be able to do. Only **settled** dimensions appear here. Anything that is
> still open lives in `QUESTIONS.md`. There is no `decided` column on purpose: this file lists what is
> true, that file lists what is open, and a dimension in both would be a double write that drifts.
> Delete the rows that do not apply. Do not mark them.

| Need | Shape |
|------|-------|
| runs as | [CLI \| web app \| service \| library \| …] |
| deploys to | [where it runs in production] |
| persists | [what state, and where] |
| integrates with | [external systems it must talk to] |
| authenticates | [how, or delete this row] |
| hard constraints | [offline / scale / latency / compliance, or delete] |

## Spine (committed)

> The few choices that everything else is built on, each with its reasoning in `DECISIONS.md`.
> New project: only what the first file really needs. Existing code: what is really in use.
> A decided choice cites its `Dn`. A transcribed choice states the fact alone, with no `Dn` and no
> invented row.

- [language / runtime] — why in `DECISIONS.md` [`Dn`, if decided]
- architecture style — a `hard:` `Dn`. Module boundaries are contexts in `GLOSSARY-MAP.md`, never paths.
- [test runner] — why in `DECISIONS.md` [`Dn`, if decided]

## Where conventions live

> **The tree is the list.** A table that you keep by hand drifts, and a list of layer paths is old the
> first time a directory moves, in silence, because a wrong path gives no error. Nothing is copied
> here. To list every convention surface:
>
>     git ls-files -co --exclude-standard '*CLAUDE.md' '.claude/rules/*' '.claude/skills/*/SKILL.md'
>
> The `description:` of each file (skills, rules) or its first heading (`CLAUDE.md`) says what it
> owns. Questions of layout, such as where the controllers live or what sits under `src/`, are
> answered by a glob of the tree for today's answer, never by a list in this file.

## Why behind the calls
See `DECISIONS.md`.
