// Symlink specs that expose the canonical .aped/aped-*/SKILL.md directories
// under the skill directories that other tools auto-discover:
//
//   .claude/skills/aped-*      → ../../.aped/aped-*   (Claude Code auto-discovery)
//   .opencode/skills/aped-*    → ../../.aped/aped-*   (OpenCode)
//   .agents/skills/aped-*      → ../../.aped/aped-*   (Codex CLI + agents.md)
//   .codex/skills/aped-*       → ../../.aped/aped-*   (Codex-native, future-proof)
//
// One canonical file per skill, N symlinks per tool. Edits land in .aped/ once
// and every tool sees the change. Skipped on Windows (needs developer mode +
// core.symlinks=true; out of scope for this scaffolder).
import { platform } from 'node:os';
import { skills } from './skills.js';

export const DEFAULT_SKILL_SYMLINK_TARGETS = [
  '.claude/skills',
  '.opencode/skills',
  '.agents/skills',
  '.codex/skills',
];

export function symlinks(c) {
  return buildSkillSymlinkEntries(c);
}

export function buildSkillSymlinkEntries(c) {
  if (c.skillSymlinks === false) return [];
  if (platform() === 'win32') return [];

  const targets = Array.isArray(c.skillSymlinks) && c.skillSymlinks.length > 0
    ? c.skillSymlinks
    : DEFAULT_SKILL_SYMLINK_TARGETS;

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
