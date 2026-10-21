# [domain name]

> **The ubiquitous language of the project:** the words in which this domain is discussed, specified,
> planned and coded. The file is `GLOSSARY.md` at the repo root and is committed. A vocabulary that only one
> person can see is not ubiquitous.
>
> **A glossary and nothing else.** No implementation detail, no schema, no class names, no decisions.
> The *why* behind a choice is in `DECISIONS.md`. What the product is, is in `PRODUCT.md`. This file is
> the dictionary in which those are written.
>
> **Only terms that belong to this domain.** Retries, caches, timeouts and error types are concepts
> that any project has. They do not belong here, however much this project uses them. Before you add
> a term, ask: *would another project in another industry have this word?* If yes, leave it out.
>
> **Be opinionated.** When several words compete for one concept, pick the winner and put the losers
> under `_Avoid_`. A glossary that records the doubt and does not resolve it has done nothing.
>
> **Entries are edited in place.** The decision log is append-only. This file is not: it is a live
> picture of the language *as it is now*. When a term is renamed, rewrite the entry and put the old
> word in `_Avoid_`. That makes a change of mind free. Delete an entry when its concept leaves the
> code.
>
> **Nothing blocks on this file.** A word that is not in here is at most a flag, never a refusal.

[One or two sentences: what this domain is and why it exists.]

## Language

<!--
**Order**:
A customer's committed request for goods, priced and frozen at submission.
_Avoid_: Purchase, transaction

**Cancel**:
Withdrawing an Order before dispatch. After dispatch it is a Return, not a cancel.
_Avoid_: Void, delete

**Customer**:
A person or organisation that places Orders. Distinct from the User, who holds the login.
_Avoid_: Client, buyer, account
-->

<!-- Group under ### subheadings when natural clusters appear; a flat list is right until then. -->
