#!/usr/bin/env node

import { run } from '../src/index.js';

const useColor = !process.env.NO_COLOR && (process.env.FORCE_COLOR || process.stderr.isTTY);
const red = (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s);
const dim = (s) => (useColor ? `\x1b[90m${s}\x1b[0m` : s);

run().catch((err) => {
  const isUserError = err && (err.isUserError || err.name === 'UserError');
  const prefix = red('Error:');
  if (isUserError) {
    console.error(`${prefix} ${err.message}`);
    process.exit(1);
  }
  console.error(`${prefix} ${err.message || err}`);
  if (process.env.DEBUG || process.env.NODE_DEBUG) {
    console.error(err.stack || '');
  } else {
    console.error(dim('Run with --debug for a stack trace.'));
  }
  process.exit(2);
});
