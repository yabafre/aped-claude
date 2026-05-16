import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { issueTrackerSection, ISSUE_TRACKER_CLICKUP } from '../src/templates/providers/issue-tracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

describe('clickup is a first-class ticket_system option', () => {
  it('exports a non-empty ISSUE_TRACKER_CLICKUP block', () => {
    expect(ISSUE_TRACKER_CLICKUP).toMatch(/ticket_system = "clickup"/);
  });

  it('issueTrackerSection("clickup") returns the ClickUp block, not the none fallback', () => {
    const section = issueTrackerSection('clickup');
    expect(section).toBe(ISSUE_TRACKER_CLICKUP);
    expect(section).not.toMatch(/ticket_system = "none"/);
  });

  it('is listed in TICKET_OPTIONS and VALID_TICKET_VALUES in src/index.js', () => {
    const indexSrc = readFileSync(join(root, 'src/index.js'), 'utf-8');
    expect(indexSrc).toMatch(/\{ value: 'clickup', label: 'ClickUp' \}/);
  });

  it('is documented in the CLI help text (--tickets= line)', () => {
    const indexSrc = readFileSync(join(root, 'src/index.js'), 'utf-8');
    const helpLine = indexSrc.match(/--tickets=SYSTEM.*$/m)?.[0] ?? '';
    expect(helpLine).toContain('clickup');
  });

  it('routes ClickUp through the ClickUp MCP, not a paste-URL fallback', () => {
    expect(ISSUE_TRACKER_CLICKUP).toMatch(/mcp__clickup__/);
    expect(ISSUE_TRACKER_CLICKUP).toMatch(/ClickUp MCP/);
    expect(ISSUE_TRACKER_CLICKUP).not.toMatch(/paste the commit\/PR URL/i);
    expect(ISSUE_TRACKER_CLICKUP).not.toMatch(/paste the PR URL as a task comment/i);
  });

  it('aped-from-ticket workflow.md.tmpl declares the ClickUp MCP readiness check', () => {
    const tmpl = readFileSync(
      join(root, 'src/templates/skills/aped-from-ticket/workflow.md.tmpl'),
      'utf-8'
    );
    expect(tmpl).toMatch(/`clickup`:.*ClickUp MCP must be available/);
    expect(tmpl).toMatch(/`clickup`: use the ClickUp MCP tool to fetch the task by id/);
    expect(tmpl).toMatch(/`clickup`: ClickUp MCP comment tool/);
  });
});
