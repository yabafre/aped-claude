// Loader: each skill lives in its own `skills/aped-*.md` file with
// {{APED_DIR}}, {{OUTPUT_DIR}}, {{CLI_VERSION}} placeholders. This keeps each
// skill reviewable on its own (diffs, blame, syntax highlighting) and keeps
// this module small. To regenerate after a hand-edit sanity check, run
// `node scripts/verify-roundtrip.mjs` (requires the legacy inline source).
import { readFileSync, readdirSync } from 'node:fs';
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

function listSkillNames() {
  return readdirSync(SKILLS_DIR)
    .filter((f) => f.startsWith('aped-') && f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .sort();
}

export function skills(c) {
  return listSkillNames().map((name) => ({
    path: `${c.apedDir}/${name}/SKILL.md`,
    content: substitute(
      readFileSync(join(SKILLS_DIR, `${name}.md`), 'utf-8'),
      c,
    ),
  }));
}
