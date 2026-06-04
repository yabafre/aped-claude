// fs round-trip contract for projectCodexSurface: marker gating, generated
// .codex files, and the AGENTS.md guard logic.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, lstatSync, readlinkSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectCodexSurface } from '../src/codex-manager.js';

let dir;
const config = { apedDir: '.aped', outputDir: 'docs/aped', skillSymlinks: ['.agents/skills'] };

const SETTINGS = {
  mcpServers: {
    'aped-state': {
      command: 'node',
      args: ['${CLAUDE_PROJECT_DIR}/.aped/mcp/aped-state-server.mjs'],
      env: { APED_DIR: '.aped' },
    },
    // A non-APED server the user added — must NOT be projected by APED.
    context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
  },
  hooks: {
    PreToolUse: [
      { matcher: 'Bash', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.aped/hooks/safe-bash.js', timeout: 3 }] },
    ],
  },
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aped-codex-'));
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude/settings.local.json'), JSON.stringify(SETTINGS, null, 2), 'utf-8');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('projectCodexSurface — marker gating', () => {
  it('is a no-op without a .codex/ or .agents/ marker', () => {
    const result = projectCodexSurface(config, dir);
    expect(result.skipped).toBe('no-codex-marker');
    expect(existsSync(join(dir, '.codex/config.toml'))).toBe(false);
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false);
  });
});

describe('projectCodexSurface — with a .codex marker', () => {
  beforeEach(() => mkdirSync(join(dir, '.codex'), { recursive: true }));

  it('writes config.toml with only the APED-owned mcp server, cwd-relative', () => {
    projectCodexSurface(config, dir);
    const toml = readFileSync(join(dir, '.codex/config.toml'), 'utf-8');
    expect(toml).toContain('personality = "friendly"');
    expect(toml).toContain('[mcp_servers.aped-state]');
    expect(toml).toContain('args = [".aped/mcp/aped-state-server.mjs"]');
    expect(toml).not.toMatch(/CLAUDE_PROJECT_DIR/);
    // context7 is the user's, not APED's — APED must not project it.
    expect(toml).not.toContain('context7');
    // hooks were wired → the feature flag is set.
    expect(toml).toContain('codex_hooks = true');
  });

  it('writes hooks.json projected from the wired Claude hooks', () => {
    projectCodexSurface(config, dir);
    const hooks = JSON.parse(readFileSync(join(dir, '.codex/hooks.json'), 'utf-8'));
    expect(hooks.hooks.PreToolUse[0].matcher).toBe('Bash');
    expect(hooks.hooks.PreToolUse[0].hooks[0].command).toBe('.aped/hooks/safe-bash.js');
  });

  it('writes a standalone AGENTS.md when no CLAUDE.md exists', () => {
    const result = projectCodexSurface(config, dir);
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('<!-- APED:START -->');
    expect(agents).toContain('.agents/skills/aped-*');
    expect(result.agentsAction).toBe('written');
    expect(lstatSync(join(dir, 'AGENTS.md')).isSymbolicLink()).toBe(false);
  });

  it('symlinks AGENTS.md → CLAUDE.md when a real CLAUDE.md exists', () => {
    writeFileSync(join(dir, 'CLAUDE.md'), '# Project\n', 'utf-8');
    const result = projectCodexSurface(config, dir);
    const agentsPath = join(dir, 'AGENTS.md');
    expect(lstatSync(agentsPath).isSymbolicLink()).toBe(true);
    expect(readlinkSync(agentsPath)).toBe('CLAUDE.md');
    expect(result.agentsAction).toBe('symlinked');
  });

  it('never overwrites a user-authored AGENTS.md', () => {
    writeFileSync(join(dir, 'AGENTS.md'), '# My own notes\n', 'utf-8');
    const result = projectCodexSurface(config, dir);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf-8')).toBe('# My own notes\n');
    expect(result.agentsAction).toBe('kept-user');
  });

  it('repairs skills into .agents/skills/', () => {
    projectCodexSurface(config, dir);
    const link = join(dir, '.agents/skills/aped-analyze');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe('../../.aped/aped-analyze');
  });

  it('re-running is stable (config.toml byte-identical on second projection)', () => {
    projectCodexSurface(config, dir);
    const first = readFileSync(join(dir, '.codex/config.toml'), 'utf-8');
    projectCodexSurface(config, dir);
    const second = readFileSync(join(dir, '.codex/config.toml'), 'utf-8');
    expect(second).toBe(first);
  });
});

describe('projectCodexSurface — .agents marker alone also triggers', () => {
  it('treats a .agents/ dir as a Codex target', () => {
    mkdirSync(join(dir, '.agents'), { recursive: true });
    const result = projectCodexSurface(config, dir);
    expect(result.skipped).toBeUndefined();
    expect(existsSync(join(dir, '.codex/config.toml'))).toBe(true);
  });
});
