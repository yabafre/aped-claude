import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectExisting, UserError } from '../src/index.js';

let originalCwd;
let dir;

beforeEach(() => {
  originalCwd = process.cwd();
  dir = mkdtempSync(join(tmpdir(), 'aped-detect-'));
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
});

function writeConfig(apedDir, content) {
  mkdirSync(join(dir, apedDir), { recursive: true });
  writeFileSync(join(dir, apedDir, 'config.yaml'), content, 'utf-8');
}

describe('detectExisting', () => {
  it('returns null when apedDir has no config.yaml', () => {
    expect(detectExisting('.aped')).toBeNull();
  });

  it('parses a valid config with all whitelisted keys', () => {
    writeConfig(
      '.aped',
      [
        'project_name: my-app',
        'user_name: jane',
        'communication_language: french',
        'document_output_language: english',
        'aped_path: .aped',
        'output_path: docs/aped',
        'aped_version: 3.7.0',
        'ticket_system: linear',
        'git_provider: github',
      ].join('\n'),
    );
    const existing = detectExisting('.aped');
    expect(existing).toMatchObject({
      projectName: 'my-app',
      authorName: 'jane',
      communicationLang: 'french',
      documentLang: 'english',
      apedDir: '.aped',
      outputDir: 'docs/aped',
      ticketSystem: 'linear',
      gitProvider: 'github',
      installedVersion: '3.7.0',
    });
    // commandsDir was retired in 4.0.0 — must not leak through.
    expect('commandsDir' in existing).toBe(false);
  });

  it('silently ignores non-whitelisted keys (no code execution, no pollution)', () => {
    writeConfig(
      '.aped',
      [
        'project_name: ok',
        'malicious_key: rm -rf /',
        'user_name: jane',
      ].join('\n'),
    );
    const existing = detectExisting('.aped');
    expect(existing.projectName).toBe('ok');
    expect(existing.authorName).toBe('jane');
    expect('malicious_key' in existing).toBe(false);
  });

  it('strips surrounding single and double quotes from values', () => {
    writeConfig(
      '.aped',
      [
        `project_name: "quoted-name"`,
        `user_name: 'single-quoted'`,
      ].join('\n'),
    );
    const existing = detectExisting('.aped');
    expect(existing.projectName).toBe('quoted-name');
    expect(existing.authorName).toBe('single-quoted');
  });

  it('falls back to defaults for missing keys', () => {
    writeConfig('.aped', 'project_name: only-project');
    const existing = detectExisting('.aped');
    expect(existing.projectName).toBe('only-project');
    expect(existing.authorName).toBe('');
    expect(existing.communicationLang).toBe('english');
    expect(existing.documentLang).toBe('english');
    expect(existing.ticketSystem).toBe('none');
    expect(existing.gitProvider).toBe('github');
    expect(existing.installedVersion).toBe('0.0.0');
  });

  it('falls back to default ticketSystem when the stored value is invalid', () => {
    writeConfig('.aped', 'ticket_system: invented-tracker');
    const existing = detectExisting('.aped');
    expect(existing.ticketSystem).toBe('none');
  });

  it('falls back to default gitProvider when the stored value is invalid', () => {
    writeConfig('.aped', 'git_provider: sourceforge');
    const existing = detectExisting('.aped');
    expect(existing.gitProvider).toBe('github');
  });

  it('rejects a malicious absolute aped_path', () => {
    writeConfig('.aped', 'aped_path: /etc');
    expect(() => detectExisting('.aped')).toThrow(UserError);
  });

  it('rejects a malicious "../" output_path', () => {
    writeConfig('.aped', 'output_path: ../outside');
    expect(() => detectExisting('.aped')).toThrow(UserError);
  });

  it('silently drops the legacy commands_path key (retired in 4.0.0)', () => {
    // Even a value that would have failed validateSafePath in 3.x must now
    // be ignored before validation runs — the key is no longer whitelisted.
    writeConfig(
      '.aped',
      ['project_name: legacy', 'commands_path: /tmp/commands'].join('\n'),
    );
    const existing = detectExisting('.aped');
    expect(existing.projectName).toBe('legacy');
    expect('commandsDir' in existing).toBe(false);
  });

  it('accepts inline comments on lines', () => {
    writeConfig(
      '.aped',
      [
        'project_name: real-name # this is a comment',
        'user_name: jane # another',
      ].join('\n'),
    );
    const existing = detectExisting('.aped');
    expect(existing.projectName).toBe('real-name');
    expect(existing.authorName).toBe('jane');
  });
});
