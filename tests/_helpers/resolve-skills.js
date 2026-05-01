// Shared helper for resolving APED skills across both layouts:
//   - Legacy flat: src/templates/skills/aped-X.md
//   - 6.0.0+ directory: src/templates/skills/aped-X/SKILL.md (+ workflow.md + steps/...)
//
// Most tests want ONE of two views:
//   1. Frontmatter-only — only SKILL.md (or the flat .md). Use `resolveSkillEntries`.
//   2. Full prose — every .md inside the skill (SKILL.md + workflow.md + steps/*.md).
//      Use `resolveSkillFullContent` when the test needs to lint prose discipline.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** List of {name, content} where content is the SKILL.md (or the flat .md for legacy). */
export function resolveSkillEntries(skillsDir) {
  const out = [];
  for (const f of readdirSync(skillsDir)) {
    if (!f.startsWith('aped-') || f === 'aped-skills') continue;
    const path = join(skillsDir, f);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      const skillMd = join(path, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      out.push({ name: f, content: readFileSync(skillMd, 'utf8') });
    } else if (f.endsWith('.md')) {
      out.push({ name: f.replace(/\.md$/, ''), content: readFileSync(path, 'utf8') });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * List of {name, content} where content is the CONCATENATION of every .md file
 * inside the skill (SKILL.md + workflow.md + steps/**.md). Use for prose-discipline
 * tests that need to scan every line of the skill body.
 */
export function resolveSkillFullContent(skillsDir) {
  const out = [];
  for (const f of readdirSync(skillsDir)) {
    if (!f.startsWith('aped-') || f === 'aped-skills') continue;
    const path = join(skillsDir, f);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      const allMd = walkMd(path);
      if (!allMd.length) continue;
      const content = allMd.map((p) => readFileSync(p, 'utf8')).join('\n\n');
      out.push({ name: f, content });
    } else if (f.endsWith('.md')) {
      out.push({ name: f.replace(/\.md$/, ''), content: readFileSync(path, 'utf8') });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function walkMd(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMd(p));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Read a single skill by name. Returns the concatenated content of every .md
 * inside the skill directory (SKILL.md + workflow.md + steps/**.md), or the
 * flat .md content for legacy single-file skills.
 *
 * Drop-in replacement for `readFileSync(join(SKILLS_DIR, 'aped-X.md'))`.
 */
export function readSkillContent(skillsDir, skillName) {
  const dirPath = join(skillsDir, skillName);
  if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
    const allMd = walkMd(dirPath);
    if (!allMd.length) throw new Error(`Skill ${skillName} has no .md files`);
    return allMd.map((p) => readFileSync(p, 'utf8')).join('\n\n');
  }
  // Legacy single-file
  const flatPath = join(skillsDir, `${skillName}.md`);
  if (existsSync(flatPath)) {
    return readFileSync(flatPath, 'utf8');
  }
  throw new Error(`Skill ${skillName} not found at ${dirPath} or ${flatPath}`);
}

/**
 * Returns the list of .md file paths inside a skill (SKILL.md + workflow.md + steps/...)
 * or the single flat .md path for legacy. Used by tests that need to lint each
 * file individually rather than the concatenated body.
 */
export function listSkillMdPaths(skillsDir, skillName) {
  const dirPath = join(skillsDir, skillName);
  if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
    return walkMd(dirPath);
  }
  const flatPath = join(skillsDir, `${skillName}.md`);
  if (existsSync(flatPath)) return [flatPath];
  return [];
}
