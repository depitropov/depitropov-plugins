# Judging

## Who reads this

Every step that judges work and sorts what it finds reads this file.

## The four buckets

- **Decide**: a person must answer it before the run goes on.
- **Fix**: you fix it in this step.
- **Report**: a person should see it. You do not fix it.
- **Noise**: not a real problem.

When the input `shared-role.triage` is given, sort with that skill. Otherwise these lines are the rule. A rule of the skill may name the usual bucket of a finding. That bucket wins.

## Decide stops the step

When any Decide is not answered by `decisions`, fix nothing. Write the notes and the result with `"status": "decide"`.

An answered Decide is Fix: apply the answer.

Put each such question into `decide`.

## The notes file

`<step>` is the name of your step; a gate's is its `gate` input.

Write `<notes>/<step>.md` with these sections, in this order:

1. `## Checked`: each check and its outcome.
2. `## Decide`, `## Fix`, `## Report`, `## Noise`: one line per finding.
3. `## Open questions`: each open Decide word for word, with its options.

A sorting skill may add to each section.

## The result

Write this JSON to the path in the prompt:

```json
{ "status": "ok", "decide": [], "fix": [], "report": [], "noise": [], "notes": "<notes>/<step>.md" }
```

`status` is one of these:

- `ok`
- `decide`
- `skipped`: add `reason`.
- `failed`: add `reason`.

The lines have these formats:

- `decide`: `<question> — options: <a> | <b>`
- `fix`: `<file:line> — <what you changed>`
- `report`: `<file:line> — <what a person should look at>`
- `noise`: `<one line> — <why it does not matter>`

The run reads only this JSON. Keep it equal to the notes.
