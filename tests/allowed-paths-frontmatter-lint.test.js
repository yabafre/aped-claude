// allowed-paths frontmatter lint (v5.0.0) — enforces that every top-level
// aped skill has an allowed-paths field with write and read-only arrays.
//
// 6.0.0: skills moved from flat aped-*.md to directory format aped-*/SKILL.md.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(import.meta.dirname, '..', 'src', 'templates', 'skills');

function getSkills() {
  const out = [];
  for (const f of readdirSync(SKILLS_DIR)) {
    if (!f.startsWith('aped-') || f === 'aped-skills') continue;
    const path = join(SKILLS_DIR, f);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      const skillMd = join(path, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      out.push({ file: `${f}/SKILL.md`, content: readFileSync(skillMd, 'utf-8') });
    } else if (f.endsWith('.md')) {
      out.push({ file: f, content: readFileSync(path, 'utf-8') });
    }
  }
  return out;
}

const SKILLS = getSkills();

// Some utility skills don't need allowed-paths (read-only meta-skills).
// The original test ran against ALL aped-*.md files; we keep the same scope.
describe('allowed-paths frontmatter lint (v5.0.0)', () => {
  for (const { file, content } of SKILLS) {
    it(`${file} has allowed-paths frontmatter`, () => {
      expect(content).toMatch(/^allowed-paths:/m);
    });

    it(`${file} allowed-paths has write array`, () => {
      expect(content).toMatch(/^\s+write:\s*\[/m);
    });

    it(`${file} allowed-paths has read-only array`, () => {
      expect(content).toMatch(/^\s+read-only:\s*\[/m);
    });
  }
});
