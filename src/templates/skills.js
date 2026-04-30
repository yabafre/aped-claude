// Skill loader. Each skill is one of two layouts (both produce identical
// scaffold output paths under <apedDir>/aped-X/):
//
//   1) Single-file legacy:
//        src/templates/skills/aped-X.md
//      → <apedDir>/aped-X/SKILL.md
//
//   2) Directory (4.4.0+):
//        src/templates/skills/aped-X/SKILL.md
//        src/templates/skills/aped-X/process.md
//        src/templates/skills/aped-X/references/rules.md
//      → <apedDir>/aped-X/SKILL.md
//        <apedDir>/aped-X/process.md
//        <apedDir>/aped-X/references/rules.md
//
// {{APED_DIR}}, {{OUTPUT_DIR}}, {{CLI_VERSION}} placeholders are substituted
// in every file (SKILL.md and any companion).
//
// The `aped-skills/` directory holds non-routable sub-skill reference docs
// (anthropic-best-practices, persuasion-principles, testing-skills-with-subagents).
// It ships via package.json `files` and is read at runtime by aped-claude
// — it is NOT enumerated as a skill here.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, 'skills');

function substitute(content, c) {
  return content
    .split('{{APED_DIR}}').join(c.apedDir)
    .split('{{OUTPUT_DIR}}').join(c.outputDir)
    .split('{{CLI_VERSION}}').join(c.cliVersion || '1.7.1');
}

// Returns [{ name, files: [{ relPath, source }] }, ...] sorted by name.
// Exported so tests can inject fixture directories.
export function listSkillEntries(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.name.startsWith('aped-')) continue;
    if (entry.name === 'aped-skills') continue; // non-routable sub-skills bucket

    if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push({
        name: entry.name.slice(0, -3),
        files: [{ relPath: 'SKILL.md', source: join(dir, entry.name) }],
      });
    } else if (entry.isDirectory()) {
      const skillMd = join(dir, entry.name, 'SKILL.md');
      if (!existsSync(skillMd)) continue; // directory without SKILL.md is not a skill
      out.push({ name: entry.name, files: walkSkillDir(join(dir, entry.name)) });
    }
  }

  // Detect duplicates (a skill cannot be defined as both a file and a directory).
  const seen = new Set();
  for (const entry of out) {
    if (seen.has(entry.name)) {
      throw new Error(
        `duplicate skill "${entry.name}" — defined as both a single-file skill ` +
        `and a directory skill in ${dir}. Remove one.`,
      );
    }
    seen.add(entry.name);
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function walkSkillDir(skillDir) {
  const out = [];
  function walk(current, prefix = '') {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const p = join(current, entry.name);
      const rel = prefix + entry.name;
      if (entry.isDirectory()) {
        walk(p, rel + '/');
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push({ relPath: rel, source: p });
      }
    }
  }
  walk(skillDir);
  return out;
}

// Same shape as before: [{ path, content }, ...].
// Exported for fixture-based testing; production callers should use `skills(c)`.
export function skillsFromDir(c, dir) {
  return listSkillEntries(dir).flatMap(({ name, files }) =>
    files.map((f) => ({
      path: `${c.apedDir}/${name}/${f.relPath}`,
      content: substitute(readFileSync(f.source, 'utf-8'), c),
    })),
  );
}

export function skills(c) {
  return skillsFromDir(c, SKILLS_DIR);
}
