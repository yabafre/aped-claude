import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { verifyClaimsTemplates } from '../src/templates/optional-features.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const TPLS = verifyClaimsTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const HOOK_TPL = TPLS.find((t) => t.path.endsWith('verify-claims.js'));

function setupSandbox({ enabled = true, evidenceWindow } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aped-vc-test-'));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'hooks'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  const dest = join(root, HOOK_TPL.path);
  writeFileSync(dest, HOOK_TPL.content);
  chmodSync(dest, 0o755);
  const cfg = ['placeholder_lint:', '  enabled: true', 'verify_claims:'];
  cfg.push(`  enabled: ${enabled}`);
  if (evidenceWindow !== undefined) cfg.push(`  evidence_window: ${evidenceWindow}`);
  writeFileSync(join(root, APED_DIR, 'config.yaml'), cfg.join('\n') + '\n');
  return { root, hook: dest };
}

function runHook(hook, payload, root, env = {}) {
  // Trailing newline mirrors how Claude Code pipes JSON to PostToolUse hooks.
  const input = JSON.stringify(payload) + '\n';
  try {
    const out = execSync(`node ${hook}`, {
      input,
      env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env },
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

describe('verify-claims.js — advisory hook', () => {
  it('emits advisory when forbidden phrase has no preceding evidence', () => {
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: { output: 'should work\n' },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('VERIFY-CLAIMS');
    expect(r.stdout).toContain('should work');
  });

  it('stays silent when forbidden phrase has concrete evidence within window', () => {
    const output = [
      'Tests: 4 passed',
      'exit code: 0',
      'Done!',
    ].join('\n');
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: { output },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('still fires when evidence is FAR (beyond window) before the phrase', () => {
    const off = setupSandbox({ evidenceWindow: 5 });
    try {
      const lines = ['Tests: 4 passed'];
      for (let i = 0; i < 20; i++) lines.push('noise line ' + i);
      lines.push('looks good');
      const r = runHook(off.hook, {
        tool_name: 'Bash',
        tool_response: { output: lines.join('\n') },
      }, off.root);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain('VERIFY-CLAIMS');
      expect(r.stdout).toContain('looks good');
    } finally {
      rmSync(off.root, { recursive: true, force: true });
    }
  });

  it('kill switch — verify_claims.enabled: false suppresses everything', () => {
    const off = setupSandbox({ enabled: false });
    try {
      const r = runHook(off.hook, {
        tool_name: 'Bash',
        tool_response: { output: 'should work\nlooks good\nDone!\n' },
      }, off.root);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('');
    } finally {
      rmSync(off.root, { recursive: true, force: true });
    }
  });

  it('never blocks tool use — output never contains permissionDecision', () => {
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: { output: 'Done!\n' },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).not.toContain('permissionDecision');
    expect(r.stdout).not.toContain('deny');
  });

  it('non-Bash tool calls are skipped silently', () => {
    const r = runHook(sb.hook, {
      tool_name: 'Read',
      tool_response: { output: 'should work — but this is from Read, not Bash' },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('same-line evidence suppresses the advisory ("PASS: should work")', () => {
    // Edge case from review: pre-patch the window was lines.slice(start, i),
    // exclusive of the offending line — so a pass marker on the same line
    // (e.g. test runner output that happens to include the phrase) was
    // silently ignored. Now same-line evidence wins.
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: { output: 'PASS: should work as expected\n' },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('word-boundary phrase matching — "doneness" does NOT trigger Done!', () => {
    // Edge case: pre-patch substring matching meant any line containing
    // "doneness" or "perfectly" tripped the Done!/Perfect! rules. Now the
    // exclamation marker disambiguates.
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: { output: 'Checking the doneness of the steak.\nPerfectly aligned columns.\n' },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('stderr fallback — phrase in stderr alone still triggers', () => {
    // Edge case: pre-patch only `output || stdout` was scanned. A failing
    // command that only writes to stderr (e.g. a test runner that exits non-
    // zero and reports failures on stderr) could ship "should work" claims
    // that were invisible to the hook.
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: { stdout: '', stderr: 'Build error encountered.\nshould work after the next iteration.\n' },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('VERIFY-CLAIMS');
    expect(r.stdout).toContain('should work');
  });

  it('evidence_window: 0 disables the window check (phrase scan only)', () => {
    // Edge case: pre-patch `n > 0` rejected 0 silently and defaulted to 30.
    // Now 0 is the documented sentinel for "ignore preceding lines, only
    // suppress on same-line evidence" — useful for projects that want
    // strict phrase scanning regardless of upstream context.
    const off = setupSandbox({ evidenceWindow: 0 });
    try {
      const output = ['Tests: 4 passed', 'should work'].join('\n');
      const r = runHook(off.hook, {
        tool_name: 'Bash',
        tool_response: { output },
      }, off.root);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain('VERIFY-CLAIMS');
    } finally {
      rmSync(off.root, { recursive: true, force: true });
    }
  });

  it('caps advisory at 3 hits but reports total count', () => {
    const r = runHook(sb.hook, {
      tool_name: 'Bash',
      tool_response: {
        output: [
          'should work',
          'looks good',
          'probably fine',
          'Done!',
          'Great!',
        ].join('\n'),
      },
    }, sb.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('VERIFY-CLAIMS');
    expect(r.stdout).toMatch(/and\s+\d+\s+more/);
  });
});
