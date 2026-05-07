import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { references } from '../src/templates/references.js';

// Cross-cutting smoke: the three validator launchers actually execute bash,
// the bash actually exec's node, and the Node walker actually emits the
// failure-shape contract documented in markdown-schema.dsl.md.

const APED_DIR = '.aped';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: 'aped-output' });
const ALL_REFS = references({ apedDir: APED_DIR });

const VALIDATORS = [
  { name: 'story', schemaSuffix: 'data/story.schema.json' },
  { name: 'epics', schemaSuffix: 'data/epics.schema.json' },
  { name: 'epic-context', schemaSuffix: 'data/epic-context.schema.json' },
];

function find(arr, suffix) {
  const t = arr.find((x) => x.path.endsWith(suffix));
  if (!t) throw new Error(`No template ending in ${suffix}`);
  return t;
}

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-schema-runtime-'));
  mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });

  const walker = find(ALL_SCRIPTS, 'scripts/lib/markdown-schema-walk.mjs');
  writeFileSync(join(root, walker.path), walker.content);

  for (const v of VALIDATORS) {
    const sh = find(ALL_SCRIPTS, `scripts/validate-${v.name}.sh`);
    writeFileSync(join(root, sh.path), sh.content);
    chmodSync(join(root, sh.path), 0o755);
    const schema = find(ALL_REFS, v.schemaSuffix);
    writeFileSync(join(root, schema.path), schema.content);
  }
  return root;
}

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('artefact-schema script runtime contract', () => {
  for (const v of VALIDATORS) {
    it(`validate-${v.name}.sh prints Usage and exits 2 on no args`, () => {
      const r = spawnSync('bash', [join(sandbox, APED_DIR, 'scripts', `validate-${v.name}.sh`)], {
        encoding: 'utf8',
      });
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/Usage:/);
    });

    it(`validate-${v.name}.sh exits 2 with "file not found" when target is missing`, () => {
      const r = spawnSync(
        'bash',
        [join(sandbox, APED_DIR, 'scripts', `validate-${v.name}.sh`), '/tmp/nope-does-not-exist.md'],
        { encoding: 'utf8' },
      );
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/file not found/);
    });

    it(`validate-${v.name}.sh exits 2 when the Node walker is missing`, () => {
      rmSync(join(sandbox, APED_DIR, 'scripts', 'lib', 'markdown-schema-walk.mjs'));
      const tmpFile = join(sandbox, 'tmp-target.md');
      writeFileSync(tmpFile, '# Stub\n');
      const r = spawnSync(
        'bash',
        [join(sandbox, APED_DIR, 'scripts', `validate-${v.name}.sh`), tmpFile],
        { encoding: 'utf8' },
      );
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/walker not found/);
      // Re-install walker for subsequent tests in the suite (per-test setup).
      const walker = find(ALL_SCRIPTS, 'scripts/lib/markdown-schema-walk.mjs');
      writeFileSync(join(sandbox, walker.path), walker.content);
    });
  }
});
