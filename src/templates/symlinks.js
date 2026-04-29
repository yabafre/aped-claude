// Cross-tool skill symlink targets. Each APED skill lives canonically under
// .aped/aped-*/ and gets linked into tool-specific discovery paths so every
// tool (Claude Code, OpenCode, Codex, agents.md readers) can reach the same
// file:
//
//   .claude/skills/aped-*      → ../../.aped/aped-*   (Claude Code)
//   .opencode/skills/aped-*    → ../../.aped/aped-*   (OpenCode)
//   .agents/skills/aped-*      → ../../.aped/aped-*   (Codex CLI + agents.md)
//   .codex/skills/aped-*       → ../../.aped/aped-*   (Codex-native)
//
// Claude Code reaches APED skills via .claude/skills/aped-*/SKILL.md — the
// 3.x slash-command stubs (.claude/commands/aped-*.md) were retired in
// 4.0.0. The 3.7.5 duplicate-registration concern is gone with them.
//
// TARGET_CATALOG is the historical superset used by `--fresh` and the
// `symlink` subcommand for cleanup, so legacy installs whose symlinks
// pointed elsewhere get tidied up on the next run.
//
// By default we auto-detect which of the non-Claude tools are actually
// present in the project (by the existence of their top-level directory)
// and only create symlinks for those. A fresh single-tool Claude Code
// project therefore gets zero skill symlinks — zero duplication.
//
// Skipped on Windows (needs developer mode + core.symlinks=true; out of
// scope for this scaffolder).
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { skills } from './skills.js';

// The set we auto-detect against. Every entry is an object so we can
// expand later with auxiliary-path hints without breaking config shape.
// `.claude/skills` returned to active duty in 4.0.0 once the legacy
// `.claude/commands/aped-*.md` stubs were retired — without those stubs
// there is no risk of double-registration, so Claude Code now reads APED
// skills through the standard `.claude/skills/<name>/SKILL.md` discovery.
// The scaffold runner ensures `.claude/` exists before the symlink pass
// so a fresh project still gets links on first install.
const AUTO_DETECT_TARGETS = [
  { marker: '.claude',   skillsPath: '.claude/skills'   },
  { marker: '.opencode', skillsPath: '.opencode/skills' },
  { marker: '.agents',   skillsPath: '.agents/skills'   },
  { marker: '.codex',    skillsPath: '.codex/skills'    },
];

// All skill-symlink locations APED has ever written to. Used by cleanup
// paths (`--fresh`, the `symlink` subcommand) so that leftover symlinks
// from older APED versions get tidied up automatically. Never used
// directly for writes.
export const TARGET_CATALOG = [
  '.claude/skills',
  '.opencode/skills',
  '.agents/skills',
  '.codex/skills',
];

// Back-compat export. Tests and external callers may still import this —
// we keep it as the auto-detect union so that "what would the default
// install do in a generic environment" stays answerable.
export const DEFAULT_SKILL_SYMLINK_TARGETS = AUTO_DETECT_TARGETS.map((t) => t.skillsPath);

export function symlinks(c) {
  return buildSkillSymlinkEntries(c);
}

export function buildSkillSymlinkEntries(c) {
  if (c.skillSymlinks === false) return [];
  if (platform() === 'win32') return [];

  const targets = resolveTargets(c);
  if (targets.length === 0) return [];

  const skillNames = deriveSkillNames(c);
  const entries = [];

  for (const targetBase of targets) {
    const depth = targetBase.split('/').filter(Boolean).length;
    const upPrefix = '../'.repeat(depth);
    for (const name of skillNames) {
      entries.push({
        type: 'symlink',
        path: `${targetBase}/${name}`,
        target: `${upPrefix}${c.apedDir}/${name}`,
      });
    }
  }

  return entries;
}

// Explicit list (array) → trust the caller.
// `false` was handled upstream. Anything else → auto-detect based on which
// tool-specific marker directories exist in the project cwd.
function resolveTargets(c) {
  if (Array.isArray(c.skillSymlinks) && c.skillSymlinks.length > 0) {
    return c.skillSymlinks;
  }
  const cwd = process.cwd();
  return AUTO_DETECT_TARGETS
    .filter((t) => existsSync(join(cwd, t.marker)))
    .map((t) => t.skillsPath);
}

export function deriveSkillNames(c) {
  const pattern = new RegExp(`^${escapeRegex(c.apedDir)}/(aped-[a-z0-9-]+)/SKILL\\.md$`);
  return skills(c)
    .map((t) => {
      const m = t.path.match(pattern);
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
