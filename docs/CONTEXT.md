# Context

The glossary of this project. Use these names and no others.

| Term | Meaning |
|---|---|
| **Orchestrator** | The `orchestra` plugin and its single entry, `orchestra:run`. It reads the per-project config, resolves each slot, runs the driver loop and the gate runner, and owns `orchestra check` and `orchestra:init`. |
| **Workflow** | Takes one task to reviewed, committed code. Its `next.js` fixes the stage order and says when each phase runs. It can declare its own stack-free gates. |
| **Curator** | The plugin in the optional `curator` slot (`orc-curator`, S76). Keeps the project's direction docs in `docs/curator/` current: backlog, product, direction, decisions, questions, glossary, tech. Its `setup` records the present and nudges to `/wayfinder`; it runs when its flag is missing. Its `curate` takes a diff (at a run's `done`), a map (a landing) or a change in words. Navigation is `/wayfinder`. Its skills also work by hand. |
| **Navigation** | Making the unknown known: exploring, researching, prototyping and deciding. Done with mattpocock `/wayfinder`, never by the Curator (S79). Its opposite is curation: keeping the known true while the code moves. |
| **Burst** | One short round of navigation with a narrow destination: a kick-off, a big feature, a redesign, or a turn whose answer is unknown. The user starts it; its map lives in `.scratch/<effort>/` until landing (S79). |
| **Landing** | `curate` reading a finished burst's map and writing its results into the Curator's docs: decisions, backlog rows, scope cuts, open questions. The map then moves to `docs/curator/maps/<effort>/` (S79). |
| **Stack Skills** | The plugin in the `stack-skills` slot (formerly SSK, Specific Stack Knowledge). The rules for one stack (for example Java): its build, its gates, its fix guides and its plan and code guides. |
| **Global gates** | The plugin in the optional `global-gates` slot (`orc-global-gates`, S80). It declares the gates that every workflow gets, such as `clean-code`. Such a gate reads only what every workflow gives, never a workflow's own files. |
| **PSK** | Project Specific Knowledge. Rules for one project that can override the Stack Skills, including the build. Not defined yet. |
| **Slot** | A named place in the config that one plugin fills, for example the `stack-skills` slot. |
| **Declaration** | The `orchestra.json` a slot plugin ships. Data only: its slot, config keys, gates, and for Stack Skills its build and guides. |
| **Resolution** | The first step of a run. `orchestra:run` invokes each slot plugin's `manifest` skill and writes the declarations, folders and versions to `.orchestra/resolved.json`, which git ignores. Then it runs `orchestra check` on the config, so a bad config stops the run before any subagent. |
| **Dry run** | The rule of `orchestra check` that starts a workflow's real `next.js` with a task in a throwaway git repo and checks the first action it prints. |
| **Driver loop** | The loop in `orchestra:run` that runs the workflow's `next.js` and acts on each printed action. |
| **Phase** | One of three standard groups of gates, in this order: `implementation-check` (is it correct and sound), `conventions-check` (does it follow our conventions), `finish` (cosmetic changes, then the final build). |
| **Gate** | One check that runs in a phase. It is a `tool` (a command) or an `agent` (a skill run by a subagent). The workflow, the global-gates plugin or the Stack Skills declares it. The declarer owns its command, selection, fix guide and round limit. |
| **Gate runner** | The orchestra code that runs one phase: selects the gates, orders them, runs them, loops the fixer, and returns `ok`, `decide` or `failed`. |
| **Build** | The full build and test run with coverage. A required declaration of the Stack Skills, not a gate. The gate runner runs it first in `implementation-check` and last in `finish`. |
| **Measure** | An optional declaration of the Stack Skills: a command that measures the shape of the changed code against the run's base commit, and a skill with the stack's clean-code rules. A gate that asks for it gets both as inputs. |
| **Fixer** | The orchestra subagent that fixes a failed tool gate. It uses orchestra's generic fixer procedure plus the gate's fix guide. |
| **Fix guide** | A skill, owned by the gate's declarer, that says how to fix one tool's findings. |
| **Triage** | Sorting each finding of a judging stage or an agent gate into Decide, Patch, Evaluate or Noise. The contract is the skill `orchestra:triage`. |
| **Role** | What a workflow stage does, from a fixed list: `spec`, `plan`, `code`. A workflow declares its roles and tags each dispatch with one. Guides are given by role (S76). |
| **Guide** | A file with short write-time rules for one role, inside a slot plugin and declared by its path under `guides.<role>`. orchestra tells the stage to read the guides for a dispatch's role, by absolute path (S76, S79). |
| **Run folder** | `tmp/runs/<branch>/`. The orchestration state of one run: results, checkpoints, logs, `run.json`, `stages.json`. Git-ignored. Inside the run root. |
| **Notes folder** | `docs/runs/<branch>/`. What a human reads about one run: `task.md`, `brief.md`, `plan.md`, `decisions.md`, review notes, `report.md`. Committed. Inside the run root. |
| **Worktree** | The git worktree of one run, `.orchestra/worktrees/<branch>`. Git-ignored. Removed when the run is done; the branch stays. |
| **Project root** | The user's checkout. orchestra reads `.orchestra/` there and never switches, commits in or edits files of the checkout. |
| **Run root** | The run's worktree. Every stage, gate, build and commit of the run happens there. |
