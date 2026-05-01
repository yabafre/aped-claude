// Anti-Claude-Code-trigger-word lint.
//
// Generalised from superpowers issue #1283: skill bodies must not contain
// phrases that Claude Code's runtime treats specially (extending reasoning
// depth, switching to continuation mode, etc.).
//
// 6.0.0: skills moved from flat aped-X.md to aped-X/{SKILL.md, workflow.md, steps/...}.
// We scan every .md inside each skill directory.
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillFullContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const TRIGGER_WORDS = [
  'ultrathink',
  'ultra-think',
  'think hard',
  'think harder',
  'think deeply',
  'megathink',
  'mega-think',
  'think a lot',
  // 4.20.0 — Superpowers #1042
  'save plans to:',
  'save output to:',
  'write results to:',
];

// Exemptions (per-skill, full skill name). None today.
const EXEMPT_NAMES = new Set([]);

const SKILLS = resolveSkillFullContent(SKILLS_DIR);

describe('anti-CC-trigger-word lint (superpowers #1283 generalised)', () => {
  it.each(SKILLS.map((s) => [s.name, s]))(
    '%s — body contains no Claude Code runtime trigger keywords',
    (_name, skill) => {
      if (EXEMPT_NAMES.has(skill.name)) return;
      const content = skill.content.toLowerCase();
      const hits = [];
      for (const word of TRIGGER_WORDS) {
        const idx = content.indexOf(word);
        if (idx === -1) continue;
        const lineNo = content.slice(0, idx).split('\n').length;
        const lineStart = content.lastIndexOf('\n', idx) + 1;
        const lineEnd = content.indexOf('\n', idx);
        const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
        hits.push(`  L${lineNo}: "${word}" → ${line.trim()}`);
      }
      if (hits.length > 0) {
        throw new Error(
          `${skill.name} contains a Claude Code runtime trigger keyword in the skill body. ` +
            `These phrases are picked up by CC's keyword scanner and silently inflate the ` +
            `model's reasoning depth on every invocation, without the user opting in.\n` +
            hits.join('\n') +
            `\n\nReplace with neutral phrasing (e.g. "carefully", "deeply consider", "step through")` +
            ` or — if a longer reasoning step is genuinely required — surface it via skill body ` +
            `instructions, not via a runtime-scanned keyword.`,
        );
      }
    },
  );

  it('TRIGGER_WORDS list is non-empty (sanity)', () => {
    expect(TRIGGER_WORDS.length).toBeGreaterThan(0);
  });
});
