// aped-ticket MCP server (4.17.0) — provider-routed ticket adapter.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let sandbox;
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'aped-ticket-test-'));
  mkdirSync(join(sandbox, '.aped'), { recursive: true });
  process.env.CLAUDE_PROJECT_DIR = sandbox;
  process.env.APED_DIR = '.aped';
});
afterEach(() => {
  delete process.env.CLAUDE_PROJECT_DIR;
  delete process.env.APED_DIR;
  rmSync(sandbox, { recursive: true, force: true });
});

async function loadDispatch() {
  const mod = await import('../src/templates/mcp/aped-ticket-server.mjs');
  return mod.dispatch;
}

describe('aped-ticket MCP server — provider routing (4.17.0)', () => {
  it('responds to initialize with protocol version', async () => {
    const dispatch = await loadDispatch();
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(res.result.protocolVersion).toBe('2024-11-05');
    expect(res.result.serverInfo.name).toBe('aped-ticket');
  });

  it('lists 4 tools via tools/list', async () => {
    const dispatch = await loadDispatch();
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const names = res.result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'aped_ticket.create_issue',
      'aped_ticket.get_status',
      'aped_ticket.link_pr',
      'aped_ticket.list_open',
    ]);
  });

  it('returns TICKETS_DISABLED when ticket_system is none', async () => {
    writeFileSync(join(sandbox, '.aped', 'config.yaml'), 'ticket_system: none\n');
    const dispatch = await loadDispatch();
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_ticket.create_issue', arguments: { title: 'test' } } });
    expect(res.result.isError).toBe(true);
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.error).toBe('TICKETS_DISABLED');
  });

  it('returns UNKNOWN_PROVIDER for unsupported provider', async () => {
    writeFileSync(join(sandbox, '.aped', 'config.yaml'), 'ticket_system: trello\n');
    const dispatch = await loadDispatch();
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_ticket.get_status', arguments: { ticket_id: '1' } } });
    expect(res.result.isError).toBe(true);
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.error).toBe('UNKNOWN_PROVIDER');
  });

  it('returns PROVIDER_ERROR for unimplemented providers (linear/jira/gitlab)', async () => {
    for (const provider of ['linear', 'jira', 'gitlab']) {
      writeFileSync(join(sandbox, '.aped', 'config.yaml'), `ticket_system: ${provider}\n`);
      const dispatch = await loadDispatch();
      const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_ticket.create_issue', arguments: { title: 'test' } } });
      expect(res.result.isError).toBe(true);
      const payload = JSON.parse(res.result.content[0].text);
      expect(payload.error).toBe('PROVIDER_ERROR');
      expect(payload.message).toMatch(/not yet implemented/);
    }
  });

  it('returns method-not-found for unknown methods', async () => {
    const dispatch = await loadDispatch();
    const res = dispatch({ jsonrpc: '2.0', id: 1, method: 'foo/bar' });
    expect(res.error.code).toBe(-32601);
  });
});
