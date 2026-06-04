// Pure-builder contract for .codex/config.toml generation (greenfield).
import { describe, it, expect } from 'vitest';
import { buildCodexConfigToml, rewriteCommandForCodex } from '../src/templates/codex.js';

const apedState = {
  command: 'node',
  args: ['.aped/mcp/aped-state-server.mjs'],
  env: { APED_DIR: '.aped' },
};

describe('buildCodexConfigToml — greenfield', () => {
  it('emits personality, the aped-state mcp table, env sub-table, and the features flag', () => {
    const toml = buildCodexConfigToml(
      { mcpServers: { 'aped-state': apedState }, hooksEnabled: true },
      {},
    );
    expect(toml).toContain('personality = "friendly"');
    expect(toml).toContain('[mcp_servers.aped-state]');
    expect(toml).toContain('command = "node"');
    expect(toml).toContain('args = [".aped/mcp/aped-state-server.mjs"]');
    expect(toml).toContain('[mcp_servers.aped-state.env]');
    expect(toml).toContain('APED_DIR = ".aped"');
    expect(toml).toContain('[features]');
    expect(toml).toContain('codex_hooks = true');
  });

  it('args are cwd-relative — never a CLAUDE_PROJECT_DIR / CODEX_PROJECT_DIR literal', () => {
    const toml = buildCodexConfigToml(
      { mcpServers: { 'aped-state': apedState }, hooksEnabled: false },
      {},
    );
    expect(toml).not.toMatch(/CLAUDE_PROJECT_DIR/);
    expect(toml).not.toMatch(/CODEX_PROJECT_DIR/);
  });

  it('omits [features] when no hooks are wired', () => {
    const toml = buildCodexConfigToml(
      { mcpServers: { 'aped-state': apedState }, hooksEnabled: false },
      {},
    );
    expect(toml).not.toContain('[features]');
    expect(toml).not.toContain('codex_hooks');
  });

  it('a bare personality file is valid when nothing else is wired', () => {
    const toml = buildCodexConfigToml({ mcpServers: {}, hooksEnabled: false }, {});
    expect(toml).toBe('personality = "friendly"\n');
  });

  it('greenfield output is a fixed point under re-projection (no churn)', () => {
    const inputs = { mcpServers: { 'aped-state': apedState }, hooksEnabled: true };
    const first = buildCodexConfigToml(inputs, {});
    const second = buildCodexConfigToml(inputs, { existingToml: first });
    expect(second).toBe(first);
  });
});

describe('rewriteCommandForCodex', () => {
  it('strips the ${CLAUDE_PROJECT_DIR}/ prefix', () => {
    expect(rewriteCommandForCodex('${CLAUDE_PROJECT_DIR}/.aped/hooks/safe-bash.js'))
      .toBe('.aped/hooks/safe-bash.js');
  });
  it('strips the bare $CLAUDE_PROJECT_DIR/ form', () => {
    expect(rewriteCommandForCodex('$CLAUDE_PROJECT_DIR/.aped/mcp/x.mjs'))
      .toBe('.aped/mcp/x.mjs');
  });
  it('handles the `bash ${CLAUDE_PROJECT_DIR}/…sh` wrapper shape', () => {
    expect(rewriteCommandForCodex('bash ${CLAUDE_PROJECT_DIR}/.aped/hooks/session-start.sh'))
      .toBe('bash .aped/hooks/session-start.sh');
  });
  it('leaves an already cwd-relative command unchanged', () => {
    expect(rewriteCommandForCodex('.aped/mcp/aped-state-server.mjs'))
      .toBe('.aped/mcp/aped-state-server.mjs');
  });
});
