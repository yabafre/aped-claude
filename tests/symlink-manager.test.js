import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, existsSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectSkillSymlinks, repairSkillSymlinks } from '../src/symlink-manager.js';
import { deriveSkillNames } from '../src/templates/symlinks.js';

let dir;

const config = {
  apedDir: '.aped',
  skillSymlinks: ['.claude/skills'],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aped-symlink-'));
  for (const skillName of deriveSkillNames(config)) {
    mkdirSync(join(dir, '.aped', skillName), { recursive: true });
    writeFileSync(join(dir, '.aped', skillName, 'SKILL.md'), '# test\n', 'utf-8');
  }
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('inspectSkillSymlinks', () => {
  it('reports missing symlinks', () => {
    const results = inspectSkillSymlinks(config, dir);
    expect(results[0].status).toBe('missing');
  });

  it('reports healthy symlinks', () => {
    mkdirSync(join(dir, '.claude', 'skills'), { recursive: true });
    symlinkSync('../../.aped/aped-analyze', join(dir, '.claude', 'skills', 'aped-analyze'), 'dir');
    const results = inspectSkillSymlinks(config, dir);
    expect(results[0].status).toBe('ok');
  });
});

describe('repairSkillSymlinks', () => {
  it('repairs missing symlinks', () => {
    const result = repairSkillSymlinks(config, dir);
    const targetPath = join(dir, '.claude', 'skills', 'aped-analyze');
    expect(result.repaired.length).toBeGreaterThan(0);
    expect(existsSync(targetPath)).toBe(true);
    expect(readlinkSync(targetPath)).toBe('../../.aped/aped-analyze');
  });

  it('skips conflicting real directories', () => {
    mkdirSync(join(dir, '.claude', 'skills', 'aped-analyze'), { recursive: true });
    const result = repairSkillSymlinks(config, dir);
    expect(result.skipped).toHaveLength(1);
  });
});
