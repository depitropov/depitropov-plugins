# Curator Contract (Plan 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give orchestra the contract that a Curator plugin plugs into: guides by role (with the Stack Skills guides moved to it), an optional `curator` slot that declares `curate`, `setup` and `guides`, and a new `inline` action through which `drive.js` runs the Curator's `setup` before the first stage and its `curate` on `done`.

**Architecture:** Guides move from "the workflow pulls the Stack Skills guide into the dispatch inputs" to "orchestra lists every slot's guides for the dispatch's role in the prompt". The workflow declares its `roles` and tags each dispatch with one; `check.js` and `drive.js` guard both sides. The Curator logic in `drive.js` lives in a new `lib/curator.js`: it turns a missing setup flag or a `done` into an `inline` action that the `orchestra:run` skill carries out in the main session. No `orc-curator` plugin is built here; a stub Curator under `test/` proves the contract.

**Tech Stack:** Node 22, standard library only, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-16-curator-design.md`, section "The orchestra changes" and "Plans" item 1. Decision: S76 (`docs/TENSIONS.md`, `docs/DECISIONS.md`).

## Global Constraints

- orchestra code: Node, standard library only (S11). No new runtime dependency.
- Every `check.js` failure line has the form `<where>: <problem>. Fix: <fix>.`
- `check.js` and `plugins/orchestra/skills/writing-plugins/SKILL.md` change in the same commit (CLAUDE.md "Contracts"). The packaging test checks that writing-plugins quotes every contract word.
- Every `SKILL.md` frontmatter has only `name` and `description`. Skill text names actions, never harness tool names (`check.js` `HARNESS_WORDS`).
- Skill and doc text is ASD-STE-100 simple English and uses the names in `docs/CONTEXT.md` (Role, Guide, Curator are defined there since S76).
- The roles are exactly `spec`, `plan`, `code`.
- The `curator` section of `.orchestra/config.json` is optional; `workflow` and `stack-skills` stay required.
- `setup` and `curate` run in the main session, never in a subagent. Only `drive.js` prints `inline`; a workflow's `next.js` never does.
- All five plugins move to version `0.13.0`, in both `plugin.json` and `.claude-plugin/plugin.json`.
- Run all tests with `npm test` from the repo root. Every task ends with `npm test` green.

## Review Focus

1. **A setup skill that ends `ok` but writes no flag.** Expected: the run fails with a reason that names the flag path, and the next call runs setup again; never a loop and never a silent skip. Pinned in Task 3 (`curator.test.js`).
2. **A curate that fails.** Expected: the run stops `failed` with a report, the worktree stays, and the next call runs curate again, as a failed stage does (S32). Pinned in Task 3.
3. **A project with no `curator` section.** Expected: every action is the same as before this plan: no `inline`, no guide line from a Curator. Pinned in Task 3 (the existing drive tests stay green, plus one assertion).
4. **A Stack Skills guide for a role the workflow lacks, but disabled in the config.** Expected: `orchestra check` passes. Without the `disable`, it fails and names the fix. Pinned in Task 1.
5. **A workflow that dispatches with a role it did not declare.** Expected: the run fails with a reason that names the skill and the role. Pinned in Task 1 (`roleError` in `protocol.test.js`).

---

### Task 1: Roles and guides by role

Guides are given by role. The workflow declares its roles and tags each dispatch; orchestra puts the guides into the prompt. The Stack Skills guides move to this mechanism in the same commit, so no stage gets a guide twice.

**Files:**
- Modify: `plugins/orchestra/lib/protocol.js` (add `ROLES`, `guidesFor`, `roleError`; `validateAction` checks `role`; `withPrompt` takes the guides)
- Modify: `plugins/orchestra/lib/check.js` (import `ROLES`; remove `GUIDE_KINDS`; `roles` on `workflow`; the guides check for any slot that allows `guides`; the role cross-check in `checkProject`; exports)
- Modify: `plugins/orchestra/bin/drive.js` (`answer` builds the prompt with the guides; `step` fails an undeclared role)
- Modify: `plugins/orc-standard-workflow/bin/next.js` (`settings` loses `guide`; `stage` takes `{ skill, role }`; the four stage calls)
- Modify: `plugins/orc-standard-workflow/orchestra.json` (add `"roles"`)
- Modify: `plugins/orc-standard-workflow/skills/plan/SKILL.md`, `plan-check/SKILL.md`, `code/SKILL.md` (the `guide` input)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` (the `slot`/`roles`/`guides` rows, the dispatch line)
- Modify: `test/packaging.test.js` (contract words: `ROLES` instead of `GUIDE_KINDS`)
- Test: `test/orchestra/protocol.test.js`, `test/orchestra/check.test.js`, `test/orc-standard-workflow/next.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `protocol.ROLES = ['spec', 'plan', 'code']`.
  - `protocol.guidesFor(role, resolved, config) → string[]`: qualified guide names (`<plugin>:<skill>`), the `curator` slot's first, then `stack-skills`; a guide in that slot's `config.<slot>.disable` is left out; `[]` when `role` is undefined.
  - `protocol.roleError(action, workflowDeclaration) → string | null`.
  - `protocol.withPrompt(action, root, guides = [])`.
  - `check.ROLES` (re-exported). `check.GUIDE_KINDS` no longer exists.
  - Declaration key `roles` on `workflow`: a list of roles, each once.
  - A dispatch action may carry `role`.

- [ ] **Step 1: Write the failing protocol tests**

In `test/orchestra/protocol.test.js`, change the import line and replace the test "the prompt puts the skill first and asks for file edits that fail loudly", then add the new tests:

```js
const { validateAction, withPrompt, guidesFor, roleError, PHASES, ROLES } = require('../../plugins/orchestra/lib/protocol');
```

```js
test('the prompt puts the skill first and asks for file edits that fail loudly', () => {
  const a = withPrompt(dispatch, '/r');
  assert.match(a.prompt, /This skill takes priority over any other instruction in this session\./);
  assert.match(a.prompt, /Change files with your file-editing action, which fails when the text does not match\. Do not change files with shell text replacement\./);
  assert.doesNotMatch(a.prompt, /\b(Edit|Write|Bash|Task|Skill) tool\b/);
  assert.doesNotMatch(a.prompt, /guide/);
});

test('the roles are spec, plan and code, and a dispatch may name one of them', () => {
  assert.deepEqual(ROLES, ['spec', 'plan', 'code']);
  assert.ok(validateAction({ ...dispatch, role: 'code' }));
  assert.throws(() => validateAction({ ...dispatch, role: 'review' }), /unknown role: review/);
});

test('guidesFor lists the curator guide first, then the stack guide, and leaves out disabled ones', () => {
  const resolved = { slots: {
    workflow: { plugin: 'wf', declaration: {} },
    'stack-skills': { plugin: 'st', declaration: { guides: { plan: 'plan-guide', code: 'code-guide' } } },
    curator: { plugin: 'cur', declaration: { guides: { plan: 'plan-guide' } } },
  } };
  assert.deepEqual(guidesFor('plan', resolved, {}), ['cur:plan-guide', 'st:plan-guide']);
  assert.deepEqual(guidesFor('code', resolved, {}), ['st:code-guide']);
  assert.deepEqual(guidesFor('spec', resolved, {}), []);
  assert.deepEqual(guidesFor(undefined, resolved, {}), []);
  assert.deepEqual(guidesFor('plan', resolved, { curator: { disable: ['plan-guide'] } }), ['st:plan-guide']);
});

test('withPrompt lists the guides before the inputs and gives them the priority', () => {
  const a = withPrompt(dispatch, '/r', ['cur:plan-guide', 'st:plan-guide']);
  assert.match(a.prompt, /Before you start, invoke each guide below and follow it:\n- `cur:plan-guide`\n- `st:plan-guide`/);
  assert.match(a.prompt, /This skill and these guides take priority over any other instruction in this session\./);
  assert.ok(a.prompt.indexOf('cur:plan-guide') < a.prompt.indexOf('Inputs:'));
});

test('roleError names a role that the workflow did not declare', () => {
  const d = { roles: ['spec', 'plan'] };
  assert.equal(roleError({ ...dispatch, role: 'plan' }, d), null);
  assert.equal(roleError(dispatch, d), null);
  assert.match(roleError({ ...dispatch, role: 'code' }, d), /wf:code has role "code", which the workflow does not declare in "roles"/);
  assert.match(roleError({ ...dispatch, role: 'code' }, {}), /does not declare in "roles"/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/orchestra/protocol.test.js`
Expected: FAIL (`guidesFor is not a function`, the old priority sentence).

- [ ] **Step 3: Implement the protocol changes**

Replace `plugins/orchestra/lib/protocol.js` with:

```js
'use strict';

const PHASES = ['implementation-check', 'conventions-check', 'finish'];
const TERMINAL = ['done', 'decide', 'failed'];
const ACTIONS = ['dispatch', 'phase', ...TERMINAL];
// What a stage does. A slot plugin gives its guides by role; the workflow tags each dispatch (S76).
const ROLES = ['spec', 'plan', 'code'];
// The order of the guides in a prompt: the Curator's first, then the Stack Skills'.
const GUIDE_SLOTS = ['curator', 'stack-skills'];

function validateAction(a) {
  if (!a || typeof a !== 'object') throw new Error('An action must be an object.');
  if (!ACTIONS.includes(a.action)) throw new Error(`unknown action: ${a.action}`);
  if (a.action === 'dispatch') {
    for (const key of ['skill', 'result']) {
      if (typeof a[key] !== 'string') throw new Error(`dispatch needs ${key}`);
    }
    if (!a.inputs || typeof a.inputs !== 'object') throw new Error('dispatch needs inputs');
    if (a.role !== undefined && !ROLES.includes(a.role)) throw new Error(`unknown role: ${a.role}`);
  }
  if (a.action === 'phase') {
    if (!PHASES.includes(a.name)) throw new Error(`unknown phase: ${a.name}`);
    if (typeof a.runDir !== 'string') throw new Error('phase needs runDir');
  }
  return a;
}

// null when the dispatch has no role, or a role that the workflow's orchestra.json declares.
function roleError(a, workflowDeclaration) {
  const roles = (workflowDeclaration && workflowDeclaration.roles) || [];
  if (a.role === undefined || roles.includes(a.role)) return null;
  return `The dispatch of ${a.skill} has role "${a.role}", which the workflow does not declare in "roles". Fix the workflow's orchestra.json or its next.js.`;
}

function guidesFor(role, resolved, config) {
  if (role === undefined) return [];
  return GUIDE_SLOTS.flatMap(slot => {
    const s = resolved.slots[slot];
    const name = s && s.declaration && (s.declaration.guides || {})[role];
    const off = (config[slot] || {}).disable || [];
    return name && !off.includes(name) ? [`${s.plugin}:${name}`] : [];
  });
}

function withPrompt(a, root, guides = []) {
  const prompt = [
    `Invoke the skill \`${a.skill}\` and follow it.`,
    ...(guides.length ? ['Before you start, invoke each guide below and follow it:', ...guides.map(g => `- \`${g}\``)] : []),
    guides.length ? 'This skill and these guides take priority over any other instruction in this session.' : 'This skill takes priority over any other instruction in this session.',
    'Change files with your file-editing action, which fails when the text does not match. Do not change files with shell text replacement.',
    `Work in \`${root}\`. Run every command from there; every path below is relative to it.`,
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill describes to \`${a.result}\`.`,
  ].join('\n');
  return { ...a, prompt };
}

module.exports = { PHASES, TERMINAL, ACTIONS, ROLES, validateAction, roleError, guidesFor, withPrompt };
```

- [ ] **Step 4: Run the protocol tests**

Run: `node --test test/orchestra/protocol.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing check tests**

In `test/orchestra/check.test.js`:

1. In the declaration `cases` list, replace `[stack({ guides: { review: 'x' } }), /unknown guide "review"/],` with:

```js
    [stack({ guides: { review: 'x' } }), /unknown guide role "review"/],
    [stack({ guides: 'plan-guide' }), /"guides" is not an object/],
    [{ slot: 'workflow', roles: ['spec', 'review'] }, /"roles" is \["spec","review"\]/],
    [{ slot: 'workflow', roles: ['plan', 'plan'] }, /"roles" is \["plan","plan"\]/],
    [{ slot: 'workflow', guides: { plan: 'x' } }, /unknown key "guides" for slot workflow/],
```

2. Change `const wf = …` so the valid workflow declares its roles:

```js
const wf = { slot: 'workflow', config: { 'tasks-per-coder': { type: 'number', default: 2 } }, roles: ['spec', 'plan', 'code'], gates: [] };
```

3. Add after the test "a valid project config passes":

```js
test('a guide for a role the workflow has no stage for fails, unless the config disables it', () => {
  const noCode = { ...wf, roles: ['spec', 'plan'] };
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, { workflow: noCode, 'stack-skills': st }));
  assert.deepEqual(out, ['.orchestra/config.json: st declares a "code" guide, but the workflow wf has no code stage. Fix: add "code-guide" to "stack-skills.disable", or choose a workflow with a code stage.']);
  const off = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', disable: ['code-guide'] } };
  assert.deepEqual(checkProject(project(off, { workflow: noCode, 'stack-skills': st })), []);
});
```

- [ ] **Step 6: Run them to see them fail**

Run: `node --test test/orchestra/check.test.js`
Expected: FAIL on the new cases (`unknown guide role`, `"roles" is`, the cross-check).

- [ ] **Step 7: Implement the check changes**

In `plugins/orchestra/lib/check.js`:

1. Line 6: `const { PHASES, ACTIONS, ROLES, validateAction } = require('./protocol');`
2. Line 16: `const DECLARATION_KEYS = { workflow: ['slot', 'config', 'roles', 'gates'], 'stack-skills': ['slot', 'config', 'build', 'measure', 'guides', 'gates'] };`
3. Delete line 20 (`const GUIDE_KINDS = …`).
4. In `checkDeclaration`, delete the `for (const [kind, name] of Object.entries(d.guides || {}))` loop inside the `stack-skills` block (lines 85-88), and add right after the `placeholders` helper (before `if (d.slot === 'stack-skills')`):

```js
  if (d.guides !== undefined && !isObject(d.guides)) fail('"guides" is not an object', 'write { "<role>": "<guide skill>" }');
  for (const [role, name] of Object.entries(isObject(d.guides) ? d.guides : {})) {
    if (!ROLES.includes(role)) fail(`unknown guide role "${role}"`, `use one of ${ROLES.join(', ')}`);
    skill(name, `guide "${role}"`);
  }
  if (d.roles !== undefined && (!Array.isArray(d.roles) || !d.roles.every(r => ROLES.includes(r)) || new Set(d.roles).size !== d.roles.length)) {
    fail(`"roles" is ${JSON.stringify(d.roles)}`, `list the role of each of your stages once, from ${ROLES.join(', ')}`);
  }
```

   (The `unknown key` rule already rejects `guides` on a workflow and `roles` on any other slot.)

5. In `checkProject`, before the `// A run's worktree lives in the project (S74).` comment, add:

```js
  // A guide is given by role. A guide for a role the workflow has no stage for never reaches a stage (S76).
  const wf = slots.workflow;
  if (wf && isObject(wf.declaration) && isObject(config.workflow) && config.workflow.plugin === wf.plugin) {
    const roles = Array.isArray(wf.declaration.roles) ? wf.declaration.roles : [];
    for (const slot of SLOTS) {
      const s = slots[slot];
      const section = config[slot];
      if (!s || !isObject(section) || section.plugin !== s.plugin || !isObject(s.declaration) || !isObject(s.declaration.guides)) continue;
      const off = Array.isArray(section.disable) ? section.disable : [];
      for (const [role, name] of Object.entries(s.declaration.guides)) {
        if (!ROLES.includes(role) || roles.includes(role) || off.includes(name)) continue;
        out.push(`${CONFIG}: ${s.plugin} declares a "${role}" guide, but the workflow ${wf.plugin} has no ${role} stage. Fix: add "${name}" to "${slot}.disable", or choose a workflow with a ${role} stage.`);
      }
    }
  }
```

6. `module.exports`: replace `GUIDE_KINDS` with `ROLES`.

- [ ] **Step 8: Run the check tests**

Run: `node --test test/orchestra/check.test.js`
Expected: PASS.

- [ ] **Step 9: Write the failing next.js test**

In `test/orc-standard-workflow/next.test.js`, replace the test "plan and plan-check get the plan guide, code gets the code guide, unless disabled" with:

```js
test('spec, plan, plan-check and code carry their role, and no guide input', () => {
  const dir = project({ guides: { plan: 'plan-guide', code: 'code-guide' } });
  const spec = next(dir, '.orchestra/task.txt');
  assert.equal(spec.role, 'spec');
  const plan = pass(dir, spec);
  assert.equal(plan.role, 'plan');
  assert.equal(plan.inputs.guide, undefined);
  const check = pass(dir, plan);
  assert.equal(check.role, 'plan');
  const code = checked(dir, check, 1);
  assert.equal(code.role, 'code');
  assert.equal(code.inputs.guide, undefined);
});
```

- [ ] **Step 10: Run it to see it fail**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: FAIL (`spec.role` is undefined).

- [ ] **Step 11: Implement the next.js changes**

In `plugins/orc-standard-workflow/bin/next.js`:

1. In `settings`, delete the `disabled` and `guide` lines (87-91) and return `{ build: …, perCoder }` without `guide`.
2. Change the `stage` signature and its dispatch line:

```js
function stage(ctx, name, inputs, { skill = name, role } = {}) {
```

```js
    return { action: 'dispatch', skill: `orc-standard-workflow:${skill}`, ...(role ? { role } : {}), inputs: { ...inputs, ...decisions }, result, runDir: ctx.runDir };
```

3. The calls:

```js
  const specStep = stage(ctx, 'spec', { task: `${notes}/task.md`, notes }, { role: 'spec' });
```

```js
  const steps = [
    ['plan', { spec: run.spec, notes }],
    ['plan-check', { spec: run.spec, plan, notes }],
  ];
  for (const [name, inputs] of steps) {
    const a = stage(ctx, name, inputs, { role: 'plan' });
    if (a) return a;
  }
```

```js
    const a = stage(ctx, `code-${from}`, { spec: run.spec, plan, from, to, base: run.base, build: s.build, notes }, { skill: 'code', role: 'code' });
```

4. In `plugins/orc-standard-workflow/orchestra.json`, add after `"slot": "workflow",`: `"roles": ["spec", "plan", "code"],`

- [ ] **Step 12: Run the next.js tests**

Run: `node --test test/orc-standard-workflow/next.test.js`
Expected: PASS. If an older test asserts `inputs` with `deepEqual` and a `guide` key, remove only the `guide` key from its expected object.

- [ ] **Step 13: drive.js builds the prompt with the guides and fails an undeclared role**

In `plugins/orchestra/bin/drive.js`:

1. Line 7: `const { validateAction, withPrompt, guidesFor, roleError } = require('../lib/protocol');`
2. Replace the first line of `answer` with:

```js
  const prompted = action.action === 'dispatch' ? withPrompt(action, root, guidesFor(action.role, load(root), readConfig(root))) : action;
  const out = { ...prompted, branch: git(root, 'branch', '--show-current'), worktree: path.relative(project, root) };
```

3. In `step`, change the `dispatch` branch to:

```js
    if (a.action === 'dispatch') {
      const bad = roleError(a, resolved.slots.workflow.declaration);
      if (bad) return finish(project, { action: 'failed', reason: bad, runDir: a.runDir }, resolved);
      remember(project, a);
      return a;
    }
```

- [ ] **Step 14: The stage skills lose the `guide` input**

1. `plugins/orc-standard-workflow/skills/plan/SKILL.md`: delete the input line ``- `guide` (optional): a skill with short rules for planning in this stack.`` Change step 1 to: ``1. Read `spec`. Follow the rules of every guide that your dispatch prompt lists.``
2. `plan-check/SKILL.md`: delete the same input line. Change step 1 to: ``1. Read `spec` and `plan`. If `decisions` is given, read it first. Use the rules of every guide that your dispatch prompt lists as the reference.`` (Keep the rest of step 1 that follows "as the reference", if any.)
3. `code/SKILL.md`: delete ``- `guide` (optional): a skill with short rules for writing code in this stack.`` Change step 1 to: ``1. Follow the rules of every guide that your dispatch prompt lists. They are short rules for writing code in this stack.``

- [ ] **Step 15: writing-plugins and the contract-word test**

In `plugins/orchestra/skills/writing-plugins/SKILL.md`, in the `orchestra.json` table:
- `slot` row: ``| `slot` | all | `workflow`, `stack-skills` or `curator`. |`` (Task 2 adds the `curator` rows; write `curator` here now.)
- Replace the `guides` row with: ``| `guides` | `stack-skills`, `curator` | `{ "<role>": "<skill>" }`: a guide, a skill with short write-time rules, for the stages of one role. The roles are `spec`, `plan` and `code`. orchestra lists the guides of a stage's role in its prompt. A project turns one off with `disable`. |``
- Add a row: ``| `roles` | `workflow` | The roles of its stages, each once: `spec`, `plan`, `code`. orchestra check fails when a slot plugin declares a guide for a role that is not here. |``

In "A workflow: bin/next.js", change the `dispatch` bullet to: ``- `dispatch`: `skill`, `inputs`, `result` (the file the subagent writes) and `runDir`. Optional `role`: the stage's role, one of your `roles`. orchestra adds that role's guides to the prompt; a role you did not declare fails the run.``

In `test/packaging.test.js`, in the contract-word test, replace `...check.GUIDE_KINDS` with `...check.ROLES`.

- [ ] **Step 16: Run all tests**

Run: `npm test`
Expected: PASS. `orchestra check passes on every plugin` covers the new `roles` key in `orc-standard-workflow` and the `code` guide of `orc-java-stack`.

- [ ] **Step 17: Commit**

```bash
git add plugins/orchestra plugins/orc-standard-workflow test
git commit -m "feat(orchestra): guides by role; the Stack Skills guides move to the prompt (S76)"
```

---

### Task 2: The `curator` slot in the contract

A plugin may fill an optional `curator` slot. It declares `curate`, `setup` and optional `guides`. `check.js` checks it; `orchestra:init` offers it.

**Files:**
- Modify: `plugins/orchestra/lib/check.js` (`SLOTS`, `REQUIRED_SLOTS`, `DECLARATION_KEYS.curator`, `SETUP_KEYS`, the curator block in `checkDeclaration`, `checkProject`'s missing-section loop, exports)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` (the `curate` and `setup` rows, a "A Curator" section)
- Modify: `plugins/orchestra/skills/init/SKILL.md` (the optional slot)
- Modify: `test/helpers.js` (`writePlugin` writes the `curate` and `setup` skills)
- Modify: `test/packaging.test.js` (contract words include `SETUP_KEYS`)
- Test: `test/orchestra/check.test.js`

**Interfaces:**
- Consumes: `ROLES` and the guides check from Task 1.
- Produces:
  - `check.SLOTS = ['workflow', 'stack-skills', 'curator']`, `check.REQUIRED_SLOTS = ['workflow', 'stack-skills']`, `check.SETUP_KEYS = ['skill', 'done']`.
  - A `curator` declaration: `{ "slot": "curator", "config": {…}, "curate": "<skill>", "setup": { "skill": "<skill>", "done": "<relative file path>" }, "guides": { "<role>": "<skill>" } }`. `curate` and `setup` are required.
  - `test/helpers.writePlugin` creates `skills/<curate>` and `skills/<setup.skill>`.

- [ ] **Step 1: Write the failing check tests**

In `test/orchestra/check.test.js`:

1. Add near `const stack = …`:

```js
const curator = (extra = {}) => ({ slot: 'curator', curate: 'curate', setup: { skill: 'setup', done: 'docs/curator/.setup' }, ...extra });
```

2. In the declaration `cases` list, replace `[{ slot: 'curator' }, /"slot" is "curator"/],` with:

```js
    [{ slot: 'psk' }, /"slot" is "psk"/],
    [curator({ curate: undefined }), /"curate" names no skill/],
    [curator({ setup: undefined }), /there is no "setup"/],
    [curator({ setup: { skill: 'setup', done: 'x', when: 'once' } }), /unknown setup key "when"/],
    [curator({ setup: { skill: 'setup' } }), /setup "done" is undefined/],
    [curator({ setup: { skill: 'setup', done: '/abs/.setup' } }), /setup "done" is "\/abs\/\.setup"/],
    [curator({ setup: { skill: 'setup', done: '../out/.setup' } }), /setup "done" is "\.\.\/out\/\.setup"/],
    [curator({ build: { run: 'make' } }), /unknown key "build" for slot curator/],
    [curator({ guides: { review: 'x' } }), /unknown guide role "review"/],
```

3. Change `project(config, declarations)` so a `curator` declaration gets the plugin name `cur`:

```js
    const name = { workflow: 'wf', 'stack-skills': 'st', curator: 'cur' }[slot];
```

4. Add tests:

```js
test('a valid curator declaration passes, and the curator section is optional', () => {
  const cur = curator({ guides: { spec: 'spec-guide', plan: 'plan-guide' } });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, curator: { plugin: 'cur' } };
  assert.deepEqual(checkProject(project(config, { workflow: wf, 'stack-skills': st, curator: cur })), []);
  assert.deepEqual(checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' } }, { workflow: wf, 'stack-skills': st })), []);
});

test('a curator guide for a role the workflow lacks names the curator section in its fix', () => {
  const cur = curator({ guides: { spec: 'spec-guide' } });
  const config = { workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st' }, curator: { plugin: 'cur' } };
  const out = checkProject(project(config, { workflow: { ...wf, roles: ['plan', 'code'] }, 'stack-skills': st, curator: cur }));
  assert.deepEqual(out, ['.orchestra/config.json: cur declares a "spec" guide, but the workflow wf has no spec stage. Fix: add "spec-guide" to "curator.disable", or choose a workflow with a spec stage.']);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/orchestra/check.test.js`
Expected: FAIL (`"slot" is "curator"` for the valid curator; the new rules).

- [ ] **Step 3: helpers.writePlugin writes the curator skills**

In `test/helpers.js`, in `writePlugin`, extend the `skills.push(...)` list:

```js
    skills.push(...[d.build && d.build.guide, d.measure && d.measure.rules, d.curate, d.setup && d.setup.skill, ...Object.values(d.guides || {}), ...(d.gates || []).flatMap(g => [g.skill, g.guide])].filter(Boolean));
```

- [ ] **Step 4: Implement the curator slot**

In `plugins/orchestra/lib/check.js`:

1. ```js
   const SLOTS = ['workflow', 'stack-skills', 'curator'];
   // A project may leave the curator slot empty: then it runs with no Curator (S76).
   const REQUIRED_SLOTS = ['workflow', 'stack-skills'];
   ```
2. `DECLARATION_KEYS` gets `curator: ['slot', 'config', 'curate', 'setup', 'guides']`.
3. Add `const SETUP_KEYS = ['skill', 'done'];` after `MEASURE_KEYS`.
4. In `checkDeclaration`, after the `stack-skills` block (before `if (d.gates !== undefined …`):

```js
  if (d.slot === 'curator') {
    skill(d.curate, '"curate"');
    const s = d.setup;
    if (!isObject(s)) {
      fail('there is no "setup"', 'add "setup": { "skill": "<setup skill>", "done": "<the flag file the skill writes last>" }');
    } else {
      for (const key of Object.keys(s)) {
        if (!SETUP_KEYS.includes(key)) fail(`unknown setup key "${key}"`, `remove it; the allowed keys are ${SETUP_KEYS.join(', ')}`);
      }
      skill(s.skill, 'setup "skill"');
      if (typeof s.done !== 'string' || !s.done || path.isAbsolute(s.done) || s.done.split(/[\\/]/).includes('..')) {
        fail(`setup "done" is ${JSON.stringify(s.done)}`, 'give a file path inside the project, relative to its root, such as "docs/curator/.setup"');
      }
    }
  }
```

5. In `checkProject`, change `for (const slot of SLOTS)` (the missing-section loop) to `for (const slot of REQUIRED_SLOTS)`.
6. `module.exports`: add `REQUIRED_SLOTS` and `SETUP_KEYS`.

- [ ] **Step 5: Run the check tests**

Run: `node --test test/orchestra/check.test.js`
Expected: PASS.

- [ ] **Step 6: writing-plugins, init, and the contract-word test**

In `plugins/orchestra/skills/writing-plugins/SKILL.md`:
- First paragraph: "A plugin fills one slot: `workflow`, `stack-skills` or `curator`. A project must fill the first two; `curator` is optional."
- Add rows to the `orchestra.json` table:
  - ``| `curate` | `curator`, required | The skill that brings the project's direction docs up to date at the end of a run. orchestra runs it in the main session, not in a subagent, when the workflow is done. |``
  - ``| `setup` | `curator`, required | `skill`: the skill that sets the Curator up in a project; it may interview the user. `done`: a file path relative to the project root. The skill writes this file as its last step. orchestra checks the file on every run and runs the skill when it is missing. |``
- Add a section before "## The project config":

```markdown
## A Curator

A Curator keeps a project's direction docs current. orchestra knows only its declaration: `curate`,
`setup` and `guides`. Both skills run in the main session, so they may ask the user questions.

- `setup` runs before the first stage when the `done` file is missing. It commits its files and
  writes `done` last, so a setup that stops half-way runs again.
- `curate` runs when the workflow is done, before the report. Its inputs are `base`, `brief` and
  `notes`. It commits its edits.
- Each writes the result JSON `{ "status": "ok" }`, or `{ "status": "failed", "reason": "…" }`.
- Every skill of a Curator should also work by hand, with no run.
```

In `plugins/orchestra/skills/init/SKILL.md`:
- Description: "…or to change which workflow, Stack Skills or Curator plugin the project uses."
- Step 2: "Its `slot` is `workflow`, `stack-skills` or `curator`."
- Step 3, add: "The `curator` slot is optional. When a Curator plugin is in the list, ask the user if the project wants it; it keeps the project's backlog and direction docs current, and its setup interviews the user on the first run. When there is none, leave the slot out."
- Step 4: after the JSON example, add: "Add `\"curator\": { \"plugin\": \"<Curator plugin>\" }` only when the user chose one."
- Step 5: "Add `curator=<Curator folder>` to the command when the config has a curator section."

In `test/packaging.test.js`, in the contract-word test, add `...check.SETUP_KEYS` to the `words` set.

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add plugins/orchestra test
git commit -m "feat(orchestra): the optional curator slot with curate, setup and guides (S76)"
```

---

### Task 3: The `inline` action: setup and curate

`drive.js` runs the Curator's `setup` before the first stage when its flag is missing, and its `curate` on `done`. Both come out as an `inline` action, which the `orchestra:run` skill carries out in the main session.

**Files:**
- Create: `plugins/orchestra/lib/curator.js`
- Modify: `plugins/orchestra/lib/protocol.js` (add `inlinePrompt`)
- Modify: `plugins/orchestra/bin/drive.js` (`step`: setup before a dispatch, curate on done; `answer`: the inline prompt)
- Modify: `plugins/orchestra/lib/report.js` (`runOrder`: curate last)
- Modify: `plugins/orchestra/skills/run/SKILL.md` (the `inline` action, the permitted actions)
- Modify: `plugins/orchestra/skills/writing-plugins/SKILL.md` (one line on `inline` under "A Curator")
- Create: `test/orchestra/curator.test.js`
- Modify: `test/orchestra/drive.test.js` (a curator project, end to end)
- Modify: `test/packaging.test.js` (the run skill handles `inline`)

**Interfaces:**
- Consumes: `check` contract from Task 2 (`resolved.slots.curator.declaration.curate`, `.setup.skill`, `.setup.done`); `withPrompt`, `guidesFor` from Task 1.
- Produces:
  - `curator.setup(project, runDir, resolved) → action | null` and `curator.curate(project, runDir, resolved) → action | null`. `null` means nothing to do. An action is `inline` or `failed`.
  - The `inline` action: `{ action: 'inline', skill: '<plugin>:<skill>', inputs, result: 'tmp/runs/<branch>/<setup|curate>.result.json', runDir }`, plus `prompt`, `branch` and `worktree` from `answer`.
  - `protocol.inlinePrompt(action, root) → string`.

- [ ] **Step 1: Write the failing curator unit tests**

Create `test/orchestra/curator.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeJson } = require('../helpers');
const curator = require('../../plugins/orchestra/lib/curator');
const { inlinePrompt } = require('../../plugins/orchestra/lib/protocol');

const RUN = 'tmp/runs/task/x';
const resolved = { slots: { curator: { plugin: 'cur', declaration: { curate: 'curate', setup: { skill: 'setup', done: 'docs/curator/.setup' } } } } };

function root() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-'));
  writeJson(path.join(dir, RUN, 'run.json'), { base: 'abc', branch: 'task/x', spec: 'docs/runs/task/x/brief.md', docs: 'docs/runs/task/x' });
  return dir;
}

test('no curator slot: nothing to do', () => {
  const dir = root();
  assert.equal(curator.setup(dir, RUN, { slots: {} }), null);
  assert.equal(curator.curate(dir, RUN, { slots: {} }), null);
});

test('a missing flag gives an inline setup; the flag ends it', () => {
  const dir = root();
  assert.deepEqual(curator.setup(dir, RUN, resolved), { action: 'inline', skill: 'cur:setup', inputs: { done: 'docs/curator/.setup' }, result: `${RUN}/setup.result.json`, runDir: RUN });
  fs.mkdirSync(path.join(dir, 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/curator/.setup'), '');
  assert.equal(curator.setup(dir, RUN, resolved), null);
});

test('a setup that ends ok but writes no flag fails once, then runs again', () => {
  const dir = root();
  writeJson(path.join(dir, RUN, 'setup.result.json'), { status: 'ok' });
  const a = curator.setup(dir, RUN, resolved);
  assert.equal(a.action, 'failed');
  assert.match(a.reason, /cur:setup ended ok but did not write docs\/curator\/\.setup/);
  assert.equal(curator.setup(dir, RUN, resolved).action, 'inline');
});

test('curate on done gives an inline curate with base, brief and notes; ok ends it', () => {
  const dir = root();
  const a = curator.curate(dir, RUN, resolved);
  assert.deepEqual(a, { action: 'inline', skill: 'cur:curate', inputs: { base: 'abc', brief: 'docs/runs/task/x/brief.md', notes: 'docs/runs/task/x' }, result: `${RUN}/curate.result.json`, runDir: RUN });
  writeJson(path.join(dir, a.result), { status: 'ok' });
  assert.equal(curator.curate(dir, RUN, resolved), null);
});

test('a failed curate stops the call once, then runs again', () => {
  const dir = root();
  writeJson(path.join(dir, RUN, 'curate.result.json'), { status: 'failed', reason: 'BACKLOG.md is not valid' });
  assert.deepEqual(curator.curate(dir, RUN, resolved), { action: 'failed', reason: 'BACKLOG.md is not valid', runDir: RUN });
  assert.equal(curator.curate(dir, RUN, resolved).action, 'inline');
});

test('a result that is not JSON is a failure', () => {
  const dir = root();
  fs.writeFileSync(path.join(dir, RUN, 'curate.result.json'), '{ not json');
  assert.match(curator.curate(dir, RUN, resolved).reason, /Invalid result JSON/);
});

test('the inline prompt says to work in this session, in the worktree, and names the result', () => {
  const p = inlinePrompt({ skill: 'cur:curate', inputs: { base: 'abc' }, result: `${RUN}/curate.result.json` }, '/r');
  assert.match(p, /^Invoke the skill `cur:curate` in this session and follow it\. It may ask the user questions; ask them\./);
  assert.match(p, /Work in `\/r`\./);
  assert.match(p, /- base: abc/);
  assert.match(p, /write the result JSON that the skill describes to `tmp\/runs\/task\/x\/curate\.result\.json`/);
  assert.doesNotMatch(p, /subagent|priority/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/orchestra/curator.test.js`
Expected: FAIL (`Cannot find module '../../plugins/orchestra/lib/curator'`).

- [ ] **Step 3: Implement `lib/curator.js` and `inlinePrompt`**

Create `plugins/orchestra/lib/curator.js`:

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// The Curator runs in the main session, not in a subagent, so it can ask the user (S76): setup once,
// before the first stage, while its flag file is missing; curate when the workflow is done.

function readResult(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { status: 'failed', reason: `Invalid result JSON in ${file}: ${e.message}` };
  }
}

function inline(c, skill, name, runDir, inputs) {
  return { action: 'inline', skill: `${c.plugin}:${skill}`, inputs, result: `${runDir}/${name}.result.json`, runDir };
}

// No result: run the skill. ok: done. failed: stop this call once; the next call runs it again (S32).
function settle(project, a) {
  const file = path.join(project, a.result);
  const res = readResult(file);
  if (!res) return a;
  if (res.status === 'ok') return null;
  if (res.reported) {
    fs.rmSync(file);
    return a;
  }
  fs.writeFileSync(file, JSON.stringify({ ...res, status: 'failed', reported: true }, null, 2) + '\n');
  return { action: 'failed', reason: res.reason || `${a.skill} failed. See ${a.result}.`, runDir: a.runDir };
}

function setup(project, runDir, resolved) {
  const c = resolved.slots.curator;
  if (!c) return null;
  const { skill, done } = c.declaration.setup;
  if (fs.existsSync(path.join(project, done))) return null;
  const a = inline(c, skill, 'setup', runDir, { done });
  const res = readResult(path.join(project, a.result));
  // The flag, not the result, says that setup is done. An ok with no flag runs setup again, never loops.
  if (res && res.status === 'ok') {
    fs.rmSync(path.join(project, a.result));
    return { action: 'failed', reason: `${a.skill} ended ok but did not write ${done}. It runs again on the next call.`, runDir };
  }
  return settle(project, a);
}

function curate(project, runDir, resolved) {
  const c = resolved.slots.curator;
  if (!c) return null;
  const run = JSON.parse(fs.readFileSync(path.join(project, runDir, 'run.json'), 'utf8'));
  return settle(project, inline(c, c.declaration.curate, 'curate', runDir, { base: run.base, brief: run.spec, notes: run.docs }));
}

module.exports = { setup, curate };
```

In `plugins/orchestra/lib/protocol.js`, add before `module.exports`, and export `inlinePrompt`:

```js
// For an inline action: the main session runs the skill itself, so the prompt has no subagent rules.
function inlinePrompt(a, root) {
  return [
    `Invoke the skill \`${a.skill}\` in this session and follow it. It may ask the user questions; ask them.`,
    `Work in \`${root}\`. Run every command from there; every path below is relative to it.`,
    'Inputs:',
    ...Object.entries(a.inputs).map(([key, value]) => `- ${key}: ${value}`),
    `When you finish, write the result JSON that the skill describes to \`${a.result}\`.`,
  ].join('\n');
}
```

- [ ] **Step 4: Run the curator tests**

Run: `node --test test/orchestra/curator.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing end-to-end drive test**

In `test/orchestra/drive.test.js`:

1. Change `project()` to take an option and fill the curator slot when asked:

```js
function project({ curator } = {}) {
  const dir = makeRepo();
  const st = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  writePlugin(st, 'st', { slot: 'stack-skills', build: { run: 'node -e "process.exit(0)"', guide: 'fix-build' }, gates: [] });
  const config = { workflow: { plugin: 'orc-standard-workflow' }, 'stack-skills': { plugin: 'st' } };
  const dirs = { workflow: path.join(PLUGINS, 'orc-standard-workflow'), 'stack-skills': st };
  if (curator) {
    const cur = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-'));
    writePlugin(cur, 'cur', { slot: 'curator', curate: 'curate', setup: { skill: 'setup', done: 'docs/curator/.setup' }, guides: { plan: 'plan-guide' } });
    config.curator = { plugin: 'cur' };
    dirs.curator = cur;
  }
  writeJson(path.join(dir, '.orchestra/config.json'), config);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'config');
  git(dir, 'push');
  resolve(dir, dirs, path.join(PLUGINS, 'orchestra'));
  fs.writeFileSync(path.join(dir, '.orchestra/task.txt'), 'Add a discount\n');
  return dir;
}
```

2. Add the test:

```js
test('with a curator: setup runs first, plan gets the curator guide, curate runs on done and is last in the report', () => {
  const dir = project({ curator: true });
  const setup = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(setup.action, 'inline');
  assert.equal(setup.skill, 'cur:setup');
  assert.match(setup.prompt, /in this session/);
  const root = wt(dir, setup);
  fs.mkdirSync(path.join(root, 'docs/curator'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/curator/.setup'), '');
  git(root, 'add', 'docs/curator');
  git(root, 'commit', '-m', 'docs(curator): setup');
  writeJson(path.join(root, setup.result), { status: 'ok' });

  let a = drive(dir);
  assert.equal(a.skill, 'orc-standard-workflow:spec');
  assert.doesNotMatch(a.prompt, /cur:plan-guide/);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'spec', status: 'ok' });
  a = drive(dir);
  assert.equal(a.skill, 'orc-standard-workflow:plan');
  assert.match(a.prompt, /- `cur:plan-guide`/);
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan', status: 'ok' });
  a = drive(dir);
  fs.writeFileSync(path.join(wt(dir, a), a.inputs.plan), '# Plan\n\n### T1 — a task\n');
  writeJson(path.join(wt(dir, a), a.result), { stage: 'plan-check', status: 'ok' });
  const code = drive(dir);
  writeJson(path.join(wt(dir, code), code.result), { stage: 'code', status: 'ok' });
  const review = toReview(dir);
  writeJson(path.join(wt(dir, review), review.result), { stage: 'logic-review', status: 'ok' });

  const curate = afterReview(dir);
  assert.equal(curate.action, 'inline');
  assert.equal(curate.skill, 'cur:curate');
  assert.equal(curate.inputs.brief, 'docs/runs/task/add-a-discount/brief.md');
  writeJson(path.join(wt(dir, curate), curate.result), { status: 'ok' });

  const done = drive(dir);
  assert.equal(done.action, 'done');
  const rows = doneReport(dir, done).split('\n').filter(l => /^\| (setup|spec|curate|phase-finish) \|/.test(l)).map(l => l.split(' | ')[0].slice(2));
  assert.deepEqual(rows, ['setup', 'spec', 'phase-finish', 'curate']);
});

test('without a curator no action is inline', () => {
  const dir = project();
  const a = drive(dir, ['--task-file', '.orchestra/task.txt']);
  assert.equal(a.action, 'dispatch');
  assert.equal(a.skill, 'orc-standard-workflow:spec');
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `node --test test/orchestra/drive.test.js`
Expected: FAIL (the first action is the spec dispatch, not `inline`).

- [ ] **Step 7: Wire setup and curate into drive.js and the report**

In `plugins/orchestra/bin/drive.js`:

1. Line 7: `const { validateAction, withPrompt, inlinePrompt, guidesFor, roleError } = require('../lib/protocol');` and add `const curator = require('../lib/curator');` after the `worktree` import.
2. In `answer`, replace the `prompted` line from Task 1 with:

```js
  const prompts = {
    dispatch: a => withPrompt(a, root, guidesFor(a.role, load(root), readConfig(root))),
    inline: a => ({ ...a, prompt: inlinePrompt(a, root) }),
  };
  const prompted = prompts[action.action] ? prompts[action.action](action) : action;
```

3. In `step`, the `dispatch` branch becomes:

```js
    if (a.action === 'dispatch') {
      const bad = roleError(a, resolved.slots.workflow.declaration);
      if (bad) return finish(project, { action: 'failed', reason: bad, runDir: a.runDir }, resolved);
      // ponytail: the held-back dispatch counts as one of the workflow's two dispatches of that stage; once per project.
      const held = curator.setup(project, a.runDir, resolved);
      if (held && held.action === 'failed') return finish(project, held, resolved);
      if (held) {
        remember(project, held);
        return held;
      }
      remember(project, a);
      return a;
    }
    if (a.action === 'done') {
      const c = curator.curate(project, a.runDir, resolved);
      if (c) return c.action === 'failed' ? finish(project, c, resolved) : c;
    }
```

   (Keep the existing `decide` and `phase` lines after it.)

In `plugins/orchestra/lib/report.js`, in `runOrder`, change the second filter so curate is taken last by the final `results.forEach(take)`:

```js
  results.filter(f => f !== 'curate.result.json' && !f.startsWith('phase-') && !PHASES.some(p => f.startsWith(`${p}.`))).forEach(take);
```

- [ ] **Step 8: Run the drive tests**

Run: `node --test test/orchestra/drive.test.js`
Expected: PASS, the old tests too.

- [ ] **Step 9: The run skill carries out `inline`**

In `plugins/orchestra/skills/run/SKILL.md`, in the list of actions, after the `dispatch` bullet:

```markdown
- `inline`: do this one yourself, in this session, not in a subagent. orchestra prints it for a
  Curator skill that may talk to the user. Follow the `prompt` text exactly: invoke the skill it
  names, ask the user its questions, work only in `worktree`, and write the result file. Then run
  `node <orchestra>/bin/drive.js` again, with no task.
```

In "Permitted actions", change the first bullet to:

```markdown
- Do not edit project files yourself. Subagents do the work in the run's worktree. Two exceptions:
  the user's answers to a `decide`, written to `decisions.md` inside the worktree as above, and the
  work of an `inline` action.
```

and the last bullet's last sentence to: "Never do a stage yourself; an `inline` action is not a stage."

In `plugins/orchestra/skills/writing-plugins/SKILL.md`, in "A Curator", add: "orchestra asks for each skill with an `inline` action, which the `orchestra:run` skill carries out in the main session. Only orchestra prints `inline`; a workflow's `next.js` never does."

In `test/packaging.test.js`, in the test "the run skill stops when it cannot dispatch a subagent, and never does a stage itself", add:

```js
  assert.match(text, /- `inline`: do this one yourself, in this session, not in a subagent\./);
```

- [ ] **Step 10: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add plugins/orchestra test
git commit -m "feat(orchestra): the inline action runs the Curator's setup and curate (S76)"
```

---

### Task 4: The design docs and the version

**Files:**
- Modify: `docs/DESIGN.md` (§4.2, §5.1, §5.2, §7, §8.1, §9, and a new §9a "The Curator contract")
- Modify: all ten manifests: `plugins/*/plugin.json` and `plugins/*/.claude-plugin/plugin.json` (`0.12.0` → `0.13.0`)

**Interfaces:**
- Consumes: the contract of Tasks 1-3.
- Produces: nothing for code.

- [ ] **Step 1: DESIGN.md**

- §4.2: after the example, change "A workflow's `orchestra.json` has `slot: workflow`, its `config` keys and its own `gates` in the same format. It has no `build` and no `guides`." to: "A workflow's `orchestra.json` has `slot: workflow`, its `config` keys, its `roles` (the roles of its stages: `spec`, `plan`, `code`) and its own `gates` in the same format. It has no `build` and no `guides`. `guides` maps a role to a skill (S76)."
- §5.1 step 2: "Asks which plugin fills each slot. The `curator` slot is optional (S76)."
- §5.2: append to step 4: "The driver loop also prints `inline` for the Curator: its `setup` before the first stage while the `done` file is missing, and its `curate` when the workflow is done. `orchestra:run` carries out an `inline` action in the main session (S76)."
- §7 table: add a row ``| Roles | `roles` in `orchestra.json`; each dispatch of a stage with a role carries `role`. orchestra adds the guides of that role to the prompt and fails a role the workflow did not declare (S76). |``
- §8.1: in rows 2, 3 and 4 replace "Loads the stack's plan guide" / "Loads the stack's code guide" with "Role `plan`: gets the plan guides" / "Role `code`: gets the code guides"; in row 1 add "Role `spec`". Change "A guide is on when the stack plugin declares it, unless `disable` lists it (S53, S40)." to "A guide is on when a slot plugin declares it for the stage's role, unless `disable` lists it (S53, S40, S76)."
- §9 table: replace the `guides.plan` and `guides.code` rows with one row ``| `guides` | no | `{ "<role>": "<skill>" }`: short rules for the stages of one role, 5–15 per area (R3, S76). |``
- New §9a after §9:

```markdown
## 9a. The Curator contract

| Part | Required | Meaning |
|---|---|---|
| `curate` | yes | The skill that updates the direction docs when the workflow is done. Runs inline in the main session; inputs `base`, `brief`, `notes`; it commits its edits. |
| `setup` | yes | `{ skill, done }`. The skill runs inline before the first stage while the file `done` is missing; it writes `done` last. |
| `guides` | no | As for Stack Skills; listed before the Stack Skills guides. |
| `manifest` skill | yes | Resolution (5.2). |

The `curator` section of the config is optional. The design of the Curator plugin itself is in
`docs/superpowers/specs/2026-10-16-curator-design.md` (S76).
```

- [ ] **Step 2: The version**

Run from the repo root:

```bash
for f in plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json; do sed -i '' 's/"version": "0.12.0"/"version": "0.13.0"/' "$f"; done
grep -h '"version"' plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json | sort | uniq -c
```

Expected: `10 "version": "0.13.0"` (one line). If a manifest has no space after the colon, edit it by hand.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/DESIGN.md plugins
git commit -m "docs: the Curator contract and guides by role in the design; plugins 0.13.0 (S76)"
```

---

## After the plan

- Tell the user which sections of `docs/guide.html` are out of date (guides by role, the `curator` slot, the `inline` action, the version and the last `S` number) and offer to update them (CLAUDE.md "Guide").
- Plan 2 (curate and direction in `orc-curator`) starts from this contract.
