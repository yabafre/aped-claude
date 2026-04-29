import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectInstallation } from '../src/doctor.js';
import { deriveSkillNames } from '../src/templates/symlinks.js';

let dir;

const config = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  skillSymlinks: ['.claude/skills'],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aped-doctor-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scaffoldHealthyInstall() {
  mkdirSync(join(dir, '.aped', 'hooks'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'aped'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'skills'), { recursive: true });
  writeFileSync(join(dir, '.aped', 'config.yaml'), 'project_name: demo\n', 'utf-8');
  writeFileSync(join(dir, 'docs', 'aped', 'state.yaml'), 'pipeline:\n  current_phase: "none"\n', 'utf-8');
  writeFileSync(join(dir, '.aped', 'hooks', 'guardrail.sh'), '#!/usr/bin/env bash\n', 'utf-8');
  writeFileSync(join(dir, '.claude', 'settings.local.json'), '{"hooks":{}}\n', 'utf-8');
  for (const skillName of deriveSkillNames(config)) {
    mkdirSync(join(dir, '.aped', skillName), { recursive: true });
    writeFileSync(join(dir, '.aped', skillName, 'SKILL.md'), '# skill\n', 'utf-8');
    symlinkSync(`../../.aped/${skillName}`, join(dir, '.claude', 'skills', skillName), 'dir');
  }
}

describe('inspectInstallation', () => {
  it('returns exitCode 1 when required files are missing', () => {
    const report = inspectInstallation(config, dir);
    expect(report.exitCode).toBe(1);
    expect(report.checks.find((check) => check.id === 'config')?.status).toBe('fail');
  });

  it('returns exitCode 0 for a healthy minimal install', () => {
    scaffoldHealthyInstall();
    const report = inspectInstallation(config, dir);
    expect(report.exitCode).toBe(0);
    expect(report.checks.find((check) => check.id === 'skills')?.status).toBe('pass');
    expect(report.checks.find((check) => check.id === 'symlinks')?.status).toBe('pass');
    // The legacy-residue diagnostic is silent on a clean 4.0+ scaffold.
    expect(report.checks.find((check) => check.id === 'legacy-4x-residue')).toBeUndefined();
  });

  it('fails when settings.local.json is invalid', () => {
    scaffoldHealthyInstall();
    writeFileSync(join(dir, '.claude', 'settings.local.json'), '{', 'utf-8');
    const report = inspectInstallation(config, dir);
    expect(report.checks.find((check) => check.id === 'settings-json')?.status).toBe('fail');
  });

  it('emits a yq optional-tool check (4.1.0 — warns when absent, sharp message about migrate + done-flip)', () => {
    scaffoldHealthyInstall();
    const report = inspectInstallation(config, dir);
    const yqCheck = report.checks.find((check) => check.id === 'bin-yq');
    expect(yqCheck).toBeDefined();
    expect(yqCheck.required).toBe(false);
    // The check's status depends on whether yq is on PATH where the test
    // runs — both pass and warn are valid outcomes. What matters is the
    // sharp hint when it warns.
    if (yqCheck.status === 'warn') {
      expect(yqCheck.fix).toMatch(/migrate-state\.sh/);
      expect(yqCheck.fix).toMatch(/mark-story-done/);
    } else {
      expect(yqCheck.status).toBe('pass');
    }
  });

  it('warns (but does not fail) when 3.x slash-command stubs and commands_path are present', () => {
    scaffoldHealthyInstall();
    // Pre-seed the leftovers a 3.12 → 4.0 upgrade would carry.
    mkdirSync(join(dir, '.claude', 'commands'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'commands', 'aped-analyze.md'), 'legacy stub\n', 'utf-8');
    writeFileSync(
      join(dir, '.aped', 'config.yaml'),
      'project_name: demo\ncommands_path: .claude/commands\n',
      'utf-8',
    );
    const report = inspectInstallation(config, dir);
    expect(report.exitCode).toBe(0);
    const legacy = report.checks.find((check) => check.id === 'legacy-4x-residue');
    expect(legacy?.status).toBe('warn');
    expect(legacy?.message).toContain('1 legacy slash-command stub');
    expect(legacy?.message).toContain('commands_path');
    expect(legacy?.fix).toContain('rm -rf .claude/commands/aped-*.md');
  });
});
