# Product — the rules for PRODUCT.md

> Rules only. The file is `docs/curator/PRODUCT.md`. The shape is the template `templates/PRODUCT.md`.
> It says what the product is, for a person who forgot the details. Everything in it is true today.

## The test

For every sentence, ask: would deleting one backlog row make it false? If yes, the sentence is a
feature description. Move it to `BACKLOG.md`. Never list features: the code shows what the product
does, and a list is old when the next feature lands.

## Where an answer goes

| What you found | Where it goes |
|---|---|
| The one-line summary and the core value | `PRODUCT.md`, `## What it is` |
| The target user | `PRODUCT.md`, `## Who it's for` |
| The problem | `PRODUCT.md`, `## Why it exists` |
| A behaviour that exists now | `PRODUCT.md`, `## What it is`: one overview paragraph, never a feature list |
| A behaviour that is not built yet | `BACKLOG.md`: the story in `## Vision`, one row under `## Next` |
| Why the product has its shape | `PRODUCT.md`, `## Why it's shaped this way`: one line, cite the `Dn` |
| A non-goal | `PRODUCT.md`, `## Deliberately not`: one line, cite the `Dn` |
| What is in scope | nowhere: the `Now` and `Next` rows are the list |
| A comparable product | `PRODUCT.md`, `## Comparable products`: written by hand, or by `curate` from a landed map that names comparable products |

## Budgets

Set the budget for each section, not for the file.

- The first three sections are one paragraph each.
- `## Core use cases` is optional: 3 or 4 lines, or empty. Nothing must match it.
- `## Comparable products` is 2 to 4 entries.
- A reason or a non-goal is one line. Cite the `Dn`. Do not repeat it.
- `## Why it's shaped this way` may grow, one line per call.
- A file over about 120 lines breaks a rule. Look first at the use cases.

## Always

- Write at the functional level: no stack, no class name, no schema.
- Write in the words of `GLOSSARY.md`.
- Keep a retired idea out of this file. The history is in `DECISIONS.md`.
- Do not argue a decision again here. Cite its `Dn`.
