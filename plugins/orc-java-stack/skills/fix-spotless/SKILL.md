---
name: fix-spotless
description: How to read a failed `spotless:apply` in a Maven project. A fix guide for the orchestra fixer.
---

# Fix Spotless

`spotless:apply` formats the code; it does not fail on unformatted code. When it fails, the cause is
either a Java syntax error or a broken Spotless set-up in the `pom.xml`.

1. A Java parse error names a file and a line: fix the syntax in that file.
2. Every other failure is the set-up. Do not change any `pom.xml`: the fixer never changes a tool's
   configuration. Find the case below, and write the result as `failed` with the case letter and its
   fix in `reason`, so the human can fix the set-up.

| Case | Error | Cause | Fix for the human |
|---|---|---|---|
| A | `No plugin found for prefix 'spotless'`, one module | No `<plugin>` block, or it is outside `<build>` | Add the plugin to `<build><pluginManagement>` |
| B | The prefix fails on a recursive run, every module `SKIPPED`; `-N` or `-pl` works | The first reactor module (often a `bom` with `packaging=pom`) has no `<parent>`, so it does not inherit `pluginManagement` | Copy the version properties and the full plugin block into that module's pom, with a comment that says why |
| C | `Spotless plugin absent from the project: <module>` | The module does not inherit or activate the plugin | As B for that module, or give it the shared parent |
| D | A `spotless-maven-plugin.version` property, but no plugin | A cherry-pick carried only the version bump | Add the plugin block |
| E | `verify` is green, but Spotless never ran | The `<executions>` block is only in `pluginManagement`, which does not activate it | Add the executions block to the active `<build><plugins>` of the parent pom |
