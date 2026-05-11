import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillFullContent } from './_helpers/resolve-skills.js';
import { PHASES, STATUSES } from '../src/templates/mcp/state-schema.mjs';
import { TOOLS } from '../src/templates/mcp/aped-ticket-server.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const skillFiles = resolveSkillFullContent(SKILLS_DIR);

// Match `mcp__aped_state__advance(phase: "X", status: "Y")` or the bare
// `aped_state.advance(phase: "X", status: "Y")` form used in skill prose.
// Capture phase / status in any positional order.
const ADVANCE_RE =
  /\b(?:mcp__aped_state__advance|aped_state\.advance)\s*\(\s*([^)]+)\)/gi;
const KV_RE = /(phase|status)\s*:\s*["']([^"']+)["']/gi;

const TICKET_TOOL_NAMES = new Set(Object.keys(TOOLS));
// Match `mcp__aped_ticket__<tool>(...)` and `aped_ticket.<tool>(...)`.
const TICKET_RE = /\b(?:mcp__aped_ticket__|aped_ticket\.)([a-zA-Z_]+)\b/gi;

function locate(content, idx) {
  const before = content.slice(0, idx);
  const line = before.split('\n').length;
  return line;
}

// Strip fenced code blocks (``` ... ```) before regex scan so future doc
// updates that legitimately include "bad-value" examples in code fences don't
// false-positive. Inline backticks left alone — too narrow to fence.
function stripCodeFences(content) {
  return content.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '));
}

describe('MCP vocabulary round-trip lint (6.4.1 — A6)', () => {
  it('every aped_state.advance call in skills passes a phase ∈ PHASES', () => {
    const offenders = [];
    for (const skill of skillFiles) {
      for (const m of stripCodeFences(skill.content).matchAll(ADVANCE_RE)) {
        const args = m[1];
        for (const kv of args.matchAll(KV_RE)) {
          if (kv[1] === 'phase' && !PHASES.includes(kv[2])) {
            offenders.push(`${skill.name}:${locate(skill.content, m.index)} — phase "${kv[2]}" ∉ PHASES`);
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('every aped_state.advance call in skills passes a status ∈ STATUSES', () => {
    const offenders = [];
    for (const skill of skillFiles) {
      for (const m of stripCodeFences(skill.content).matchAll(ADVANCE_RE)) {
        const args = m[1];
        for (const kv of args.matchAll(KV_RE)) {
          if (kv[1] === 'status' && !STATUSES.includes(kv[2])) {
            offenders.push(`${skill.name}:${locate(skill.content, m.index)} — status "${kv[2]}" ∉ STATUSES`);
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('every mcp__aped_ticket__<tool> call references a tool registered in the server', () => {
    const offenders = [];
    for (const skill of skillFiles) {
      for (const m of stripCodeFences(skill.content).matchAll(TICKET_RE)) {
        const tool = `aped_ticket.${m[1]}`;
        if (!TICKET_TOOL_NAMES.has(tool)) {
          offenders.push(`${skill.name}:${locate(skill.content, m.index)} — tool "${tool}" not in TOOLS (${[...TICKET_TOOL_NAMES].join(', ')})`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('regression guard — add_comment + link_pr are registered (6.4.1 ships add_comment)', () => {
    expect(TICKET_TOOL_NAMES.has('aped_ticket.add_comment')).toBe(true);
    expect(TICKET_TOOL_NAMES.has('aped_ticket.link_pr')).toBe(true);
  });
});
