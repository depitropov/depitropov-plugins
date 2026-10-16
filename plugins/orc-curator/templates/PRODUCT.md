# Product

> What this product **is**, for a person (or future you) who forgot the details. Everything here is
> true today. What the product intends to *become* is in `BACKLOG.md ## Vision` until it ships.
>
> **The test for every sentence here: would deleting one backlog row make it false?** If yes, it is
> a feature description in prose, and it belongs in the backlog. "Cook a whole meal" fails the test.
> "Chat is the wrong container for cooking" passes it.
>
> **Never list features.** The code shows what the app does, and a list here is old the first time a
> feature lands. What the code does not show is the whole job of this file: who this is for, why the
> gap exists, why the product has its shape, and what it refuses to be.
>
> **Set a budget for each section, not for the file.** `## Why it's shaped this way` can grow: one
> line per product call, for as long as the product lives. A cap on the whole file would one day
> force you to delete a real reason to meet a number. So: the first three sections are one paragraph
> each, `## Core use cases` is 3 or 4 lines, `## Comparable products` is 2 to 4 entries, and every
> reason or non-goal is **one line that cites its `Dn`** and does not repeat it. If the file is
> longer than about 120 lines, something has stopped obeying these rules. It is almost never the
> reasons. Look first at a use-case list that has grown into a feature list.

## What it is
[One paragraph, plain language. No class names: the idea, not the implementation.]

## Who it's for
[The user or the audience.]

## Why it exists
[The problem it solves. What was painful before.]

## Core use cases

> **Optional, not complete, 3 or 4 lines at most.** A quick reference for a reader who wants the gist
> and does not want to read the code. Nothing reads this section and nothing must match it. Empty is
> a valid state. The reasons below carry the weight. If this section grows into a feature list, cut
> it back: the code already says that, and such a list is what made this file untrue before.

- [Optional. The two or three things people mainly do.]

## Why it's shaped this way

> **Product reasons that the code cannot show.** The code shows that every operation is a button.
> Only this file can say that cooks did not want to talk to an LLM. Curate and
> `orc-curator:shape-product` write these. Write them as they come up, and **cite the `Dn` row and
> do not repeat it**: the decision log owns the history, and this file owns the readable picture of
> today.

- [The shape, then the reason. For example: "Everything is a button. Cooks do not want to prompt, and
  a fixed vocabulary needs no prompting skill. Chat is the way out for rare cases (D2)."]

## Deliberately not

> Non-goals, one line each, with the `Dn` that settled them. They earn their place *because* you
> cannot infer an absence: a feature that nobody built and a feature that was refused look the same
> in a codebase. Do not argue the decision again here. Link it.

- [What it is not, and the `Dn`.]

## Comparable products

> What else solves this problem, and what we take from each or avoid on purpose. The goal is not to
> copy. The goal is to decide with open eyes. 2 to 4 entries are enough.

- [**Product**: what they do well / where they fall short / the one thing we take or avoid on purpose]
