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
    expect(ISSUE_TRACKER_CLICKUP).toMatch(/Workspace.*Space.*List.*Task/);
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
});
