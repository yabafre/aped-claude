import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { disableAped, enableAped, statusAped } from '../src/disable.js';

// 6.2.0 contract — `aped-method disable / enable / status` must be
// reversible, idempotent, and produce a snapshot that distinguishes
// originally-unflagged from originally-flagged skills.

let dir;

const SKILLS_FLAGGED = [
  'aped-arch',
  'aped-arch-audit',
  'aped-course',
  'aped-dev',
];
const SKILLS_UNFLAGGED = [
  'aped-analyze',
  'aped-brainstorm',
  'aped-checkpoint',
  'aped-claude',
  'aped-context',
];

const config = { apedDir: '.aped' };

function frontmatter({ disabled }) {
  return [
    '---',
    'name: skill',
    "description: 'use when'",
    disabled ? 'disable-model-invocation: true' : null,
    'license: MIT',
    '---',
    '',
    'body content here',
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

function scaffoldSkills() {
  for (const name of SKILLS_FLAGGED) {
    mkdirSync(join(dir, '.aped', name), { recursive: true });
    writeFileSync(
      join(dir, '.aped', name, 'SKILL.md'),
      frontmatter({ disabled: true }),
      'utf-8',
    );
  }
  for (const name of SKILLS_UNFLAGGED) {
    mkdirSync(join(dir, '.aped', name), { recursive: true });
    writeFileSync(
      join(dir, '.aped', name, 'SKILL.md'),
      frontmatter({ disabled: false }),
      'utf-8',
    );
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aped-disable-'));
  scaffoldSkills();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('disableAped', () => {
  it('flags every previously-unflagged skill and snapshots their names', () => {
    const result = disableAped(config, dir);

    expect(result.action).toBe('disabled');
    expect(result.newlySuppressed).toBe(SKILLS_UNFLAGGED.length);
    expect(result.originallyFlagged).toBe(SKILLS_FLAGGED.length);
    expect(result.total).toBe(SKILLS_FLAGGED.length + SKILLS_UNFLAGGED.length);

    for (const name of SKILLS_UNFLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c, `${name} must be flagged`).toMatch(/^disable-model-invocation: true$/m);
    }

    expect(existsSync(join(dir, '.aped', '.DISABLED'))).toBe(true);
    const snapshot = JSON.parse(
      readFileSync(join(dir, '.aped', '.disable-snapshot.json'), 'utf-8'),
    );
    expect(snapshot.version).toBe(1);
    expect(typeof snapshot.disabled_at).toBe('string');
    expect(snapshot.originally_unflagged.sort()).toEqual([...SKILLS_UNFLAGGED].sort());
  });

  it('is idempotent — re-running while disabled returns noop', () => {
    disableAped(config, dir);
    const second = disableAped(config, dir);
    expect(second.action).toBe('noop');
    expect(second.already).toBe(true);
  });

  it('does not flip originally-flagged skills (preserves their flag)', () => {
    disableAped(config, dir);
    for (const name of SKILLS_FLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      const matches = c.match(/^disable-model-invocation: true$/gm) || [];
      expect(matches.length, `${name} must keep exactly one flag line`).toBe(1);
    }
  });
});

describe('enableAped', () => {
  it('removes the flag from originally-unflagged skills only', () => {
    disableAped(config, dir);
    const result = enableAped(config, dir);

    expect(result.action).toBe('enabled');
    expect(result.restored).toBe(SKILLS_UNFLAGGED.length);
    expect(result.kept).toBe(SKILLS_FLAGGED.length);

    for (const name of SKILLS_UNFLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c, `${name} must NOT be flagged`).not.toMatch(/^disable-model-invocation: true$/m);
    }
    for (const name of SKILLS_FLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c, `${name} must STILL be flagged`).toMatch(/^disable-model-invocation: true$/m);
    }

    expect(existsSync(join(dir, '.aped', '.DISABLED'))).toBe(false);
    expect(existsSync(join(dir, '.aped', '.disable-snapshot.json'))).toBe(false);
  });

  it('is idempotent — re-running while already enabled returns noop', () => {
    const result = enableAped(config, dir);
    expect(result.action).toBe('noop');
    expect(result.already).toBe(true);
  });

  it('best-effort restore when snapshot is missing but marker remains', () => {
    disableAped(config, dir);
    rmSync(join(dir, '.aped', '.disable-snapshot.json'), { force: true });
    const result = enableAped(config, dir);
    expect(result.bestEffort).toBe(true);
    // Without the snapshot we strip the flag from ALL — including the originals.
    expect(result.restored).toBe(SKILLS_FLAGGED.length + SKILLS_UNFLAGGED.length);
  });
});

describe('statusAped', () => {
  it('reports enabled on a fresh install', () => {
    const s = statusAped(config, dir);
    expect(s.state).toBe('enabled');
    expect(s.total).toBe(SKILLS_FLAGGED.length + SKILLS_UNFLAGGED.length);
  });

  it('reports disabled with totals after a disable call', () => {
    disableAped(config, dir);
    const s = statusAped(config, dir);
    expect(s.state).toBe('disabled');
    expect(s.newlySuppressed).toBe(SKILLS_UNFLAGGED.length);
    expect(s.originallyFlagged).toBe(SKILLS_FLAGGED.length);
    expect(typeof s.lastToggle).toBe('string');
  });

  it('reports disabled-stale when marker exists but snapshot is missing', () => {
    disableAped(config, dir);
    rmSync(join(dir, '.aped', '.disable-snapshot.json'), { force: true });
    const s = statusAped(config, dir);
    expect(s.state).toBe('disabled-stale');
  });

  it('reports enabled again after enable', () => {
    disableAped(config, dir);
    enableAped(config, dir);
    const s = statusAped(config, dir);
    expect(s.state).toBe('enabled');
  });
});

// 6.3.2 — local mode: marker-only disable for per-developer suppression
// without committing frontmatter flips. The activation guard
// (check-enabled.sh) HALTs on the marker regardless of mode, so the
// runtime UX is identical; only the file footprint differs.
describe('disableAped — local mode (6.3.2)', () => {
  // Stub a git repo so .gitignore handling fires.
  beforeEach(() => {
    mkdirSync(join(dir, '.git'), { recursive: true });
  });

  it('writes marker with mode: local and skips frontmatter + snapshot', () => {
    const result = disableAped(config, dir, { local: true });

    expect(result.action).toBe('disabled');
    expect(result.mode).toBe('local');

    // Marker present, snapshot absent.
    expect(existsSync(join(dir, '.aped', '.DISABLED'))).toBe(true);
    expect(existsSync(join(dir, '.aped', '.disable-snapshot.json'))).toBe(false);

    // Marker carries mode: local.
    const markerContent = readFileSync(join(dir, '.aped', '.DISABLED'), 'utf-8');
    expect(markerContent).toMatch(/^mode:\s*local$/m);
    expect(markerContent).toMatch(/^disabled_at:\s*\d{4}-\d{2}-\d{2}T/m);

    // Frontmatters untouched — originals stay flagged, unflagged stay clean.
    for (const name of SKILLS_UNFLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c, `${name} unflagged should remain unflagged`).not.toMatch(/^disable-model-invocation: true$/m);
    }
    for (const name of SKILLS_FLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c, `${name} originally flagged stays flagged`).toMatch(/^disable-model-invocation: true$/m);
    }
  });

  it('auto-appends .aped/.DISABLED to .gitignore (creates if absent)', () => {
    disableAped(config, dir, { local: true });
    const gitignorePath = join(dir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const ignore = readFileSync(gitignorePath, 'utf-8');
    expect(ignore).toMatch(/^\.aped\/\.DISABLED$/m);
  });

  it('appends to existing .gitignore without duplicating', () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n', 'utf-8');
    disableAped(config, dir, { local: true });
    let ignore = readFileSync(join(dir, '.gitignore'), 'utf-8');
    expect((ignore.match(/^\.aped\/\.DISABLED$/gm) || []).length).toBe(1);

    // Re-running disable while already local-disabled is a noop —
    // gitignore must NOT grow further.
    disableAped(config, dir, { local: true });
    ignore = readFileSync(join(dir, '.gitignore'), 'utf-8');
    expect((ignore.match(/^\.aped\/\.DISABLED$/gm) || []).length).toBe(1);
  });

  it('skips .gitignore in non-git directories (no .git/)', () => {
    rmSync(join(dir, '.git'), { recursive: true, force: true });
    const result = disableAped(config, dir, { local: true });
    expect(result.gitignore.skipped).toBe('no-git');
    expect(existsSync(join(dir, '.gitignore'))).toBe(false);
  });

  it('refuses --local when full-disabled is already in effect (mode-conflict)', () => {
    disableAped(config, dir);
    const result = disableAped(config, dir, { local: true });
    expect(result.action).toBe('mode-conflict');
    expect(result.currentMode).toBe('full');
    expect(result.requestedMode).toBe('local');
  });

  it('refuses default disable when local-disabled is already in effect (mode-conflict)', () => {
    disableAped(config, dir, { local: true });
    const result = disableAped(config, dir);
    expect(result.action).toBe('mode-conflict');
    expect(result.currentMode).toBe('local');
    expect(result.requestedMode).toBe('full');
  });

  it('is idempotent — re-running --local while already local returns noop', () => {
    disableAped(config, dir, { local: true });
    const second = disableAped(config, dir, { local: true });
    expect(second.action).toBe('noop');
    expect(second.mode).toBe('local');
  });
});

describe('enableAped — local mode (6.3.2)', () => {
  beforeEach(() => {
    mkdirSync(join(dir, '.git'), { recursive: true });
  });

  it('removes the marker without touching frontmatters', () => {
    disableAped(config, dir, { local: true });
    const result = enableAped(config, dir);

    expect(result.action).toBe('enabled');
    expect(result.mode).toBe('local');
    expect(result.restored).toBe(0);
    expect(existsSync(join(dir, '.aped', '.DISABLED'))).toBe(false);

    // Frontmatters never changed by local-disable, still in original shape.
    for (const name of SKILLS_FLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c).toMatch(/^disable-model-invocation: true$/m);
    }
    for (const name of SKILLS_UNFLAGGED) {
      const c = readFileSync(join(dir, '.aped', name, 'SKILL.md'), 'utf-8');
      expect(c).not.toMatch(/^disable-model-invocation: true$/m);
    }
  });

  it('keeps the .gitignore line after enable (future-proof guard)', () => {
    disableAped(config, dir, { local: true });
    enableAped(config, dir);
    const ignore = readFileSync(join(dir, '.gitignore'), 'utf-8');
    expect(ignore).toMatch(/^\.aped\/\.DISABLED$/m);
  });
});

describe('statusAped — local mode (6.3.2)', () => {
  beforeEach(() => {
    mkdirSync(join(dir, '.git'), { recursive: true });
  });

  it('reports disabled-local after a local disable', () => {
    disableAped(config, dir, { local: true });
    const s = statusAped(config, dir);
    expect(s.state).toBe('disabled-local');
    expect(typeof s.lastToggle).toBe('string');
    expect(s.total).toBe(SKILLS_FLAGGED.length + SKILLS_UNFLAGGED.length);
  });

  it('reports enabled after a local-disable + enable round-trip', () => {
    disableAped(config, dir, { local: true });
    enableAped(config, dir);
    const s = statusAped(config, dir);
    expect(s.state).toBe('enabled');
  });

  it('still differentiates legacy disabled-stale from disabled-local', () => {
    // Legacy marker — single ISO line, no `mode:` key, no snapshot.
    writeFileSync(join(dir, '.aped', '.DISABLED'), '2026-04-01T10:00:00Z\n', 'utf-8');
    const s = statusAped(config, dir);
    expect(s.state).toBe('disabled-stale');
    expect(s.lastToggle).toBe('2026-04-01T10:00:00Z');
  });
});
