// File-existence assertion lint.
//
// Pre-4.9.0, four skills described "Read state.yaml" without an explicit
// fallback for greenfield mid-flight (no state.yaml yet). The model would
// either hallucinate a phase or HALT silently. 4.9.0 inserts an explicit
// fallback in each skill body. This lint locks the discipline.
//
// Each skill must include a discoverable "if absent" branch in the immediate
// vicinity of the state.yaml read. The match is regex-based on semantic
// anchors (the failure-mode language) rather than exact-string, so future
// copy-edits don't break the lint gratuitously.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('file-existence assertion discipline (4.9.0 H11)', () => {
  it('aped-checkpoint Step 1 has explicit "If state.yaml is absent" branch', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-checkpoint.md'), 'utf8');
    expect(content).toMatch(/If state\.yaml is absent/);
    expect(content).toMatch(/pre-pipeline checkpoint/);
    expect(content).toMatch(/do not invent a phase/);
  });

  it('aped-status Step 1 has explicit absent-state.yaml halt', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-status.md'), 'utf8');
    expect(content).toMatch(/If state\.yaml is absent/);
    expect(content).toMatch(/no state\.yaml — pipeline not started yet/);
    expect(content).toMatch(/do NOT invent a phase or fabricate a dashboard/);
  });

  it('aped-zoom-out tells the agent missing artefacts are signal not error', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-zoom-out.md'), 'utf8');
    expect(content).toMatch(/Missing artefacts are signal, not error/);
    expect(content).toMatch(/If `state\.yaml` is absent/);
    expect(content).toMatch(/forbidden/);
  });

  it('aped-debug Discovery has explicit "if .last-test-exit absent" branch', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-debug.md'), 'utf8');
    expect(content).toMatch(/If `\.aped\/\.last-test-exit` is absent/);
    expect(content).toMatch(/run-tests\.sh.*once before continuing/);
    expect(content).toMatch(/debugging in the dark/);
  });
});
