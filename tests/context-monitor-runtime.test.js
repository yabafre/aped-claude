// Runtime contract for the context-monitor hook: spawn the real script with
// a synthetic transcript and assert the decision (warning/critical/silent),
// debounce, and disable-via-config paths.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HOOK = join(import.meta.dirname, '..', 'src', 'templates', 'hooks', 'context-monitor.js');

function makeTranscript(dir, usedTokens) {
  const path = join(dir, 'transcript.jsonl');
  const entries = [
    { type: 'user', message: { content: 'noise' } },
    {
      type: 'assistant',
      message: {
        usage: {
          input_tokens: usedTokens,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      },
    },
  ];
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n'));
  return path;
}

function runHook({ usedTokens, modelId = 'claude-opus-4-7', cwd, sessionId = 'test-abc-1' }) {
  const transcript = makeTranscript(cwd, usedTokens);
  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcript,
    cwd,
    model: { id: modelId, display_name: 'Test Model' },
  });
  const result = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8', timeout: 5000 });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function parsedAdvisory(stdout) {
  if (!stdout.trim()) return null;
  return JSON.parse(stdout).hookSpecificOutput;
}

let workDir;
let warnFile;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'aped-ctx-mon-'));
  // Pre-clean the debounce file under tmpdir for the test session id.
  warnFile = join(tmpdir(), 'aped-ctx-test-abc-1-warned.json');
  if (existsSync(warnFile)) rmSync(warnFile);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
  if (existsSync(warnFile)) rmSync(warnFile);
});

describe('context-monitor runtime', () => {
  it('emits nothing when usage is below WARNING threshold (200k window, 60% used)', () => {
    const { stdout, status } = runHook({ usedTokens: 120_000, cwd: workDir });
    expect(status).toBe(0);
    expect(stdout).toBe('');
  });

  it('emits WARNING when usage crosses 65% (remaining 35%)', () => {
    const { stdout, status } = runHook({ usedTokens: 130_000, cwd: workDir });
    expect(status).toBe(0);
    const out = parsedAdvisory(stdout);
    expect(out).toBeTruthy();
    expect(out.hookEventName).toBe('PostToolUse');
    expect(out.additionalContext).toMatch(/CONTEXT WARNING/);
    expect(out.additionalContext).toMatch(/usage 65%/);
  });

  it('emits CRITICAL when usage crosses 75% (remaining 25%)', () => {
    const { stdout } = runHook({ usedTokens: 150_000, cwd: workDir });
    const out = parsedAdvisory(stdout);
    expect(out.additionalContext).toMatch(/CONTEXT CRITICAL/);
    expect(out.additionalContext).toMatch(/usage 75%/);
  });

  it('mentions aped-checkpoint when state.yaml exists at OUTPUT_DIR', () => {
    // The hook uses '{{OUTPUT_DIR}}' as a literal substring before substitution.
    // To exercise the apedActive branch, create the path the *substituted* hook
    // expects when scaffolded into a project where outputDir = 'docs/aped'.
    // Here we directly stub the path the unsubstituted hook checks.
    const litDir = join(workDir, '{{OUTPUT_DIR}}');
    mkdirSync(litDir, { recursive: true });
    writeFileSync(join(litDir, 'state.yaml'), 'current_phase: dev\n');
    const { stdout } = runHook({ usedTokens: 150_000, cwd: workDir });
    expect(stdout).toMatch(/aped-checkpoint/);
  });

  it('detects 1M context window when model.id contains [1m]', () => {
    // 350k of 1M = 35% used → 65% remaining → no warning.
    const { stdout } = runHook({
      usedTokens: 350_000,
      modelId: 'claude-opus-4-7[1m]',
      cwd: workDir,
    });
    expect(stdout).toBe('');
  });

  it('debounces subsequent warnings within 5 tool calls', () => {
    // 1st call: warning fires.
    const first = runHook({ usedTokens: 130_000, cwd: workDir });
    expect(parsedAdvisory(first.stdout)).not.toBeNull();

    // 2nd call same severity: should be silenced by debounce.
    const second = runHook({ usedTokens: 130_000, cwd: workDir });
    expect(second.stdout).toBe('');
  });

  it('severity escalation WARNING → CRITICAL bypasses debounce', () => {
    runHook({ usedTokens: 130_000, cwd: workDir }); // warn
    const escalate = runHook({ usedTokens: 150_000, cwd: workDir });
    const out = parsedAdvisory(escalate.stdout);
    expect(out).toBeTruthy();
    expect(out.additionalContext).toMatch(/CONTEXT CRITICAL/);
  });

  it('respects hooks.context_monitor: false in {{APED_DIR}}/config.local.yaml', () => {
    // The unsubstituted hook reads '{{APED_DIR}}/config.local.yaml' literally.
    const litDir = join(workDir, '{{APED_DIR}}');
    mkdirSync(litDir, { recursive: true });
    writeFileSync(join(litDir, 'config.local.yaml'), 'hooks:\n  context_monitor: false\n');
    const { stdout } = runHook({ usedTokens: 150_000, cwd: workDir });
    expect(stdout).toBe('');
  });

  it('rejects session_id with path traversal characters', () => {
    const { stdout } = runHook({ usedTokens: 150_000, cwd: workDir, sessionId: '../escape' });
    expect(stdout).toBe('');
  });

  it('exits silently on missing transcript_path', () => {
    const payload = JSON.stringify({
      session_id: 'no-transcript',
      transcript_path: '/nonexistent/path.jsonl',
      cwd: workDir,
      model: { id: 'claude-opus-4-7' },
    });
    const result = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8', timeout: 5000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('exits silently on malformed JSON input', () => {
    const result = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8', timeout: 5000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });
});
