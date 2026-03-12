#!/usr/bin/env node

import { run } from '../src/index.js';

run().catch((err) => {
  console.error('\x1b[31mError:\x1b[0m', err.message);
  process.exit(1);
});
