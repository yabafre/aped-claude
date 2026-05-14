import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { references } from '../src/templates/references.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_TMPL_PATH = join(
  __dirname,
  '..',
  'src/templates/skills/aped-discuss-epic/SKILL.md.tmpl',
);
const SKILL_MD_PATH = join(
  __dirname,
  '..',
  'src/templates/skills/aped-discuss-epic/SKILL.md',
);
const ETHOS_PATH = join(__dirname, '..', 'src/templates/ethos.md');

const TMPL_CONTENT = readFileSync(SKILL_TMPL_PATH, 'utf-8');
const MD_CONTENT = readFileSync(SKILL_MD_PATH, 'utf-8');
const ETHOS_CONTENT = readFileSync(ETHOS_PATH, 'utf-8');

describe('aped-discuss-epic skill (6.9.0)', () => {
  it('description routes on the SPIDR / discuss-epic trigger phrases', () => {
    const descMatch = TMPL_CONTENT.match(/^description:\s*'(.+)'$/m);
    expect(descMatch, 'description frontmatter line not found').toBeTruthy();
    const desc = descMatch[1].toLowerCase();

    const triggers = [
      'discuss epic',
      'lock decisions for epic',
      'epic implementation decisions',
      'spidr for epic',
    ];
    for (const t of triggers) {
      expect(desc, `trigger phrase "${t}" missing from description`).toContain(t);
    }
  });

  it('SKILL.md is in sync with .tmpl (gen-skill-docs ran)', () => {
    expect(MD_CONTENT.length).toBeGreaterThan(0);
    expect(MD_CONTENT).toContain('aped-discuss-epic');
    expect(MD_CONTENT).toContain('SPIDR');
    expect(MD_CONTENT).toContain('Spike');
  });

  it('cites ETHOS.md#aped-discuss-epic and the anchor exists', () => {
    expect(MD_CONTENT).toMatch(/ETHOS\.md#aped-discuss-epic/);
    expect(ETHOS_CONTENT).toMatch(/^### aped-discuss-epic\s*$/m);
  });

  it('declares the SPIDR axes in the body (Spike / Paths / Interfaces / Data / Rules)', () => {
    for (const axis of ['Spike', 'Paths', 'Interfaces', 'Data', 'Rules']) {
      expect(MD_CONTENT, `axis "${axis}" missing`).toContain(axis);
    }
  });
});

describe('epic-context.schema.json — Implementation decisions section (6.9.0)', () => {
  const APED_DIR = '.aped';
  const OUTPUT_DIR = 'aped-output';
  const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
  const ALL_REFS = references({ apedDir: APED_DIR });

  function findScript(suffix) {
    return ALL_SCRIPTS.find((x) => x.path.endsWith(suffix));
  }
  function findRef(suffix) {
    return ALL_REFS.find((x) => x.path.endsWith(suffix));
  }

  function setup() {
    const root = mkdtempSync(join(tmpdir(), 'aped-de-test-'));
    mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
    mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });
    mkdirSync(join(root, OUTPUT_DIR, 'epics-context'), { recursive: true });
    const validator = findScript('scripts/validate-epic-context.sh');
    const walker = findScript('scripts/lib/markdown-schema-walk.mjs');
    const schema = findRef('data/epic-context.schema.json');
    writeFileSync(join(root, validator.path), validator.content);
    chmodSync(join(root, validator.path), 0o755);
    writeFileSync(join(root, walker.path), walker.content);
    writeFileSync(join(root, schema.path), schema.content);
    return root;
  }

  function run(root, rel) {
    const r = spawnSync(
      'bash',
      [join(root, APED_DIR, 'scripts', 'validate-epic-context.sh'), join(root, rel)],
      { encoding: 'utf8' },
    );
    return { code: r.status ?? -1, stderr: r.stderr ?? '' };
  }

  const LEGACY_CACHE = `# Epic 1 Context

## Scope from PRD

FR-1, FR-2.

## Architecture references

- See architecture.md §Auth.

## UX references

- See ux/auth-flow.md.

## Project context (brownfield only)

N/A — greenfield.

## Lessons applicable

None yet.

## Previous stories — outcomes

(empty until story 1-1 ships)
`;

  it('validates a legacy 6.8.0 epic-context cache (no Implementation decisions block)', () => {
    const sandbox = setup();
    try {
      const target = join(OUTPUT_DIR, 'epics-context', 'epic-1-context.md');
      writeFileSync(join(sandbox, target), LEGACY_CACHE);
      const r = run(sandbox, target);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('validates a 6.9.0 cache WITH an Implementation decisions block', () => {
    const sandbox = setup();
    try {
      const target = join(OUTPUT_DIR, 'epics-context', 'epic-1-context.md');
      const enriched = LEGACY_CACHE.replace(
        '## Previous stories — outcomes',
        `## Implementation decisions

**Date:** 2026-05-14
**Decided across stories:** 1-1-login, 1-2-signup, 1-3-reset

- **Spike:** N/A — auth provider already chosen in architecture.md.
- **Paths:** /api/auth/* for all auth verbs. UI under /auth/.
- **Interfaces:** AuthError { code: 'INVALID' | 'EXPIRED' | 'LOCKED' }.
- **Data:** Session stored server-side; client receives opaque token.
- **Rules:** All auth verbs idempotent; lockout after 5 failed attempts.

## Previous stories — outcomes`,
      );
      writeFileSync(join(sandbox, target), enriched);
      const r = run(sandbox, target);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
