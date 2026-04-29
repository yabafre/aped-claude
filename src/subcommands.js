// Subcommand handlers for `aped-method <doctor|statusline|safe-bash|symlink|
// post-edit-typescript>`. Split out from index.js to keep the main file
// focused on the primary `aped-method` scaffolding flow.
//
// Circular import note: this module imports shared helpers (DEFAULTS,
// UserError, validateSafePath, mergeSettings, CLI_VERSION, detectExisting)
// from './index.js'. Those imports are only consumed inside function bodies,
// so the live bindings are resolved by the time any of the exported handlers
// is actually called — no TDZ hazards.
import * as p from '@clack/prompts';
import {
  existsSync,
  readFileSync,
  writeFileSync as writeFS,
  chmodSync,
  lstatSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import color from 'picocolors';
import { inspectInstallation } from './doctor.js';
import { repairSkillSymlinks, summarizeSymlinkInspection } from './symlink-manager.js';
import {
  statuslineTemplates,
  safeBashTemplates,
  typeScriptQualityTemplates,
  verifyClaimsTemplates,
  sessionStartTemplates,
  visualCompanionTemplates,
} from './templates/optional-features.js';
import {
  DEFAULTS,
  UserError,
  validateSafePath,
  mergeSettings,
  CLI_VERSION,
  detectExisting,
} from './index.js';

export async function runSubcommand(command, args) {
  if (args._unknown.length > 0) {
    for (const flag of args._unknown) {
      console.warn(`${color.yellow('warn')} unknown flag: ${flag}`);
    }
    console.warn(color.dim('Run `aped-method --help` for the full list.'));
  }

  const config = resolveCommandConfig(args);

  if (command === 'doctor') {
    printDoctorReport(inspectInstallation(config));
    return;
  }

  if (!existsSync(join(process.cwd(), config.apedDir, 'config.yaml'))) {
    throw new UserError(`No APED installation found at ${config.apedDir}/config.yaml`);
  }

  if (command === 'statusline') {
    const overwriteStatusLine = await confirmStatuslineOverwrite(args);
    if (overwriteStatusLine === null) {
      p.cancel('Statusline install cancelled.');
      return;
    }
    await installFeature('statusline', statuslineTemplates(config), {
      mergeSettingsOptions: { overwriteStatusLine },
    });
    return;
  }

  if (command === 'safe-bash') {
    await installFeature('safe-bash', safeBashTemplates(config));
    return;
  }

  if (command === 'post-edit-typescript') {
    await installFeature('post-edit-typescript', typeScriptQualityTemplates(config));
    return;
  }

  if (command === 'verify-claims') {
    await installFeature('verify-claims', verifyClaimsTemplates(config));
    return;
  }

  if (command === 'session-start') {
    if (args.uninstall) {
      uninstallSessionStart(config);
      return;
    }
    await installFeature('session-start', sessionStartTemplates(config));
    return;
  }

  if (command === 'visual-companion') {
    if (args.uninstall) {
      uninstallVisualCompanion(config);
      return;
    }
    await installFeature('visual-companion', visualCompanionTemplates(config));
    return;
  }

  if (command === 'symlink') {
    runSymlinkRepair(config);
    return;
  }

  if (command === 'sync-logs') {
    runSyncLogsSubcommand(config, args);
    return;
  }
}

// ── sync-logs prune ────────────────────────────────────────────────────────
// Delegates the actual prune to .aped/scripts/sync-log.sh so that the same
// retention logic is exercised whether prune fires from cmd_end (post-sync)
// or from this CLI (one-shot manual sweep). Default is dry-run; --apply
// flips PRUNE_DRY_RUN=0. Optional --provider=NAME scopes the sweep.
function runSyncLogsSubcommand(config, args) {
  const action = args.action;
  if (action !== 'prune') {
    console.error(
      `${color.red('Error:')} sync-logs requires an action. Known actions: prune`
    );
    console.error(color.dim('Example: aped-method sync-logs prune --apply'));
    throw new UserError(`Unknown sync-logs action: ${action || '(none)'}`);
  }

  const script = join(process.cwd(), config.apedDir, 'scripts/sync-log.sh');
  if (!existsSync(script)) {
    throw new UserError(
      `sync-log.sh not found at ${config.apedDir}/scripts/sync-log.sh — re-run \`aped-method --update\` to install it.`
    );
  }

  const env = {
    ...process.env,
    PRUNE_DRY_RUN: args.apply ? '0' : '1',
  };
  if (args.provider) env.PRUNE_PROVIDER_FILTER = String(args.provider);

  const label = args.apply ? color.green('APPLY') : color.dim('dry-run');
  const scope = args.provider ? ` provider=${args.provider}` : '';
  p.log.message(`sync-logs prune (${label})${scope}`);

  const result = spawnSync('bash', [script, 'prune'], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new UserError(`sync-log.sh prune exited with code ${result.status}`);
  }
}

// Remove the SessionStart hook entry that points at this APED install
// from .claude/settings.local.json. Leaves the hook .sh file in place
// (cheap to keep, and a future re-install is just a JSON edit away).
function uninstallSessionStart(config) {
  p.intro(`${color.green(color.bold('APED Method'))} ${color.dim(`v${CLI_VERSION}`)}`);
  const settingsPath = join(process.cwd(), '.claude/settings.local.json');
  if (!existsSync(settingsPath)) {
    p.log.warn('No .claude/settings.local.json to uninstall from.');
    p.outro(color.dim('session-start: nothing to do.'));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    p.log.error('settings.local.json is not valid JSON — refusing to edit.');
    process.exitCode = 1;
    return;
  }

  const sessionStart = parsed?.hooks?.SessionStart;
  if (!Array.isArray(sessionStart) || sessionStart.length === 0) {
    p.log.warn('No SessionStart hook entries found.');
    p.outro(color.dim('session-start: nothing to do.'));
    return;
  }

  const apedHookFragment = `/${config.apedDir}/hooks/session-start.sh`;
  let removed = 0;
  const filteredOuter = [];
  for (const handler of sessionStart) {
    const inner = Array.isArray(handler.hooks) ? handler.hooks : [];
    const keptInner = inner.filter((hk) => {
      const cmd = String(hk.command || '');
      const isOurs = cmd.includes(apedHookFragment);
      if (isOurs) removed++;
      return !isOurs;
    });
    if (keptInner.length > 0) {
      filteredOuter.push({ ...handler, hooks: keptInner });
    }
  }

  if (filteredOuter.length === 0) {
    delete parsed.hooks.SessionStart;
    if (parsed.hooks && Object.keys(parsed.hooks).length === 0) {
      delete parsed.hooks;
    }
  } else {
    parsed.hooks.SessionStart = filteredOuter;
  }

  writeFS(settingsPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
  p.log.success(`Removed ${removed} APED SessionStart hook entr${removed === 1 ? 'y' : 'ies'} from settings.local.json.`);
  p.outro(color.dim('session-start uninstalled. Hook script kept at hooks/session-start.sh — re-run install to re-enable.'));
}

// Remove the visual-companion directory from the project. No settings.json
// touch needed — visual-companion never wrote one.
function uninstallVisualCompanion(config) {
  p.intro(`${color.green(color.bold('APED Method'))} ${color.dim(`v${CLI_VERSION}`)}`);
  const dir = join(process.cwd(), config.apedDir, 'visual-companion');
  if (!existsSync(dir)) {
    p.log.warn(`No visual-companion directory at ${color.dim(dir)}.`);
    p.outro(color.dim('visual-companion: nothing to do.'));
    return;
  }
  let isDir = false;
  try { isDir = statSync(dir).isDirectory(); } catch { /* missing */ }
  if (!isDir) {
    p.log.warn(`Skipping non-directory at ${color.dim(dir)}.`);
    p.outro(color.dim('visual-companion: nothing to do.'));
    return;
  }
  rmSync(dir, { recursive: true, force: true });
  p.log.success(`Removed ${color.dim(dir)}.`);
  p.outro(color.dim('visual-companion uninstalled.'));
}

// Returns:
//   true  → overwrite existing statusLine without asking
//   false → keep existing statusLine, let mergeSettings skip
//   null  → user cancelled, caller should abort the install
async function confirmStatuslineOverwrite(args) {
  const settingsPath = join(process.cwd(), '.claude/settings.local.json');
  let existingStatusLine = null;
  if (existsSync(settingsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      existingStatusLine = parsed.statusLine || null;
    } catch {
      // Invalid JSON is not our problem here — mergeSettings will rewrite.
    }
  }

  // No prior statusLine, or it's already the APED one → proceed silently.
  if (!existingStatusLine) return true;
  const existingCmd = String(existingStatusLine.command || '');
  if (existingCmd.includes('/scripts/statusline.')) return true;

  // Non-interactive mode always proceeds (scripted installs should not hang).
  if (args.yes) return true;

  p.intro(`${color.green(color.bold('APED Method'))} ${color.dim(`v${CLI_VERSION}`)}`);
  p.log.warn(`Existing statusLine detected: ${color.dim(existingCmd.slice(0, 80))}`);
  const choice = await p.confirm({
    message: 'Overwrite the existing statusLine with the APED statusline?',
    initialValue: false,
  });
  if (p.isCancel(choice) || choice === false) return null;
  return true;
}

function resolveCommandConfig(args) {
  const apedDir = validateSafePath(args.aped || args.apedDir, '--aped') || DEFAULTS.apedDir;
  const existing = detectExisting(apedDir);

  return {
    ...DEFAULTS,
    ...(existing || {}),
    apedDir,
    outputDir: validateSafePath(args.output || args.outputDir, '--output') || existing?.outputDir || DEFAULTS.outputDir,
    cliVersion: CLI_VERSION,
  };
}

async function installFeature(name, templates, options = {}) {
  p.intro(`${color.green(color.bold('APED Method'))} ${color.dim(`v${CLI_VERSION}`)}`);
  p.log.step(`Installing ${color.bold(name)}...`);
  const stats = applyTemplates(templates, options);
  p.log.success(`${name} installed  ${color.green(`+${stats.created}`)} created  ${color.yellow(`↑${stats.updated}`)} updated  ${color.dim(`=${stats.skipped}`)} kept`);
  p.outro(color.dim(`Run \`aped-method doctor\` to verify the scaffold after installing ${name}.`));
}

function runSymlinkRepair(config) {
  p.intro(`${color.green(color.bold('APED Method'))} ${color.dim(`v${CLI_VERSION}`)}`);
  const result = repairSkillSymlinks(config);
  const afterSummary = summarizeSymlinkInspection(inspectInstallation(config).symlinkResults);

  for (const item of result.repaired.slice(0, 8)) {
    p.log.success(`Repaired ${color.dim(item.path)} → ${color.dim(item.target)}`);
  }
  if (result.repaired.length > 8) {
    p.log.message(color.dim(`...and ${result.repaired.length - 8} more symlinks`));
  }
  for (const item of result.skipped.slice(0, 5)) {
    p.log.warn(`Skipped ${color.dim(item.path)} because a real file/directory already exists there`);
  }

  p.note(
    [
      `Before: ok=${result.summary.ok} missing=${result.summary.missing} broken=${result.summary.broken} blocked=${result.summary.blocked}`,
      `After:  ok=${afterSummary.ok} missing=${afterSummary.missing} broken=${afterSummary.broken} blocked=${afterSummary.blocked}`,
    ].join('\n'),
    'Symlink repair'
  );

  p.outro(color.dim('APED symlink check complete'));
}

function printDoctorReport(report) {
  p.intro(`${color.green(color.bold('APED Doctor'))} ${color.dim(`v${CLI_VERSION}`)}`);
  for (const check of report.checks) {
    const icon = check.status === 'pass'
      ? color.green('✓')
      : check.status === 'warn'
        ? color.yellow('!')
        : color.red('x');
    const importance = check.required ? '' : color.dim(' (optional)');
    p.log.message(`${icon} ${color.bold(check.label)}${importance} — ${check.message}`);
    if (check.fix) {
      p.log.message(color.dim(`    fix: ${check.fix}`));
    }
  }
  if (report.exitCode === 0) {
    p.outro(color.green('Doctor passed — required APED scaffold pieces look healthy.'));
  } else {
    p.outro(color.red('Doctor found required APED issues.'));
    process.exitCode = report.exitCode;
  }
}

function applyTemplates(templates, options = {}) {
  const overwrite = options.overwrite ?? true;
  const mergeSettingsOptions = options.mergeSettingsOptions || {};
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tpl of templates) {
    const fullPath = join(process.cwd(), tpl.path);
    mkdirSync(dirname(fullPath), { recursive: true });

    if (tpl.type === 'symlink') {
      let existingLink = null;
      try { existingLink = lstatSync(fullPath); } catch { /* absent */ }
      if (existingLink && existingLink.isSymbolicLink() && readlinkSync(fullPath) === tpl.target) {
        skipped++;
      } else if (existingLink && existingLink.isSymbolicLink()) {
        rmSync(fullPath, { force: true, recursive: true });
        symlinkSync(tpl.target, fullPath, 'dir');
        updated++;
      } else if (existingLink) {
        skipped++;
      } else {
        symlinkSync(tpl.target, fullPath, 'dir');
        created++;
      }
      continue;
    }

    if (!existsSync(fullPath)) {
      writeFS(fullPath, tpl.content, 'utf-8');
      if (tpl.executable) chmodSync(fullPath, 0o755);
      created++;
      continue;
    }

    if (tpl.path.endsWith('settings.local.json')) {
      mergeSettings(fullPath, tpl.content, mergeSettingsOptions);
      updated++;
      continue;
    }

    if (!overwrite) {
      skipped++;
      continue;
    }

    writeFS(fullPath, tpl.content, 'utf-8');
    if (tpl.executable) chmodSync(fullPath, 0o755);
    updated++;
  }

  return { created, updated, skipped };
}
