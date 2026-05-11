import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'src', 'templates', 'skills');
const ETHOS_PATH = join(ROOT, 'src', 'templates', 'ethos.md');

function extractAnchors(ethos) {
  const out = new Set();
  for (const m of ethos.matchAll(/^### ([a-z][\w-]+)\s*$/gm)) {
    out.add(m[1]);
  }
  return out;
}

function walkMd(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkMd(p, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const ETHOS = readFileSync(ETHOS_PATH, 'utf-8');
const ANCHORS = extractAnchors(ETHOS);
const SKILL_MD_PATHS = walkMd(SKILLS_DIR);
const skillFiles = SKILL_MD_PATHS.map((p) => ({
  path: p,
  rel: relative(SKILLS_DIR, p),
  content: readFileSync(p, 'utf-8'),
}));

// Skills that intentionally hold step-local Iron Laws inline (not hoisted).
// Update this list if a future skill ships a procedural sub-Iron-Laws list
// that should NOT cite ETHOS.md.
const INLINE_ALLOWLIST = new Set([
  'aped-review/steps/step-05-finalize.md',
]);

describe('ETHOS citation lint (6.5.0 — B1)', () => {
  it('exposes all expected skill anchors', () => {
    expect(ANCHORS.size).toBeGreaterThanOrEqual(13);
    // Spot-check a few load-bearing ones.
    expect(ANCHORS.has('aped-dev')).toBe(true);
    expect(ANCHORS.has('aped-review')).toBe(true);
    expect(ANCHORS.has('aped-story')).toBe(true);
  });

  it('every Iron Law section in a skill file cites a valid ETHOS.md anchor (or is inline-allowlisted)', () => {
    const offenders = [];
    const CITATION_RE = /ETHOS\.md#([a-z][\w-]+)/g;
    const HEADING_RE = /^(?:### Iron Law|## Iron Laws?|^\*\*Iron Law)\b/m;

    for (const skill of skillFiles) {
      if (!HEADING_RE.test(skill.content)) continue;

      if (INLINE_ALLOWLIST.has(skill.rel)) continue;
      const skillRel = skill.rel;

      const citations = [...skill.content.matchAll(CITATION_RE)];
      if (citations.length === 0) {
        offenders.push(`${skillRel} — has an Iron Law section but no ETHOS.md citation`);
        continue;
      }
      for (const m of citations) {
        if (!ANCHORS.has(m[1])) {
          offenders.push(`${skillRel} — citation #${m[1]} not found in ETHOS.md anchors`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('every verdict in a skill body matches the verdict text in ETHOS.md (no silent drift)', () => {
    // Extract the bold ALL-CAPS verdict from each ETHOS section, then assert
    // that anchor's first verdict (if present in the skill body) matches.
    const VERDICT_RE = /\*\*([A-Z][^*]+?)\*\*/g;
    const anchorVerdicts = new Map();
    const sections = ETHOS.split(/^### /m).slice(1);
    for (const section of sections) {
      const [headingLine, ...rest] = section.split('\n');
      const anchor = headingLine.trim();
      const body = rest.join('\n');
      const match = VERDICT_RE.exec(body);
      VERDICT_RE.lastIndex = 0;
      if (match) anchorVerdicts.set(anchor, match[1].trim());
    }

    const offenders = [];
    for (const skill of skillFiles) {
      if (INLINE_ALLOWLIST.has(skill.rel)) continue;
      const skillRel = skill.rel;
      const citationMatch = /ETHOS\.md#([a-z][\w-]+)/.exec(skill.content);
      if (!citationMatch) continue;
      const expected = anchorVerdicts.get(citationMatch[1]);
      if (!expected) continue;
      // Pull the first 400 chars after the Iron Law heading and only run
      // drift check if the FIRST bold phrase there starts ALL-CAPS (i.e. is
      // a verdict, not arbitrary inline bold like "**Title**" elsewhere).
      // Multi-law skills (aped-design-twice / aped-pre-mortem / aped-triage)
      // use a citation + summary form with no leading verdict — they skip
      // here naturally because the first **bold** after the heading is the
      // citation link text "**ETHOS.md** § ..." which doesn't start ALL-CAPS.
      const headingIdx = skill.content.search(/^(?:### Iron Law|## Iron Laws?|^\*\*Iron Law)/m);
      if (headingIdx < 0) continue;
      const window = skill.content.slice(headingIdx, headingIdx + 400);
      const verdictMatch = /\*\*([A-Z][A-Z ,\-—]+\.)\*\*/.exec(window);
      if (!verdictMatch) continue;
      const got = verdictMatch[1].trim();
      if (got !== expected) {
        offenders.push(
          `${skillRel} — verdict drift\n  skill: "${got}"\n  ethos: "${expected}"`,
        );
      }
    }
    expect(offenders, offenders.join('\n\n')).toEqual([]);
  });
});
