// Bash discipline lint (4.14.0) — verifies that no shipped .sh file uses the
// fragility patterns documented in handoff §5.1:
//   - grep -c in arithmetic context (produces "0\n0" under || echo 0)
//   - unwrapped grep in pipeline under set -euo pipefail
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

function collectShFiles() {
  const files = [];
  const dirs = [
    join(ROOT, 'scripts'),
    join(ROOT, 'src', 'templates', 'hooks'),
    join(ROOT, '.github', 'scripts'),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.sh')) files.push(join(dir, f));
    }
  }
  return files;
}

function extractEmbeddedScripts() {
  const scriptsJs = join(ROOT, 'src', 'templates', 'scripts.js');
  if (!existsSync(scriptsJs)) return [];
  const content = readFileSync(scriptsJs, 'utf-8');
  const scripts = [];
  const regex = /content:\s*`([\s\S]*?)`/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    if (m[1].includes('#!/usr/bin/env bash') || m[1].includes('set -euo pipefail')) {
      scripts.push({ name: `scripts.js:offset${m.index}`, content: m[1] });
    }
  }
  return scripts;
}

const SH_FILES = collectShFiles();
const EMBEDDED = extractEmbeddedScripts();

describe('bash discipline — standalone .sh files (4.14.0)', () => {
  for (const f of SH_FILES) {
    const name = f.replace(ROOT + '/', '');
    const content = readFileSync(f, 'utf-8');

    it(`${name} does not use grep -c in arithmetic context`, () => {
      const lines = content.split('\n');
      const violations = lines.filter(
        (l) => /\$\(.*grep\s+-c/.test(l) && !/wc -l/.test(l) && !l.trimStart().startsWith('#'),
      );
      expect(violations, `grep -c found without wc -l:\n${violations.join('\n')}`).toHaveLength(0);
    });
  }
});

describe('bash discipline — embedded scripts in scripts.js (4.14.0)', () => {
  for (const { name, content } of EMBEDDED) {
    it(`${name} does not use grep -c in arithmetic context`, () => {
      const lines = content.split('\n');
      const violations = lines.filter(
        (l) => /\$\(.*grep\s+-c/.test(l) && !/wc -l/.test(l) && !l.trimStart().startsWith('#'),
      );
      expect(violations, `grep -c found without wc -l:\n${violations.join('\n')}`).toHaveLength(0);
    });
  }
});
