---
name: review-comments
description: Reviews the comments and Javadoc of the changed Java code against the comment contract, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Comments review

## Inputs

- `spec`: the brief. Read it only for the scope of the task.
- `base`: the commit before any work.
- `notes`: the run's notes folder. Your findings file goes here.
- `decisions` (optional): the human's answers.

## Procedure

1. Get the change: `git diff <base> HEAD -- '*.java'`. Read each changed file in full. If the change
   has nothing in scope, write the result with `"status": "skipped"` and stop.
   Run the tier-1 sweep below on the changed files. Each hit is a finding under rule 2, 3 or 4.
   Then run the tier-2 sweep. A tier-2 hit is only a hint: judge it against rule 4, because the
   same tokens name real things (a garbage collector, a chip).
2. Check the lines this change adds or edits against each rule below. Code the change does not touch
   is not in scope.
3. The project's code wins. When the untouched code of the same kind in this project does it another
   way, follow the project: that rule is not a finding.
4. Each finding names the rule number and `file:line`.
5. Invoke the skill `orchestra:triage` and follow it: give every finding its axes and one bucket.
6. Write `<notes>/comments.md` in the triage notes format.
7. If there is an open Decide finding (one that `decisions` does not answer), stop here. Do not fix
   anything. Write the result with `"status": "decide"`.
8. Otherwise fix every Patch finding and every answered Decide. Your fixes must not change
   behaviour. Run only the tests of the files you changed. Never pipe a test command: the pipe hides the exit code. Commit once:
   `fix(comments): <summary>`. orchestra commits `notes` itself: do not stage files under `docs/runs/`
   or `tmp/`. Do not review your own fixes again.

Not yours: logic, structure, log statements, layout and test style. Other gates own them.

## Result

Write to the path given in the prompt:

```json
{
  "stage": "comments",
  "status": "ok",
  "decide": [],
  "counts": { "decide": 0, "patch": 2, "evaluate": 0, "noise": 1 },
  "evaluate": [],
  "files": ["<notes>/comments.md"]
}
```

`status` is `ok`, `decide`, `skipped` or `failed`. `evaluate` lists every Evaluate finding as one
line with `file:line`.

## Permitted actions

Edit code and tests. Run tests. Commit. Do not push. Do not change branches. Do not ask the user; a
question goes into `decide`.

## Rules

A comment carries what the code cannot. A comment that a reader can derive from the code below it is
a second copy of the code that no compiler checks. A wrong comment is worse than none: misleading
text costs about 23% of code-reasoning accuracy, and correct comments raise automated bug-fix
accuracy up to three times. The bar is accuracy, not volume.

1. **Every comment says one of five things.** If it says none of them, delete it.

   | Kind | Says |
   |---|---|
   | Constraint | An invariant or bound the code must not break |
   | Reason | Why this way, and what breaks with the obvious way |
   | External fact | Library, driver, database planner, spec or upstream behaviour not visible in this file |
   | API contract | Public Javadoc: what a caller passes, what it gets, what it must handle |
   | Expiry | This construct is temporary: what must be true before it is deleted |

2. **Describe state, never change.** No `now`, `no longer`, `was X before`, `used to`. Git holds the
   history. A comment that describes a diff is wrong after the next change. A regression guard names
   the broken behaviour it prevents, in the present tense. During a migration, the system being
   replaced still runs: what it does is an external fact (kind 3), in the present tense.
3. **No plan coordinates.** `T4.2`, `R5`, `Step 6`, `AC3`, `Phase 3` resolve only against a plan the
   reader does not have. A Jira key is fine: it is stable and resolvable. The test is whether the
   reference survives: a decision-log entry that is never renumbered is fine; a task ID from a plan
   that is archived on delivery is not. Write the fact, and cite the reference after it.
4. **Bare plan shorthand** (`G1`, `R-9`, `D4`, `M1`, `WS2`, `E1`) is a plan coordinate too, when the
   context shows it is one. The same token can name a real thing (`G1` garbage collector, `M1` chip,
   `D3` library, `R2` bucket): then it is not a finding.
5. **Never invent a reason.** A reason that the code, the brief or the commit history cannot back is a
   finding. Delete the reason; keep any fact the comment holds. A plausible wrong reason is the most
   expensive comment there is.
6. **Delete on sight:**
   - anything that restates the line below it;
   - section banners (`// ---- Helpers ----`): extract a method instead;
   - leaked reasoning (`// Now we need to handle the case where...`);
   - commented-out code;
   - Javadoc that re-spells the method name (`/** Gets the name. */`);
   - `@param` and `@return` lines that repeat the signature and add nothing.
7. **In tests, comment the trap the test guards, never the fixture it builds.** The builder is
   readable; the reason the fixture has that shape is not.
8. **A comment matches the code next to it.** Code that changed with its comment left behind: update
   or delete the comment. A cross-file fact (a fixture ID, a seeded row) is cited exactly, or not at
   all.

Examples.

Reason plus external fact. Delete this, and the next reader turns the literal into a bind parameter
and loses the index:

```java
/**
 * The status is spelled as a literal rather than bound: this query runs on every tick, so the
 * driver switches it to a server-side prepared statement with a generic plan, and under a generic
 * plan the planner cannot prove a bound value satisfies the partial index predicate.
 */
```

Constraint that an innocent refactor would break:

```java
// a LinkedHashMap because the sort below is stable and its keys can tie, which makes the query's
// ordering the final tiebreak — a HashMap would randomize it
```

API contract that names the failure mode, not the signature:

```java
/**
 * Returns at most {@code topGroups} pending groups, most urgent first.
 *
 * <p>A group whose oldest pending message was created before {@code promotedBefore} outranks every
 * non-promoted group regardless of its priority, so a steady stream of urgent groups cannot starve
 * a low-priority one for longer than that threshold.
 */
```

Plan coordinates plus a change description (rules 2 and 3), then the same comment as state and reason:

```java
// R5 (T4.4): a 4xx create error is now terminal — surfaced as NonRetryableException so the
// P6 activity predicate does not retry it. (Was a bare BusinessRuleException before R5.)

// a 4xx create is terminal: the retry predicate lets NonRetryableException through, so a
// malformed payload fails fast instead of burning the retry budget
```

In a test (rule 7):

```java
// bad — narrates the lines below it
// create three low priority messages and one urgent one

// good — states what would break without this test
// only the two oldest aged groups are promoted; without the cap all five would rank first and the
// urgent group would not make the tick at all
```

Sweeps. Run them on the changed files only:

```sh
TIER1='(\b(AC[0-9]+|T[0-9]+\.[0-9]+|P[0-9]+|Step [0-9]+|Phase ?-?[0-9]+|is now|no longer|was previously|used to)\b|\bR-?[0-9]+:)'
TIER2='\b([GMBEDRT]-?[0-9]+|WS[0-9]+|concept [0-9]+)\b'
git diff --name-only --diff-filter=d <base> HEAD -- '*.java' | xargs -r grep -nE "^\s*(//|\*).*${TIER1}"
git diff --name-only --diff-filter=d <base> HEAD -- '*.java' | xargs -r grep -nE "^\s*(//|\*).*${TIER2}"
```

A hit on a line this change did not add or edit is out of scope.
