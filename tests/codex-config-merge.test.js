// Merge-safety contract for .codex/config.toml: APED touches only its own
// sections; unrelated keys survive verbatim; the merge is a fixed point.
import { describe, it, expect } from 'vitest';
import { buildCodexConfigToml } from '../src/templates/codex.js';

const apedState = {
  command: 'node',
  args: ['.aped/mcp/aped-state-server.mjs'],
  env: { APED_DIR: '.aped' },
};

const EXISTING = `personality = "pragmatic"
notify = ["my-notifier"]

[projects."/Users/me/proj"]
trust_level = "trusted"

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

[features]
js_repl = false
`;

describe('buildCodexConfigToml — merge into an existing config', () => {
  const merged = buildCodexConfigToml(
    { mcpServers: { 'aped-state': apedState }, hooksEnabled: true },
    { existingToml: EXISTING },
  );

  it('never overwrites an existing personality', () => {
    expect(merged).toContain('personality = "pragmatic"');
    expect(merged).not.toContain('personality = "friendly"');
  });

  it('preserves unrelated top-level keys, projects, and foreign mcp servers', () => {
    expect(merged).toContain('notify = ["my-notifier"]');
    expect(merged).toContain('[projects."/Users/me/proj"]');
    expect(merged).toContain('trust_level = "trusted"');
    expect(merged).toContain('[mcp_servers.context7]');
    expect(merged).toContain('args = ["-y", "@upstash/context7-mcp"]');
  });

  it('adds the APED mcp table and the codex_hooks flag while keeping sibling [features] keys', () => {
    expect(merged).toContain('[mcp_servers.aped-state]');
    expect(merged).toContain('[features]');
    expect(merged).toContain('js_repl = false');
    expect(merged).toContain('codex_hooks = true');
  });

  it('is a fixed point — merge(merge(x)) === merge(x)', () => {
    const again = buildCodexConfigToml(
      { mcpServers: { 'aped-state': apedState }, hooksEnabled: true },
      { existingToml: merged },
    );
    expect(again).toBe(merged);
  });

  it('does not introduce a personality when the existing file had none', () => {
    const noPersona = `[mcp_servers.context7]
command = "npx"
`;
    const out = buildCodexConfigToml(
      { mcpServers: { 'aped-state': apedState }, hooksEnabled: false },
      { existingToml: noPersona },
    );
    expect(out).not.toContain('personality');
    expect(out).toContain('[mcp_servers.context7]');
    expect(out).toContain('[mcp_servers.aped-state]');
  });

  it('drops codex_hooks when hooks are toggled off, keeping the rest', () => {
    const out = buildCodexConfigToml(
      { mcpServers: { 'aped-state': apedState }, hooksEnabled: false },
      { existingToml: merged },
    );
    expect(out).not.toContain('codex_hooks');
    expect(out).toContain('js_repl = false');
    expect(out).toContain('[mcp_servers.aped-state]');
  });
});
