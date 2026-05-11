// ETHOS.md is the canonical home of APED's Iron Laws (B1 — 6.5.0). Skills
// cite it by section anchor; the verdict + rationale live here only.
// Scaffolded to `<apedDir>/ETHOS.md` so relative citations `../ETHOS.md#...`
// from `<apedDir>/aped-X/...` resolve in both the source repo and downstream
// projects.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, 'ethos.md');

export function ethos(config) {
  const content = readFileSync(SOURCE, 'utf-8');
  return [{ path: `${config.apedDir}/ETHOS.md`, content }];
}
