// `2>/dev/null` swallow sentinel.
//
// Some skill bodies legitimately swallow stderr from probes that are
// expected-to-fail (out-of-scope-KB scans against directories that may not
// exist, optional-dependency `which` checks). Those are listed in
// ALLOWED_SWALLOWS below.
//
// Anything not on the allowlist is a regression: a swallow that hides a real
// failure from the model and lets it default to a wrong branch (e.g. cache
// freshness gate, jq parse failure → silent DONE auto-approve, shallow git
// history → every doc looks fresh).
//
// To add a new legitimate swallow:
//   1. Confirm the failure mode is genuinely "expected-and-uninteresting"
//      (file may not exist, command may not be installed).
//   2. Add `<file>:<line>:<reason>` to ALLOWED_SWALLOWS.
//   3. Pair the swallow with an explicit fallback that does NOT silently
//      adopt a permissive default (e.g. mark `unknown` instead of `fresh`).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

// Each entry: '<skill-file>:<line>:<reason>'. Lines are recorded after the
// 4.7.6 fix of the three risky swallows in aped-context, aped-lead, aped-status
// — line numbers track the post-fix file. Keep this list small; every entry is
// a documented decision the next maintainer must understand to extend.
const ALLOWED_SWALLOWS = new Set([
  // OOS-KB scans — directory may legitimately not exist on greenfield projects
  'aped-arch-audit.md:OOS-KB scan',
  'aped-debug.md:OOS-KB scan',
  'aped-iterate.md:OOS-KB scan',
  'aped-from-ticket.md:OOS-KB scan',
  'aped-quick.md:OOS-KB scan',
  // aped-context Phase 5 doc-freshness — paired with shallow-repo guard so
  // an empty git log result is interpreted as `unknown` not `fresh`.
  'aped-context.md:doc-freshness git log',
  // aped-lead jq read — stderr is captured to a temp file and surfaced via
  // a fallback to NEEDS_CONTEXT (NOT silent default to DONE).
  'aped-lead.md:jq parse with stderr capture',
  // aped-status stat fallback — paired with empty-string check that forces
  // cache stale, never silently treats `now` as the mtime.
  'aped-status.md:stat fallback with empty-check',
  // aped-sprint workmux cleanup — `workmux close` may already have been
  // closed by a peer; the `|| true` chain makes this idempotent. The
  // failure mode is "session already gone" which is the desired terminal
  // state. No silent default-to-permissive risk here.
  'aped-sprint.md:workmux idempotent close',
]);

function listTopLevelSkills(dir) {
  return readdirSync(dir)
    .filter((name) => name.startsWith('aped-') && name.endsWith('.md'))
    .map((name) => join(dir, name));
}

function findSwallows(content) {
  const lines = content.split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    if (line.includes('2>/dev/null')) {
      hits.push({ lineNo: idx + 1, line: line.trim() });
    }
  });
  return hits;
}

const SKILL_PATHS = listTopLevelSkills(SKILLS_DIR);

describe('error-swallow discipline lint', () => {
  it.each(SKILL_PATHS)('%s — every 2>/dev/null is on the allowlist', (skillPath) => {
    const raw = readFileSync(skillPath, 'utf8');
    const swallows = findSwallows(raw);
    if (swallows.length === 0) return;

    const skillName = skillPath.split('/').pop();

    // Skill may have several legit swallows (e.g. multiple OOS-KB scans).
    // We require AT LEAST ONE entry on the allowlist for skills that have
    // any swallow at all — the exact line count isn't tracked because
    // formatting/refactor of legit swallows shouldn't force a lint update.
    const allowed = [...ALLOWED_SWALLOWS].some((entry) => entry.startsWith(`${skillName}:`));
    if (!allowed) {
      throw new Error(
        `${skillPath} introduces a 2>/dev/null swallow not on the allowlist:\n` +
          swallows
            .map((s) => `  L${s.lineNo}: ${s.line}`)
            .join('\n') +
          `\n\nEither pair the swallow with an explicit fallback that fails-noisy (mark 'unknown', surface NEEDS_CONTEXT, force cache stale, …) and add an entry to ALLOWED_SWALLOWS in tests/error-swallow-discipline.test.js, or remove the swallow.`
      );
    }
  });

  it('aped-context.md gates doc-freshness behind shallow-repo check', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-context.md'), 'utf8');
    expect(content).toMatch(/git rev-parse --is-shallow-repository/);
    expect(content).toMatch(/marking every doc as unknown/);
  });

  it('aped-lead.md surfaces jq failure as NEEDS_CONTEXT (never silent DONE)', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-lead.md'), 'utf8');
    expect(content).toMatch(/agent_status=NEEDS_CONTEXT/);
    expect(content).toMatch(/never silently default to DONE/);
  });

  it('aped-status.md forces cache stale when stat unavailable', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-status.md'), 'utf8');
    expect(content).toMatch(/forcing ticket-cache refresh/);
  });
});
