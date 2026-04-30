// Template-shape contract for the enable-mcp opt-in install.
import { describe, it, expect } from 'vitest';
import { mcpStateTemplates } from '../src/templates/optional-features.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';

describe('mcpStateTemplates (4.13.0 install template)', () => {
  it('produces the MCP server file and a settings.local.json patch', () => {
    const tpls = mcpStateTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    expect(tpls).toHaveLength(2);

    const server = tpls.find((t) => t.path === `${APED_DIR}/mcp/aped-state-server.mjs`);
    expect(server).toBeDefined();
    expect(server.executable).toBe(true);
    expect(server.content).toMatch(/APED state MCP server/);
    expect(server.content).toMatch(/aped_state\.get/);
    expect(server.content).toMatch(/aped_state\.update/);
    expect(server.content).toMatch(/aped_validate\.phase/);

    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings.content);
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers['aped-state']).toBeDefined();
    expect(parsed.mcpServers['aped-state'].command).toBe('node');
    expect(parsed.mcpServers['aped-state'].args[0]).toBe(
      `\${CLAUDE_PROJECT_DIR}/${APED_DIR}/mcp/aped-state-server.mjs`,
    );
    expect(parsed.mcpServers['aped-state'].env.APED_DIR).toBe(APED_DIR);
  });

  it('substitutes apedDir consistently when non-default', () => {
    const tpls = mcpStateTemplates({ apedDir: 'aped', outputDir: 'docs/aped' });
    const server = tpls.find((t) => t.path === 'aped/mcp/aped-state-server.mjs');
    expect(server).toBeDefined();
    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    const parsed = JSON.parse(settings.content);
    expect(parsed.mcpServers['aped-state'].args[0]).toMatch(/aped\/mcp\/aped-state-server\.mjs/);
    expect(parsed.mcpServers['aped-state'].env.APED_DIR).toBe('aped');
  });

  it('server respects CLAUDE_PROJECT_DIR + APED_DIR env vars at runtime', () => {
    const tpls = mcpStateTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const server = tpls.find((t) => t.path === `${APED_DIR}/mcp/aped-state-server.mjs`);
    // The server resolves PROJECT_ROOT from CLAUDE_PROJECT_DIR and APED_DIR
    // from the env var; both must be referenced in the server source.
    expect(server.content).toMatch(/process\.env\.CLAUDE_PROJECT_DIR/);
    expect(server.content).toMatch(/process\.env\.APED_DIR/);
  });

  it('top-level key allowlist includes the canonical state.yaml roots', () => {
    const tpls = mcpStateTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const server = tpls.find((t) => t.path === `${APED_DIR}/mcp/aped-state-server.mjs`);
    // We assert the allowlist as text — the runtime test
    // (mcp-state-server.test.js) checks the SCHEMA_REJECT semantics.
    expect(server.content).toMatch(/'schema_version'/);
    expect(server.content).toMatch(/'pipeline'/);
    expect(server.content).toMatch(/'sprint'/);
    expect(server.content).toMatch(/'corrections_pointer'/);
  });

  it('protocol version locked to spec-compatible value', () => {
    const tpls = mcpStateTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const server = tpls.find((t) => t.path === `${APED_DIR}/mcp/aped-state-server.mjs`);
    expect(server.content).toMatch(/PROTOCOL_VERSION = '2024-11-05'/);
  });
});
