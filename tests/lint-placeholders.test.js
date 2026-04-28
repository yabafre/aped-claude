import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const LINT_TPL = ALL_SCRIPTS.find((s) => s.path.endsWith('lint-placeholders.sh'));

function setupSandbox({ enabled = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aped-lint-test-'));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  const lint = join(root, LINT_TPL.path);
  writeFileSync(lint, LINT_TPL.content);
  chmodSync(lint, 0o755);
  // Minimal config.yaml — only the placeholder_lint flag is read.
  writeFileSync(
    join(root, APED_DIR, 'config.yaml'),
    `project_name: test\nplaceholder_lint:\n  enabled: ${enabled}\n`,
  );
  return { root, lint };
}

function runLint(lint, file, root) {
  try {
    const out = execSync(`bash ${lint} ${file}`, {
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return { code: 0, stdout: out, stderr: '' };
  } catch (e) {
    return {
      code: e.status ?? -1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
    };
  }
}

let sb;
beforeEach(() => { sb = setupSandbox(); });
afterEach(() => { rmSync(sb.root, { recursive: true, force: true }); });

describe('lint-placeholders.sh — I/O matrix', () => {
  it('clean file exits 0 silently', () => {
    const f = join(sb.root, OUTPUT_DIR, 'clean.md');
    writeFileSync(f, '# Clean PRD\n## Goals\n- ship the thing\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('TBD on a line is flagged with file:line:RULE', () => {
    const f = join(sb.root, OUTPUT_DIR, 'dirty.md');
    writeFileSync(f, '# PRD\nStatus: TBD\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/dirty\.md:2: TBD: Status: TBD/);
  });

  it('TODO inside a fenced code block is still flagged (artefact-level scan)', () => {
    const f = join(sb.root, OUTPUT_DIR, 'code.md');
    writeFileSync(f, '# Story\n```js\n// TODO: handle this\n```\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/code\.md:3: TODO/);
  });

  it('mustache tokens are whitelisted (no false positive)', () => {
    const f = join(sb.root, OUTPUT_DIR, 'tpl.md');
    writeFileSync(f, '# {{project_name}}\nDate: {date} — {{author}}\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('ellipsis mid-prose ("etc...") is whitelisted', () => {
    const f = join(sb.root, OUTPUT_DIR, 'etc.md');
    writeFileSync(f, '# Stack\nWe ship apples, oranges, etc... daily.\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('lone ellipsis on its own line is flagged LONE_ELLIPSIS', () => {
    const f = join(sb.root, OUTPUT_DIR, 'dots.md');
    writeFileSync(f, '# Title\n...\nMore.\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/dots\.md:2: LONE_ELLIPSIS/);
  });

  it('"add appropriate error handling" prose is flagged', () => {
    const f = join(sb.root, OUTPUT_DIR, 'aeh.md');
    writeFileSync(f, '# Story\n- Add appropriate error handling on the boundary.\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/aeh\.md:2: ADD_ERROR_HANDLING/);
  });

  it('missing file exits 2 with stderr message', () => {
    const r = runLint(sb.lint, join(sb.root, 'nope.md'), sb.root);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/file not found/);
  });

  it('lint disabled in config exits 0 regardless of content', () => {
    // Disable lint via config and verify even an obviously dirty file passes.
    const off = setupSandbox({ enabled: false });
    try {
      const f = join(off.root, OUTPUT_DIR, 'dirty.md');
      writeFileSync(f, '# PRD\nStatus: TBD\nXXX placeholder XXX\n');
      const r = runLint(off.lint, f, off.root);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('');
    } finally {
      rmSync(off.root, { recursive: true, force: true });
    }
  });

  it('similar-to-story phrase is flagged', () => {
    // Extra coverage: the SIMILAR_TO_STORY rule prevents the most common
    // story-writing antipattern.
    const f = join(sb.root, OUTPUT_DIR, 'sim.md');
    writeFileSync(f, '# Story 2-3\nImplement validation similar to story 2-1.\n');
    const r = runLint(sb.lint, f, sb.root);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/sim\.md:2: SIMILAR_TO_STORY/);
  });

  // ── Awk parser robustness — patches from review ─────────────────────────
  it('config kill-switch ignores trailing # comment on enabled line', () => {
    // Edge case: `enabled: false  # disabled in CI` — pre-patch the gsub
    // didn't strip the comment, so ENABLED became "false#disabled" and
    // the kill switch silently failed to trigger.
    const root = mkdtempSync(join(tmpdir(), 'aped-lint-test-'));
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
    mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
    const lint = join(root, LINT_TPL.path);
    writeFileSync(lint, LINT_TPL.content);
    chmodSync(lint, 0o755);
    writeFileSync(
      join(root, APED_DIR, 'config.yaml'),
      `placeholder_lint:\n  enabled: false  # disabled in CI\n`,
    );
    const f = join(root, OUTPUT_DIR, 'dirty.md');
    writeFileSync(f, 'TBD\n');
    try {
      const r = runLint(lint, f, root);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('placeholder_lint_legacy: sibling does not match the kill-switch parser', () => {
    // Edge case: unanchored regex pre-patch matched any line starting with
    // `placeholder_lint:` — including `placeholder_lint_legacy:`. Anchoring
    // to end-of-line + whitespace prevents the false match.
    const root = mkdtempSync(join(tmpdir(), 'aped-lint-test-'));
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
    mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
    const lint = join(root, LINT_TPL.path);
    writeFileSync(lint, LINT_TPL.content);
    chmodSync(lint, 0o755);
    writeFileSync(
      join(root, APED_DIR, 'config.yaml'),
      // Only the legacy block has enabled: false. The real placeholder_lint
      // block is absent → lint should run (default-on), and we put TBD in
      // the file to assert it does run.
      `placeholder_lint_legacy:\n  enabled: false\n`,
    );
    const f = join(root, OUTPUT_DIR, 'dirty.md');
    writeFileSync(f, 'TBD\n');
    try {
      const r = runLint(lint, f, root);
      expect(r.code).toBe(1);
      expect(r.stdout).toMatch(/TBD/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('nested placeholder_lint.rules.enabled does not poison the kill-switch', () => {
    // Edge case: pre-patch the awk matched any indented `enabled:` line
    // inside the placeholder_lint block — including a deeply-nested one.
    // Now only 2-space (canonical first-child) indent counts.
    const root = mkdtempSync(join(tmpdir(), 'aped-lint-test-'));
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
    mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
    const lint = join(root, LINT_TPL.path);
    writeFileSync(lint, LINT_TPL.content);
    chmodSync(lint, 0o755);
    writeFileSync(
      join(root, APED_DIR, 'config.yaml'),
      // Top-level enabled is absent; a nested rules.enabled: false should
      // NOT disable the lint.
      `placeholder_lint:\n  rules:\n    enabled: false\n`,
    );
    const f = join(root, OUTPUT_DIR, 'dirty.md');
    writeFileSync(f, 'TBD\n');
    try {
      const r = runLint(lint, f, root);
      expect(r.code).toBe(1);
      expect(r.stdout).toMatch(/TBD/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
