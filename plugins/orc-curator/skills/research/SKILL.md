---
name: research
description: Grounds a question in checked evidence and writes the complete research to one note per topic in docs/curator/research/. A tool, not a step — the topic comes from the caller (shape-tech, shape-product or direction hand over what reading and asking could not settle); it never looks for topics of its own. Two methods — deep when the approach is chosen and you must know what it demands, wide when the options are open (list them, fix the comparison axes, one agent per candidate, rank at the end). Also by hand — "research X", "how do people build Y", "what does Z really demand" — and then the note is the only output. It gathers evidence and never decides — no DECISIONS, TECH, DIRECTION or QUESTIONS rows.
---

# Research

You change "we do not know enough to decide this" into **checked evidence**: one note per topic,
complete enough to read on its own, with the recommendation first and, next to it, the claims that
died when you checked them.

**You are a tool with a narrow job.** You decide **how** to research, and you may **decline**. You
never decide **what**: no search for topics, no scan for candidates, no shortlist to confirm. A
caller holds a decision open while it waits for you. A run that researches something else leaves it
with the same guess that it invoked you to avoid.

**And you never decide the answer.** Evidence and decision are two acts, and only the second needs an
authority that you do not have. You cannot know what the user will pick, what they will discard, or
how `TECH.md` must read after it. So you write the note, give the findings back, and the caller
records them.

You run in the main session, so that you can start agents in a `wide` run.

`<plugin>` is the folder two levels above this skill's folder.

## Step 1: Prepare

When `docs/curator/` does not exist, tell the user to run `orc-curator:setup` first, write nothing,
and return `Result: blocked`.

When `docs/curator/research/` does not exist, create it.

## Step 2: The inputs

| Input | Who gives it | When it is missing |
|---|---|---|
| **the topics** | the caller: this is the mandate | by hand: what the user asked. Neither: ask once what to research, and stop when there is no answer. **Never pick a topic for yourself.** |
| **mode**: `wide` or `deep` | the caller, or the user by hand | infer it (Step 3). The caller usually knows if the options are open: that is why the caller sets it |
| **budget**: a number | the caller | a small default: `wide` at most 4 candidates, `deep` at most 6 sources. A "quick look" with no limit is how twenty fetches happen |
| **project context** | the caller | read `docs/curator/PRODUCT.md` and `docs/curator/TECH.md` |
| **the axes that matter** (`wide`) | the caller, when it knows them | you fix them yourself in beat 2 |

**Several topics give several notes.** "Which ORM" and "which API doc tool" share no sources, no
reasoning and no conclusion. Keep them apart from here on, and never put two in one file: then
neither can be superseded later without a change to the other.

**Do not go hunting.** Do not read `docs/curator/QUESTIONS.md` for candidates, and do not read a
brief or a plan to find gaps. Finding topics is the work of the caller.

## Step 3: Accept, decline, or pick the method

**Read `docs/curator/research/` first.** When a note already covers this topic, either supersede it
(say so, and fill `Supersedes:` in the new note) or give its path and stop. Two notes on one question
is how a project gets two answers.

**Decline when the topic cannot be researched.** Say so plainly, name the ground, and write nothing:

| Ground | What to say |
|---|---|
| it is a **preference**: it depends on what the user wants, not on how the world works | "this is a question for the user, not for the web". The rule is `<plugin>/references/ask-vs-research.md` |
| it is **already settled** in `docs/curator/DECISIONS.md` | cite the `Dn`. When the caller wants to reopen it, that is a new decision, not a research run |
| it is **already covered** by a note that still holds | give the path |

To decline is cheap and correct. Research on a preference gives a sure answer with the name of the
user on it and their intent nowhere in it.

**Then pick the method**, when the caller did not:

| The question looks like | Mode |
|---|---|
| "which X do we use", "compare A, B and C", "what are the options": the options are **open** | **wide** |
| "how does X work", "what does X demand of us", "how is X done by the book": the choice is **made** | **deep** |

Say in one line which mode you run and why. The depth is for the caller to set, never for you to
raise: `<plugin>/references/right-sizing.md`, "Research depth".

## Step 4: `deep`: how this thing really works

The approach is chosen. The job is to know what it demands before the first line of code. Do not fan
out: do it yourself, or start one agent for a broad topic.

1. **Primary sources, on the version in use.** A search snippet is not a source. Check what a library
   does against its own docs or repo. A claim about version 3 in a version 2 codebase is worse than
   no claim.
2. **The canonical shape.** How it is done by the book, and where the book says nothing.
3. **Pitfalls and failure modes**: what hurts people, and what it looks like when it does.
4. **One worked reference**, concrete enough to build against.
5. **Try to refute the claims that carry the load.** Attack the claims that the recommendation rests
   on, and **record what died**.

## Step 5: `wide`: what the options are and how they compare

The options are open, and the failure is anchoring: the first good option becomes the
recommendation, and all that comes after is read as confirmation. Four beats, **in this order**. The
order is the mechanism, not a style.

**Beat 1: list the candidates, evaluate nothing.** Name the candidates broadly, up to the budget.
Include the unfashionable ones and the boring ones: the point is coverage, and "what everybody uses"
is a start, not a finding. Do not form an opinion yet.

**Beat 2: fix the comparison axes, before any agent starts.** Four to six dimensions that this
decision really turns on, plus the constraints of the project from Step 2. **This comes before beat
3.** When each agent picks its own axes, nobody can fill the comparison table, because no two
candidates were measured against the same thing.

**Beat 3: fan out, one agent for each candidate.** Start them all at the same time. Each prompt
carries: the one candidate, the fixed axes, the project context, the source rule of Step 4, and the
instruction to **report against the axes and not to recommend**.

> This is the guard against anchoring, and it is in the structure, not in a warning. An agent that
> knows only about Postgres cannot prefer Postgres to options it never heard of. It can only report
> Postgres against axes that it did not choose. The bias is not forbidden: it is not available.

When you cannot start agents, research each candidate in turn against the fixed axes, and do not
form a view before the last one is done. The guard is weaker this way: say so in
`Deviations/Warnings`.

**Beat 4: rank, from the same data for each candidate.** Only now form a view. Fill the
`## Comparison` table of the note, rank the candidates, and say what would change the ranking. Name
the runners-up and what each one wins at. A wide run whose output is one name has thrown away most
of what it cost.

**When the list finds only one or two real candidates, it was not a wide question.** Say so, switch
to `deep` on the option that is left, and report the switch.

## Step 6: Write the note

`docs/curator/research/<YYYY-MM-DD>-<topic-slug>.md`, from `<plugin>/templates/RESEARCH.md`. Fill
`Mode:`, `For:` (the `Bn` or the task this was run for, so that the note is found from the row that
caused it) and `Supersedes:`.

**The complete research goes in the note.** The findings with their confidence, each source, the
comparison table, the refutations, the caveats: enough that a person who reads it cold in three
months needs nothing else. The return block is a pointer and a recommendation, never a substitute. A
note that sums up what you found, and does not record it, must be done again.

**A confidence for each finding.** Say plainly where the evidence is of blog quality.

**Commit.** By hand: `git add docs/curator/research && git commit -m "docs(research): <topics>"`.
When a caller invoked you (`Caller: <name>`), do not commit. The caller commits once.

## Step 7: Report the evidence

**The note is your only file.** All that the caller needs also goes in the return block, for the
caller to record:

| What | Why it is important to the caller |
|---|---|
| the **recommendation**, one line for each dimension | the caller takes it to the user to pick |
| the **ranking with the runners-up** (`wide`) | the user chooses; one name takes the choice away |
| what you **refuted**, and what killed it | often worth more than the confirmed half: it is the wrong thing they were about to build |
| what you **could not settle**, one line each | the caller writes the `Qn`; you write none |
| the note path | the `Refs:` of the rows that the caller writes |

**Write no rows: not a `Dn`, not a `TECH.md` line, not a `Cn`, and not even a `Qn`.** Each one is a
decision or the record of one, and that authority belongs to the skill that sits with the user. One
rule, with no exception: an open question looks harmless to file, and it is the first step of
deciding.

**The duty moved with the authority.** A run whose findings nobody records was still wasted, but that
failure is the caller's. Your failure is a note that hides its recommendation or skips the
refutation.

**By hand, there is no caller, so nothing is recorded.** Say so plainly: the note is written, here is
the recommendation, **no decisions, constraints or questions were filed**, and `orc-curator:shape-tech`
(a tech call) or `orc-curator:direction` (a constraint) turns it into rows. Do not offer to add "just
this one `Dn`". That is the same authority leak in a friendlier voice, and the note is the durable
record in either case.

## Hard gate

<HARD-GATE>
**Research, never build, and never decide.** Write no product code, add no dependency, and write
**no file outside `docs/curator/research/`**: not `DECISIONS.md`, not `TECH.md`, not
`DIRECTION.md`, not `QUESTIONS.md`, not a brief, not a plan. `shape-tech`, `shape-product` and
`direction` record what is decided, and `curate` keeps it.

**Never choose your own topic.** No candidate lists, no scan of `QUESTIONS.md`, no "while we are
here". With no topic, ask once and stop.

**Never research a preference.** When the answer depends on what the user wants and not on how the
world works, decline and say who to ask.

**Never let a `wide` run collapse into a `deep` one on the first good option.** Beats 1 and 2 end
before beat 3 starts. A fan-out with no fixed axes, or a ranking before each candidate has reported,
is the anchoring that this method exists to prevent.

**Never report a claim that you did not check against a primary source.** The confidence levels are
part of the result, not decoration.
</HARD-GATE>

## End of run

**The return block is the LAST thing in your reply:**

```
Result: ok | blocked | needs-input
Wrote: <note paths, and nothing else, by design>
Mode: <deep | wide (N candidates against M axes)>
Summary: <10 lines or fewer, one for each topic>
Recommendation: <one line for each dimension: what the caller takes to the user to pick>
Ranking: <wide only: in order, with what each runner-up wins at>
Refuted: <one line each, or "none">
Could not settle: <one line each, or "none": the caller writes these as Qn entries>
Recorded: <"by <caller>" | "nothing: run by hand; run orc-curator:shape-tech or orc-curator:direction to file it">
Deviations/Warnings: <or "none">
```

`blocked` when Step 3 declined: **name the ground in `Deviations/Warnings`**, with the `Dn` or the
note path when that was the reason. Also `blocked` when `docs/curator/` does not exist.
`needs-input` when there is no topic. `ok` when each topic has a note.

**A decline has no Result value of its own.** A declined topic *is* blocked by design; the ground is
the part that is important. A question that is not settled is **not** `blocked` either: it goes on
its own line for the caller to file.
