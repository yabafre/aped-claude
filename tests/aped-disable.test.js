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
