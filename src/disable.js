// 6.2.0 — APED disable / enable / status mechanism.
//
// disableAped() flips `disable-model-invocation: true` on every
// .aped/aped-*/SKILL.md (preserving any pre-existing flag) and writes
// .aped/.DISABLED + .aped/.disable-snapshot.json with the list of
// originally-unflagged skill names. enableAped() consumes the snapshot
// to restore the exact pre-disable shape (originals stay flagged,
// newly-suppressed lose the line).
//
// statusAped() reads the marker + snapshot and returns a structured
// shape the CLI handler turns into a one-line summary.
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

export function disableAped(config, cwd = process.cwd()) {
  const apedDirAbs = join(cwd, config.apedDir);
  if (!existsSync(apedDirAbs)) {
    throw new Error(`No APED installation at ${config.apedDir}`);
  }

  // Idempotent path — already disabled.
  if (existsSync(markerPath(apedDirAbs)) && existsSync(snapshotPath(apedDirAbs))) {
    const snapshot = JSON.parse(readFileSync(snapshotPath(apedDirAbs), 'utf-8'));
    return {
      action: 'noop',
      already: true,
      newlySuppressed: 0,
      originallyFlagged: snapshot.originally_unflagged
        ? listSkills(apedDirAbs).length - snapshot.originally_unflagged.length
        : 0,
      total: listSkills(apedDirAbs).length,
    };
  }

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
    disabled_at: new Date().toISOString(),
    version: SNAPSHOT_VERSION,
    originally_unflagged: originallyUnflagged,
  };
  writeFileSync(snapshotPath(apedDirAbs), JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  writeFileSync(markerPath(apedDirAbs), snapshot.disabled_at + '\n', 'utf-8');

  return {
    action: 'disabled',
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
  const skills = listSkills(apedDirAbs);

  if (!existsSync(marker) && !existsSync(snapPath)) {
    return {
      action: 'noop',
      already: true,
      restored: 0,
      kept: skills.length,
      total: skills.length,
    };
  }

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

  return {
    action: 'enabled',
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

  const markerExists = existsSync(marker);
  const snapshotExists = existsSync(snapPath);

  if (!markerExists && !snapshotExists) {
    return { state: 'enabled', total: skills.length };
  }

  let snapshot = null;
  if (snapshotExists) {
    try {
      snapshot = JSON.parse(readFileSync(snapPath, 'utf-8'));
    } catch {
      snapshot = null;
    }
  }

  if (markerExists && !snapshot) {
    return {
      state: 'disabled-stale',
      total: skills.length,
      lastToggle: readFileSync(marker, 'utf-8').trim() || null,
    };
  }

  return {
    state: 'disabled',
    total: skills.length,
    lastToggle: snapshot?.disabled_at || null,
    newlySuppressed: snapshot?.originally_unflagged?.length ?? 0,
    originallyFlagged:
      skills.length - (snapshot?.originally_unflagged?.length ?? 0),
  };
}
