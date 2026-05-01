import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillFullContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const skillFiles = resolveSkillFullContent(SKILLS_DIR);

// Known APED skill suffixes (the part after `aped-`). When a skill body
// references another skill, it must use the fully-qualified `aped-X` form,
// never the bare suffix in phrases like "the X skill" / "the X workflow".
const KNOWN_SUFFIXES = [
  'analyze', 'arch', 'arch-audit', 'brainstorm', 'checkpoint', 'claude',
  'context', 'course', 'debug', 'dev', 'elicit', 'epics', 'from-ticket',
  'iterate', 'lead', 'prd', 'prfaq', 'qa', 'quick', 'receive-review',
  'retro', 'review', 'ship', 'sprint', 'status', 'story', 'ux',
  'write-skill', 'zoom-out',
  'grill',
  'triage',
  'pre-mortem', 'design-twice',
];

function stem(word) {
  return word
    .replace(/ing$/, '')
    .replace(/er$/, '')
    .replace(/s$/, '');
}

describe('skill body cross-reference lint (4.3.0 — H2)', () => {
  it.each(skillFiles.map((s) => [s.name, s]))(
    '%s: no bare "the X skill/workflow/command" references to known APED skills',
    (_name, skill) => {
      const offenders = [];
      const PATTERN = /\bthe\s+([a-zA-Z][a-zA-Z0-9-]+)\s+(skill|workflow|command)\b/gi;
      for (const m of skill.content.matchAll(PATTERN)) {
        const candidate = m[1].toLowerCase();
        if (
          KNOWN_SUFFIXES.includes(candidate) ||
          KNOWN_SUFFIXES.includes(stem(candidate))
        ) {
          offenders.push(m[0]);
        }
      }
      expect(offenders, `${_name}: bare references — should use \`aped-X\` form`).toEqual([]);
    },
  );

  it.each(skillFiles.map((s) => [s.name, s]))(
    '%s: no bare "invoke X" instructions where X is a known suffix without aped- prefix',
    (_name, skill) => {
      const offenders = [];
      const PATTERN = /\binvoke\s+(?!aped-)`?([a-zA-Z][a-zA-Z0-9-]+)`?\b/g;
      for (const m of skill.content.matchAll(PATTERN)) {
        const candidate = m[1].toLowerCase();
        if (KNOWN_SUFFIXES.includes(candidate)) {
          offenders.push(m[0]);
        }
      }
      expect(offenders, `${_name}: should use \`aped-X\` form for invocations`).toEqual([]);
    },
  );
});
