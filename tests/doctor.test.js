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
  commandsDir: '.claude/commands',
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
  mkdirSync(join(dir, '.claude', 'commands'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'skills'), { recursive: true });
  writeFileSync(join(dir, '.aped', 'config.yaml'), 'project_name: demo\ncommands_path: .claude/commands\n', 'utf-8');
  writeFileSync(join(dir, 'docs', 'aped', 'state.yaml'), 'pipeline:\n  current_phase: "none"\n', 'utf-8');
  writeFileSync(join(dir, '.aped', 'hooks', 'guardrail.sh'), '#!/usr/bin/env bash\n', 'utf-8');
  writeFileSync(join(dir, '.claude', 'commands', 'aped-analyze.md'), 'Read the skill\n', 'utf-8');
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
    expect(report.checks.find((check) => check.id === 'commands')?.status).toBe('pass');
    expect(report.checks.find((check) => check.id === 'symlinks')?.status).toBe('pass');
  });

  it('fails when settings.local.json is invalid', () => {
    scaffoldHealthyInstall();
    writeFileSync(join(dir, '.claude', 'settings.local.json'), '{', 'utf-8');
    const report = inspectInstallation(config, dir);
    expect(report.checks.find((check) => check.id === 'settings-json')?.status).toBe('fail');
  });
});
