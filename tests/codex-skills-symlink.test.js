// The 6.14.0 skill-symlink target fix: Codex reads skills from .agents/skills/,
// never .codex/skills/. The wrong path is demoted to cleanup-only.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SKILL_SYMLINK_TARGETS,
  TARGET_CATALOG,
  buildSkillSymlinkEntries,
} from '../src/templates/symlinks.js';

describe('skill symlink targets (6.14.0)', () => {
  it('auto-detect default targets include .agents/skills and exclude .codex/skills', () => {
    expect(DEFAULT_SKILL_SYMLINK_TARGETS).toContain('.agents/skills');
    expect(DEFAULT_SKILL_SYMLINK_TARGETS).not.toContain('.codex/skills');
  });

  it('default targets are deduped (.codex and .agents both map to .agents/skills)', () => {
    const agentsCount = DEFAULT_SKILL_SYMLINK_TARGETS.filter((t) => t === '.agents/skills').length;
    expect(agentsCount).toBe(1);
  });

  it('TARGET_CATALOG keeps .codex/skills for legacy cleanup', () => {
    expect(TARGET_CATALOG).toContain('.codex/skills');
    expect(TARGET_CATALOG).toContain('.agents/skills');
  });

  it('builds .agents/skills/aped-* entries pointing back to the canonical .aped tree', () => {
    const entries = buildSkillSymlinkEntries({ apedDir: '.aped', skillSymlinks: ['.agents/skills'] });
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.type).toBe('symlink');
      expect(e.path).toMatch(/^\.agents\/skills\/aped-/);
      expect(e.target).toMatch(/^\.\.\/\.\.\/\.aped\/aped-/);
    }
  });
});
