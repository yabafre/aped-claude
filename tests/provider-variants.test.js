import { describe, it, expect } from 'vitest';
import { references } from '../src/templates/references.js';
import {
  issueTrackerSection,
  ISSUE_TRACKER_NONE,
} from '../src/templates/providers/issue-tracker.js';
import {
  gitProviderSection,
  GIT_PROVIDER_GITHUB,
} from '../src/templates/providers/git-provider.js';

// Phase 1 contract for the provider-variant refactor: each scaffold receives
// only the configured ticket_system + git_provider sections in
// .aped/aped-dev/references/ticket-git-workflow.md, plus the common footer.
// Adding a new provider should be a drop-in to providers/*.js -- references.js
// stays unchanged.

function renderWorkflow(ts, gp) {
  const files = references({
    apedDir: '.aped',
    ticketSystem: ts,
    gitProvider: gp,
  });
  const entry = files.find((f) =>
    f.path.endsWith('aped-dev/references/ticket-git-workflow.md'),
  );
  expect(entry, 'ticket-git-workflow.md is registered').toBeTruthy();
  return entry.content;
}

// Strategic combos covering every ticket_system value and every git_provider
// value at least once. 5 combos, every variant exercised.
const COMBOS = [
  {
    ts: 'linear',
    gp: 'github',
    expectedTsMarker: /ticket_system = "linear"/,
    expectedGpMarker: /git_provider = "github"/,
    forbiddenMarkers: [
      /ticket_system = "jira"/,
      /ticket_system = "github-issues"/,
      /ticket_system = "gitlab-issues"/,
      /git_provider = "gitlab"/,
      /git_provider = "bitbucket"/,
    ],
  },
  {
    ts: 'jira',
    gp: 'gitlab',
    expectedTsMarker: /ticket_system = "jira"/,
    expectedGpMarker: /git_provider = "gitlab"/,
    forbiddenMarkers: [
      /ticket_system = "linear"/,
      /ticket_system = "github-issues"/,
      /ticket_system = "gitlab-issues"/,
      /git_provider = "github"$|git_provider = "github"\n/m,
      /git_provider = "bitbucket"/,
    ],
  },
  {
    ts: 'github-issues',
    gp: 'github',
    expectedTsMarker: /ticket_system = "github-issues"/,
    expectedGpMarker: /git_provider = "github"/,
    forbiddenMarkers: [
      /ticket_system = "linear"/,
      /ticket_system = "jira"/,
      /ticket_system = "gitlab-issues"/,
      /git_provider = "gitlab"/,
      /git_provider = "bitbucket"/,
    ],
  },
  {
    ts: 'gitlab-issues',
    gp: 'gitlab',
    expectedTsMarker: /ticket_system = "gitlab-issues"/,
    expectedGpMarker: /git_provider = "gitlab"/,
    forbiddenMarkers: [
      /ticket_system = "linear"/,
      /ticket_system = "jira"/,
      /ticket_system = "github-issues"/,
      /git_provider = "github"$|git_provider = "github"\n/m,
      /git_provider = "bitbucket"/,
    ],
  },
  {
    ts: 'none',
    gp: 'bitbucket',
    expectedTsMarker: /ticket_system = "none"/,
    expectedGpMarker: /git_provider = "bitbucket"/,
    forbiddenMarkers: [
      /ticket_system = "linear"/,
      /ticket_system = "jira"/,
      /ticket_system = "github-issues"/,
      /ticket_system = "gitlab-issues"/,
      /git_provider = "gitlab"/,
      /git_provider = "github"$|git_provider = "github"\n/m,
    ],
  },
];

describe('provider-variant refactor — only configured providers render', () => {
  for (const combo of COMBOS) {
    it(`(${combo.ts}, ${combo.gp}) emits only the configured providers + common footer`, () => {
      const content = renderWorkflow(combo.ts, combo.gp);

      expect(
        combo.expectedTsMarker.test(content),
        `expected ticket_system marker for ${combo.ts} to be present`,
      ).toBe(true);
      expect(
        combo.expectedGpMarker.test(content),
        `expected git_provider marker for ${combo.gp} to be present`,
      ).toBe(true);

      for (const forbidden of combo.forbiddenMarkers) {
        expect(
          forbidden.test(content),
          `forbidden marker ${forbidden} must NOT appear in (${combo.ts}, ${combo.gp})`,
        ).toBe(false);
      }

      // Common footer always present (config-agnostic).
      expect(content).toMatch(/## Commit Message Format/);
      expect(content).toMatch(/## State Sync/);
      expect(content).toMatch(/## Epic\/Milestone Tracking/);
      expect(content).toMatch(/## Critical Rules/);
    });
  }

  it('dispatch defaults to NONE / GITHUB on unrecognised values', () => {
    expect(issueTrackerSection('mystery-tracker')).toBe(ISSUE_TRACKER_NONE);
    expect(gitProviderSection('mystery-host')).toBe(GIT_PROVIDER_GITHUB);
  });

  it('reduces line count vs the un-split monolith (regression guard)', () => {
    // The pre-refactor monolith was ~190 lines for every config. Even the
    // largest combo (Linear + GitHub) post-refactor renders well under that
    // because Jira / GitHub Issues / GitLab Issues / GitLab / Bitbucket
    // sections are no longer concatenated. Treat anything > 160 lines as
    // a regression to investigate.
    const content = renderWorkflow('linear', 'github');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThan(160);
    expect(lineCount).toBeGreaterThan(60);
  });
});
