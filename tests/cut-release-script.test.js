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

  it('check-pre-merge.sh catches skill-count drift in aped-quickstart.md (6.12.0)', () => {
    // 6.12.0 hardening — the 35-skill drift in aped-quickstart.md survived
    // 7 days post-6.9.0 because no test enforced it. This regression guard
    // pollutes a copy of the file with the wrong count and confirms the
    // script exits 1 with a stable message naming the offending doc.
    const { mkdtempSync, copyFileSync, readFileSync, writeFileSync, mkdirSync, rmSync } = require('node:fs');
    const { tmpdir } = require('node:os');
    const sandbox = mkdtempSync(join(tmpdir(), 'aped-precheck-drift-'));
    try {
      // Mirror the repo files the script actually reads.
      mkdirSync(join(sandbox, 'scripts'), { recursive: true });
      mkdirSync(join(sandbox, 'docs', 'dev'), { recursive: true });
      mkdirSync(join(sandbox, 'src', 'templates', 'skills'), { recursive: true });
      copyFileSync(join(ROOT, 'scripts', 'check-pre-merge.sh'), join(sandbox, 'scripts', 'check-pre-merge.sh'));
      copyFileSync(join(ROOT, 'README.md'), join(sandbox, 'README.md'));
      copyFileSync(join(ROOT, 'SECURITY.md'), join(sandbox, 'SECURITY.md'));
      copyFileSync(join(ROOT, 'CHANGELOG.md'), join(sandbox, 'CHANGELOG.md'));
      copyFileSync(join(ROOT, 'package.json'), join(sandbox, 'package.json'));
      for (const doc of ['aped-quickstart.md', 'aped-personas.md', 'aped-workflow.md', 'aped-phases.md', 'skills-classification.md', 'TROUBLESHOOTING.md']) {
        copyFileSync(join(ROOT, 'docs', doc), join(sandbox, 'docs', doc));
      }
      copyFileSync(join(ROOT, 'docs', 'dev', 'discovery-pattern.md'), join(sandbox, 'docs', 'dev', 'discovery-pattern.md'));
      // Mirror the skills tree so the count expression resolves.
      const { readdirSync, statSync } = require('node:fs');
      const skillsRoot = join(ROOT, 'src', 'templates', 'skills');
      for (const entry of readdirSync(skillsRoot)) {
        const src = join(skillsRoot, entry);
        const st = statSync(src);
        const dst = join(sandbox, 'src', 'templates', 'skills', entry);
        if (st.isDirectory()) {
          mkdirSync(dst, { recursive: true });
          if (existsSync(join(src, 'SKILL.md'))) {
            copyFileSync(join(src, 'SKILL.md'), join(dst, 'SKILL.md'));
          }
        } else if (entry.endsWith('.md')) {
          copyFileSync(src, dst);
        }
      }
      // Pollute the quickstart with the wrong count.
      const quickPath = join(sandbox, 'docs', 'aped-quickstart.md');
      const polluted = readFileSync(quickPath, 'utf-8').replace(/\*\*36 skills\*\*/, '**35 skills**');
      writeFileSync(quickPath, polluted);
      // Initialize a tiny git repo so `git describe --tags` in section 1 doesn't fail.
      spawnSync('git', ['init', '-q'], { cwd: sandbox });
      spawnSync('git', ['add', '.'], { cwd: sandbox });
      spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: sandbox });
      const r = spawnSync('bash', ['scripts/check-pre-merge.sh'], { encoding: 'utf8', cwd: sandbox });
      expect(r.status, `expected exit 1 but got ${r.status}\nstdout:\n${r.stdout}`).toBe(1);
      expect(r.stdout).toMatch(/docs\/aped-quickstart\.md cites 35 skills, actual count is 36/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
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
