// Codex projection — pure builders for the conventional OpenAI Codex project
// surface. APED's canonical files live in .aped/aped-*/; Codex reads its skills
// from .agents/skills/ (handled in symlinks.js) and its config from .codex/.
// This module turns APED's already-wired Claude config (hooks + the aped-state
// MCP) into the Codex equivalents, mirroring the official migrate-to-codex
// converter (the authority for this machine's Codex binary):
//
//   .codex/config.toml   personality + [mcp_servers.aped-*] + [features].codex_hooks
//   .codex/hooks.json     { hooks: { <Event>: [ { matcher?, hooks:[...] } ] } }
//   AGENTS.md             provider-neutral APED routing/discipline block
//
// Everything here is pure (string in → string out, no fs). The fs entry point
// is src/codex-manager.js. Two deliberate deviations from the literal spec,
// both grounded in the live converter source:
//   1. commands are rewritten to cwd-relative paths — Codex exposes NO project
//      dir variable, and hook/MCP commands run with cwd = project root, so a
//      ${CLAUDE_PROJECT_DIR} prefix would survive as a broken literal.
//   2. the SessionStart matcher's Claude-only tokens (clear/compact) are mapped
//      to Codex's session events (startup/resume).

import { existsSync } from 'node:fs';
import { join } from 'node:path';

// A Codex project surface is generated when the project already uses Codex —
// detected the same way symlinks.js auto-detects tool markers. `.codex/` is the
// Codex config dir; `.agents/` is the cross-tool skills dir. Either marker means
// "Codex is in play". A fresh single-tool Claude project has neither and stays
// Codex-free (we never create these markers in greenfield).
export function isCodexTargeted(cwd = process.cwd()) {
  return existsSync(join(cwd, '.codex')) || existsSync(join(cwd, '.agents'));
}

// Codex hook/MCP commands run with cwd = project root and there is no
// ${CODEX_PROJECT_DIR} (or any) project-dir variable. Strip the Claude
// ${CLAUDE_PROJECT_DIR}/ prefix wherever it appears so the path resolves
// relative to cwd. Handles `${CLAUDE_PROJECT_DIR}/x`, `$CLAUDE_PROJECT_DIR/x`,
// and the `bash ${CLAUDE_PROJECT_DIR}/x.sh` wrapper shape.
export function rewriteCommandForCodex(command) {
  if (typeof command !== 'string') return command;
  return command.replace(/\$\{?CLAUDE_PROJECT_DIR\}?\//g, '');
}

// ── Codex hooks.json ────────────────────────────────────────────────────────
// Mirrors migrate-to-codex/scripts/migrate/hooks.py:
//   - convertible events: PreToolUse, PostToolUse, SessionStart, UserPromptSubmit, Stop
//   - only `type: "command"` handlers convert
//   - `matcher` kept for PreToolUse / PostToolUse / SessionStart; dropped for the rest
//   - `timeout` (seconds) carried through
//   - commands rewritten cwd-relative
// Returns the JSON string for .codex/hooks.json, or null when nothing converts.
const CODEX_HOOK_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'SessionStart',
  'UserPromptSubmit',
  'Stop',
]);
const CODEX_MATCHER_EVENTS = new Set(['PreToolUse', 'PostToolUse', 'SessionStart']);

export function buildCodexHooksJson(claudeHooks) {
  const hooksPayload = {};

  for (const event of Object.keys(claudeHooks || {})) {
    if (!CODEX_HOOK_EVENTS.has(event)) continue;
    const groups = Array.isArray(claudeHooks[event]) ? claudeHooks[event] : [];

    for (const group of groups) {
      const handlers = (Array.isArray(group?.hooks) ? group.hooks : [])
        .filter((h) => (h?.type || 'command') === 'command' && typeof h?.command === 'string')
        .map((h) => {
          const out = { type: 'command', command: rewriteCommandForCodex(h.command) };
          if (h.timeout !== undefined && h.timeout !== null) out.timeout = h.timeout;
          return out;
        });
      if (handlers.length === 0) continue;

      const mapped = { hooks: handlers };
      // matcher only survives on the events Codex matches against.
      if (CODEX_MATCHER_EVENTS.has(event) && typeof group?.matcher === 'string') {
        const matcher = event === 'SessionStart'
          ? rewriteSessionStartMatcher(group.matcher)
          : group.matcher;
        if (matcher) mapped.matcher = matcher;
      }

      (hooksPayload[event] ||= []).push(mapped);
    }
  }

  if (Object.keys(hooksPayload).length === 0) return null;
  return `${JSON.stringify({ hooks: hooksPayload }, null, 2)}\n`;
}

// Claude SessionStart matchers carry `clear` / `compact` (Claude-only session
// events Codex never emits). Codex matches `startup` / `resume`. Keep `startup`
// when present, drop the Claude-only tokens, and add `resume` so the hook fires
// on a resumed Codex session. A custom matcher with none of these tokens is
// left untouched.
function rewriteSessionStartMatcher(matcher) {
  const tokens = String(matcher).split('|').map((t) => t.trim()).filter(Boolean);
  const claudeOnly = new Set(['clear', 'compact']);
  if (!tokens.some((t) => t === 'startup' || claudeOnly.has(t))) return matcher;
  const out = [];
  if (tokens.includes('startup')) out.push('startup');
  out.push('resume');
  return out.join('|');
}

// ── Codex config.toml ────────────────────────────────────────────────────────
// Generates / merges .codex/config.toml. APED owns exactly:
//   - top-level `personality = "friendly"` — written ONLY when generating the
//     file from scratch (never flips a user's existing personality)
//   - one [mcp_servers.<name>] table (+ optional .env sub-table) per APED-owned
//     MCP server (the aped-* servers passed in `mcpServers`)
//   - `[features].codex_hooks = true` when convertible hooks exist
// Unrelated keys (notify, projects, marketplaces, non-APED mcp_servers, other
// [features] keys) are preserved verbatim. Merge is line/section based — no TOML
// parser dependency — and is a fixed point (merge(merge(x)) === merge(x)).
export function buildCodexConfigToml({ mcpServers = {}, hooksEnabled = false }, { existingToml = '' } = {}) {
  const apedServerNames = Object.keys(mcpServers);
  const mcpChunks = apedServerNames.map((name) => renderMcpServerToml(name, mcpServers[name]));

  if (!existingToml || !existingToml.trim()) {
    // Order mirrors the merge path (personality → [features] → mcp tables) so a
    // greenfield file is already a fixed point: re-running the projection over
    // it produces byte-identical output, no churn in the user's repo.
    const chunks = ['personality = "friendly"'];
    if (hooksEnabled) chunks.push('[features]\ncodex_hooks = true');
    chunks.push(...mcpChunks);
    return `${chunks.join('\n\n')}\n`;
  }

  return mergeCodexConfigToml(existingToml, { apedServerNames, mcpChunks, hooksEnabled });
}

function mergeCodexConfigToml(existingToml, { apedServerNames, mcpChunks, hooksEnabled }) {
  const { preamble, sections } = parseTomlSections(existingToml);

  // APED-managed mcp section names: [mcp_servers.<aped>] and its .env sub-table.
  const managed = new Set();
  for (const name of apedServerNames) {
    managed.add(`mcp_servers.${name}`);
    managed.add(`mcp_servers.${name}.env`);
  }

  const kept = [];
  let featuresHandled = false;
  for (const section of sections) {
    if (managed.has(section.name)) continue; // drop — re-rendered below
    if (section.name === 'features') {
      kept.push(applyFeaturesCodexHooks(section.lines, hooksEnabled));
      featuresHandled = true;
      continue;
    }
    kept.push(section.lines.join('\n'));
  }

  const chunks = [];
  const pre = trimBlankEdges(preamble).join('\n');
  if (pre) chunks.push(pre);
  for (const k of kept) {
    const t = k.trim();
    if (t) chunks.push(t);
  }
  chunks.push(...mcpChunks);
  if (hooksEnabled && !featuresHandled) chunks.push('[features]\ncodex_hooks = true');

  return `${chunks.join('\n\n')}\n`;
}

// Render one [mcp_servers.<name>] table (+ .env sub-table). The `mcp_servers`
// path segment is literal; only the server-name segment is quoted when it is
// not a valid TOML bare key (A-Za-z0-9_-). `aped-state` etc. stay bare.
function renderMcpServerToml(name, cfg = {}) {
  const key = `mcp_servers.${tomlKey(name)}`;
  const lines = [`[${key}]`];
  if (typeof cfg.command === 'string') lines.push(`command = ${tomlString(cfg.command)}`);
  if (Array.isArray(cfg.args)) lines.push(`args = ${tomlStringArray(cfg.args)}`);
  const env = cfg.env && typeof cfg.env === 'object' ? cfg.env : null;
  let out = lines.join('\n');
  if (env && Object.keys(env).length > 0) {
    const envLines = [`[${key}.env]`];
    for (const [k, v] of Object.entries(env)) envLines.push(`${tomlKey(k)} = ${tomlString(String(v))}`);
    out += `\n\n${envLines.join('\n')}`;
  }
  return out;
}

// In-place edit of a parsed [features] section's lines: ensure codex_hooks is
// true (hooksEnabled) or removed (!hooksEnabled), preserving sibling keys.
function applyFeaturesCodexHooks(lines, hooksEnabled) {
  const header = lines[0];
  const body = lines.slice(1).filter((l) => !/^\s*codex_hooks\s*=/.test(l));
  const rebuilt = [header, ...body];
  if (hooksEnabled) {
    // Insert codex_hooks right after the header for a stable position.
    rebuilt.splice(1, 0, 'codex_hooks = true');
  }
  return rebuilt.join('\n');
}

// Split TOML text into a preamble (everything before the first table header)
// and an ordered list of sections, each { name, lines } where lines[0] is the
// `[name]` header line. Comment/blank lines stay attached to their section.
function parseTomlSections(text) {
  const allLines = text.replace(/\r\n/g, '\n').split('\n');
  const headerRe = /^\s*\[([^\]]+)\]\s*$/;
  const preamble = [];
  const sections = [];
  let current = null;
  for (const line of allLines) {
    const m = line.match(headerRe);
    if (m) {
      current = { name: m[1].trim(), lines: [line] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble, sections };
}

function trimBlankEdges(lines) {
  const out = [...lines];
  while (out.length && out[0].trim() === '') out.shift();
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  return out;
}

function tomlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : tomlString(key);
}
function tomlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
function tomlStringArray(values) {
  return `[${values.map((v) => tomlString(String(v))).join(', ')}]`;
}

// ── AGENTS.md ────────────────────────────────────────────────────────────────
// Standalone, provider-neutral APED routing/discipline block for Codex (and any
// AGENTS.md reader). Used when no root CLAUDE.md exists to symlink to. Wrapped in
// APED markers so a later sync can manage it without touching user content.
export function buildAgentsMd(config) {
  const a = config.apedDir;
  const o = config.outputDir;
  return `# AGENTS.md

<!-- APED:START -->
## APED Method — disciplined user-driven pipeline

Pipeline: **Analyze → PRD → UX → Architecture → Epics → Story → Dev → Review**.

### Skill invocation

If there is **even a 1% chance** an APED skill applies, invoke it. APED skills live in
\`.agents/skills/aped-*/SKILL.md\` (Codex discovers them there); the runtime routes by each
skill's \`description:\`. Use natural-language phrases ("create the prd", "review this branch",
"kick off dev") — do not paraphrase what you think the skill would say.

User instructions in \`AGENTS.md\` / \`CLAUDE.md\` or \`${a}/config.yaml\` override skill defaults.

Full catalog: \`${a}/skills/SKILL-INDEX.md\`.

### APED rules

- **No auto-chain.** Each skill ends with "Run aped-X when ready." Wait for the user.
- **Gates are mandatory.** When a skill says "⏸ HALT" or "⏸ GATE", wait for explicit user confirmation.
- **Validate before persisting** to \`${o}/\`.
- **Story-driven dev.** No code without a story file. Use \`aped-story\` first.

### State

- Engine: \`${a}/\` (immutable) · Artifacts: \`${o}/\` (evolves)
- State: \`${o}/state.yaml\` · Lessons: \`${o}/lessons.md\`

### Codex notes

- Skills live in \`.agents/skills/aped-*/\`. MCP + hooks config live in \`.codex/config.toml\` and \`.codex/hooks.json\`.
- Codex runs PreToolUse / PostToolUse for shell (Bash) commands only, so APED hooks matched on
  Write/Edit are advisory-inert under Codex — rely on the GREEN-gate discipline instead.
<!-- APED:END -->
`;
}
