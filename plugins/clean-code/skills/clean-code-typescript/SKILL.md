---
name: clean-code-typescript
description: Use when editing .ts or .tsx files or when TypeScript, React, hooks, components, Vite, or vitest are part of the task. The TypeScript and React shape of the clean-code rules, with the layer defaults for a React app and the per-layer smells that no linter catches. Also read by the orchestra clean-code gate.
---

# Clean Code — TypeScript and React

The TypeScript and React shape of the clean-code rules. The `clean-code`
skill, or the clean-code gate of orchestra, owns the process; whichever
loaded this skill keeps it. A finding cites `TS rule <n>` and `file:line`.
A rule that `tsc --strict`, typescript-eslint `recommended` or
`eslint-plugin-react-hooks` checks is not repeated here. Where one of them
borders a rule, the rule names the tool. "Gate rule 11", "12" and "13" are the orchestra gate's rules for a core
that works without the UI and the IO, dependencies that point inward, and a
simple typed value at a boundary. In the standalone `clean-code` skill they
are Phases 1, 2 and 3 of `architecture.md`.

The project's `CLAUDE.md` or `AGENTS.md` (root, `frontend/`) outranks every
default here.

## Rules

1. **`strict` is on in `tsconfig.json`.** No lint rule reads this setting, so read the file. With
   `strict` on, `tsc` catches the implied `any`, and `no-explicit-any` catches the written one. A
   value whose shape is not known at a boundary is `unknown` plus a narrowing guard, not an `as`
   cast. An `as` cast has a comment that says why the compiler is wrong.
2. **Discriminated unions, not flags.** Two optional fields that travel together, or a boolean prop
   that switches the render, are one union with a `kind`.
3. **Each component has a named `Props` type.** A `type` or an `interface`; inline only for one or
   two fields. It is never the API response type: the component owns its contract, and the wire
   shape stays in the hook that fetched it.
4. **Data comes through a hook.** `useQuery` and `useMutation` live in `hooks/`. No `axios`, no
   `fetch`, no `useEffect` with a request in a component or a page. The exception: the framework
   owns the fetch (a route loader, a server component); then that layer does it. If the hook file
   does not exist yet, create it.
5. **Query keys are constants or a key factory in the hook file.** An inline key array in a
   component breaks the cache at the next rename.
6. **Every dependency array entry comes from a stable source.** `exhaustive-deps` flags a literal
   object, array, function or `x ?? []` declared in the component body. It cannot see a value that a
   call returns (`.filter()`, `.map()`, a `useMutation()` result) or that props pass in. Such a value
   changes identity on every render: the memo misses, dependent effects run again, and `memo()`
   children render again. Nothing remounts unless the value is a `key`. Prefer a primitive
   (`items.length`, the stable `mutate`), or derive the value inside the hook; use `useMemo` last.
   Never remove an entry from the array to fix it, and never silence `react-hooks/exhaustive-deps`:
   the warning is a bug report. Fix the source: move a constant out of the component, build the
   object inside the effect, read the primitive out of the object, and only then use `useMemo` or
   `useCallback`.
7. **A component does one job.** It is a function, so the line limit applies to it, JSX and inline
   callbacks included. A file over 500 lines holds several modules. Extract first the piece that
   owns its own state: its handlers go with it.
8. **Loading, error and empty are explicit branches.** `data?.map(...)`, `?? []` and `data!` all
   pass `tsc --strict`. The first two render the same blank list for a pending query, a failed query
   and zero rows; `data!` crashes. Only `no-non-null-assertion` catches the `!`, and it is in
   typescript-eslint `strict`, not in `recommended`. Each state gets its own JSX.
9. **`eslint-disable` has a reason after ` -- `.** The reason says why the rule is wrong here, not
   what the rule says. No recommended set asks for the reason; the project can turn on
   `@eslint-community/eslint-comments/require-description`. `@ts-ignore` and a bare
   `@ts-expect-error` are already errors under `ban-ts-comment`.
10. **Early return.** Guards first; the JSX at the bottom is the normal path.
11. **A test renders the real component.** One behaviour per test, and a name that reads as a
    sentence: `renders empty state when there are no rows`, not `test 3`.
12. **No `helpers.ts` or `utils.ts`.** `utils/` is a layer, not a file name. Each file in it does one
    job and has its name (`formatMoney.ts`, `isApiError.ts`). A function with one caller stays in
    the caller's file.
13. **URL state has one owner.** Do not copy URL state into React state.

Not listed: `console.log`, `as any` and `@ts-ignore`. typescript-eslint `recommended` makes `as any`
and `@ts-ignore` errors (`no-explicit-any`, `ban-ts-comment`). Core `no-console` covers the log, but
it is not in `eslint:recommended`; the project turns it on.

## Layers of a React app

The project's `AGENTS.md` or `CLAUDE.md` overrides these names. It may group by feature
(`features/<resource>/{api,hooks,components,types}`) instead of by layer; the arrows hold either way.

```
pages/        route components: call hooks, compose components, no rules
hooks/        one hook file per resource; query keys as constants in that file; invalidation on mutation; `select` turns the wire shape into the app's type
api/          one HTTP client with interceptors, and the wire types beside it (generated or mirrored from the backend contract)
components/   presentational and project components; no data fetching; use the app's types, never the wire shape
types/        the app's own domain and view types: what hooks give to components
utils/        pure functions that a second caller needs, one job per file, named for it
```

The direction: `pages` import `hooks` and `components`; `hooks` import `api` and `types`;
`components` import `types` and `utils`; `api` imports nothing above it; nothing imports `pages`. A
component that imports the HTTP client is an adapter in the wrong folder (gate rule 11). A component
that reads a backend field name breaks gate rule 13: the translation belongs in the hook. When the
project groups by feature, the same arrows hold inside each feature. Across features the direction
is shared → features → pages, and features do not import each other. When the project has
`import/no-restricted-paths` zones or another dependency checker, its result wins over this list.

| Layer | Smell | What it shows |
|---|---|---|
| `pages/` | a business rule in the page (`if (row.status === ...)` decides a permission) | gate rule 11: the page only composes; the rule belongs in a hook or a domain helper |
| `pages/` | 500 lines or more | several pages, or a page that carries a component |
| `components/` | `axios`, `fetch` or a `useEffect` request | gate rule 11: the component cannot be tested without IO |
| `components/` | an inline props type, or a `Props` that is the API response type | the wire shape leaks across the boundary; name the `Props` |
| `components/` | reads a backend field name (`row.created_at` from the DTO) | gate rule 13: translate in the hook's `select` |
| `hooks/` | an inline query key (`['users']`) instead of the hook's key constant | a rename or a typo in one copy, and `invalidateQueries` no longer matches |
| `hooks/` | a mutation that neither invalidates nor updates the cache (no `invalidateQueries` in `onSuccess` or `onSettled`, no `setQueryData`) | mounted lists keep the old rows until a refocus, a reconnect or a remount |
| anywhere | a memo or effect dependency held in a variable that is new on each render (`const rows = data ?? []`, `.filter()`, an inline object) | TS rule 6: the memo misses on every render; `exhaustive-deps` catches only the expression written inline in the array |

## Two searches

Run these on the changed files under `components/` and `pages/`:

```bash
command grep -ln "axios\.\|fetch(" <changed files>           # fetching outside hooks: TS rule 4
command grep -n "queryKey: \[['\"]" <changed files>          # inline query keys outside hooks: TS rule 5
```

A hit in a changed file is a finding. A hit in a file the task did not change is not in scope.

## Reading the measurement

The measure parses TypeScript with the project's own `typescript` package, from the nearest
`node_modules` above each file. Without that package it stops and prints the `npm ci` command.
TypeScript 7 has no JavaScript compiler API, so on a 7.x project it stops and asks for
`typescript@5`.

What counts as a function: declarations, methods, constructors, accessors, and an arrow or a
function expression that is the initial value of a `const`, a property, or `export default`. A
callback passed to `.map`, `useMemo` or `useEffect` belongs to the function around it, and its
branches count toward that function's complexity. So a component with a large inline callback is
one large function: that is the honest reading.

In a test file, `describe` (and `suite`, `context`) is a container like the file: its callback is
not measured. Each `it`, `test` and hook is measured alone. A callback with no name takes the name of
its call and its title, cut at 60 characters: `it("adds numbers")`, `vi.mock("./api")`,
`beforeEach()`. A test over 50 lines (the test limit) is a finding like any function; a long `describe` is not.


## Measuring

By hand, from the frontend directory:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/clean-code/measure.py" src --changed --compare
```
