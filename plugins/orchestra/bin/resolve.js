#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { resolve } = require('../lib/resolved');

const slotDirs = {};
for (const pair of process.argv.slice(2)) {
  const i = pair.indexOf('=');
  if (i < 1) {
    console.error(`Expected <slot>=<folder>, got "${pair}".`);
    process.exit(1);
  }
  slotDirs[pair.slice(0, i)] = pair.slice(i + 1);
}

try {
  const resolved = resolve(process.cwd(), slotDirs, path.join(__dirname, '..'));
  for (const [slot, s] of Object.entries(resolved.slots)) console.log(`${slot}: ${s.plugin} ${s.version} (${s.dir})`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
