#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { checkPlugin, checkProject } = require('../lib/check');

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('Usage: check.js <plugin-folder>…  or  check.js --project <dir>');
  process.exit(1);
}
const i = argv.indexOf('--project');
const failures = i >= 0 ? checkProject(path.resolve(argv[i + 1] || '.')) : argv.flatMap(dir => checkPlugin(path.resolve(dir)));
for (const f of failures) console.log(f);
console.log(failures.length ? `${failures.length} failed.` : 'All checks passed.');
process.exitCode = failures.length ? 1 : 0;
