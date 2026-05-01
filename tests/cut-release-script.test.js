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

  it('cut-release.sh skill counter handles both flat and BMAD layouts (6.0.0+)', () => {
    // Regression guard: prior to 6.0.0 the script counted only flat
    // src/templates/skills/aped-*.md. The BMAD migration moved every skill
    // into a directory; the flat glob now matches 0 and the script falsely
    // claimed README/skills mismatch — blocking every release after merge.
    const content = readFileSync(join(ROOT, 'scripts', 'cut-release.sh'), 'utf-8');
    expect(content, 'cut-release.sh must count flat aped-X.md files (legacy 5.x)').toMatch(
      /ls src\/templates\/skills\/aped-\*\.md/,
    );
    expect(content, 'cut-release.sh must count directory-format SKILL.md files (6.0.0+)').toMatch(
      /find src\/templates\/skills .*-name\s+SKILL\.md/,
    );
    // Run the script's actual skill-count expression and confirm it matches
    // the README counter exactly. This is what would block a release.
    const r = spawnSync(
      'bash',
      [
        '-c',
        `cd "${ROOT}" && \
          flat=$({ ls src/templates/skills/aped-*.md 2>/dev/null || true; } | wc -l | tr -d ' ') && \
          dir=$({ find src/templates/skills -mindepth 2 -maxdepth 2 -name SKILL.md 2>/dev/null || true; } | { grep -v aped-skills || true; } | wc -l | tr -d ' ') && \
          total=$((flat + dir)) && \
          readme=$({ grep -oE '\\*\\*[0-9]+ skills\\*\\*' README.md || true; } | head -1 | { grep -oE '[0-9]+' || echo 0; }) && \
          echo "$total $readme"`,
      ],
      { encoding: 'utf8' },
    );
    expect(r.status, r.stderr).toBe(0);
    const [total, readme] = r.stdout.trim().split(/\s+/).map(Number);
    expect(total, `skill count (flat + dir) must match README counter`).toBe(readme);
  });
});
