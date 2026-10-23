---
name: manifest
description: Reports where the clean-code plugin is installed. Invoked by the orchestra clean-code gate to find measure.py; not for direct use.
---

# Manifest

Find the folder that holds this `SKILL.md`. Go two folders up. That folder holds `plugin.json` and
`skills/clean-code/measure.py`. Check that both files exist.

Answer with exactly one line and nothing else:

PLUGIN_DIR=<absolute path of that folder>
