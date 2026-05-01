// FR / NFR / AC identifier format lint.
//
// APED ships canonical examples in two opposing styles before 4.7.6:
//   - aped-epics canonical "Running FR coverage matrix" uses FR-1 (hyphen)
//   - aped-epics output examples + aped-prd + aped-story use FR1 (no hyphen)
//
// Lock the canonical hyphenated form here so any future drift fails CI.
//
// Allowed forms: FR-N, NFR-N, AC-N (case-sensitive, hyphen mandatory).
//
// 6.0.0: skills moved from flat aped-X.md to aped-X/{SKILL.md, workflow.md, steps/...}.
// We scan every .md inside each skill directory.
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillFullContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

// Strip fenced code blocks where a non-hyphen form is legitimately present.
function stripExemptCodeBlocks(content) {
  return content.replace(/```(json|yaml|regex|html)\n[\s\S]*?\n```/g, '```$1\n[STRIPPED]\n```');
}

const SKILL_ENTRIES = resolveSkillFullContent(SKILLS_DIR);

describe('FR/NFR/AC ID format lint', () => {
  it.each(SKILL_ENTRIES.map((s) => [s.name, s]))('%s uses canonical hyphenated form (FR-N, NFR-N, AC-N)', (_name, skill) => {
    const body = stripExemptCodeBlocks(skill.content);

    const offenders = [
      ...body.matchAll(/(^|[^\w-])(FR|NFR|AC)(\d+)([^\w-]|$)/g),
    ];

    if (offenders.length === 0) return;

    const samples = offenders.slice(0, 5).map((m) => {
      const idx = m.index;
      const lineStart = body.lastIndexOf('\n', idx) + 1;
      const lineEnd = body.indexOf('\n', idx);
      const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd);
      const lineNo = body.slice(0, lineStart).split('\n').length;
      return `  L${lineNo}: ${m[2]}${m[3]} → ${m[2]}-${m[3]}\n    > ${line.trim()}`;
    });

    throw new Error(
      `${skill.name} uses non-hyphenated FR/NFR/AC IDs (canonical is FR-N / NFR-N / AC-N):\n${samples.join('\n')}\n\nReplace with the hyphenated form so cross-skill consumers (validate-coverage.sh, oracle scripts, future MCP atoms) parse a single shape.`,
    );
  });

  it('canonical example block is reachable in aped-epics', () => {
    const skill = SKILL_ENTRIES.find((s) => s.name === 'aped-epics');
    expect(skill).toBeDefined();
    expect(skill.content).toMatch(/FR-1.*FR-3.*FR-7/);
    expect(skill.content).toMatch(/AC-1: Given/);
    expect(skill.content).toMatch(/FR-1: \{FR title from PRD\}/);
  });

  it('aped-prd canonical example uses hyphenated NFR-1', () => {
    const skill = SKILL_ENTRIES.find((s) => s.name === 'aped-prd');
    expect(skill).toBeDefined();
    expect(skill.content).toMatch(/NFR-1:/);
  });
});
