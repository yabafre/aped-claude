// MCP server runtime tests — exercise the JSON-RPC dispatch surface
// directly via the exported `dispatch` function. We don't spawn a
// subprocess (that's covered by tests/mcp-state-install.test.js +
// scaffold-references.test.js); the protocol surface is sufficient as
// long as `dispatch` is the same function wired to stdio in main().
//
// Each test sets CLAUDE_PROJECT_DIR to a fresh sandbox containing a
// minimal .aped/config.yaml + docs/aped/state.yaml so the server's
// readConfigField + STATE_FILE resolution lands in the sandbox.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, '..', 'src', 'templates', 'mcp', 'aped-state-server.mjs');

function setupSandbox(stateContent) {
  const root = mkdtempSync(join(tmpdir(), 'aped-mcp-test-'));
  mkdirSync(join(root, '.aped'), { recursive: true });
  mkdirSync(join(root, 'docs', 'aped'), { recursive: true });
  // Minimal config — output_path drives where state.yaml is read.
  writeFileSync(join(root, '.aped', 'config.yaml'), 'output_path: docs/aped\n');
  // Default state.yaml; can be overridden per-test.
  writeFileSync(
    join(root, 'docs', 'aped', 'state.yaml'),
    stateContent ?? 'schema_version: 2\npipeline:\n  current_phase: "none"\n  phases: {}\nsprint:\n  active_epic: null\n',
  );
  return root;
}

// Spawn the server as a real subprocess and drive it via stdio. Each
// test sends one or more newline-delimited JSON requests; the server's
// stdout responses are collected and returned.
async function call(root, requests) {
  const proc = spawnSync('node', [SERVER], {
    encoding: 'utf-8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, APED_DIR: '.aped' },
    input: requests.map((r) => JSON.stringify(r)).join('\n') + '\n',
    timeout: 5000,
  });
  // Parse line-delimited responses on stdout.
  const responses = (proc.stdout || '')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  return { responses, stderr: proc.stderr || '' };
}

let sandbox;
beforeEach(() => { sandbox = null; });
afterEach(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

describe('MCP server — protocol surface', () => {
  it('responds to initialize with protocolVersion + capabilities', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'initialize' },
    ]);
    expect(responses).toHaveLength(1);
    expect(responses[0].id).toBe(1);
    expect(responses[0].result.protocolVersion).toBe('2024-11-05');
    expect(responses[0].result.capabilities.tools).toBeDefined();
    expect(responses[0].result.serverInfo.name).toBe('aped-state');
  });

  it('responds to tools/list with the 3 declared tools', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    ]);
    const names = responses[0].result.tools.map((t) => t.name).sort();
    expect(names).toEqual(['aped_state.get', 'aped_state.update', 'aped_validate.phase']);
  });

  it('returns method-not-found for unknown methods', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'foo/bar' },
    ]);
    expect(responses[0].error.code).toBe(-32601);
  });

  it('does not respond to notifications/initialized', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', method: 'notifications/initialized' },
    ]);
    expect(responses).toHaveLength(0);
  });
});

describe('MCP server — aped_state.get', () => {
  it('returns full doc on empty path', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.get', arguments: {} } },
    ]);
    const text = responses[0].result.content[0].text;
    const payload = JSON.parse(text);
    expect(payload.value).toBeDefined();
    expect(payload.sha).toMatch(/^[0-9a-f]{16}$/);
    expect(payload.schema_version).toBe(2);
  });

  it('returns a sub-tree by dot-path', async () => {
    sandbox = setupSandbox(
      'schema_version: 2\npipeline:\n  current_phase: "prd"\n  phases:\n    prd:\n      status: in-progress\n',
    );
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.get', arguments: { path: 'pipeline.current_phase' } } },
    ]);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.value).toBe('prd');
  });

  it('returns null for missing keys (not an error)', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.get', arguments: { path: 'nonexistent.field' } } },
    ]);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.value).toBeNull();
  });

  it('returns NO_STATE error when state.yaml is absent', async () => {
    sandbox = setupSandbox();
    rmSync(join(sandbox, 'docs', 'aped', 'state.yaml'));
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.get', arguments: {} } },
    ]);
    expect(responses[0].result.isError).toBe(true);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.error).toBe('NO_STATE');
  });
});

describe('MCP server — aped_state.update', () => {
  it('updates a scalar field and returns sha_before/sha_after', async () => {
    sandbox = setupSandbox(
      'schema_version: 2\npipeline:\n  current_phase: "none"\n  phases: {}\n',
    );
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.update', arguments: { path: 'pipeline.current_phase', value: 'prd' } } },
    ]);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.sha_before).toMatch(/^[0-9a-f]{16}$/);
    expect(payload.sha_after).toMatch(/^[0-9a-f]{16}$/);
    expect(payload.sha_before).not.toBe(payload.sha_after);
  });

  it('rejects updates on top-level keys NOT in the canonical schema (typo guard)', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.update', arguments: { path: 'pipline.phases.prd.status', value: 'done' } } },
    ]);
    expect(responses[0].result.isError).toBe(true);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.error).toBe('SCHEMA_REJECT');
    expect(payload.message).toMatch(/'pipline' is not in the canonical/);
  });

  it('honours expect_sha — fails on mismatch (concurrent modification)', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.update', arguments: { path: 'pipeline.current_phase', value: 'prd', expect_sha: '0000000000000000' } } },
    ]);
    expect(responses[0].result.isError).toBe(true);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.error).toBe('CONFLICT');
  });

  it('refuses update with empty path (BAD_INPUT)', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_state.update', arguments: { path: '', value: 'foo' } } },
    ]);
    expect(responses[0].result.isError).toBe(true);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.error).toBe('BAD_INPUT');
  });
});

describe('MCP server — aped_validate.phase', () => {
  it('returns BAD_INPUT for unsupported phase', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_validate.phase', arguments: { phase: 'foobar' } } },
    ]);
    expect(responses[0].result.isError).toBe(true);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.error).toBe('BAD_INPUT');
  });

  it('returns NO_ORACLE when oracle script is missing', async () => {
    sandbox = setupSandbox();
    const { responses } = await call(sandbox, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aped_validate.phase', arguments: { phase: 'prd' } } },
    ]);
    expect(responses[0].result.isError).toBe(true);
    const payload = JSON.parse(responses[0].result.content[0].text);
    expect(payload.error).toBe('NO_ORACLE');
  });
});
