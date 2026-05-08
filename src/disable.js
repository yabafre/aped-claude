// 6.2.0 — APED disable / enable / status mechanism.
// 6.3.2 — added local-only mode (--local) so a single dev can suppress
//         APED routing in their working copy without committing the
//         frontmatter flips to the team. Marker file gains a `mode:`
//         line ('local' or 'full') so enable can branch correctly.
//
// disableAped(config, cwd, { local: false }) — full mode (existing):
//   flips `disable-model-invocation: true` on every .aped/aped-*/SKILL.md
//   (preserving any pre-existing flag) and writes
//   .aped/.DISABLED + .aped/.disable-snapshot.json with the list of
//   originally-unflagged skill names.
//
// disableAped(config, cwd, { local: true }) — local mode (6.3.2):
//   writes .aped/.DISABLED with `mode: local` only. No frontmatter
//   changes, no snapshot. The activation guard (check-enabled.sh) HALTs
//   on the marker regardless of mode. Auto-appends .aped/.DISABLED to
//   .gitignore so the marker stays out of commits.
//
// enableAped() reads the marker mode and either consumes the snapshot
// (full mode) or just removes the marker (local mode).
//
// All functions are pure file ops; the prompts/coloring lives in
// subcommands.js. This separation makes the mechanism unit-testable
// against a tmpdir scaffold.

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';

const SNAPSHOT_VERSION = 1;
const FLAG_LINE = 'disable-model-invocation: true';

function listSkills(apedDirAbs) {
  if (!existsSync(apedDirAbs)) return [];
  return readdirSync(apedDirAbs)
    .filter((name) => name.startsWith('aped-') && name !== 'aped-skills')
    .filter((name) => {
      try {
        return statSync(join(apedDirAbs, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((name) => existsSync(join(apedDirAbs, name, 'SKILL.md')));
}

function splitFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  return {
    frontmatter: content.slice(4, end),
    body: content.slice(end + 4).replace(/^\n/, ''),
  };
}

function frontmatterHasFlag(frontmatter) {
  return frontmatter.split('\n').some((line) => line.trim() === FLAG_LINE);
}

function setFlag(content) {
  const parts = splitFrontmatter(content);
  if (!parts) return { content, changed: false };
  if (frontmatterHasFlag(parts.frontmatter)) return { content, changed: false };
  const newFm = parts.frontmatter + '\n' + FLAG_LINE;
  return { content: '---\n' + newFm + '\n---\n' + parts.body, changed: true };
}

function unsetFlag(content) {
  const parts = splitFrontmatter(content);
  if (!parts) return { content, changed: false };
  const lines = parts.frontmatter.split('\n');
  const filtered = lines.filter((line) => line.trim() !== FLAG_LINE);
  if (filtered.length === lines.length) return { content, changed: false };
  return {
    content: '---\n' + filtered.join('\n') + '\n---\n' + parts.body,
    changed: true,
  };
}

function markerPath(apedDirAbs) {
  return join(apedDirAbs, '.DISABLED');
}

function snapshotPath(apedDirAbs) {
  return join(apedDirAbs, '.disable-snapshot.json');
}

// 6.3.3 — gitignored per-developer override of config.yaml. Written by
// `disable --local`, removed by `enable`. Read by check-enabled.sh first
// (takes precedence over config.yaml) so the runtime guard halts on the
// local flag without committing the change to config.yaml.
function configLocalPath(apedDirAbs) {
  return join(apedDirAbs, 'config.local.yaml');
}

function writeConfigLocal(configLocalAbs, disabledAt) {
  const content =
    `# Local-only override of .aped/config.yaml — managed by aped-method.\n` +
    `# Written at ${disabledAt} by \`aped-method disable --local\`.\n` +
    `# Removed by \`aped-method enable\`. This file is gitignored so the\n` +
    `# disable doesn't propagate to the team. Hand-edit at your own risk —\n` +
    `# the next \`disable --local\` overwrites it; \`enable\` deletes it.\n` +
    `aped:\n` +
    `  enabled: false\n` +
    `skill_invocation_discipline:\n` +
    `  enabled: false\n`;
  writeFileSync(configLocalAbs, content, 'utf-8');
}

// 6.3.2 — parse the marker. Returns { mode, disabled_at } where mode is
// 'local' | 'full' | 'legacy'. Legacy markers are pre-6.3.2 (single ISO
// timestamp line, no `mode:` key) — kept readable so existing installs
// upgrade gracefully.
function readMarker(markerAbs) {
  if (!existsSync(markerAbs)) return null;
  const raw = readFileSync(markerAbs, 'utf-8');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let mode = null;
  let disabledAt = null;
  for (const line of lines) {
    const m = line.match(/^(disabled_at|mode):\s*(.+)$/);
    if (m) {
      if (m[1] === 'mode') mode = m[2];
      else disabledAt = m[2];
    } else if (!disabledAt && /^\d{4}-\d{2}-\d{2}T/.test(line)) {
      // Legacy marker — single ISO line, no `mode:` key.
      disabledAt = line;
    }
  }
  if (!mode) mode = 'legacy';
  return { mode, disabled_at: disabledAt };
}

function writeMarker(markerAbs, mode, disabledAt) {
  const content =
    `# APED disable marker — managed by aped-method (do not hand-edit).\n` +
    `disabled_at: ${disabledAt}\n` +
    `mode: ${mode}\n`;
  writeFileSync(markerAbs, content, 'utf-8');
}

// 6.3.2 — append one or more lines to project root .gitignore. Idempotent
// per-line. Skips silently when the project isn't a git repo (no .git/).
// Returns { added, path, skipped } where `added` is the count of lines
// actually appended. 6.3.3 — accepts string OR array.
function appendToGitignore(cwd, lineOrLines) {
  const lines = Array.isArray(lineOrLines) ? lineOrLines : [lineOrLines];
  const gitDir = join(cwd, '.git');
  if (!existsSync(gitDir)) {
    return { added: 0, path: null, skipped: 'no-git' };
  }

  const gitignorePath = join(cwd, '.gitignore');
  let existing = '';
  if (existsSync(gitignorePath)) {
    existing = readFileSync(gitignorePath, 'utf-8');
  }
  const presentLines = new Set(
    existing.split('\n').map((l) => l.trim()).filter(Boolean),
  );

  const toAppend = lines.filter((l) => !presentLines.has(l));
  if (toAppend.length === 0) {
    return { added: 0, path: gitignorePath, skipped: 'already-present' };
  }

  const needsLeadingNewline = existing && !existing.endsWith('\n');
  const header = existing ? '' : '# Project gitignore\n';
  const block =
    (needsLeadingNewline ? '\n' : '') +
    header +
    `\n# APED — local-only disable artefacts (per-developer, not team-wide)\n` +
    toAppend.join('\n') + '\n';
  writeFileSync(gitignorePath, existing + block, 'utf-8');
  return { added: toAppend.length, path: gitignorePath, skipped: null };
}

export function disableAped(config, cwd = process.cwd(), options = {}) {
  const apedDirAbs = join(cwd, config.apedDir);
  if (!existsSync(apedDirAbs)) {
    throw new Error(`No APED installation at ${config.apedDir}`);
  }

  const local = options.local === true;
  const marker = readMarker(markerPath(apedDirAbs));
  const snapshotExists = existsSync(snapshotPath(apedDirAbs));

  // Mode-conflict refusal (6.3.2). If a marker is present, refuse the opposite
  // mode without an explicit `enable` first — keeps state coherent and avoids
  // half-flipped frontmatters.
  if (marker) {
    const currentMode = marker.mode === 'local' ? 'local' : 'full';
    const requestedMode = local ? 'local' : 'full';
    if (currentMode !== requestedMode) {
      return {
        action: 'mode-conflict',
        currentMode,
        requestedMode,
        total: listSkills(apedDirAbs).length,
      };
    }
    // Same mode — idempotent noop.
    if (currentMode === 'full' && snapshotExists) {
      const snapshot = JSON.parse(readFileSync(snapshotPath(apedDirAbs), 'utf-8'));
      return {
        action: 'noop',
        already: true,
        mode: 'full',
        newlySuppressed: 0,
        originallyFlagged: snapshot.originally_unflagged
          ? listSkills(apedDirAbs).length - snapshot.originally_unflagged.length
          : 0,
        total: listSkills(apedDirAbs).length,
      };
    }
    if (currentMode === 'local') {
      return {
        action: 'noop',
        already: true,
        mode: 'local',
        total: listSkills(apedDirAbs).length,
      };
    }
  }

  const disabledAt = new Date().toISOString();

  // 6.3.2 — local mode: marker only, no frontmatter touch, no snapshot.
  // 6.3.3 — also writes `.aped/config.local.yaml` (gitignored) so
  // `aped.enabled: false` is visible to scripts and humans grepping config.
  // Auto-appends both marker and config.local.yaml to .gitignore so neither
  // propagates to the team.
  if (local) {
    writeMarker(markerPath(apedDirAbs), 'local', disabledAt);
    writeConfigLocal(configLocalPath(apedDirAbs), disabledAt);
    const gitignore = appendToGitignore(cwd, [
      `${config.apedDir}/.DISABLED`,
      `${config.apedDir}/config.local.yaml`,
    ]);
    return {
      action: 'disabled',
      mode: 'local',
      already: false,
      total: listSkills(apedDirAbs).length,
      gitignore,
      disabled_at: disabledAt,
    };
  }

  // Full mode (default — existing 6.2.0 behaviour).
  const skills = listSkills(apedDirAbs);
  const originallyUnflagged = [];
  let newlySuppressed = 0;

  for (const name of skills) {
    const skillPath = join(apedDirAbs, name, 'SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');
    const parts = splitFrontmatter(content);
    if (!parts) continue;
    const wasFlagged = frontmatterHasFlag(parts.frontmatter);
    if (!wasFlagged) {
      originallyUnflagged.push(name);
      const result = setFlag(content);
      if (result.changed) {
        writeFileSync(skillPath, result.content, 'utf-8');
        newlySuppressed++;
      }
    }
  }

  const snapshot = {
    disabled_at: disabledAt,
    version: SNAPSHOT_VERSION,
    originally_unflagged: originallyUnflagged,
  };
  writeFileSync(snapshotPath(apedDirAbs), JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  writeMarker(markerPath(apedDirAbs), 'full', disabledAt);

  return {
    action: 'disabled',
    mode: 'full',
    already: false,
    newlySuppressed,
    originallyFlagged: skills.length - originallyUnflagged.length,
    total: skills.length,
    snapshot,
  };
}

export function enableAped(config, cwd = process.cwd()) {
  const apedDirAbs = join(cwd, config.apedDir);
  if (!existsSync(apedDirAbs)) {
    throw new Error(`No APED installation at ${config.apedDir}`);
  }

  const marker = markerPath(apedDirAbs);
  const snapPath = snapshotPath(apedDirAbs);
  const localCfg = configLocalPath(apedDirAbs);
  const skills = listSkills(apedDirAbs);
  const markerInfo = readMarker(marker);

  // Idempotent noop when no disable artefact remains.
  if (!markerInfo && !existsSync(snapPath) && !existsSync(localCfg)) {
    return {
      action: 'noop',
      already: true,
      restored: 0,
      kept: skills.length,
      total: skills.length,
    };
  }

  // 6.3.2 — local mode: just remove the marker. No snapshot to consume,
  // no frontmatter to restore (none was flipped).
  // 6.3.3 — also remove .aped/config.local.yaml (the gitignored override).
  // Triggered when the marker says local OR an orphan config.local.yaml is
  // present without a snapshot (e.g. user deleted the marker by hand). The
  // .gitignore line stays so a future `disable --local` doesn't risk a commit.
  const localOnlyShape =
    (markerInfo && markerInfo.mode === 'local') ||
    (!markerInfo && existsSync(localCfg) && !existsSync(snapPath));
  if (localOnlyShape) {
    if (existsSync(marker)) unlinkSync(marker);
    if (existsSync(localCfg)) unlinkSync(localCfg);
    return {
      action: 'enabled',
      mode: 'local',
      already: false,
      restored: 0,
      kept: skills.length,
      total: skills.length,
    };
  }

  // Full or legacy mode — consume snapshot, restore frontmatters.
  let snapshot = null;
  if (existsSync(snapPath)) {
    try {
      snapshot = JSON.parse(readFileSync(snapPath, 'utf-8'));
    } catch {
      snapshot = null;
    }
  }

  let restored = 0;
  let bestEffort = false;

  if (snapshot && Array.isArray(snapshot.originally_unflagged)) {
    for (const name of snapshot.originally_unflagged) {
      const skillPath = join(apedDirAbs, name, 'SKILL.md');
      if (!existsSync(skillPath)) continue;
      const content = readFileSync(skillPath, 'utf-8');
      const result = unsetFlag(content);
      if (result.changed) {
        writeFileSync(skillPath, result.content, 'utf-8');
        restored++;
      }
    }
  } else {
    bestEffort = true;
    for (const name of skills) {
      const skillPath = join(apedDirAbs, name, 'SKILL.md');
      const content = readFileSync(skillPath, 'utf-8');
      const result = unsetFlag(content);
      if (result.changed) {
        writeFileSync(skillPath, result.content, 'utf-8');
        restored++;
      }
    }
  }

  if (existsSync(marker)) unlinkSync(marker);
  if (existsSync(snapPath)) unlinkSync(snapPath);
  if (existsSync(localCfg)) unlinkSync(localCfg);  // 6.3.3 — defensive cleanup

  return {
    action: 'enabled',
    mode: 'full',
    already: false,
    restored,
    kept: skills.length - restored,
    total: skills.length,
    bestEffort,
  };
}

export function statusAped(config, cwd = process.cwd()) {
  const apedDirAbs = join(cwd, config.apedDir);
  if (!existsSync(apedDirAbs)) {
    return { state: 'no-install', total: 0 };
  }

  const skills = listSkills(apedDirAbs);
  const marker = markerPath(apedDirAbs);
  const snapPath = snapshotPath(apedDirAbs);

  const markerInfo = readMarker(marker);
  const snapshotExists = existsSync(snapPath);
  const localCfgExists = existsSync(configLocalPath(apedDirAbs));

  if (!markerInfo && !snapshotExists && !localCfgExists) {
    return { state: 'enabled', total: skills.length };
  }

  // 6.3.2 — local mode: marker says `mode: local`, no snapshot expected.
  // 6.3.3 — also surface as disabled-local when only the gitignored
  // config.local.yaml is present (orphan, e.g. marker hand-deleted).
  if ((markerInfo && markerInfo.mode === 'local') || (!markerInfo && localCfgExists && !snapshotExists)) {
    return {
      state: 'disabled-local',
      total: skills.length,
      lastToggle: markerInfo?.disabled_at || null,
    };
  }

  let snapshot = null;
  if (snapshotExists) {
    try {
      snapshot = JSON.parse(readFileSync(snapPath, 'utf-8'));
    } catch {
      snapshot = null;
    }
  }

  if (markerInfo && !snapshot) {
    return {
      state: 'disabled-stale',
      total: skills.length,
      lastToggle: markerInfo.disabled_at,
    };
  }

  return {
    state: 'disabled',
    total: skills.length,
    lastToggle: snapshot?.disabled_at || markerInfo?.disabled_at || null,
    newlySuppressed: snapshot?.originally_unflagged?.length ?? 0,
    originallyFlagged:
      skills.length - (snapshot?.originally_unflagged?.length ?? 0),
  };
}
