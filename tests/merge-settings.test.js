import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeSettings } from '../src/index.js';

let dir;
let settingsPath;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aped-merge-'));
  settingsPath = join(dir, 'settings.local.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('mergeSettings', () => {
  it('writes incoming content verbatim when the target file is missing', () => {
    const incoming = JSON.stringify({ hooks: { UserPromptSubmit: [] } });
    mergeSettings(settingsPath, incoming);
    expect(existsSync(settingsPath)).toBe(true);
    expect(readFileSync(settingsPath, 'utf-8')).toBe(incoming);
  });

  it('overwrites the file when the existing content is not valid JSON', () => {
    writeFileSync(settingsPath, 'not json {{{', 'utf-8');
    const incoming = JSON.stringify({ hooks: { UserPromptSubmit: [] } });
    mergeSettings(settingsPath, incoming);
    expect(readFileSync(settingsPath, 'utf-8')).toBe(incoming);
  });

  it('adds a new hook event when it does not exist on the target', () => {
    writeFileSync(settingsPath, JSON.stringify({ permissions: { allow: ['x'] } }), 'utf-8');
    const incoming = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: '', hooks: [{ type: 'command', command: 'echo hi' }] },
        ],
      },
    });
    mergeSettings(settingsPath, incoming);
    const merged = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(merged.permissions).toEqual({ allow: ['x'] });
    expect(merged.hooks.UserPromptSubmit).toHaveLength(1);
    expect(merged.hooks.UserPromptSubmit[0].hooks[0].command).toBe('echo hi');
  });

  it('skips a handler whose command already exists', () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          UserPromptSubmit: [
            { matcher: '', hooks: [{ type: 'command', command: 'echo hi' }] },
          ],
        },
      }),
      'utf-8',
    );
    const incoming = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: '', hooks: [{ type: 'command', command: 'echo hi' }] },
        ],
      },
    });
    mergeSettings(settingsPath, incoming);
    const merged = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(merged.hooks.UserPromptSubmit).toHaveLength(1);
  });

  it('preserves non-hook fields (permissions, env) during a merge', () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        env: { FOO: 'bar' },
        permissions: { allow: ['Read(**)'] },
        hooks: {},
      }),
      'utf-8',
    );
    const incoming = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: '', hooks: [{ type: 'command', command: 'guardrail.sh' }] },
        ],
      },
    });
    mergeSettings(settingsPath, incoming);
    const merged = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(merged.env).toEqual({ FOO: 'bar' });
    expect(merged.permissions).toEqual({ allow: ['Read(**)'] });
    expect(merged.hooks.UserPromptSubmit[0].hooks[0].command).toBe('guardrail.sh');
  });

  it('writes pretty-printed JSON ending with a newline', () => {
    writeFileSync(settingsPath, JSON.stringify({ hooks: {} }), 'utf-8');
    const incoming = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: '', hooks: [{ type: 'command', command: 'x' }] },
        ],
      },
    });
    mergeSettings(settingsPath, incoming);
    const out = readFileSync(settingsPath, 'utf-8');
    expect(out.endsWith('\n')).toBe(true);
    expect(out).toContain('\n  '); // pretty-printed indentation
  });
});
