# Measurement

How to measure the shape of the changed code with `measure.py`, and how to read its output. The
limits are in rule 3 of `rules.md`.

## The command

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/clean-code/measure.py" <paths> --changed --base <base> --compare
```

`${CLAUDE_PLUGIN_ROOT}` is the folder of this plugin. Run it from the repository root.

- `--changed`: measure only the files that differ from the merge-base with `--base` (default
  `origin/main`), and the untracked files.
- `--compare`: measure the same files a second time at the merge-base (or at `--compare <ref>`), and
  judge each function and each file on its own. Put the paths before `--compare`, or the first path
  is read as its ref.
- `--at HEAD`: measure the committed files, not the working tree. `--changed` then lists only the
  committed changes, with no untracked files. Use it when other work may be uncommitted in the
  same tree, or to measure a commit that is not checked out (`--at <sha>`).
- `--legacy`: code that was already over a limit may grow with no finding. See "Legacy code".
- `--all`: also show the rows that are not findings (`still-over`, `new`).
- `--max-lines`, `--max-test-lines`, `--max-cc`, `--max-params`, `--max-file-lines`,
  `--max-depth`: other limits. A project that changes them writes that into its `CLAUDE.md` or
  `AGENTS.md`, not only into one command line.

The script measures `.py`, `.ts`, `.tsx` and `.java` files. The thresholds are the defaults in
`shape.py`; rule 3 of `rules.md` states them. A test function is a function in a file named
`test_*.py`, `*_test.py`, `conftest.py`, `*.test.ts(x)`, `*.spec.ts(x)`, `*Test.java`,
`*Tests.java` or `*IT.java`, or under `__tests__/` or `src/test/`.

## Exit codes

Exit code 0 means it measured, also when no file matched (the tables then have `0 rows`). Exit code
2 means a usage or input error, with the message `measure.py: <what went wrong>`. Any exit code other
than 0 is a broken measurement. Its message is the first error line of the output. For a Python
traceback, it is the last line.

## The output

- The `COMPARE` tables: one row per function and per file that has a verdict.
- `SUMMARY`: the counts of the files after the change.
- `BEFORE`: the same counts at the merge-base.
- `VERDICT`: the last line, the count of each verdict, for example
  `VERDICT new_over=0 crossed=0 grew=1 fixed=0 file_new_over=0 file_crossed=0 file_grew=1 suppressions_up=0`.

## The verdicts

| Verdict | Meaning | What to do |
|---|---|---|
| `new-over` | A function or a file that the change created is over a limit. | Split it. |
| `crossed` | A function that the change touched crossed a limit it was under, or a file crossed the file limit. | Split it. |
| `grew` | Over before and after, and a measure that is over went up. For a file: over the file limit, and longer. | Say why in one sentence, and what the split would be. |
| `suppressions-up` | A file has more suppressions than before. | Each new one has its reason on its line, or it goes. |
| `fixed` | It was over, and it is now under every limit. | Report it. |
| `still-over` | Over before and after, not worse (only with `--all`). | Context, not a finding. |
| `new` | A new function under every limit (only with `--all`). | Nothing to do. |

A function is matched by file, name and its position among the functions of that name in the file.
So a renamed function shows as a `new-over` or `new` row, and its old name has no row: read the
diff before you call it new, and judge it against the old function.

## Legacy code

With `--legacy`, growth that stays over a limit that the code was already over is not a finding: a
function that `grew` shows as `still-over`, and a file that grew drops out. `new-over`, `crossed` and
`suppressions-up` stay findings.
