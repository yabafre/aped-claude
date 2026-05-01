// `2>/dev/null` swallow sentinel.
//
// Some skill bodies legitimately swallow stderr from probes that are
// expected-to-fail (out-of-scope-KB scans against directories that may not
// exist, optional-dependency `which` checks). Those are listed in
// ALLOWED_SWALLOWS below.
//
// Anything not on the allowlist is a regression: a swallow that hides a real
// failure from the model and lets it default to a wrong branch.
//
// 6.0.0: skills moved from flat aped-X.md to directory aped-X/{SKILL.md,
// workflow.md, steps/...}. The allowlist key drops the `.md` suffix and
// matches the skill *directory* name; the whole skill is scanned (every .md
// inside it).
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillFullContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

// Each entry: '<skill-name>:<reason>' — keys match skill directory names (no `.md`).
const ALLOWED_SWALLOWS = new Set([
  // OOS-KB scans — directory may legitimately not exist on greenfield projects
  'aped-arch-audit:OOS-KB scan',
  'aped-debug:OOS-KB scan',
  'aped-iterate:OOS-KB scan',
  'aped-from-ticket:OOS-KB scan',
  'aped-quick:OOS-KB scan',
  // aped-context Phase 5 doc-freshness — paired with shallow-repo guard so
  // an empty git log result is interpreted as `unknown` not `fresh`.
  'aped-context:doc-freshness git log',
  // aped-lead jq read — stderr is captured to a temp file and surfaced via
  // a fallback to NEEDS_CONTEXT (NOT silent default to DONE).
  'aped-lead:jq parse with stderr capture',
  // aped-status stat fallback — paired with empty-string check that forces
  // cache stale, never silently treats `now` as the mtime.
  'aped-status:stat fallback with empty-check',
  // aped-sprint workmux cleanup — `workmux close` may already have been
  // closed by a peer; the `|| true` chain makes this idempotent.
  'aped-sprint:workmux idempotent close',
  // aped-story step-01 / aped-dev step-01: branch detection — `git symbolic-ref`
  // fails on detached HEAD; we explicitly set CURRENT_BRANCH=DETACHED and HALT
  // before any state mutation.
  'aped-story:branch detection || DETACHED',
  'aped-dev:branch detection || DETACHED',
  // aped-story step-03 branch creation: `git checkout -b "$BRANCH" 2>/dev/null
  // || git checkout "$BRANCH"` — explicit fallback when the branch already
  // exists (user re-invoking after partial setup).
  'aped-story:idempotent branch checkout',
]);

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

const SKILL_ENTRIES = resolveSkillFullContent(SKILLS_DIR);

describe('error-swallow discipline lint', () => {
  it.each(SKILL_ENTRIES.map((s) => [s.name, s]))('%s — every 2>/dev/null is on the allowlist', (_name, skill) => {
    const swallows = findSwallows(skill.content);
    if (swallows.length === 0) return;

    // Skill may have several legit swallows. Allowlist matches by skill-name prefix.
    const allowed = [...ALLOWED_SWALLOWS].some((entry) => entry.startsWith(`${skill.name}:`));
    if (!allowed) {
      throw new Error(
        `${skill.name} introduces a 2>/dev/null swallow not on the allowlist:\n` +
          swallows.map((s) => `  L${s.lineNo}: ${s.line}`).join('\n') +
          `\n\nEither pair the swallow with an explicit fallback that fails-noisy (mark 'unknown', surface NEEDS_CONTEXT, force cache stale, …) and add an entry to ALLOWED_SWALLOWS in tests/error-swallow-discipline.test.js, or remove the swallow.`,
      );
    }
  });

  it('aped-context gates doc-freshness behind shallow-repo check', () => {
    const skill = SKILL_ENTRIES.find((s) => s.name === 'aped-context');
    expect(skill).toBeDefined();
    expect(skill.content).toMatch(/git rev-parse --is-shallow-repository/);
    expect(skill.content).toMatch(/marking every doc as unknown/);
  });

  it('aped-lead surfaces jq failure as NEEDS_CONTEXT (never silent DONE)', () => {
    const skill = SKILL_ENTRIES.find((s) => s.name === 'aped-lead');
    expect(skill).toBeDefined();
    expect(skill.content).toMatch(/agent_status=NEEDS_CONTEXT/);
    expect(skill.content).toMatch(/never silently default to DONE/);
  });

  it('aped-status forces cache stale when stat unavailable', () => {
    const skill = SKILL_ENTRIES.find((s) => s.name === 'aped-status');
    expect(skill).toBeDefined();
    expect(skill.content).toMatch(/forcing ticket-cache refresh/);
  });
});
