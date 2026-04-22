import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildSkillSymlinkEntries } from './templates/symlinks.js';

export function inspectSkillSymlinks(config, cwd = process.cwd()) {
  const entries = buildSkillSymlinkEntries(config);
  return entries.map((entry) => {
    const fullPath = join(cwd, entry.path);
    try {
      const stat = lstatSync(fullPath);
      if (!stat.isSymbolicLink()) {
        return { ...entry, fullPath, status: 'blocked' };
      }
      const actualTarget = readlinkSync(fullPath);
      if (actualTarget === entry.target) {
        return { ...entry, fullPath, actualTarget, status: 'ok' };
      }
      return { ...entry, fullPath, actualTarget, status: 'broken' };
    } catch {
      return {
        ...entry,
        fullPath,
        status: existsSync(fullPath) ? 'blocked' : 'missing',
      };
    }
  });
}

export function summarizeSymlinkInspection(results) {
  const summary = { ok: 0, missing: 0, broken: 0, blocked: 0 };
  for (const result of results) {
    summary[result.status] += 1;
  }
  return summary;
}

export function repairSkillSymlinks(config, cwd = process.cwd()) {
  const inspected = inspectSkillSymlinks(config, cwd);
  const repaired = [];
  const skipped = [];

  for (const result of inspected) {
    if (result.status === 'ok') continue;
    if (result.status === 'blocked') {
      skipped.push(result);
      continue;
    }

    mkdirSync(dirname(result.fullPath), { recursive: true });
    try {
      rmSync(result.fullPath, { force: true, recursive: true });
    } catch {
      // Ignore and let symlink creation attempt report via the remaining status.
    }
    symlinkSync(result.target, result.fullPath, 'dir');
    repaired.push(result);
  }

  return {
    inspected,
    repaired,
    skipped,
    summary: summarizeSymlinkInspection(inspected),
  };
}
