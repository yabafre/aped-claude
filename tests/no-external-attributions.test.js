import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

// 6.2.0 contract — APED skill bodies must not cite external sources that
// don't ship with user projects. Without the source files in the user's
// repo, Claude routinely tries to "look up" the attribution and wastes
// context. Strip the citation, keep the technical content.
//
// Allowlist: `aped-skills/` is a directory of scaffolded reference docs
// (anthropic-best-practices.md, persuasion-principles.md,
// testing-skills-with-subagents.md). Those files are user-readable
// references that intentionally cite their origin.
const FORBIDDEN_TOKENS = [
  /\bPocock\b/i,
  /\bAdapted from\b/i,
  /\bTranslation of\b/i,
  /\bLifted from Superpowers\b/i,
  /\bsuperpowers issue\b/i,
  /\bverbatim Superpowers\b/i,
  /\bBMAD pattern\b/i,
  /\bAnthropic context-engineering\b/i,
  /\bAnthropic engineering blog\b/i,
];

const ALLOWLIST_PREFIXES = [
  'aped-skills/',
];

function walkMd(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkMd(full, out);
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function isAllowlisted(relPath) {
  return ALLOWLIST_PREFIXES.some((p) => relPath.startsWith(p));
}

const allFiles = walkMd(SKILLS_DIR).map((abs) => ({
  abs,
  rel: relative(SKILLS_DIR, abs).replace(/\\/g, '/'),
}));
const auditFiles = allFiles.filter((f) => !isAllowlisted(f.rel));

describe('no external attributions in scaffolded skill bodies (6.2.0)', () => {
  it('finds skill markdown files (sanity)', () => {
    expect(auditFiles.length).toBeGreaterThan(20);
  });

  it.each(auditFiles.map((f) => [f.rel, f]))(
    '%s: contains no forbidden external attribution tokens',
    (_rel, file) => {
      const content = readFileSync(file.abs, 'utf8');
      const lines = content.split('\n');
      const violations = [];
      lines.forEach((line, idx) => {
        for (const re of FORBIDDEN_TOKENS) {
          if (re.test(line)) {
            violations.push(`L${idx + 1}: ${line.trim().slice(0, 200)} [matched ${re}]`);
            break;
          }
        }
      });
      expect(
        violations,
        `${_rel} has external attribution(s):\n  ${violations.join('\n  ')}`,
      ).toEqual([]);
    },
  );
});
