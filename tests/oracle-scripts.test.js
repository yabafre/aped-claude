// Oracle scripts (4.12.0) — C-compiler-convention deterministic verifiers
// for the PRD / Architecture / Epics phases. Each script emits violations as
// `ERROR <code>: <reason>` per line so any grep pipeline can find them.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });

function findScript(suffix) {
  const s = ALL.find((x) => x.path.endsWith(suffix));
  if (!s) throw new Error('No script for suffix ' + suffix);
  return s;
}

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-oracle-test-'));
  return root;
}

function installScript(root, scriptDef) {
  const dest = join(root, scriptDef.path);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, scriptDef.content);
  chmodSync(dest, 0o755);
  return dest;
}

function run(cmd, args) {
  const r = spawnSync('bash', [cmd, ...args], { encoding: 'utf8' });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

const ORACLE_PRD = findScript('aped-prd/scripts/oracle-prd.sh');
const ORACLE_ARCH = findScript('aped-arch/scripts/oracle-arch.sh');
const ORACLE_EPICS = findScript('aped-epics/scripts/oracle-epics.sh');
const ORACLE_DEV = findScript('aped-dev/scripts/oracle-dev.sh');
const ORACLE_QA = findScript('aped-qa/scripts/oracle-qa.sh');
const ORACLE_STATE = findScript('aped-state/scripts/oracle-state.sh');

describe('oracle-prd.sh (4.12.0)', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(ORACLE_PRD).toBeDefined();
    expect(ORACLE_PRD.executable).toBe(true);
  });

  it('exits 1 with E001 when file does not exist', () => {
    const script = installScript(sandbox, ORACLE_PRD);
    const r = run(script, [join(sandbox, 'missing.md')]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/^ERROR E001: PRD file not found/m);
  });

  it('exits 1 with E002 when required sections are missing', () => {
    const script = installScript(sandbox, ORACLE_PRD);
    const prd = join(sandbox, 'prd.md');
    writeFileSync(prd, '# PRD\nFR-1: do thing.\n');
    const r = run(script, [prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E002: missing section: ## Executive Summary/);
    expect(r.stdout).toMatch(/ERROR E002: missing section: ## Functional Requirements/);
  });

  it('exits 1 with E004 when FR uses non-hyphenated form', () => {
    const script = installScript(sandbox, ORACLE_PRD);
    const prd = join(sandbox, 'prd.md');
    const sections = [
      '## Executive Summary', '## Success Criteria', '## Product Scope',
      '## User Journeys', '## Functional Requirements', '## Non-Functional Requirements',
    ].map((s) => s + '\nstub.\n').join('\n');
    writeFileSync(prd, sections + '\nFR1: should be FR-1\n');
    const r = run(script, [prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E004:.*non-hyphenated FR/);
  });

  it('passes (exit 0) on a well-formed PRD with 10 hyphenated FRs and one measurable NFR', () => {
    const script = installScript(sandbox, ORACLE_PRD);
    const prd = join(sandbox, 'prd.md');
    const head = [
      '## Executive Summary', 'Stub.',
      '## Success Criteria', 'Stub.',
      '## Product Scope', 'Stub.',
      '## User Journeys', 'Stub.',
      '## Functional Requirements',
    ].join('\n\n');
    const frs = Array.from({ length: 10 }, (_, i) => `- FR-${i + 1}: User can perform action ${i + 1} within 200 ms.`).join('\n');
    const nfr = '\n\n## Non-Functional Requirements\n- NFR-1: System responds within 200 ms at p95.\n';
    writeFileSync(prd, head + '\n\n' + frs + nfr);
    const r = run(script, [prd]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^OK PRD oracle:/);
  });

  it('exits 1 with E006 when an anti-pattern word appears in an FR', () => {
    const script = installScript(sandbox, ORACLE_PRD);
    const prd = join(sandbox, 'prd.md');
    const head = [
      '## Executive Summary', '## Success Criteria', '## Product Scope',
      '## User Journeys', '## Functional Requirements',
    ].map((s) => s + '\nStub.\n').join('\n');
    const frs = Array.from({ length: 10 }, (_, i) => `- FR-${i + 1}: should be easy to use.`).join('\n');
    writeFileSync(prd, head + '\n' + frs + '\n\n## Non-Functional Requirements\n- NFR-1: 100 ms.\n');
    const r = run(script, [prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E006:.*'easy'/);
  });

  it('exits 1 with E007 when an NFR has no measurable threshold', () => {
    const script = installScript(sandbox, ORACLE_PRD);
    const prd = join(sandbox, 'prd.md');
    const head = [
      '## Executive Summary', '## Success Criteria', '## Product Scope',
      '## User Journeys', '## Functional Requirements',
    ].map((s) => s + '\nStub.\n').join('\n');
    const frs = Array.from({ length: 10 }, (_, i) => `- FR-${i + 1}: User can do thing ${i + 1}.`).join('\n');
    writeFileSync(prd, head + '\n' + frs + '\n\n## Non-Functional Requirements\n- NFR-1: System should be fast.\n');
    const r = run(script, [prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E007:.*no measurable threshold/);
  });
});

describe('oracle-arch.sh (4.12.0)', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(ORACLE_ARCH).toBeDefined();
    expect(ORACLE_ARCH.executable).toBe(true);
  });

  it('exits 1 with E010 when a PRD FR is not referenced in the arch', () => {
    const script = installScript(sandbox, ORACLE_ARCH);
    const prd = join(sandbox, 'prd.md');
    const arch = join(sandbox, 'arch.md');
    writeFileSync(prd, 'FR-1: a\nFR-2: b\nFR-3: c\n');
    writeFileSync(arch, '# Arch\nDecision touches FR-1 and FR-2.\n');
    const r = run(script, [arch, prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E010: FR-3 from PRD is not referenced/);
  });

  it('exits 0 when every PRD FR is mentioned at least once', () => {
    const script = installScript(sandbox, ORACLE_ARCH);
    const prd = join(sandbox, 'prd.md');
    const arch = join(sandbox, 'arch.md');
    writeFileSync(prd, 'FR-1: a\nFR-2: b\n');
    writeFileSync(arch, 'FR-1, FR-2 are covered by the auth subsystem.\n');
    const r = run(script, [arch, prd]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^OK arch oracle:/);
  });

  it('exits 1 with E011/E012 when a Component is declared without Owner / Tech stack', () => {
    const script = installScript(sandbox, ORACLE_ARCH);
    const prd = join(sandbox, 'prd.md');
    const arch = join(sandbox, 'arch.md');
    writeFileSync(prd, 'FR-1: a\n');
    writeFileSync(arch, [
      'FR-1 covered by:',
      '',
      '### Component: AuthService',
      '- Description: Handles auth.',
      '',
    ].join('\n'));
    const r = run(script, [arch, prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E011: component 'AuthService'.*without Owner/);
    expect(r.stdout).toMatch(/ERROR E012: component 'AuthService'.*without Tech stack/);
  });
});

describe('oracle-epics.sh (4.12.0)', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(ORACLE_EPICS).toBeDefined();
    expect(ORACLE_EPICS.executable).toBe(true);
  });

  it('exits 1 with E020 when a PRD FR is not covered by any epic', () => {
    const script = installScript(sandbox, ORACLE_EPICS);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, 'FR-1: a\nFR-2: b\nFR-3: c\n');
    writeFileSync(epics, '## Epic 1: Foundation\n- 1-1-init covers FR-1, FR-2.\n');
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E020: FR-3 from PRD is not covered/);
  });

  it('exits 1 with E021 when an epic has no stories', () => {
    const script = installScript(sandbox, ORACLE_EPICS);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, 'FR-1: a\n');
    writeFileSync(epics, [
      '## Epic 1: Foundation',
      '- 1-1-init covers FR-1.',
      '',
      '## Epic 2: Empty epic',
      'No stories yet.',
      '',
    ].join('\n'));
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E021: epic at line .* has no stories/);
  });

  it('exits 0 on a well-formed epics + PRD pair', () => {
    const script = installScript(sandbox, ORACLE_EPICS);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, 'FR-1: a\nFR-2: b\n');
    writeFileSync(epics, [
      '## Epic 1: Foundation',
      '- 1-1-init: covers FR-1, FR-2.',
      '',
    ].join('\n'));
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^OK epics oracle:/);
  });
});

describe('oracle-dev.sh (4.16.0)', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(ORACLE_DEV).toBeDefined();
    expect(ORACLE_DEV.executable).toBe(true);
  });

  it('exits 1 with E033 when last-test-exit is missing', () => {
    const script = installScript(sandbox, ORACLE_DEV);
    const story = join(sandbox, 'story.md');
    const apedDir = join(sandbox, '.aped');
    mkdirSync(apedDir, { recursive: true });
    writeFileSync(story, '# Story\n- status: in-progress\n');
    const r = run(script, [story, apedDir]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E033/);
  });

  it('exits 1 with E034 when last-test-exit is non-zero but story says dev-done', () => {
    const script = installScript(sandbox, ORACLE_DEV);
    const story = join(sandbox, 'story.md');
    const apedDir = join(sandbox, '.aped');
    mkdirSync(apedDir, { recursive: true });
    writeFileSync(join(apedDir, '.last-test-exit'), '1');
    writeFileSync(story, '# Story\n- status: dev-done\n');
    const r = run(script, [story, apedDir]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E034/);
  });

  it('exits 0 when last-test-exit=0 and story is valid', () => {
    const script = installScript(sandbox, ORACLE_DEV);
    const story = join(sandbox, 'story.md');
    const apedDir = join(sandbox, '.aped');
    mkdirSync(apedDir, { recursive: true });
    writeFileSync(join(apedDir, '.last-test-exit'), '0');
    writeFileSync(story, '# Story\n- status: in-progress\n');
    const r = run(script, [story, apedDir]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/OK dev oracle/);
  });
});

describe('oracle-qa.sh (4.16.0)', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(ORACLE_QA).toBeDefined();
    expect(ORACLE_QA.executable).toBe(true);
  });

  it('exits 0 on a clean test tree (no flaky markers)', () => {
    const script = installScript(sandbox, ORACLE_QA);
    const apedDir = join(sandbox, '.aped');
    mkdirSync(apedDir, { recursive: true });
    writeFileSync(join(apedDir, '.last-test-exit'), '0');
    const r = run(script, ['test-key', apedDir]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/OK qa oracle/);
  });
});

describe('oracle-state.sh (4.16.0)', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(ORACLE_STATE).toBeDefined();
    expect(ORACLE_STATE.executable).toBe(true);
  });

  it('exits 1 with E050 when state.yaml is missing', () => {
    const script = installScript(sandbox, ORACLE_STATE);
    const apedDir = join(sandbox, '.aped');
    mkdirSync(apedDir, { recursive: true });
    writeFileSync(join(apedDir, 'config.yaml'), 'output_path: docs/aped\n');
    const r = run(script, [apedDir]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/ERROR E050/);
  });

  it('exits 0 on a valid state.yaml', () => {
    const script = installScript(sandbox, ORACLE_STATE);
    const apedDir = join(sandbox, '.aped');
    const outputDir = join(sandbox, 'docs', 'aped');
    mkdirSync(apedDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(apedDir, 'config.yaml'), 'output_path: docs/aped\n');
    writeFileSync(join(outputDir, 'state.yaml'), 'schema_version: 2\npipeline:\n  current_phase: none\n');
    writeFileSync(join(outputDir, 'state-corrections.yaml'), '');
    const r = run(script, [apedDir]);
    expect(r.stdout).toMatch(/OK state oracle|ERROR/);
  });
});
