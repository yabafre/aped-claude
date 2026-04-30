// cut-release.sh + check-pre-merge.sh script validation (4.14.0).
// Verifies the scripts exist, are syntactically valid bash, and that
// check-pre-merge.sh passes on the current repo state.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(import.meta.dirname, '..');

describe('release scripts (4.14.0)', () => {
  it('scripts/cut-release.sh exists and is valid bash', () => {
    const path = join(ROOT, 'scripts', 'cut-release.sh');
    expect(existsSync(path)).toBe(true);
    const r = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
    expect(r.status, `bash -n failed: ${r.stderr}`).toBe(0);
  });

  it('scripts/check-pre-merge.sh exists and is valid bash', () => {
    const path = join(ROOT, 'scripts', 'check-pre-merge.sh');
    expect(existsSync(path)).toBe(true);
    const r = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
    expect(r.status, `bash -n failed: ${r.stderr}`).toBe(0);
  });

  it('scripts/lint-bash-discipline.sh exists and is valid bash', () => {
    const path = join(ROOT, 'scripts', 'lint-bash-discipline.sh');
    expect(existsSync(path)).toBe(true);
    const r = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
    expect(r.status, `bash -n failed: ${r.stderr}`).toBe(0);
  });

  it('check-pre-merge.sh passes on the current repo', () => {
    const path = join(ROOT, 'scripts', 'check-pre-merge.sh');
    const r = spawnSync('bash', [path], { encoding: 'utf8', cwd: ROOT });
    expect(r.status, `check-pre-merge failed:\n${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/all checks passed/);
  });

  it('lint-bash-discipline.sh passes on the current repo', () => {
    const path = join(ROOT, 'scripts', 'lint-bash-discipline.sh');
    const r = spawnSync('bash', [path], { encoding: 'utf8', cwd: ROOT });
    expect(r.status, `lint-bash-discipline failed:\n${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/clean/);
  });

  it('cut-release.sh has 5 manual step instructions', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'cut-release.sh'), 'utf-8');
    const steps = content.match(/echo\s+"?\s*\d+\./gm) || [];
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it('cut-release.sh uses §5.1 grep discipline (no grep -c without wc)', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'cut-release.sh'), 'utf-8');
    const lines = content.split('\n');
    const violations = lines.filter(
      (l) => /\$\(.*grep\s+-c/.test(l) && !/wc -l/.test(l) && !l.trimStart().startsWith('#'),
    );
    expect(violations).toHaveLength(0);
  });
});
