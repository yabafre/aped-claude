import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { references } from '../src/templates/references.js';

// Cohort-3b (6.11.0) — architecture.md structural schema. Closes 5/5
// artefact-contract coverage from 6.3.0. Exercises the two new DSL fields:
// top_level_patterns (ADR-N at L2) + sub_sections_heading_pattern (Component
// at L3 under Phase 4). Oracle (oracle-arch.sh) keeps ADR/Component
// field-content semantics; this walker owns structural drift only.

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const ALL_REFS = references({ apedDir: APED_DIR });

function findScript(suffix) {
  const s = ALL_SCRIPTS.find((x) => x.path.endsWith(suffix));
  if (!s) throw new Error(`No script template ending in ${suffix}`);
  return s;
}
function findRef(suffix) {
  const r = ALL_REFS.find((x) => x.path.endsWith(suffix));
  if (!r) throw new Error(`No reference template ending in ${suffix}`);
  return r;
}

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-arch-schema-test-'));
  mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  const validator = findScript(`${APED_DIR}/scripts/validate-architecture.sh`);
  const walker = findScript('scripts/lib/markdown-schema-walk.mjs');
  const schema = findRef('data/architecture.schema.json');
  writeFileSync(join(root, validator.path), validator.content);
  chmodSync(join(root, validator.path), 0o755);
  writeFileSync(join(root, walker.path), walker.content);
  writeFileSync(join(root, schema.path), schema.content);
  return { root, validatorPath: validator.path };
}

function run(root, validatorPath, archRelPath) {
  const r = spawnSync(
    'bash',
    [join(root, validatorPath), join(root, archRelPath)],
    { encoding: 'utf8' },
  );
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

// Conformant fixture mirrors aped-arch/step-01-init.md skeleton (6.11.0):
// 9 Phase L2 + fixed L3 under Phase 2/3/4. Phase 2b is required:false so
// we include it to exercise the open L3 case below; absence is also OK.
const ARCH_CONFORMANT = `---
artefact: architecture
project: demo
---

# Architecture — demo

## Phase 1 — Context Analysis

Extracted FRs/NFRs, scale, integration points.

## Phase 2 — Technology Decisions

### Data Layer

Postgres 16.

### Authentication & Security

Clerk + JWT.

### API Design

tRPC for internal, REST for partner.

### Frontend

Next.js 16 App Router.

### Infrastructure

Vercel + Neon.

## Phase 2b — Council Dispatches

### Dispatch: tRPC vs gRPC

Chose tRPC. Minority: gRPC for streaming workloads.

## Phase 3 — Implementation Patterns

### Naming Conventions

camelCase TS, snake_case SQL.

### Code Structure

Feature-folder.

### Communication Patterns

Event bus for cross-domain.

### Process Rules

PR-based, no direct main.

## Phase 4 — Structure & Mapping

### Directory Tree

src/, tests/, docs/.

### FR → File Mapping

FR-1 → src/auth/login.ts.

### Integration Boundaries

Auth boundary at /api/auth.

### Shared Code Inventory

@repo/ui, @repo/db.

## Phase 5 — Validation

Coherence checklist all green.

## Phase 6 — Watch Items

- W-1: rate-limit assumption pending load test.

## Phase 7 — Residual Gaps

- G-1: OAuth provider list TBD.

## Phase 8 — Epic Zero

- E0.1: Provision Vercel + Neon.
`;

let sandbox;
let validatorPath;
beforeEach(() => {
  const s = setupSandbox();
  sandbox = s.root;
  validatorPath = s.validatorPath;
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('validate-architecture.sh — cohort-3b structural schema (6.11.0)', () => {
  it('exits 0 on a conformant skeleton', () => {
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), ARCH_CONFORMANT);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('flags a missing required L2 (Phase 4 removed)', () => {
    const broken = ARCH_CONFORMANT.replace(
      /## Phase 4 — Structure & Mapping[\s\S]*?## Phase 5/,
      '## Phase 5',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Phase 4 — Structure & Mapping'/);
  });

  it('flags an invented L2 not in top_level and not pattern-matched', () => {
    const broken = ARCH_CONFORMANT.replace(
      '## Phase 5 — Validation',
      '## Random Notes\n\nSomething.\n\n## Phase 5 — Validation',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented top-level heading 'Random Notes'/);
  });

  it('accepts an ADR pattern at L2 between Phase 3 and Phase 4', () => {
    const enriched = ARCH_CONFORMANT.replace(
      '## Phase 4 — Structure & Mapping',
      '## ADR-7: Use Postgres over MongoDB\n\n**Status:** accepted.\n**Context:** ...\n**Decision:** Postgres.\n**Consequences:** ...\n\n## Phase 4 — Structure & Mapping',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), enriched);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('accepts multiple ADRs at L2 in any position (free count, free order)', () => {
    const enriched = ARCH_CONFORMANT.replace(
      '## Phase 1 — Context Analysis',
      '## ADR-1: Pick the runtime\n\n**Status:** accepted.\n**Context:** ...\n**Decision:** Node 22.\n**Consequences:** ...\n\n## Phase 1 — Context Analysis',
    )
      .replace(
        '## Phase 3 — Implementation Patterns',
        '## ADR-2: Pick the DB\n\n**Status:** accepted.\n**Context:** ...\n**Decision:** Postgres.\n**Consequences:** ...\n\n## Phase 3 — Implementation Patterns',
      )
      .replace(
        '## Phase 8 — Epic Zero',
        '## ADR-3: Pick the auth provider\n\n**Status:** accepted.\n**Context:** ...\n**Decision:** Clerk.\n**Consequences:** ...\n\n## Phase 8 — Epic Zero',
      );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), enriched);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('exits 0 when Phase 2b is absent (required:false)', () => {
    const trimmed = ARCH_CONFORMANT.replace(
      /## Phase 2b — Council Dispatches[\s\S]*?## Phase 3/,
      '## Phase 3',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), trimmed);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('accepts an open L3 under Phase 2b (forbid_invented_sub_headings:false)', () => {
    const variant = ARCH_CONFORMANT.replace(
      '### Dispatch: tRPC vs gRPC',
      '### Choose: REST vs GraphQL',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), variant);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('accepts a Component: pattern at L3 under Phase 4 alongside the 4 fixed L3', () => {
    const enriched = ARCH_CONFORMANT.replace(
      '### Shared Code Inventory\n\n@repo/ui, @repo/db.\n',
      '### Shared Code Inventory\n\n@repo/ui, @repo/db.\n\n### Component: auth-service\n\n- Owner: backend team\n- Tech stack: Node 22, Postgres\n',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), enriched);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('flags an invented L3 under Phase 3 (no pattern there)', () => {
    const broken = ARCH_CONFORMANT.replace(
      '### Process Rules\n\nPR-based, no direct main.',
      '### Process Rules\n\nPR-based, no direct main.\n\n### Random Pattern\n\nFoo.',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented heading 'Random Pattern' not in schema/);
  });

  it('flags a missing required L3 under Phase 2 (Data Layer removed)', () => {
    const broken = ARCH_CONFORMANT.replace(
      /### Data Layer[\s\S]*?### Authentication & Security/,
      '### Authentication & Security',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(
      /missing required heading 'Data Layer' under 'Phase 2 — Technology Decisions'/,
    );
  });

  it('flags legacy architecture.md missing Phase 6/7/8 (drift signal)', () => {
    const legacy = ARCH_CONFORMANT.replace(
      /## Phase 6 — Watch Items[\s\S]*$/,
      '',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), legacy);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Phase 6 — Watch Items'/);
    expect(r.stderr).toMatch(/missing required heading 'Phase 7 — Residual Gaps'/);
    expect(r.stderr).toMatch(/missing required heading 'Phase 8 — Epic Zero'/);
  });

  it('does not flag an invented L3 that matches the Component pattern as out-of-schema', () => {
    // Counter-test for the pattern: replace one fixed Phase 4 L3 with a
    // Component entry. The fixed one (Shared Code Inventory) will be
    // flagged as missing, but the Component itself should NOT be flagged
    // as invented.
    const swap = ARCH_CONFORMANT.replace(
      '### Shared Code Inventory\n\n@repo/ui, @repo/db.\n',
      '### Component: legacy-monolith\n\n- Owner: platform team\n- Tech stack: Rails 7\n',
    );
    const target = join(OUTPUT_DIR, 'architecture.md');
    writeFileSync(join(sandbox, target), swap);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Shared Code Inventory'/);
    expect(r.stderr).not.toMatch(/invented heading 'Component: legacy-monolith'/);
  });
});
