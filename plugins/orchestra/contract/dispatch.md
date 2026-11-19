# Dispatch

Every subagent that orchestra dispatches reads this file first.

## Inputs

- `decisions`: the answers of a person to earlier questions. Optional. An answer in `decisions` is a requirement: act on it.

## Commands

Never pipe a test or build command through `tail`, `head` or `grep`: the pipe hides the exit code. Write the output to a file, check the exit code, then read the end of the file.

Do not run the full build. Orchestra runs it before the first gate and after the last one. Your skill may say when you may run it.

## Commits

Do not stage files under `docs/runs/` or `tmp/`. Orchestra commits the notes.

## The result

The prompt names the result file. Its `status` is `ok`, or `failed` with a `reason`. Your skill or `judging.md` may add fields and values.

## Permitted actions

Do not push. Do not change branches. Do not ask the user. Your skill says what you may edit and if you commit.
