import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DEFAULT_SKILL_SYMLINK_TARGETS, deriveSkillNames } from './templates/symlinks.js';
import { inspectSkillSymlinks, summarizeSymlinkInspection } from './symlink-manager.js';

export function inspectInstallation(config, cwd = process.cwd()) {
  const checks = [];
  const requiredPaths = [
    { id: 'config', label: 'Config file', path: join(config.apedDir, 'config.yaml') },
    { id: 'state', label: 'State file', path: join(config.outputDir, 'state.yaml') },
    { id: 'guardrail', label: 'Guardrail hook', path: join(config.apedDir, 'hooks', 'guardrail.sh') },
    { id: 'settings', label: 'Claude local settings', path: '.claude/settings.local.json' },
  ];

  for (const item of requiredPaths) {
    const exists = existsSync(join(cwd, item.path));
    checks.push({
      id: item.id,
      label: item.label,
      required: true,
      status: exists ? 'pass' : 'fail',
      message: exists ? `${item.path} exists` : `${item.path} is missing`,
      fix: exists ? null : `Run \`aped-method --update\` to restore ${item.path}.`,
    });
  }

  const commandCount = countApedCommandFiles(join(cwd, config.commandsDir));
  checks.push({
    id: 'commands',
    label: 'Slash commands',
    required: true,
    status: commandCount > 0 ? 'pass' : 'fail',
    message: commandCount > 0
      ? `${commandCount} APED command files found in ${config.commandsDir}`
      : `No APED command files found in ${config.commandsDir}`,
    fix: commandCount > 0 ? null : 'Run `aped-method --update` to restore slash commands.',
  });

  const skillNames = deriveSkillNames(config);
  const skillCount = countInstalledSkills(cwd, config.apedDir, skillNames);
  checks.push({
    id: 'skills',
    label: 'Installed skills',
    required: true,
    status: skillCount > 0 ? 'pass' : 'fail',
    message: skillCount > 0
      ? `${skillCount}/${skillNames.length} skill directories found under ${config.apedDir}`
      : `No APED skills found under ${config.apedDir}`,
    fix: skillCount > 0 ? null : 'Run `aped-method --update` to restore skill directories.',
  });

  const settingsPath = join(cwd, '.claude/settings.local.json');
  const settingsStatus = checkJsonFile(settingsPath);
  checks.push({
    id: 'settings-json',
    label: 'settings.local.json validity',
    required: true,
    status: settingsStatus.status,
    message: settingsStatus.message,
    fix: settingsStatus.fix,
  });

  const symlinkTargets = config.skillSymlinks || DEFAULT_SKILL_SYMLINK_TARGETS;
  const symlinkResults = inspectSkillSymlinks({ ...config, skillSymlinks: symlinkTargets }, cwd);
  const symlinkSummary = summarizeSymlinkInspection(symlinkResults);
  checks.push({
    id: 'symlinks',
    label: 'Cross-tool skill symlinks',
    required: true,
    status: symlinkSummary.broken > 0 || symlinkSummary.missing > 0 ? 'fail' : symlinkSummary.blocked > 0 ? 'warn' : 'pass',
    message: `ok=${symlinkSummary.ok} missing=${symlinkSummary.missing} broken=${symlinkSummary.broken} blocked=${symlinkSummary.blocked}`,
    fix: symlinkSummary.missing > 0 || symlinkSummary.broken > 0
      ? 'Run `aped-method symlink` to repair missing or broken APED links.'
      : symlinkSummary.blocked > 0
        ? 'Remove conflicting real directories/files before re-running `aped-method symlink`.'
        : null,
  });

  for (const binary of ['jq', 'gh', 'workmux']) {
    const exists = commandExists(binary);
    checks.push({
      id: `bin-${binary}`,
      label: `Optional tool: ${binary}`,
      required: false,
      status: exists ? 'pass' : 'warn',
      message: exists ? `${binary} is available` : `${binary} is not installed`,
      fix: exists ? null : `Install ${binary} to unlock the optional APED integrations that use it.`,
    });
  }

  return {
    checks,
    exitCode: checks.some((check) => check.required && check.status === 'fail') ? 1 : 0,
    symlinkResults,
  };
}

function countApedCommandFiles(dir) {
  try {
    const entries = lstatSync(dir);
    if (!entries.isDirectory()) return 0;
  } catch {
    return 0;
  }
  return readdirSync(dir).filter((name) => /^aped-.*\.md$/.test(name)).length;
}

function countInstalledSkills(cwd, apedDir, skillNames) {
  return skillNames.filter((name) => existsSync(join(cwd, apedDir, name, 'SKILL.md'))).length;
}

function checkJsonFile(path) {
  if (!existsSync(path)) {
    return {
      status: 'fail',
      message: `${path} is missing`,
      fix: 'Run `aped-method --update` to restore `.claude/settings.local.json`.',
    };
  }

  try {
    JSON.parse(readFileSync(path, 'utf8'));
    return {
      status: 'pass',
      message: `${path} contains valid JSON`,
      fix: null,
    };
  } catch {
    return {
      status: 'fail',
      message: `${path} contains invalid JSON`,
      fix: 'Fix the JSON syntax, or rerun `aped-method --update` to restore a valid settings file.',
    };
  }
}

function commandExists(binary) {
  const tool = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(tool, [binary], { stdio: 'ignore' });
  return result.status === 0;
}
