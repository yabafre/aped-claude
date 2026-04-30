// validate-coverage.sh (4.13.1) — verifies that the coverage script matches
// canonical hyphenated FR-N identifiers (v4.7.6 standard), not just legacy FR1.
// Pre-4.13.1 the script used `grep -oE 'FR[0-9]+'` which silently produced an
// empty FR list on canonical PRDs, causing a false PASS.
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
  return mkdtempSync(join(tmpdir(), 'aped-coverage-hyphen-'));
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

const VALIDATE_COVERAGE = findScript('aped-epics/scripts/validate-coverage.sh');

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('validate-coverage.sh — hyphenated FR support (4.13.1)', () => {
  it('matches canonical FR-N identifiers in PRD and epics', () => {
    const script = installScript(sandbox, VALIDATE_COVERAGE);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, [
      '# PRD',
      '',
      'FR-1: User can sign up',
      'FR-2: User can log in',
      'FR-3: User can reset password',
    ].join('\n'));
    writeFileSync(epics, [
      '# Epics',
      '',
      'FR-1: covered in Epic 1',
      'FR-2: covered in Epic 1',
      'FR-3: covered in Epic 2',
    ].join('\n'));
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/PASSED/);
  });

  it('detects missing FR-N coverage with canonical identifiers', () => {
    const script = installScript(sandbox, VALIDATE_COVERAGE);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, [
      '# PRD',
      '',
      'FR-1: User can sign up',
      'FR-2: User can log in',
      'FR-3: User can reset password',
    ].join('\n'));
    writeFileSync(epics, [
      '# Epics',
      '',
      'FR-1: covered in Epic 1',
    ].join('\n'));
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/FAILED/);
    expect(r.stdout).toMatch(/FR-2/);
    expect(r.stdout).toMatch(/FR-3/);
  });

  it('handles mixed legacy FR1 + canonical FR-1 by normalizing', () => {
    const script = installScript(sandbox, VALIDATE_COVERAGE);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, [
      '# PRD',
      '',
      'FR-1: canonical form',
      'FR-2: canonical form',
    ].join('\n'));
    writeFileSync(epics, [
      '# Epics',
      '',
      'FR1: legacy form matches FR-1',
      'FR2: legacy form matches FR-2',
    ].join('\n'));
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/PASSED/);
  });

  it('warns but exits 0 when PRD has no FRs', () => {
    const script = installScript(sandbox, VALIDATE_COVERAGE);
    const prd = join(sandbox, 'prd.md');
    const epics = join(sandbox, 'epics.md');
    writeFileSync(prd, '# Empty PRD\n\nNo functional requirements.\n');
    writeFileSync(epics, '# Epics\n\nFR-1: something\n');
    const r = run(script, [epics, prd]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/WARNING.*No FRs found/);
  });
});
