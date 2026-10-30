# Shared roles and the core slot — design

Date: 2026-10-29. Status: agreed in brainstorming, not yet built. Decision: next S number (S87).

## Intent

A person or a company has rules that apply to every workflow, stack and project: how review
findings are ranked, how text for people is written, how a PR is reviewed and described. Today these
rules sit in different places, and some are hard-coded:

- The triage method lives in `orchestra` (`orchestra:triage`), and ten gate and stage skills name it
  directly. A company with another ranking must fork every gate it uses, including gates of a stack
  plugin it does not own.
- The `clean-code` gate lives in `orc-global-gates`, a slot that can only hold gates.
- There is no place for a writing style, a PR review or a PR description that several workflows of
  one company can share.

Orchestra must stay a clean canvas. It forces no triage method, no writing style and no PR step on
anyone. At the same time it gives a fixed structure, so that one company's rules plug into any
workflow and any gate without forks.

## Goals

- Orchestra knows a fixed list of **shared roles**: `triage`, `writing-style`, `pr-review`,
  `pr-description`. This is a fixed list, like the workflow stages and the gate phases.
- One optional plugin, in the **core slot**, fills the shared roles and declares the company's gates.
  The config names only the plugin; the plugin's declaration maps each shared role to its skill.
- A project may **override** a shared role with its own skill, or **amend** it with a guide of short
  extra rules.
- Orchestra passes the filled shared roles to the skills it dispatches. Each skill uses them only
  when they are given.
- The triage method becomes optional. The only thing orchestra requires of a stage or a gate is the
  result contract (below).

## Non-goals

- Feedback logging and session analysis. They are orchestra internals and a separate project.
- Running a PR step in orchestra. A PR is a workflow concern.
- Support for projects without git. Orchestra keeps assuming git.

## Anti-goals

- A shared role filled by a stack or workflow plugin. Only the core slot fills them; there is no
  precedence order and no conflict rule to learn.
- A skill that fails or stops when a shared role is not filled.
- A workflow or gate that names `orc-core` (or any core plugin) directly.

## The three fixed lists

| List | Values | Where it is used |
|---|---|---|
| Workflow stages (formerly "roles") | `spec`, `plan`, `code` | Tags a workflow dispatch; keys stage guides |
| Gate phases | `implementation-check`, `conventions-check`, `finish` | Groups gates |
| Shared roles (new) | `triage`, `writing-style`, `pr-review`, `pr-description` | Filled by the core slot, passed to dispatches |

## The result contract (orchestra's, universal)

A stage or gate changes the run only through its result JSON: `status` (`ok`, `decide`, `skipped`
or `failed`), the `decide` list (the questions for a person; the run stops on them), the `evaluate`
list (for later; the report shows it) and optional `counts`. This is what `runner.js`, `report.js`
and `next.js` read today; the shape does not change.

Every skill may escalate through `decide`. With no triage skill, the model decides when to escalate.
Orchestra keeps the bare minimum, in the dispatch prompt and in `orchestra:writing-plugins`:
- the result JSON above;
- "Put a question in `decide` only when a person must answer it. An answer in `decisions` is a
  requirement; act on it." (Orchestra already restarts a gate on a new answer.)

Everything else is the triage method, in the triage skill: the five axes, the Patch/Evaluate/Noise
split, the notes format, the Decide test (B1), and the rules from runs such as "never call an unasked
behaviour change Noise" (S57). `counts` keys are the method's; orchestra shows whatever keys it gets.

## Decided

1. **Core slot.** The slot `global-gates` becomes `core`. The plugin `orc-global-gates` becomes
   `orc-core`. The slot stays optional. Its declaration holds `slot`, `config`, `gates` and the new
   shared-roles map. The global-gate rule of S80 stays: a core gate reads only what every workflow
   gives.
2. **Triage moves.** `orchestra:triage` moves to `orc-core:triage`. It is the user's method, not
   orchestra's.
3. **Only the core slot fills shared roles** (option A). A shared role in any other slot's
   declaration fails `orchestra check`.
4. **Project override.** The Project Customization may map a shared role to a project skill in
   `.agents/skills/<name>/SKILL.md`. That skill replaces the core plugin's skill for the role.
5. **Project amend.** Guides may be keyed by a shared role as well as by a stage. A project amends a
   shared role with `.orchestra/project/guides/<shared role>.md`; a skill given that role also reads
   the guide.
6. **Skills use a role only when it is given.** Each gate and stage changes "Invoke the skill
   `orchestra:triage`" to "If a triage skill is given, invoke it." With no triage skill, the skill
   fills the result contract by its own judgement. Each gate and stage skill also loses its other
   triage wording (the notes format, "open Decide finding", "(triage, B1)", the bucket names in
   `counts`), or keeps it only under "if a triage skill is given". The same pattern holds for
   `writing-style`.
7. **PR roles belong to the workflow.** A workflow that ends with a PR invokes `pr-review` and
   `pr-description` when they are given. A workflow without a PR ignores them. Orchestra checks
   nothing here.
8. **Authoring.** `orchestra:writing-plugins` asks a workflow author whether the workflow ends with a
   PR, and if so tells them to read the two PR roles in that step. It also documents the shared
   roles, the core slot and "if given, invoke it" for gate authors.
9. **Rename Role to Stage**, everywhere: `docs/CONTEXT.md`, `protocol.js` (`ROLES`, `roleError`,
   `a.role`), `check.js`, the workflow declaration key `roles`, the dispatch key `role`, the guide
   keys, `next.js`, and the skills that explain them.
10. **The `sc-*` copies** (`sc-orchestra`, `sc-standard-workflow`, `sc-java-stack`, outside this
    repo) are a follow-up, done with the porting work. Until then they stay on the current orchestra
    version.
11. **Records.** One row in `docs/TENSIONS.md` and a full entry in `docs/DECISIONS.md`, in the same
    commit as the change. It changes S80 (the global-gates slot) and S76 (Role).

## My calls (not discussed; the builder may revise)

- **Declaration key:** `"shared-roles": { "triage": "triage", "writing-style": "writing-style" }`,
  shared role to skill name inside the plugin. The project uses the same key in
  `.orchestra/project/orchestra.json`, with a project skill name.
- **How a role reaches a skill:** an input per filled shared role, on every dispatch (workflow
  stages, agent gates, the fixer, inline skills): `shared-role.triage: orc-core:triage` (or the
  project skill's path), and `shared-role.triage.guide: <path>` when the project amends it. The
  prompt line for a project skill read by path follows S86.
- **Writing style is a skill**, not a stage guide, because it must reach gates and the PR step, and
  stage guides reach only `spec`, `plan` and `code`.
- **Old names fail with a fix message, no alias.** A config with a `global-gates` section fails
  `orchestra check` ("rename the section to `core` and choose `orc-core`"). A declaration with
  `roles` or an old guide key fails `orchestra check`. A `next.js` that still sends `role` in a
  dispatch fails at run time with "rename `role` to `stage`".
- **Contents of `orc-core` at first:** `triage` (moved), the `clean-code` gate (moved), and a
  `manifest`. `writing-style`, `pr-review` and `pr-description` are roles orchestra knows; the user
  adds their skills later. Their ports (from sc-shared-context and sc-sdlc-skills) are separate
  work under `docs/PORTING.md`.

## Left to the builder

- The exact checks in `check.js`: unknown shared role, shared role outside the core and project
  slots, a mapped skill that does not exist, a project guide for a shared role that nothing fills.
- Where the fallback text ("with no triage skill, sort by your own judgement") lives so it is not
  repeated in every gate skill — for example one sentence in the prompt orchestra builds.
- The version bump and the order of commits.
- The `orchestra:init` and `orchestra:project` text for the core slot and for override/amend.
- The list of `docs/guide.html` sections that the change makes out of date (CLAUDE.md rule).
