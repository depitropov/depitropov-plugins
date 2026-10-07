# Context

The glossary of this project. Use these names and no others.

| Term | Meaning |
|---|---|
| **Orchestrator** | The `orchestra` plugin and its single entry, `orchestra:run`. It reads the per-project config, resolves each slot, runs the driver loop and the gate runner, and owns the schemas and `orchestra check`. |
| **Workflow** | Takes one task to reviewed, committed code. Its `next.js` fixes the stage order and says when each phase runs. It can declare its own stack-free gates. |
| **Curator** | Keeps the project's direction current: backlog, product, direction, decisions, questions. What minions does today. Later phase. |
| **Stack Skills** | The plugin in the `stack-skills` slot (formerly SSK, Specific Stack Knowledge). The rules for one stack (for example Java): its build, its gates, its fix guides and its plan and code guides. |
| **PSK** | Project Specific Knowledge. Rules for one project that can override the Stack Skills, including the build. Not defined yet. |
| **Slot** | A named place in the config that one plugin fills, for example the `stack-skills` slot. |
| **Declaration** | The `orchestra.json` a slot plugin ships. Data only: its slot, parameters, config keys, gates, and for Stack Skills its build and guides. |
| **Resolution** | The first step of a run. `orchestra:run` invokes each slot plugin's `manifest` skill and writes the declarations, folders and versions to `.orchestra/resolved.json`, which git ignores. |
| **Driver loop** | The loop in `orchestra:run` that runs the workflow's `next.js` and acts on each printed action. |
| **Phase** | One of three standard groups of gates, in this order: `implementation-check` (is it correct and sound), `conventions-check` (does it follow our conventions), `finish` (cosmetic changes, then the final build). |
| **Gate** | One check that runs in a phase. It is a `tool` (a command) or an `agent` (a skill run by a subagent). The workflow or the Stack Skills declares it. The declarer owns its command, selection, fix guide and round limit. |
| **Gate runner** | The orchestra code that runs one phase: selects the gates, orders them, runs them, loops the fixer, and returns `ok`, `decide` or `failed`. |
| **Build** | The full build and test run with coverage. A required declaration of the Stack Skills, not a gate. The gate runner runs it first in `implementation-check` and last in `finish`. |
| **Fixer** | The orchestra subagent that fixes a failed tool gate. It uses orchestra's generic fixer procedure plus the gate's fix guide. |
| **Fix guide** | A skill, owned by the gate's declarer, that says how to fix one tool's findings. |
| **Triage** | Sorting each finding of a judging stage or an agent gate into Decide, Patch, Evaluate or Noise. The contract is the skill `orchestra:triage`. |
| **Guide** | Short write-time rules for the planner (`guides.plan`) or the coder (`guides.code`), declared by the Stack Skills. |
| **Run folder** | `tmp/runs/<branch>/`. The orchestration state of one run: results, checkpoints, logs, `run.json`, `stages.json`. Git-ignored. |
| **Notes folder** | `docs/runs/<branch>/`. What a human reads about one run: `task.md`, `brief.md`, `plan.md`, `decisions.md`, review notes, `report.md`. Committed. |
