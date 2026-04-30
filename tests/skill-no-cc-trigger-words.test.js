// Anti-Claude-Code-trigger-word lint.
//
// Generalised from superpowers issue #1283: the systematic-debugging skill
// body literally contained "Ultrathink this" — which Claude Code's runtime
// keyword scanner picks up and injects on every invocation. The user's
// session quietly inherits an "ultrathink" instruction the skill author did
// not intend.
//
// APED is clean today (verified by grep at 4.7.6 audit time: 0 hits for any
// of the trigger words below). This lint locks the absence so future skill
// additions cannot silently re-introduce the footgun.
//
// The list below is the set of phrases that Claude Code's runtime treats
// specially — extending the model's reasoning depth, switching to
// continuation mode, etc. Any of them inside a skill body inflates the
// model's behaviour at routing time without the user opting in.
//
// To extend the list when Anthropic ships new keywords, add to TRIGGER_WORDS
// below. Per-skill exemptions go in EXEMPT_PATHS (none currently).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

// Lower-case match. Match is case-insensitive but we keep the canonical
// surface form for the error message.
const TRIGGER_WORDS = [
  'ultrathink',
  'ultra-think',
  'think hard',
  'think harder',
  'think deeply',
  'megathink',
  'mega-think',
  'think a lot',
];

// Exemptions (per-skill, full path-suffix match). None today.
const EXEMPT_PATHS = new Set([]);

function listTopLevelSkills(dir) {
  return readdirSync(dir)
    .filter((name) => name.startsWith('aped-') && name.endsWith('.md'))
    .map((name) => ({ name, path: join(dir, name) }));
}

const SKILLS = listTopLevelSkills(SKILLS_DIR);

describe('anti-CC-trigger-word lint (superpowers #1283 generalised)', () => {
  it.each(SKILLS.map((s) => [s.name, s]))(
    '%s — body contains no Claude Code runtime trigger keywords',
    (_name, skill) => {
      if (EXEMPT_PATHS.has(skill.name)) return;
      const content = readFileSync(skill.path, 'utf8').toLowerCase();
      const hits = [];
      for (const word of TRIGGER_WORDS) {
        const idx = content.indexOf(word);
        if (idx === -1) continue;
        // Locate line number for the error message.
        const lineNo = content.slice(0, idx).split('\n').length;
        const lineStart = content.lastIndexOf('\n', idx) + 1;
        const lineEnd = content.indexOf('\n', idx);
        const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
        hits.push(`  L${lineNo}: "${word}" → ${line.trim()}`);
      }
      if (hits.length > 0) {
        throw new Error(
          `${skill.path} contains a Claude Code runtime trigger keyword in the skill body. ` +
            `These phrases are picked up by CC's keyword scanner and silently inflate the ` +
            `model's reasoning depth on every invocation, without the user opting in.\n` +
            hits.join('\n') +
            `\n\nReplace with neutral phrasing (e.g. "carefully", "deeply consider", "step through")` +
            ` or — if a longer reasoning step is genuinely required — surface it via skill body ` +
            `instructions, not via a runtime-scanned keyword.`
        );
      }
    }
  );

  it('TRIGGER_WORDS list is non-empty (sanity)', () => {
    expect(TRIGGER_WORDS.length).toBeGreaterThan(0);
  });
});
