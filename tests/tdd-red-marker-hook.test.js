// 4.10.0 — opt-in PostToolUse advisory hook. Emits a warning when a non-test
// file is edited shortly after a test file in the recent transcript but no
// `Confirmed RED:` witness token appeared in between. Pocock workshop
// discipline (L1742-1769). Advisory only — never blocks.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'src', 'templates', 'hooks', 'tdd-red-marker.js');

function runHook(payload) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

function makeTranscript(entries) {
  // entries: array of { kind: 'test-edit' | 'prod-edit' | 'red-witness' | 'noise', path? }
  // Renders into a JSONL-ish text the hook will scan.
  const root = mkdtempSync(join(tmpdir(), 'aped-tdd-marker-'));
  const transcriptPath = join(root, 'transcript.jsonl');
  const lines = [];
  for (const e of entries) {
    if (e.kind === 'test-edit') {
      lines.push(JSON.stringify({
        role: 'assistant',
        content: [{ type: 'tool_use', name: 'Edit', input: { file_path: e.path } }],
      }));
    } else if (e.kind === 'prod-edit') {
      lines.push(JSON.stringify({
        role: 'assistant',
        content: [{ type: 'tool_use', name: 'Edit', input: { file_path: e.path } }],
      }));
    } else if (e.kind === 'red-witness') {
      lines.push(JSON.stringify({
        role: 'assistant',
        content: [{ type: 'text', text: 'Confirmed RED: failing-test failed at src/foo.ts:42 — Cannot find module' }],
      }));
    } else if (e.kind === 'noise') {
      lines.push(JSON.stringify({
        role: 'user',
        content: 'lorem ipsum dolor sit amet',
      }));
    }
  }
  writeFileSync(transcriptPath, lines.join('\n') + '\n');
  return { root, transcriptPath };
}

describe('tdd-red-marker hook (4.10.0 — Pocock RED witness)', () => {
  it('exits silently for non-Write/Edit/MultiEdit tools', () => {
    const r = runHook({ tool_name: 'Read', tool_input: { file_path: '/tmp/foo.ts' } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('exits silently when tool_input.file_path is missing (sanity)', () => {
    const r = runHook({ tool_name: 'Write', tool_input: {} });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('exits silently when transcript_path is missing', () => {
    const r = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/src/foo.ts' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('exits silently when editing a test file (test edits are RED side, fine)', () => {
    const { root, transcriptPath } = makeTranscript([{ kind: 'noise' }]);
    try {
      const r = runHook({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/tests/foo.test.ts' },
        transcript_path: transcriptPath,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('exits silently when editing a neutral file (.md, .json, .yaml — not test-vs-prod)', () => {
    const { root, transcriptPath } = makeTranscript([
      { kind: 'test-edit', path: '/proj/tests/foo.test.ts' },
    ]);
    try {
      for (const f of ['/proj/CHANGELOG.md', '/proj/package.json', '/proj/.aped/state.yaml']) {
        const r = runHook({
          tool_name: 'Write',
          tool_input: { file_path: f },
          transcript_path: transcriptPath,
        });
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('exits silently when production edit follows test edit AND `Confirmed RED:` appeared in between', () => {
    const { root, transcriptPath } = makeTranscript([
      { kind: 'test-edit', path: '/proj/tests/foo.test.ts' },
      { kind: 'red-witness' },
    ]);
    try {
      const r = runHook({
        tool_name: 'Write',
        tool_input: { file_path: '/proj/src/foo.ts' },
        transcript_path: transcriptPath,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('emits advisory when production edit follows test edit but NO `Confirmed RED:` token', () => {
    const { root, transcriptPath } = makeTranscript([
      { kind: 'test-edit', path: '/proj/tests/foo.test.ts' },
      { kind: 'noise' },
      { kind: 'noise' },
    ]);
    try {
      const r = runHook({
        tool_name: 'Edit',
        tool_input: { file_path: '/proj/src/foo.ts' },
        transcript_path: transcriptPath,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).not.toBe('');
      const payload = JSON.parse(r.stdout);
      expect(payload.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(payload.hookSpecificOutput.additionalContext).toMatch(/TDD-RED-MARKER/);
      expect(payload.hookSpecificOutput.additionalContext).toMatch(/Confirmed RED/);
      expect(payload.hookSpecificOutput.additionalContext).toMatch(/Pocock/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('exits silently when no recent test edit (production edit on its own — not in TDD cycle)', () => {
    const { root, transcriptPath } = makeTranscript([
      { kind: 'noise' },
      { kind: 'noise' },
    ]);
    try {
      const r = runHook({
        tool_name: 'Write',
        tool_input: { file_path: '/proj/src/foo.ts' },
        transcript_path: transcriptPath,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('detects test files via multiple naming conventions (.spec.ts, _test.go, test_*.py, .e2e.ts, .cy.ts, /__tests__/)', () => {
    const cases = [
      '/proj/foo.spec.ts',
      '/proj/foo_test.go',
      '/proj/test_foo.py',
      '/proj/foo.e2e.ts',
      '/proj/foo.cy.tsx',
      '/proj/__tests__/foo.js',
      '/proj/spec/foo.rb',
    ];
    // For each: editing should be silent (test edit, not production).
    const { root, transcriptPath } = makeTranscript([{ kind: 'noise' }]);
    try {
      for (const f of cases) {
        const r = runHook({
          tool_name: 'Write',
          tool_input: { file_path: f },
          transcript_path: transcriptPath,
        });
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('handles malformed JSON payload gracefully (exits silently)', () => {
    const r = spawnSync('node', [HOOK], {
      input: '{not valid json',
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });
});
