// review-output-lint (4.18.0) — locks the YAML schema for aped-review
// Stage 1.5 fan-out merged output + tests merge-findings.mjs logic.
import { describe, it, expect } from 'vitest';
import { mergeFindings } from '../src/templates/scripts/aped-review/merge-findings.mjs';

const SAMPLE_INPUT = `---
reviewer: hannah
findings:
  - file: src/auth.ts
    line: 42
    category: hallucinated-identifier
    severity: BLOCKER
    message: "identifier 'authService' not in spec"
  - file: src/db.ts
    line: 10
    category: hallucinated-identifier
    severity: MAJOR
    message: "table 'point_events' not in PRD"
---
reviewer: eli
findings:
  - file: src/auth.ts
    line: 42
    category: missing-null-check
    severity: MINOR
    message: "no null check on user param"
  - file: src/api.ts
    line: 100
    category: edge-case
    severity: NIT
    message: "empty array not handled"
---
reviewer: aaron
findings:
  - file: tests/auth.test.ts
    line: 15
    category: paraphrased-ac
    severity: MAJOR
    message: "test description does not match verbatim AC"
`;

describe('merge-findings.mjs (4.18.0)', () => {
  it('produces valid YAML output with review: top key', () => {
    const output = mergeFindings(SAMPLE_INPUT);
    expect(output).toMatch(/^review:/);
  });

  it('includes summary line with counts', () => {
    const output = mergeFindings(SAMPLE_INPUT);
    expect(output).toMatch(/summary: "1 blockers, 2 majors, 1 minors, 1 nits"/);
  });

  it('categorizes findings by severity', () => {
    const output = mergeFindings(SAMPLE_INPUT);
    expect(output).toMatch(/blockers:/);
    expect(output).toMatch(/majors:/);
    expect(output).toMatch(/minors:/);
    expect(output).toMatch(/nits:/);
  });

  it('deduplicates by file:line:category', () => {
    const dupeInput = `---
reviewer: a
findings:
  - file: x.ts
    line: 1
    category: bug
    severity: MINOR
    message: "found it"
---
reviewer: b
findings:
  - file: x.ts
    line: 1
    category: bug
    severity: BLOCKER
    message: "also found it"
`;
    const output = mergeFindings(dupeInput);
    expect(output).toMatch(/blockers:/);
    expect(output).toMatch(/severity: BLOCKER/);
    expect(output).not.toMatch(/severity: MINOR/);
  });

  it('lists all reviewers with finding counts', () => {
    const output = mergeFindings(SAMPLE_INPUT);
    expect(output).toMatch(/name: hannah/);
    expect(output).toMatch(/name: eli/);
    expect(output).toMatch(/name: aaron/);
    expect(output).toMatch(/finding_count: 2/);
  });

  it('handles empty input gracefully', () => {
    const output = mergeFindings('');
    expect(output).toMatch(/review:/);
    expect(output).toMatch(/0 blockers/);
  });
});
