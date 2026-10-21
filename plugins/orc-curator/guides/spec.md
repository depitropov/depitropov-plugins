# Spec guide

Rules for the spec stage when the project has `docs/curator/`. When that folder does not exist, do nothing.

1. Read `docs/curator/BACKLOG.md`: the Vision, Now and Next. Never Later. A task must not depend on a bet that nobody has checked.
2. Read `docs/curator/PRODUCT.md` for why the product has its shape, and what it deliberately is not. It does not say what the product does. Do not write a criterion for something it refuses.
3. Read `docs/curator/TECH.md` and `docs/curator/CONTEXT.md`. Write the brief in the words of CONTEXT. A synonym that CONTEXT rejects gets built under a second name.
4. Match the task to one row of BACKLOG by your own judgement. Do not stretch: when no row clearly fits, the task is `new`.
5. A want that the task puts off ("later", "not now but we want it") is a `Deferred` line with the reason. It is not a non-goal. A non-goal stays under `Scope: Out`.
6. A gap about this project that only the user can close, or about how the world works, is a `Question` line. Do not guess it, and do not research it. A `Question` line never stops the run: the spec proceeds on its stated assumption. A gap without which an acceptance criterion cannot be written is a `business fact:` line of the brief instead; that one stops the run for the human.
7. A choice that two answers make impossible to swap later (what a write is, what owns identity, what a model decides) is a one-way door. This is rare, and only when `docs/curator/TECH.md` and `docs/curator/DECISIONS.md` do not already settle it. Write it as a line of the brief: `business fact: <what is missing> — options: <a> | <b>`. Do not choose it.
8. Do not derive what other rows of BACKLOG demand of this code. The direction sweep of the Curator owns that.
9. Record a word that the task gives you. Never record a word that you concluded. Do not present a finding as something the user said.
10. Do not design the solution. Patterns, file layout and mechanisms belong to the plan.
11. At the end of the brief, add this section. `Serves` appears once. `Deferred` and `Question` appear zero or more times.

```markdown
## Direction
- Serves: B<n> | new
- Deferred: <a want this task leaves for later> — <why later>
- Question: <a research-shaped or product gap, for a Qn>
```

## Permitted actions

Read the files under `docs/curator/`. Do not change any file under `docs/curator/`; the Curator updates them at the end of the run. Do not ask the user.
