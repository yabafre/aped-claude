// FR / NFR / AC identifier format lint.
//
// APED ships canonical examples in two opposing styles before 4.7.6:
//   - aped-epics canonical "Running FR coverage matrix" uses FR-1 (hyphen)
//   - aped-epics output examples + aped-prd + aped-story use FR1 (no hyphen)
//
// The pre-merge consequence is that downstream skills consume the prose IDs
// and one form drifts past the other (validate-coverage.sh, oracle scripts,
// future MCP atom contracts). Lock the canonical hyphenated form here so any
// future drift fails CI before it ships.
//
// Allowed forms: FR-N, NFR-N, AC-N (case-sensitive, hyphen mandatory).
// Tolerated context: code blocks where the surrounding language requires a
// different identifier (regex character classes, JSON keys quoted as the
// non-hyphen form when documenting an external system). The walker reads
// markdown bodies and skips fenced code blocks tagged ``` json / yaml /
// regex — fenced bash blocks DO get scanned because skills there often emit
// IDs the model is supposed to write back.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

function listTopLevelSkills(dir) {
  return readdirSync(dir)
    .filter((name) => name.startsWith('aped-') && name.endsWith('.md'))
    .map((name) => join(dir, name));
}

// Strip fenced code blocks where a non-hyphen form is legitimately present.
// The model knows to translate to/from these formats — but the prose around
// the block must use the canonical form so the routing examples don't
// teach the wrong shape.
function stripExemptCodeBlocks(content) {
  return content.replace(/```(json|yaml|regex|html)\n[\s\S]*?\n```/g, '```$1\n[STRIPPED]\n```');
}

const SKILL_PATHS = listTopLevelSkills(SKILLS_DIR);

describe('FR/NFR/AC ID format lint', () => {
  it.each(SKILL_PATHS)('%s uses canonical hyphenated form (FR-N, NFR-N, AC-N)', (skillPath) => {
    const raw = readFileSync(skillPath, 'utf8');
    const body = stripExemptCodeBlocks(raw);

    // Match `FR<digits>` / `NFR<digits>` / `AC<digits>` not preceded by a
    // hyphen, not part of a longer identifier (`FRAME`, `ACME`, `OFCRT`),
    // and not inside an obviously-irrelevant token (URL, email).
    //
    // Word boundary on the leading side does NOT cover the case where the
    // ID is preceded by an alphanumeric (e.g. `OFCRT3` would otherwise
    // match). We require a non-alphanumeric leading char (or start-of-line)
    // and a digit-then-non-alphanumeric trailing context.
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
      `${skillPath} uses non-hyphenated FR/NFR/AC IDs (canonical is FR-N / NFR-N / AC-N):\n${samples.join(
        '\n'
      )}\n\nReplace with the hyphenated form so cross-skill consumers (validate-coverage.sh, oracle scripts, future MCP atoms) parse a single shape.`
    );
  });

  it('canonical example block is reachable in aped-epics.md', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-epics.md'), 'utf8');
    expect(content).toMatch(/FR-1.*FR-3.*FR-7/);
    expect(content).toMatch(/AC-1: Given/);
    expect(content).toMatch(/FR-1: \{FR title from PRD\}/);
  });

  it('aped-prd canonical example uses hyphenated NFR-1', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-prd.md'), 'utf8');
    expect(content).toMatch(/NFR-1:/);
  });
});
