import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeOrphans, walkApedDir } from '../src/index.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';

let sandbox;
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'aped-orphans-'));
  mkdirSync(join(sandbox, APED_DIR, 'aped-review', 'steps'), { recursive: true });
  mkdirSync(join(sandbox, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, OUTPUT_DIR, 'stories'), { recursive: true });
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function touch(rel, content = 'x') {
  const full = join(sandbox, rel);
  writeFileSync(full, content);
}

describe('computeOrphans (chantier U)', () => {
  it('returns the diff between disk and templates as orphans', () => {
    // Disk: 12 step files. Templates: 5 step files (5 in new layout).
    const onDisk = Array.from({ length: 12 }, (_, i) =>
      `${APED_DIR}/aped-review/steps/step-${String(i + 1).padStart(2, '0')}-old.md`,
    );
    const templated = new Set(
      Array.from({ length: 5 }, (_, i) =>
        `${APED_DIR}/aped-review/steps/step-${String(i + 1).padStart(2, '0')}-new.md`,
      ),
    );
    const orphans = computeOrphans({
      apedDir: APED_DIR,
      templatedPaths: templated,
      filesOnDisk: onDisk,
      allowlist: [],
    });
    expect(orphans).toHaveLength(12);
    expect(orphans[0]).toBe(`${APED_DIR}/aped-review/steps/step-01-old.md`);
  });

  it('honours .update-allowlist (kept paths excluded from orphans)', () => {
    const onDisk = [
      `${APED_DIR}/aped-review/steps/step-99-custom.md`,
      `${APED_DIR}/aped-review/steps/step-old-stale.md`,
    ];
    const orphans = computeOrphans({
      apedDir: APED_DIR,
      templatedPaths: new Set(),
      filesOnDisk: onDisk,
      allowlist: [`${APED_DIR}/aped-review/steps/step-99-custom.md`],
    });
    expect(orphans).toEqual([`${APED_DIR}/aped-review/steps/step-old-stale.md`]);
  });

  it('NEVER returns config.yaml / .DISABLED / .disable-snapshot.json / WORKTREE / .archive/ / checkins/ / logs/ as orphans', () => {
    const onDisk = [
      `${APED_DIR}/config.yaml`,
      `${APED_DIR}/.DISABLED`,
      `${APED_DIR}/.disable-snapshot.json`,
      `${APED_DIR}/WORKTREE`,
      `${APED_DIR}/.archive/old-spec.md`,
      `${APED_DIR}/checkins/2026-05-07.md`,
      `${APED_DIR}/logs/sync-state.log`,
      `${APED_DIR}/.update-allowlist`,
      `${APED_DIR}/.update-orphans-2026-05-07T15-00-00Z.log`,
      `${APED_DIR}/aped-review/steps/step-01-stale.md`, // genuine orphan
    ];
    const orphans = computeOrphans({
      apedDir: APED_DIR,
      templatedPaths: new Set(),
      filesOnDisk: onDisk,
      allowlist: [],
    });
    expect(orphans).toEqual([`${APED_DIR}/aped-review/steps/step-01-stale.md`]);
  });

  it('does not consider paths outside apedDir/ (outputDir/ artefacts are caller-filtered)', () => {
    // Caller passes only apedDir/ files. computeOrphans should not need to
    // know about outputDir/ — the protection is the caller's responsibility.
    const onDisk = [`${APED_DIR}/aped-review/steps/step-01-stale.md`];
    const orphans = computeOrphans({
      apedDir: APED_DIR,
      templatedPaths: new Set(),
      filesOnDisk: onDisk,
      allowlist: [],
    });
    expect(orphans).toEqual([`${APED_DIR}/aped-review/steps/step-01-stale.md`]);
  });

  it('returns empty when every disk file has a corresponding template', () => {
    const paths = [
      `${APED_DIR}/scripts/foo.sh`,
      `${APED_DIR}/aped-review/steps/step-01-new.md`,
    ];
    const orphans = computeOrphans({
      apedDir: APED_DIR,
      templatedPaths: new Set(paths),
      filesOnDisk: paths,
      allowlist: [],
    });
    expect(orphans).toEqual([]);
  });
});

describe('walkApedDir', () => {
  it('lists every file under apedDir/ recursively (paths relative to cwd)', () => {
    touch(`${APED_DIR}/a.md`);
    touch(`${APED_DIR}/scripts/b.sh`);
    touch(`${APED_DIR}/aped-review/steps/step-01.md`);
    touch(`${OUTPUT_DIR}/stories/1-1-foo.md`);  // outside apedDir — must be ignored

    const files = walkApedDir(sandbox, APED_DIR);
    expect(files.sort()).toEqual([
      `${APED_DIR}/a.md`,
      `${APED_DIR}/aped-review/steps/step-01.md`,
      `${APED_DIR}/scripts/b.sh`,
    ]);
    expect(files.find((f) => f.startsWith(OUTPUT_DIR))).toBeUndefined();
  });

  it('returns [] when apedDir does not exist', () => {
    rmSync(join(sandbox, APED_DIR), { recursive: true, force: true });
    expect(walkApedDir(sandbox, APED_DIR)).toEqual([]);
  });
});
