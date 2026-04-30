#!/usr/bin/env node
// APED ticket MCP server (opt-in via `aped-method enable-mcp`).
//
// Provider-routed ticket adapter. Reads tickets.provider from config.yaml
// and dispatches to the correct backend (github, linear, jira, gitlab).
// Closes H4 "wrong-backend invention" — skills call typed atoms instead
// of branching on provider and inventing CLI flags.
//
// Tools:
//   aped_ticket.create_issue(title, body, labels?) → { provider, id, url }
//   aped_ticket.get_status(ticket_id)              → { provider, id, status, url }
//   aped_ticket.list_open(filter?)                 → { provider, issues[] }
//   aped_ticket.link_pr(ticket_id, pr_url)         → { provider, ok }

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function configPath() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dir = process.env.APED_DIR || '.aped';
  return join(root, dir, 'config.yaml');
}

function readConfigField(key, fallback = '') {
  try {
    const raw = readFileSync(configPath(), 'utf-8');
    const m = raw.match(new RegExp(`^${key}:\\s*['"]?([^'"\\n#]+?)['"]?\\s*(?:#.*)?$`, 'm'));
    return m ? m[1].trim() : fallback;
  } catch {
    return fallback;
  }
}

class ToolError extends Error {
  constructor(message, code = 'INTERNAL', details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function getProvider() {
  const p = readConfigField('ticket_system', 'none');
  if (p === 'none' || !p) {
    throw new ToolError('Ticket system is "none" in config.yaml. Set ticket_system to github/linear/jira/gitlab.', 'TICKETS_DISABLED');
  }
  const KNOWN = ['github', 'linear', 'jira', 'gitlab'];
  if (!KNOWN.includes(p)) {
    throw new ToolError(`Unknown provider "${p}". Supported: ${KNOWN.join(', ')}`, 'UNKNOWN_PROVIDER');
  }
  return p;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new ToolError(`Missing env var ${name}. Set it before using ticket tools.`, 'MISSING_AUTH', { env_var: name });
  return v;
}

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf-8', timeout: 30000 });
  if (r.status !== 0) {
    const msg = (r.stderr || r.stdout || '').trim();
    throw new ToolError(`gh command failed: ${msg}`, 'PROVIDER_ERROR', { args });
  }
  return r.stdout.trim();
}

const PROVIDERS = {
  github: {
    create_issue: ({ title, body, labels }) => {
      const args = ['issue', 'create', '--title', title, '--body', body || ''];
      if (labels?.length) args.push('--label', labels.join(','));
      const url = gh(args);
      const id = url.split('/').pop();
      return { provider: 'github', id, url };
    },
    get_status: ({ ticket_id }) => {
      const raw = gh(['issue', 'view', ticket_id, '--json', 'number,title,state,url,assignees']);
      const data = JSON.parse(raw);
      return {
        provider: 'github',
        id: String(data.number),
        status: data.state?.toLowerCase() || 'unknown',
        title: data.title,
        url: data.url,
        assignee: data.assignees?.[0]?.login || null,
      };
    },
    list_open: ({ filter }) => {
      const args = ['issue', 'list', '--state', 'open', '--json', 'number,title,state,url', '--limit', '50'];
      if (filter?.label) args.push('--label', filter.label);
      if (filter?.assignee) args.push('--assignee', filter.assignee);
      const raw = gh(args);
      const issues = JSON.parse(raw).map((i) => ({
        id: String(i.number),
        title: i.title,
        status: i.state?.toLowerCase() || 'open',
        url: i.url,
      }));
      return { provider: 'github', issues };
    },
    link_pr: ({ ticket_id, pr_url }) => {
      gh(['issue', 'comment', ticket_id, '--body', `Linked PR: ${pr_url}`]);
      return { provider: 'github', ok: true };
    },
  },
  linear: {
    create_issue: () => { throw new ToolError('Linear provider not yet implemented. Coming in v4.18.0.', 'PROVIDER_ERROR'); },
    get_status: () => { throw new ToolError('Linear provider not yet implemented.', 'PROVIDER_ERROR'); },
    list_open: () => { throw new ToolError('Linear provider not yet implemented.', 'PROVIDER_ERROR'); },
    link_pr: () => { throw new ToolError('Linear provider not yet implemented.', 'PROVIDER_ERROR'); },
  },
  jira: {
    create_issue: () => { throw new ToolError('Jira provider not yet implemented.', 'PROVIDER_ERROR'); },
    get_status: () => { throw new ToolError('Jira provider not yet implemented.', 'PROVIDER_ERROR'); },
    list_open: () => { throw new ToolError('Jira provider not yet implemented.', 'PROVIDER_ERROR'); },
    link_pr: () => { throw new ToolError('Jira provider not yet implemented.', 'PROVIDER_ERROR'); },
  },
  gitlab: {
    create_issue: () => { throw new ToolError('GitLab provider not yet implemented.', 'PROVIDER_ERROR'); },
    get_status: () => { throw new ToolError('GitLab provider not yet implemented.', 'PROVIDER_ERROR'); },
    list_open: () => { throw new ToolError('GitLab provider not yet implemented.', 'PROVIDER_ERROR'); },
    link_pr: () => { throw new ToolError('GitLab provider not yet implemented.', 'PROVIDER_ERROR'); },
  },
};

const TOOLS = {
  'aped_ticket.create_issue': {
    description: 'Create a ticket/issue in the configured provider (github/linear/jira/gitlab).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Issue title.' },
        body: { type: 'string', description: 'Issue body (markdown).' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply.' },
      },
      required: ['title'],
    },
    handler: (args) => {
      const p = getProvider();
      return PROVIDERS[p].create_issue(args);
    },
  },
  'aped_ticket.get_status': {
    description: 'Get the status of a ticket by ID/number.',
    inputSchema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'string', description: 'Ticket ID or number.' },
      },
      required: ['ticket_id'],
    },
    handler: (args) => {
      const p = getProvider();
      return PROVIDERS[p].get_status(args);
    },
  },
  'aped_ticket.list_open': {
    description: 'List open tickets with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            assignee: { type: 'string' },
            label: { type: 'string' },
          },
        },
      },
      required: [],
    },
    handler: (args) => {
      const p = getProvider();
      return PROVIDERS[p].list_open(args);
    },
  },
  'aped_ticket.link_pr': {
    description: 'Link a PR URL to a ticket (adds a comment).',
    inputSchema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'string', description: 'Ticket ID or number.' },
        pr_url: { type: 'string', description: 'Pull request URL.' },
      },
      required: ['ticket_id', 'pr_url'],
    },
    handler: (args) => {
      const p = getProvider();
      return PROVIDERS[p].link_pr(args);
    },
  },
};

// ── MCP protocol ──────────────────────────────────────────────────────────

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'aped-ticket', version: '1.0.0' };

function dispatch(request) {
  const { id, method, params = {} } = request;
  try {
    if (method === 'initialize') {
      return { jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO } };
    }
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: Object.entries(TOOLS).map(([name, def]) => ({ name, description: def.description, inputSchema: def.inputSchema })) } };
    }
    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params;
      const tool = TOOLS[name];
      if (!tool) return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] } };
      try {
        const result = tool.handler(args);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } };
      } catch (e) {
        if (e instanceof ToolError) {
          return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: e.code, message: e.message, details: e.details }, null, 2) }] } };
        }
        return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Internal error: ${e.message}` }] } };
      }
    }
    if (method === 'notifications/initialized' || method === 'ping') {
      return method === 'ping' ? { jsonrpc: '2.0', id, result: {} } : null;
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  } catch (e) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: 'Internal error', data: { message: e.message } } };
  }
}

function setupStdio() {
  let buffer = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line);
        const res = dispatch(req);
        if (res) process.stdout.write(JSON.stringify(res) + '\n');
      } catch (e) {
        process.stderr.write(`[aped-ticket] parse error: ${e.message}\n`);
      }
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

process.on('uncaughtException', (e) => { process.stderr.write(`[aped-ticket] uncaught: ${e.message}\n`); });
process.on('unhandledRejection', (r) => { process.stderr.write(`[aped-ticket] unhandled: ${r}\n`); });

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) setupStdio();

export { dispatch, TOOLS, ToolError, PROVIDERS };
