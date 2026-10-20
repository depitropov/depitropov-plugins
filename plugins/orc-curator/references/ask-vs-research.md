# Ask the user, or research it?

> **Shared policy.** `shape-product`, `shape-tech` and `research` cite it. It is policy only: no
> flow. Each skill keeps its own questions. This file only says **who can answer** one.

For each gap, decide who can answer it. A wrong choice costs much in both directions. If you research
a preference, you get a sure answer with the name of the user on it and their intent nowhere in it. If
you ask about the world, you get a guess that looks like a requirement.

| Type of question | Source |
|---|---|
| The intent, preference, taste, business model, audience or strategy of the user | **Ask the user.** Only they know. |
| How comparable products solve this | **Research.** |
| What is standard in a market or category | **Research.** |
| What names or words the space uses | **Research.** |
| What a library, SDK or service really does, on the version in use | **Research**, from primary sources. |
| What users in the category expect by default | **Research**, then check with the user. |
| What the specific users of *this* user need | **Ask the user.** Never generalise from web research. |

## The two failure modes

**Research when you must ask.** If the answer depends on what the user wants, and not on how the
world works, no search can find it. Never web-search around a preference.

**Ask when you must research.** If the question is about how others in the category work, research is
faster and more exact than to make the user say their vague idea of the competitors.

## After the split

A gap that goes to **ask** uses one of your questions. A gap that goes to **research** does not. Use
the skill `orc-curator:research` for it. It gathers evidence and **records nothing**: its caller
writes the rows.

A gap that goes to **research** and is also a one-way door cannot wait for a later session. A one-way
door is a choice where two answers give codebases that cannot cheaply become one another. Stop and ask
the user directly. Each skill names where the result is written.
