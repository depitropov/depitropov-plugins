# Check Minors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the deferred minors of the plan 2 final review in `orchestra check`.

**Architecture:** Four small changes in `plugins/orchestra/lib/check.js`, each pinned by one test in `test/orchestra/check.test.js`, plus one wording line in the init skill.

**Tech Stack:** Node 22, standard library only, `node:test`.

**Spec:** `docs/TENSIONS.md` S70, `docs/DECISIONS.md` S70, `docs/DESIGN.md` §5.3.

## Scope

| # | Minor (final review of plan 2) | Decision |
|---|---|---|
| 1 | Inherited keys (`toString`, `constructor`) count as declared | Use `Object.hasOwn` |
| 2 | A dry run whose scratch repo cannot be built blames `next.js` | Separate message for the set-up |
| 3 | `grep` with `{config.x}` is compiled only with the default | The config check also compiles it with the project's value |
| 4 | Typed config values get no range check (`tasks-per-coder: 0`) | Dropped: `next.js` calls `settings()` before `prepare()`, so the run fails before it creates a branch |
| 5 | init says it changes only two files, but `resolve.js` also writes `resolved.json` | Reword the line |
| 6 | The frontmatter rule assumes LF line endings | Read `SKILL.md` with CRLF turned into LF |

## Global Constraints

- Node, standard library only (S11).
- Every failure line has the form `<where>: <problem>. Fix: <fix>.`
- Run the tests with `npm test`.

## Review Focus

1. A project value equal to the default must not report the same broken `grep` twice (the declaration rule already reports it). Pinned: the minor 3 test uses a value that differs from the default, and the code checks only gates whose `grep` names a key the section sets.

---

### Task 1: The check minors

**Files:**
- Modify: `plugins/orchestra/lib/check.js` (`checkDeclaration`, `checkSection`, `checkSkills`, `dryRun`)
- Modify: `plugins/orchestra/skills/init/SKILL.md:74`
- Test: `test/orchestra/check.test.js`

**Interfaces:** none new. All helpers the tests use (`errors`, `stack`, `project`, `wf`, `st`, `tmp`, `writePlugin`, `checkPlugin`, `checkProject`) already exist at the top level of `test/orchestra/check.test.js`.

- [ ] **Step 1: Write the failing tests**

Append to `test/orchestra/check.test.js`:

```js
test('inherited object keys do not count as declared', () => {
  const out = errors(stack({ gates: [{ name: 'a', phase: 'finish', kind: 'tool', run: 'x {config.constructor}', always: true }] }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /uses \{config\.constructor\}/);
  const cfg = checkProject(project({ workflow: { plugin: 'wf', toString: 'x' }, 'stack-skills': { plugin: 'st' } }, { workflow: wf, 'stack-skills': st }));
  assert.equal(cfg.length, 1, cfg.join(' | '));
  assert.match(cfg[0], /unknown key "toString"/);
});

test('a dry run that cannot build its scratch repo says so, and does not blame next.js', () => {
  const dir = writePlugin(tmp('wf-'), 'wf', { slot: 'workflow', gates: [] });
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin/next.js'), 'console.log(JSON.stringify({ action: "done" }))\n');
  const saved = process.env.PATH;
  process.env.PATH = '';
  let out;
  try {
    out = checkPlugin(dir).join('\n');
  } finally {
    process.env.PATH = saved;
  }
  assert.match(out, /wf\/bin\/next\.js: the dry run could not build its scratch repo: .+\. Fix: /);
  assert.doesNotMatch(out, /did not print a valid action/);
});

test('a project value that breaks a gate grep fails the config check', () => {
  const d = stack({ config: { pat: { type: 'string', default: '@Entity' } }, gates: [{ name: 'g', phase: 'finish', kind: 'agent', skill: 's', grep: '{config.pat}' }] });
  const out = checkProject(project({ workflow: { plugin: 'wf' }, 'stack-skills': { plugin: 'st', pat: '(' } }, { workflow: wf, 'stack-skills': d }));
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /the values of section "stack-skills" make the "grep" of gate "g" invalid: .+\. Fix: /);
});

test('a SKILL.md with Windows line endings passes the frontmatter rule', () => {
  const dir = writePlugin(tmp('orc-'), 'orc');
  fs.writeFileSync(path.join(dir, 'skills/manifest/SKILL.md'), '---\r\nname: manifest\r\ndescription: d\r\n---\r\nBody\r\n');
  assert.deepEqual(checkPlugin(dir), []);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test test/orchestra/check.test.js`
Expected: the four new tests fail (`toString` gives the "is not a undefined" line; the dry-run test gets "did not print a valid action"; the grep test gets 0 lines; the CRLF test gets "it has no frontmatter").

- [ ] **Step 3: Use own keys only**

In `plugins/orchestra/lib/check.js`:
- In `checkDeclaration`, `placeholders`: replace `if (!config[m[1]])` with `if (!Object.hasOwn(config, m[1]))`.
- In `checkDeclaration`, the `grep` compile: replace `(config[key] ? String(config[key].default) : '')` with `(Object.hasOwn(config, key) ? String(config[key].default) : '')`.
- In `checkSection`: replace `} else if (!declared[key]) {` with `} else if (!Object.hasOwn(declared, key)) {`.

- [ ] **Step 4: Compile a gate's grep with the project's values**

In `checkSection`, after the `for (const [key, value] of Object.entries(section))` loop ends, add:

```js
  // A project value can break a gate's grep that the defaults compile. Only gates whose grep names a key
  // the section sets are tried, so a broken default is reported once, by the declaration rule.
  for (const g of Array.isArray(d.gates) ? d.gates : []) {
    if (!g || typeof g.grep !== 'string' || !Object.keys(section).some(k => g.grep.includes(`{config.${k}}`))) continue;
    try {
      new RegExp(g.grep.replace(PLACEHOLDER, (m, k) => String(Object.hasOwn(section, k) ? section[k] : declared[k] && declared[k].default)));
    } catch (e) {
      fail(`the values of section "${slot}" make the "grep" of gate "${g.name}" invalid: ${e.message}`, 'fix the value of the key that the pattern uses');
    }
  }
```

- [ ] **Step 5: Read SKILL.md with LF line endings**

In `checkSkills`, replace

```js
    const text = fs.readFileSync(path.join(skillsDir, s, 'SKILL.md'), 'utf8');
```

with

```js
    const text = fs.readFileSync(path.join(skillsDir, s, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
```

- [ ] **Step 6: Report a set-up failure of the dry run on its own**

Replace the whole body of `dryRun` from `const root = fs.mkdtempSync(...)` to the end of the function with:

```js
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-check-'));
  try {
    const env = cleanEnv();
    let project;
    let task;
    try {
      project = scratchRepo(root);
      const stack = { plugin: 'check-stack', version: '0.0.0', dir: root, declaration: { slot: 'stack-skills', build: { run: 'true' } } };
      fs.mkdirSync(path.join(project, '.orchestra'));
      fs.writeFileSync(path.join(project, CONFIG), JSON.stringify({ workflow: { plugin: label }, 'stack-skills': { plugin: stack.plugin } }) + '\n');
      for (const args of [['add', CONFIG], ['-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'config']]) {
        execFileSync('git', args, { cwd: project, env, stdio: 'ignore' });
      }
      const resolved = { orchestra: { dir: path.join(__dirname, '..') }, slots: { workflow: { plugin: label, version: '0.0.0', dir, declaration }, 'stack-skills': stack } };
      fs.writeFileSync(path.join(project, '.orchestra', 'resolved.json'), JSON.stringify(resolved) + '\n');
      task = path.join(root, 'task.txt');
      fs.writeFileSync(task, 'Dry run of orchestra check\n');
    } catch (e) {
      return [`${where}: the dry run could not build its scratch repo: ${e.message.split('\n')[0]}. Fix: check that git is installed and can commit in a new repo.`];
    }
    try {
      const printed = execFileSync(process.execPath, [nextJs, '--project', project, '--task-file', task], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
      const action = validateAction(JSON.parse(printed.trim().split('\n').pop()));
      if (action.action === 'failed') return [`${where}: the dry run ended with failed: ${action.reason}. Fix: make the first call of a new run work.`];
      return [];
    } catch (e) {
      return [`${where}: the dry run did not print a valid action: ${e.message.split('\n')[0]}. Fix: print one action of the orchestra protocol as JSON on the last line.`];
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
```

- [ ] **Step 7: Reword the init line**

In `plugins/orchestra/skills/init/SKILL.md`, replace

```
- Change only `.orchestra/config.json` and `.gitignore`.
```

with

```
- Change only `.orchestra/config.json` and `.gitignore`. The check in step 5 also writes
  `.orchestra/resolved.json`, which git ignores.
```

- [ ] **Step 8: Run all tests and see them pass**

Run: `npm test && node plugins/orchestra/bin/check.js plugins/orchestra plugins/orc-standard-workflow plugins/orc-java-stack`
Expected: PASS (113 tests) and `All checks passed.`

- [ ] **Step 9: Commit**

```bash
git add plugins/orchestra/lib/check.js plugins/orchestra/skills/init/SKILL.md test/orchestra/check.test.js
git commit -m "fix(orchestra): the deferred minors of orchestra check (S70)"
```
