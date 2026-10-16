# Glossary — the ubiquitous language of the project

> **Shared policy.** Every skill that writes or reads `docs/curator/CONTEXT.md` cites it. It is policy
> only: the format, what earns a term, and the rules for change. When a skill asks about a term is the
> business of that skill.

## The file

`docs/curator/CONTEXT.md`, committed. A vocabulary that only one person can see is not ubiquitous.

**Created lazily.** There is no file until the first term really resolves. An empty glossary is worse
than none: it reads as "this project has no domain language" and not as "nobody has written one yet".

**A glossary and nothing else.** No implementation detail, no schema, no spec, no scratch notes. When
it holds a class name or a design decision, it stops being the dictionary and becomes a fourth place
to look for facts that already live somewhere else.

## Format

The shape of the file is the template `templates/CONTEXT.md` of this plugin. Copy it when you create
the file, and follow it when you add a term. In short: one line that says what the domain is, then
`## Language`, then for each term a bold name, one or two sentences of definition, and an `_Avoid_:`
line that lists the words it beat. Group under `###` subheadings when natural clusters appear. A flat
list is right until then.

## What earns a term

- **Only what belongs to this domain.** General programming concepts (retries, timeouts, caches, error
  types) do not belong here, however much the project uses them. The test before you add a term:
  *is this a concept unique to this product, or one that any project would have?*
- **Only what someone could get wrong.** A term earns its entry when two words compete for it, when
  the obvious reading is the wrong one, or when the code and the people use different words for the
  same thing.
- **Be opinionated.** When several words exist for one concept, pick the winner and list the losers
  under `_Avoid_`. A glossary that records the doubt and does not resolve it has done nothing.
- **Define what it IS, not what it does.** One or two sentences. Behavior belongs in the code.

## Mutation

**Entries are edited in place.** `DECISIONS.md` is a record. This file is a live picture: it says what
the language *is now*. When the language changes, rewrite the entry and put the retired word in
`_Avoid_`. This is the whole defense against a frozen language: to rename a term costs nothing,
because the losing word stays on record, so nothing is lost when you change your mind.

**Delete an entry when its concept leaves the code.** A glossary whose writers only add fills with
words that nobody uses, and then nobody trusts any of it.

## Never a gate

**Nothing blocks on this file.** No skill refuses to go on because a term is not defined, because
`CONTEXT.md` is missing, or because the diff used a word that is not in it. A missing file is a no-op,
everywhere. Drift is **flagged**, never enforced: a reader raises it as a finding that the human can
dismiss. A glossary that can stop work is a glossary that people avoid.

## The four habits

For a skill that *changes* the language and does not only read it:

1. **Challenge a conflicting term.** The user says a word that the glossary already defines in a
   different way. Say so at once. *"Your glossary defines cancellation as X, but you seem to mean Y.
   Which is it?"*
2. **Sharpen a fuzzy term.** Propose the precise canonical term. *"You said 'account'. Do you mean the
   Customer or the User? Those are different things."*
3. **Cross-check with the code.** When the user states how something works, check whether the code
   agrees. Show the contradiction. Do not record the claim.
4. **Write it the moment it resolves. Never batch.** A term that was settled in the middle of an
   interview and written at the end is a term written from memory, and half of them do not survive.
