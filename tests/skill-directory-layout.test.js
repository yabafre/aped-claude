import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { skillsFromDir, listSkillEntries } from '../src/templates/skills.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 4.4.0 — engine accepts skill *directories* alongside single-file skills.
// Both layouts produce the same canonical scaffold output paths under
// <apedDir>/aped-X/. Directory layout enables shipping multi-doc skills
// (SKILL.md + companions) so heavy skills can shrink their parent body
// without losing reference material.
describe('skill directory layout (4.4.0)', () => {
  let tmp;
  const config = { apedDir: '.aped', outputDir: 'docs/aped', cliVersion: 'test' };

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'aped-skill-fixture-'));

    // Layout 1 — single-file legacy skill.
    writeFileSync(
      join(tmp, 'aped-legacy.md'),
      '---\nname: aped-legacy\ndescription: legacy single-file\n---\n\n# Legacy\n',
    );

    // Layout 2 — directory skill with SKILL.md + flat companion.
    mkdirSync(join(tmp, 'aped-multi'));
    writeFileSync(
      join(tmp, 'aped-multi', 'SKILL.md'),
      '---\nname: aped-multi\ndescription: multi-doc body\n---\n\n# Multi-doc\n\nSee `process.md`.\n',
    );
    writeFileSync(
      join(tmp, 'aped-multi', 'process.md'),
      '# Process\n\nReference at {{APED_DIR}}/aped-multi/SKILL.md.\n',
    );

    // Layout 2 — directory skill with nested subdirectory.
    mkdirSync(join(tmp, 'aped-nested'));
    writeFileSync(
      join(tmp, 'aped-nested', 'SKILL.md'),
      '---\nname: aped-nested\n---\n\n# Nested\n',
    );
    mkdirSync(join(tmp, 'aped-nested', 'references'));
    writeFileSync(join(tmp, 'aped-nested', 'references', 'rules.md'), '# Rules\n');

    // Non-routable bucket — must be excluded.
    mkdirSync(join(tmp, 'aped-skills'));
    writeFileSync(join(tmp, 'aped-skills', 'helper.md'), '# Helper\n');

    // Directory without SKILL.md — must be excluded (not a skill).
    mkdirSync(join(tmp, 'aped-not-a-skill'));
    writeFileSync(join(tmp, 'aped-not-a-skill', 'random.md'), '# random\n');

    // Non-aped-prefixed entry — ignored.
    writeFileSync(join(tmp, 'README.md'), '# README\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('listSkillEntries', () => {
    it('detects single-file legacy skills', () => {
      const entries = listSkillEntries(tmp);
      const legacy = entries.find((e) => e.name === 'aped-legacy');
      expect(legacy, 'single-file skill detected').toBeTruthy();
      expect(legacy.files).toEqual([
        { relPath: 'SKILL.md', source: join(tmp, 'aped-legacy.md') },
      ]);
    });

    it('detects directory skills with flat companions', () => {
      const entries = listSkillEntries(tmp);
      const multi = entries.find((e) => e.name === 'aped-multi');
      expect(multi, 'directory skill detected').toBeTruthy();
      expect(multi.files.length).toBe(2);
      const relPaths = multi.files.map((f) => f.relPath).sort();
      expect(relPaths).toEqual(['SKILL.md', 'process.md']);
    });

    it('walks nested subdirectories inside directory skills', () => {
      const entries = listSkillEntries(tmp);
      const nested = entries.find((e) => e.name === 'aped-nested');
      expect(nested.files.length).toBe(2);
      const relPaths = nested.files.map((f) => f.relPath).sort();
      expect(relPaths).toEqual(['SKILL.md', 'references/rules.md']);
    });

    it('skips the aped-skills/ bucket (non-routable sub-skill docs)', () => {
      const entries = listSkillEntries(tmp);
      expect(entries.find((e) => e.name === 'aped-skills')).toBeUndefined();
    });

    it('skips directories without SKILL.md (not skill directories)', () => {
      const entries = listSkillEntries(tmp);
      expect(entries.find((e) => e.name === 'aped-not-a-skill')).toBeUndefined();
    });

    it('throws if a skill is defined as both a file and a directory', () => {
      // Add `aped-multi.md` alongside the existing `aped-multi/` directory.
      writeFileSync(
        join(tmp, 'aped-multi.md'),
        '---\nname: aped-multi\n---\n\nLegacy\n',
      );
      expect(() => listSkillEntries(tmp)).toThrow(/duplicate skill "aped-multi"/);
    });

    it('returns entries sorted by name', () => {
      const entries = listSkillEntries(tmp);
      const names = entries.map((e) => e.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('skillsFromDir', () => {
    it('emits expected output paths for both layouts', () => {
      const out = skillsFromDir(config, tmp);
      const paths = out.map((o) => o.path).sort();
      expect(paths).toEqual([
        '.aped/aped-legacy/SKILL.md',
        '.aped/aped-multi/SKILL.md',
        '.aped/aped-multi/process.md',
        '.aped/aped-nested/SKILL.md',
        '.aped/aped-nested/references/rules.md',
      ]);
    });

    it('applies {{APED_DIR}} substitution to every file (not just SKILL.md)', () => {
      const out = skillsFromDir(config, tmp);
      const proc = out.find((o) => o.path === '.aped/aped-multi/process.md');
      expect(proc.content).toContain('.aped/aped-multi/SKILL.md');
      expect(proc.content).not.toContain('{{APED_DIR}}');
    });
  });
});
