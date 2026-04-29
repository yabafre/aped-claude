import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deriveSkillNames } from './templates/symlinks.js';
import { inspectSkillSymlinks, summarizeSymlinkInspection } from './symlink-manager.js';

const STATE_LOCK_STALE_SECONDS = 300;     // sync-state.sh threshold
const SPRINT_LOCK_STALE_SECONDS = 900;    // sprint-dispatch.sh threshold
const SCOPE_CHANGE_STALE_SECONDS = 7200;  // aped-course threshold (2h)

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

  // Let symlink-manager auto-detect which tools are present rather than
  // forcing a fixed target list. A single-tool Claude Code install will
  // see zero expected symlinks and that's fine — skills are reachable via
  // the per-tool skills directory the symlink layer points into.
  const symlinkResults = inspectSkillSymlinks(config, cwd);
  const symlinkSummary = summarizeSymlinkInspection(symlinkResults);
  const symlinkTotal = symlinkResults.length;
  checks.push({
    id: 'symlinks',
    label: 'Cross-tool skill symlinks',
    required: true,
    status: symlinkSummary.broken > 0 || symlinkSummary.missing > 0
      ? 'fail'
      : symlinkSummary.blocked > 0
        ? 'warn'
        : 'pass',
    message: symlinkTotal === 0
      ? 'no cross-tool symlinks expected (single-tool install)'
      : `ok=${symlinkSummary.ok} missing=${symlinkSummary.missing} broken=${symlinkSummary.broken} blocked=${symlinkSummary.blocked}`,
    fix: symlinkSummary.missing > 0 || symlinkSummary.broken > 0
      ? 'Run `aped-method symlink` to repair missing or broken APED links.'
      : symlinkSummary.blocked > 0
        ? 'Remove conflicting real directories/files before re-running `aped-method symlink`.'
        : null,
  });

  const legacyCheck = checkLegacy4xResidue(cwd, config);
  if (legacyCheck) checks.push(legacyCheck);

  checks.push(checkStateLock(cwd, config));
  checks.push(checkSprintLocks(cwd, config));
  checks.push(checkScopeChangeFlag(cwd, config));
  checks.push(checkStateBackup(cwd, config));

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

// Surface 3.x → 4.0 migration leftovers. Non-blocking (required: false) so
// existing 3.12 installs upgrade quietly; the diagnostic only renders when
// something is actually found, so a clean 4.0+ scaffold is silent here.
function checkLegacy4xResidue(cwd, config) {
  const stubs = listLegacyCommandStubs(cwd);
  const hasLegacyConfigKey = configHasLegacyCommandsPath(cwd, config.apedDir);
  if (stubs.length === 0 && !hasLegacyConfigKey) return null;

  const messages = [];
  const fixes = [];
  if (stubs.length > 0) {
    messages.push(`${stubs.length} legacy slash-command stub(s) under .claude/commands/`);
    fixes.push('rm -rf .claude/commands/aped-*.md');
  }
  if (hasLegacyConfigKey) {
    messages.push(`legacy "commands_path" key in ${join(config.apedDir, 'config.yaml')}`);
    fixes.push(`remove the "commands_path:" line from ${join(config.apedDir, 'config.yaml')}`);
  }
  return {
    id: 'legacy-4x-residue',
    label: 'Legacy 3.x slash-command residue',
    required: false,
    status: 'warn',
    message: messages.join('; ') + ' — safe to remove',
    fix: fixes.join(' && '),
  };
}

function listLegacyCommandStubs(cwd) {
  const dir = join(cwd, '.claude', 'commands');
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((name) => /^aped-.*\.md$/.test(name));
  } catch {
    return [];
  }
}

function configHasLegacyCommandsPath(cwd, apedDir) {
  const configPath = join(cwd, apedDir, 'config.yaml');
  if (!existsSync(configPath)) return false;
  try {
    return /^[ \t]*commands_path[ \t]*:/m.test(readFileSync(configPath, 'utf-8'));
  } catch {
    return false;
  }
}

function mtimeAgeSeconds(path) {
  try {
    const stats = statSync(path);
    return Math.max(0, Math.floor((Date.now() - stats.mtimeMs) / 1000));
  } catch {
    return null;
  }
}

function checkStateLock(cwd, config) {
  const lockDir = join(cwd, config.apedDir, '.state.lock');
  if (!existsSync(lockDir)) {
    return {
      id: 'state-lock',
      label: 'state.yaml lock',
      required: false,
      status: 'pass',
      message: 'no active lock',
      fix: null,
    };
  }
  const age = mtimeAgeSeconds(lockDir);
  const isStale = age != null && age > STATE_LOCK_STALE_SECONDS;
  return {
    id: 'state-lock',
    label: 'state.yaml lock',
    required: false,
    status: isStale ? 'warn' : 'pass',
    message: isStale
      ? `stale lock detected (${age}s old, threshold ${STATE_LOCK_STALE_SECONDS}s) — previous sync-state.sh likely crashed`
      : `lock held (${age}s old) — another sync-state.sh may be running`,
    fix: isStale
      ? `Remove the stale lock with: rm -rf ${join(config.apedDir, '.state.lock')}. Then verify ${join(config.outputDir, 'state.yaml')} is intact.`
      : null,
  };
}

function checkSprintLocks(cwd, config) {
  const locksDir = join(cwd, config.apedDir, '.sprint-locks');
  if (!existsSync(locksDir)) {
    return {
      id: 'sprint-locks',
      label: 'sprint dispatch locks',
      required: false,
      status: 'pass',
      message: 'no active dispatch locks',
      fix: null,
    };
  }
  let entries = [];
  try { entries = readdirSync(locksDir); } catch { entries = []; }
  if (entries.length === 0) {
    return {
      id: 'sprint-locks',
      label: 'sprint dispatch locks',
      required: false,
      status: 'pass',
      message: 'no active dispatch locks',
      fix: null,
    };
  }
  const stale = [];
  for (const entry of entries) {
    const age = mtimeAgeSeconds(join(locksDir, entry));
    if (age != null && age > SPRINT_LOCK_STALE_SECONDS) stale.push({ entry, age });
  }
  if (stale.length === 0) {
    return {
      id: 'sprint-locks',
      label: 'sprint dispatch locks',
      required: false,
      status: 'pass',
      message: `${entries.length} active dispatch lock(s) — none stale`,
      fix: null,
    };
  }
  return {
    id: 'sprint-locks',
    label: 'sprint dispatch locks',
    required: false,
    status: 'warn',
    message: `${stale.length} stale dispatch lock(s): ${stale.map((s) => `${s.entry} (${s.age}s)`).join(', ')}`,
    fix: `Remove stale dispatch locks with: rm -rf ${join(config.apedDir, '.sprint-locks')}/{${stale.map((s) => s.entry).join(',')}}`,
  };
}

function checkScopeChangeFlag(cwd, config) {
  const statePath = join(cwd, config.outputDir, 'state.yaml');
  if (!existsSync(statePath)) {
    return {
      id: 'scope-change',
      label: 'scope_change_active flag',
      required: false,
      status: 'pass',
      message: 'state.yaml not present yet',
      fix: null,
    };
  }
  let content = '';
  try { content = readFileSync(statePath, 'utf8'); } catch {
    return {
      id: 'scope-change',
      label: 'scope_change_active flag',
      required: false,
      status: 'fail',
      message: `cannot read ${config.outputDir}/state.yaml`,
      fix: 'Restore the file from backup or rerun `aped-method --update`.',
    };
  }
  const match = content.match(/scope_change_active:\s*(true|false)/);
  if (!match || match[1] !== 'true') {
    return {
      id: 'scope-change',
      label: 'scope_change_active flag',
      required: false,
      status: 'pass',
      message: 'clear',
      fix: null,
    };
  }
  const age = mtimeAgeSeconds(statePath);
  const isStale = age != null && age > SCOPE_CHANGE_STALE_SECONDS;
  return {
    id: 'scope-change',
    label: 'scope_change_active flag',
    required: false,
    status: isStale ? 'warn' : 'pass',
    message: isStale
      ? `set for ${Math.round(age / 3600)}h — likely stuck from a crashed /aped-course run`
      : `set (age ${age}s) — an /aped-course session may still be active`,
    fix: isStale
      ? `Clear with: echo 'set-scope-change false' | bash ${join(config.apedDir, 'scripts', 'sync-state.sh')}`
      : null,
  };
}

function checkStateBackup(cwd, config) {
  const backupPath = join(cwd, config.apedDir, 'state.yaml.backup');
  const statePath = join(cwd, config.outputDir, 'state.yaml');
  if (!existsSync(backupPath)) {
    return {
      id: 'state-backup',
      label: 'state.yaml backup',
      required: false,
      status: 'pass',
      message: 'no backup yet (normal until first mutation via sync-state.sh)',
      fix: null,
    };
  }
  const backupAge = mtimeAgeSeconds(backupPath);
  const stateReadable = existsSync(statePath) && (() => {
    try { readFileSync(statePath, 'utf8'); return true; } catch { return false; }
  })();
  if (!stateReadable) {
    return {
      id: 'state-backup',
      label: 'state.yaml backup',
      required: false,
      status: 'warn',
      message: 'current state.yaml is unreadable but a backup is present',
      fix: `Restore from backup: cp ${join(config.apedDir, 'state.yaml.backup')} ${join(config.outputDir, 'state.yaml')}`,
    };
  }
  return {
    id: 'state-backup',
    label: 'state.yaml backup',
    required: false,
    status: 'pass',
    message: `backup present (${backupAge}s old)`,
    fix: null,
  };
}
