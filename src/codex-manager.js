// Codex surface projector — the single fs entry point that materializes the
// conventional Codex project surface from APED's already-wired Claude config.
// Mirrors src/symlink-manager.js in shape (pure builders in templates/codex.js,
// fs orchestration here). Invoked from: the base scaffold + --update (when a
// Codex marker exists), the end of each opt-in `installFeature`, and the
// explicit `aped-method codex` subcommand.
//
// Source of truth = the materialized on-disk Claude config (exactly what
// migrate-to-codex reads): `.claude/settings.local.json` (hooks + mcpServers)
// and `.mcp.json` (mcpServers). Zero coupling to the 12 feature handlers —
// reading the files after a feature merge already reflects it.
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  isCodexTargeted,
  buildCodexConfigToml,
  buildCodexHooksJson,
  buildAgentsMd,
  rewriteCommandForCodex,
} from './templates/codex.js';
import { repairSkillSymlinks } from './symlink-manager.js';

function readJsonSafe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null; // malformed source — treat as absent, never throw mid-scaffold
  }
}

// Union of `.mcp.json` and `.claude/settings.local.json` mcpServers, filtered to
// APED-owned servers (name `aped-*` or a command/arg pointing into <apedDir>/mcp/)
// and rewritten to cwd-relative commands. Generic user servers (context7, …) are
// the user's to manage and are intentionally left out of APED's projection.
function collectApedMcpServers(config, cwd) {
  const fromMcpJson = readJsonSafe(join(cwd, '.mcp.json'))?.mcpServers || {};
  const fromSettings = readJsonSafe(join(cwd, '.claude/settings.local.json'))?.mcpServers || {};
  const union = { ...fromMcpJson, ...fromSettings }; // settings (APED's enable-mcp) wins

  const apedMarker = `${config.apedDir}/mcp/`;
  const out = {};
  for (const [name, raw] of Object.entries(union)) {
    if (!raw || typeof raw !== 'object') continue;
    const args = Array.isArray(raw.args) ? raw.args : [];
    const isAped = name.startsWith('aped-') || args.some((a) => String(a).includes(apedMarker));
    if (!isAped) continue;
    const projected = { command: rewriteCommandForCodex(raw.command) };
    if (args.length) projected.args = args.map((a) => rewriteCommandForCodex(String(a)));
    if (raw.env && typeof raw.env === 'object') projected.env = { ...raw.env };
    out[name] = projected;
  }
  return out;
}

function readHooks(cwd) {
  const settings = readJsonSafe(join(cwd, '.claude/settings.local.json'));
  return settings?.hooks && typeof settings.hooks === 'object' ? settings.hooks : {};
}

// AGENTS.md handling (least-surprising, drift-free):
//   - real root CLAUDE.md present → AGENTS.md becomes a relative symlink to it
//     (single source of truth), unless AGENTS.md is a user-authored real file.
//   - no CLAUDE.md → write a standalone provider-neutral AGENTS.md (or refresh
//     the APED-generated one). Never overwrite a user's hand-written AGENTS.md.
const APED_MARKER = '<!-- APED:START -->';

function classifyAgentsMd(agentsPath) {
  let stat;
  try { stat = lstatSync(agentsPath); } catch { return 'absent'; }
  if (stat.isSymbolicLink()) return 'symlink';
  try {
    return readFileSync(agentsPath, 'utf-8').includes(APED_MARKER) ? 'aped-generated' : 'user';
  } catch {
    return 'user';
  }
}

function ensureAgentsMd(config, cwd) {
  const agentsPath = join(cwd, 'AGENTS.md');
  const claudePath = join(cwd, 'CLAUDE.md');
  const kind = classifyAgentsMd(agentsPath);
  const claudeExists = existsSync(claudePath) && !lstatSync(claudePath).isSymbolicLink();

  if (claudeExists) {
    if (kind === 'user') return 'kept-user';
    if (kind === 'symlink' && readlinkSync(agentsPath) === 'CLAUDE.md') return 'kept-symlink';
    // absent / aped-generated / other-symlink → relative symlink to CLAUDE.md
    try { rmSync(agentsPath, { force: true }); } catch { /* ok */ }
    symlinkSync('CLAUDE.md', agentsPath);
    return 'symlinked';
  }

  // No CLAUDE.md to point at.
  if (kind === 'user' || kind === 'symlink') return `kept-${kind}`;
  writeFileSync(agentsPath, buildAgentsMd(config), 'utf-8');
  return kind === 'aped-generated' ? 'refreshed' : 'written';
}

// Project the full conventional Codex surface. No-op (and never creates Codex
// dirs) when the project carries no Codex marker.
export function projectCodexSurface(config, cwd = process.cwd()) {
  if (!isCodexTargeted(cwd)) return { skipped: 'no-codex-marker' };

  const written = [];

  // 1. Skills → .agents/skills/ (symlinks.js now targets it for the .codex marker).
  const symlinkResult = repairSkillSymlinks(config, cwd);

  // 2. .codex/config.toml (merge-safe) + .codex/hooks.json.
  const mcpServers = collectApedMcpServers(config, cwd);
  const hooksJson = buildCodexHooksJson(readHooks(cwd));
  const hooksEnabled = hooksJson !== null;

  const codexDir = join(cwd, '.codex');
  mkdirSync(codexDir, { recursive: true });

  const configPath = join(codexDir, 'config.toml');
  const existingToml = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';
  writeFileSync(
    configPath,
    buildCodexConfigToml({ mcpServers, hooksEnabled }, { existingToml }),
    'utf-8',
  );
  written.push('.codex/config.toml');

  if (hooksJson) {
    writeFileSync(join(codexDir, 'hooks.json'), hooksJson, 'utf-8');
    written.push('.codex/hooks.json');
  }

  // 3. AGENTS.md.
  const agentsAction = ensureAgentsMd(config, cwd);
  if (agentsAction === 'written' || agentsAction === 'refreshed' || agentsAction === 'symlinked') {
    written.push('AGENTS.md');
  }

  return {
    written,
    mcpServers: Object.keys(mcpServers),
    hooksEnabled,
    agentsAction,
    symlinks: {
      repaired: symlinkResult.repaired.length,
      skipped: symlinkResult.skipped.length,
    },
  };
}
