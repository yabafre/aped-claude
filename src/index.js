import * as p from '@clack/prompts';
import { existsSync, mkdirSync, readFileSync, writeFileSync as writeFS, chmodSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import color from 'picocolors';
import { statuslineTemplates, safeBashTemplates, typeScriptQualityTemplates } from './templates/optional-features.js';
import { runSubcommand } from './subcommands.js';

// ── CLI version (read from package.json) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_VERSION = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version;

const DEFAULTS = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  authorName: '',
  projectName: '',
  communicationLang: 'english',
  documentLang: 'english',
  ticketSystem: 'none',
  gitProvider: 'github',
};

const TICKET_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'jira', label: 'Jira' },
  { value: 'linear', label: 'Linear' },
  { value: 'github-issues', label: 'GitHub Issues' },
  { value: 'gitlab-issues', label: 'GitLab Issues' },
];

const GIT_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'bitbucket', label: 'Bitbucket' },
];

const VALID_TICKET_VALUES = new Set(TICKET_OPTIONS.map((o) => o.value));
const VALID_GIT_VALUES = new Set(GIT_OPTIONS.map((o) => o.value));
const SUBCOMMANDS = new Set([
  'doctor',
  'statusline',
  'safe-bash',
  'symlink',
  'post-edit-typescript',
  'verify-claims',
  'session-start',
  'visual-companion',
  'sync-logs',
  'worktree-scope',
  'tdd-red-marker',
  'commit-gate',
  'enable-mcp',
]);

// Subcommands that take a second positional action (e.g. `sync-logs prune`).
// The action is captured into `args.action` by parseArgs.
const SUBCOMMANDS_WITH_ACTION = new Set([
  'sync-logs',
]);

// Keys we accept from a user-edited config.yaml. Anything else is ignored silently
// (logged in debug mode) to avoid loading attacker-controlled values.
// `commands_path` was retired in 4.0.0 alongside the slash-command stubs;
// older configs that still carry it pass through harmlessly because unknown keys
// are dropped here and the doctor surfaces it as a one-line cleanup hint.
const VALID_YAML_KEYS = new Set([
  'project_name',
  'user_name',
  'communication_language',
  'document_output_language',
  'aped_path',
  'output_path',
  'aped_version',
  'ticket_system',
  'git_provider',
]);

// Whitelist of CLI flag keys (camelCased). Unknown flags produce a warning but do not abort.
const VALID_ARG_KEYS = new Set([
  'yes', 'y', 'update', 'u', 'fresh', 'force', 'version', 'v', 'help', 'h', 'debug',
  'uninstall',
  'project', 'projectName',
  'author', 'authorName',
  'lang', 'communicationLang',
  'docLang', 'documentLang',
  'aped', 'apedDir',
  'output', 'outputDir',
  'tickets', 'ticketSystem',
  'git', 'gitProvider',
  // Subcommand-scoped (sync-logs prune): --provider=NAME scopes the prune to one provider.
  'provider',
]);

const HELP_TEXT = `aped-method — Scaffold and operate the APED pipeline in Claude Code

USAGE
  aped-method [options]
  aped-method <subcommand> [options]

SUBCOMMANDS
  doctor                  Verify that an APED scaffold is healthy
  statusline              Install or refresh the APED Claude Code status line
  safe-bash               Install the optional APED Bash safety hook
  symlink                 Repair APED cross-tool skill symlinks
  post-edit-typescript    Install the optional TypeScript post-edit quality hook
  verify-claims           Install the optional verification-claims advisory hook
  session-start           Install the opt-in SessionStart hook (skill-index preload).
                          Pass --uninstall to remove the hook entry from settings.
  visual-companion        Install the opt-in visual companion server used by the
                          aped-brainstorm skill. Pass --uninstall to remove it.
  worktree-scope          Install the opt-in worktree-scope PreToolUse advisory
                          hook (warns when Write/Edit targets escape the worktree
                          root). Pass --uninstall to remove it.
  tdd-red-marker          Install the opt-in TDD RED-witness PostToolUse advisory
                          hook (warns when production-code Write/Edit follows a
                          test-file Write/Edit without a "Confirmed RED:" token
                          in the recent transcript). Pass --uninstall to remove.
  commit-gate             Install the opt-in commit-gate PostToolUse advisory
                          hook (warns after 5+ uncommitted file changes — enforces
                          one commit per GREEN gate). Pass --uninstall to remove.
  enable-mcp              Install the opt-in aped-state MCP companion server
                          (typed atomic ops on state.yaml: get / update /
                          validate.phase). Registers under .claude/settings
                          .local.json mcpServers. Eliminates the state.yaml
                          hallucination class. Requires yq.
  sync-logs prune         One-shot retention sweep over docs/sync-logs/. Reads the
                          \`sync_logs.retention\` block in .aped/config.yaml. Default
                          is dry-run; pass --apply to actually delete. Optional
                          --provider=NAME scopes the sweep to one provider.

OPTIONS
  --yes, -y                Non-interactive mode (use defaults or existing config)
  --update, -u             Update engine files (preserve state + artifacts)
  --fresh, --force         Delete existing installation and reinstall from zero
  --version, -v            Print version
  --help, -h               Print this help
  --debug                  Print stack traces on error

NON-INTERACTIVE FLAGS (with --yes)
  --project=NAME           Project name
  --author=NAME            Author name
  --lang=LANG              Communication language (english, french, ...)
  --doc-lang=LANG          Document output language
  --aped=DIR               APED engine directory (default: .aped)
  --output=DIR             Output artifacts directory (default: docs/aped)
  --tickets=SYSTEM         Ticket system (none|linear|jira|github-issues|gitlab-issues)
  --git=PROVIDER           Git provider (github|gitlab|bitbucket)

ENVIRONMENT
  NO_COLOR                 Disable coloured output
  FORCE_COLOR              Force coloured output even when piped
  DEBUG                    Print stack traces on error

EXAMPLES
  aped-method                            Interactive install
  aped-method --yes --project=my-app     Non-interactive install
  aped-method --update                   Upgrade engine, preserve state
  aped-method --fresh                    Wipe & reinstall (creates backup)

DOCS
  https://github.com/yabafre/aped-claude
`;

// ── UserError: surfaced with exit 1 (bad input). Other errors → exit 2 via bin wrapper. ──
class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
    this.isUserError = true;
  }
}

// ── Path safety ──
function validateSafePath(value, keyName) {
  if (value === undefined || value === null || value === '') return value;
  if (typeof value !== 'string') {
    throw new UserError(`${keyName} must be a string`);
  }
  if (value.includes('\0')) {
    throw new UserError(`${keyName} contains a null byte`);
  }
  if (isAbsolute(value)) {
    throw new UserError(`${keyName} must be a relative path (got: ${value})`);
  }
  const parts = value.split(/[\\/]/);
  if (parts.includes('..')) {
    throw new UserError(`${keyName} may not contain ".." segments (got: ${value})`);
  }
  return value;
}

// ── Semver compare (1=a>b, -1=a<b, 0=equal) ──
function semverCompare(va, vb) {
  const pa = va.split('.').map(Number);
  const pb = vb.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

// ── Detect existing install & read config (whitelisted keys only) ──
function detectExisting(apedDir) {
  const cwd = process.cwd();
  const configPath = join(cwd, apedDir, 'config.yaml');
  if (!existsSync(configPath)) return null;

  const existing = {};
  try {
    const content = readFileSync(configPath, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.split('#')[0];
      const match = line.match(/^([a-z][a-z0-9_]*)\s*:\s*(.+)$/i);
      if (!match) continue;
      const key = match[1];
      if (!VALID_YAML_KEYS.has(key)) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      existing[key] = value;
    }
  } catch {
    return null;
  }

  const apedPath = validateSafePath(existing.aped_path, 'aped_path') || apedDir;
  const outputPath = validateSafePath(existing.output_path, 'output_path') || DEFAULTS.outputDir;

  return {
    projectName: existing.project_name || '',
    authorName: existing.user_name || '',
    communicationLang: existing.communication_language || DEFAULTS.communicationLang,
    documentLang: existing.document_output_language || DEFAULTS.documentLang,
    apedDir: apedPath,
    outputDir: outputPath,
    ticketSystem: VALID_TICKET_VALUES.has(existing.ticket_system) ? existing.ticket_system : DEFAULTS.ticketSystem,
    gitProvider: VALID_GIT_VALUES.has(existing.git_provider) ? existing.git_provider : DEFAULTS.gitProvider,
    installedVersion: existing.aped_version || '0.0.0',
  };
}

// ── Args ──
function parseArgs(argv) {
  const args = { _unknown: [] };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('-') && !args.command && SUBCOMMANDS.has(arg)) {
      args.command = arg;
      continue;
    }
    // Second positional after a multi-action subcommand: capture as args.action.
    // E.g. `aped-method sync-logs prune` → command=sync-logs, action=prune.
    if (
      !arg.startsWith('-')
      && args.command
      && !args.action
      && SUBCOMMANDS_WITH_ACTION.has(args.command)
    ) {
      args.action = arg;
      continue;
    }
    if (arg === '--yes' || arg === '-y') { args.yes = true; continue; }
    if (arg === '--update' || arg === '-u') { args.mode = 'update'; continue; }
    if (arg === '--fresh' || arg === '--force') { args.mode = 'fresh'; continue; }
    if (arg === '--version' || arg === '-v') { args.version = true; continue; }
    if (arg === '--help' || arg === '-h') { args.help = true; continue; }
    if (arg === '--debug') { args.debug = true; continue; }
    if (arg === '--uninstall') { args.uninstall = true; continue; }
    // Boolean flag for `sync-logs prune` — applies the deletion (default is dry-run).
    if (arg === '--apply') { args.apply = true; continue; }
    const match = arg.match(/^--([a-z][a-z0-9-]*)=(.*)$/i);
    if (match) {
      const key = match[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      if (VALID_ARG_KEYS.has(key)) {
        args[key] = match[2];
      } else {
        args._unknown.push(arg);
      }
      continue;
    }
    args._unknown.push(arg);
  }
  return args;
}

// ── Main ──
export async function run() {
  const args = parseArgs(process.argv);

  if (args.debug) process.env.DEBUG = '1';

  if (args.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (args.version) {
    console.log(`aped-method v${CLI_VERSION}`);
    return;
  }

  if (args.command) {
    await runSubcommand(args.command, args);
    return;
  }

  if (args._unknown.length > 0) {
    // Non-fatal: warn and continue. Fatal flags (e.g. --help) are handled above.
    for (const flag of args._unknown) {
      console.warn(`${color.yellow('warn')} unknown flag: ${flag}`);
    }
    console.warn(color.dim('Run `aped-method --help` for the full list.'));
  }

  let detectedProject = '';
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    detectedProject = pkg.name || '';
  } catch {
    detectedProject = process.cwd().split('/').pop() || '';
  }

  // ── Banner ──
  const cols = process.stdout.columns || 80;

  if (cols >= 50) {
    const LOGO = [
      '',
      `  ${color.green(color.bold('     █████╗ ██████╗ ███████╗██████╗'))}`,
      `  ${color.green(color.bold('    ██╔══██╗██╔══██╗██╔════╝██╔══██╗'))}`,
      `  ${color.green(color.bold('    ███████║██████╔╝█████╗  ██║  ██║'))}`,
      `  ${color.green(color.bold('    ██╔══██║██╔═══╝ ██╔══╝  ██║  ██║'))}`,
      `  ${color.green(color.bold('    ██║  ██║██║     ███████╗██████╔╝'))}`,
      `  ${color.green(color.bold('    ╚═╝  ╚═╝╚═╝     ╚══════╝╚═════╝'))}`,
      `  ${color.dim('    ─────────────────────────────────')}`,
      `  ${color.green(color.bold('          M  E  T  H  O  D'))}`,
      `  ${color.dim('    ─────────────────────────────────')}`,
      '',
    ].join('\n');
    console.log(LOGO);
  }

  const PIPELINE = cols >= 80
    ? `  ${color.green(color.bold('A'))}${color.dim('nalyze')}  ${color.dim('→')}  ${color.green(color.bold('P'))}${color.dim('RD')}  ${color.dim('→')}  ${color.magenta(color.bold('UX'))}  ${color.dim('→')}  ${color.blue(color.bold('A'))}${color.dim('rch')}  ${color.dim('→')}  ${color.yellow(color.bold('E'))}${color.dim('pics')}  ${color.dim('→')}  ${color.green(color.bold('D'))}${color.dim('ev')}  ${color.dim('→')}  ${color.red(color.bold('R'))}${color.dim('eview')}`
    : `  ${color.green('A')}${color.dim('→')}${color.green('P')}${color.dim('→')}${color.magenta('UX')}${color.dim('→')}${color.blue('Arch')}${color.dim('→')}${color.yellow('E')}${color.dim('→')}${color.green('D')}${color.dim('→')}${color.red('R')}`;

  p.intro(`${color.green(color.bold('APED Method'))} ${color.dim(`v${CLI_VERSION}`)}`);
  p.log.message(PIPELINE);

  // ── Detect existing installation (with path-safety validation on config) ──
  const apedDir = validateSafePath(args.aped || args.apedDir, '--aped') || DEFAULTS.apedDir;
  const existing = detectExisting(apedDir);

  // ── Version upgrade detection ──
  if (existing && existing.installedVersion !== '0.0.0') {
    if (existing.installedVersion === CLI_VERSION) {
      p.log.success(color.dim(`Installed: v${existing.installedVersion} — up to date`));
    } else if (semverCompare(CLI_VERSION, existing.installedVersion) > 0) {
      p.log.warn(`Upgrade available: ${color.dim(`v${existing.installedVersion}`)} → ${color.green(`v${CLI_VERSION}`)}`);
      p.log.message(color.dim('Run with --update to upgrade engine files'));
    } else {
      p.log.warn(color.dim(`Installed v${existing.installedVersion} is newer than CLI v${CLI_VERSION}`));
    }
  }

  if (args.yes) {
    // ── Non-interactive mode ──
    let mode = args.mode || (existing ? 'update' : 'install');

    const defaults = existing || DEFAULTS;
    const config = {
      projectName: args.project || args.projectName || defaults.projectName || detectedProject || 'my-project',
      authorName: args.author || args.authorName || defaults.authorName || '',
      communicationLang: args.lang || args.communicationLang || defaults.communicationLang,
      documentLang: args.docLang || args.documentLang || defaults.documentLang,
      apedDir: validateSafePath(args.aped || args.apedDir, '--aped') || defaults.apedDir || DEFAULTS.apedDir,
      outputDir: validateSafePath(args.output || args.outputDir, '--output') || defaults.outputDir || DEFAULTS.outputDir,
      ticketSystem: args.tickets || args.ticketSystem || defaults.ticketSystem || DEFAULTS.ticketSystem,
      gitProvider: args.git || args.gitProvider || defaults.gitProvider || DEFAULTS.gitProvider,
      cliVersion: CLI_VERSION,
    };

    if (!VALID_TICKET_VALUES.has(config.ticketSystem)) {
      throw new UserError(`invalid --tickets value: ${config.ticketSystem} (allowed: ${[...VALID_TICKET_VALUES].join(', ')})`);
    }
    if (!VALID_GIT_VALUES.has(config.gitProvider)) {
      throw new UserError(`invalid --git value: ${config.gitProvider} (allowed: ${[...VALID_GIT_VALUES].join(', ')})`);
    }

    await runScaffold(config, mode);
    return;
  }

  // ── Interactive mode ──
  let mode = 'install';

  if (existing) {
    const vInfo = existing.installedVersion !== '0.0.0' ? ` | v${existing.installedVersion}` : '';
    p.log.warn(`Existing APED installation detected ${color.dim(`(${existing.projectName}${vInfo})`)}`);

    const choice = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'update', label: 'Update engine', hint: 'upgrade skills, scripts, hooks — preserve config & artifacts' },
        { value: 'fresh', label: 'Fresh install', hint: 'delete everything and start from zero' },
        { value: 'cancel', label: 'Cancel' },
      ],
    });

    if (p.isCancel(choice) || choice === 'cancel') {
      p.cancel('Operation cancelled.');
      return;
    }

    mode = choice;
  }

  const defaults = (mode === 'update' && existing) ? existing : DEFAULTS;

  if (mode === 'update') {
    p.log.info(color.dim('Current config loaded. Press Enter to keep, or type a new value.'));
  }

  const config = await p.group(
    {
      projectName: () => p.text({
        message: 'Project name',
        placeholder: defaults.projectName || detectedProject,
        initialValue: defaults.projectName || detectedProject,
      }),
      authorName: () => p.text({
        message: 'Author',
        placeholder: defaults.authorName || 'your name',
        initialValue: defaults.authorName,
      }),
      communicationLang: () => p.text({
        message: 'Communication language',
        placeholder: defaults.communicationLang,
        initialValue: defaults.communicationLang,
      }),
      documentLang: () => p.text({
        message: 'Document language',
        placeholder: defaults.documentLang,
        initialValue: defaults.documentLang,
      }),
      apedDir: () => p.text({
        message: 'APED dir (engine)',
        placeholder: defaults.apedDir || DEFAULTS.apedDir,
        initialValue: defaults.apedDir || DEFAULTS.apedDir,
        validate: (v) => pathPromptValidator(v, 'APED dir'),
      }),
      outputDir: () => p.text({
        message: 'Output dir (artifacts)',
        placeholder: defaults.outputDir || DEFAULTS.outputDir,
        initialValue: defaults.outputDir || DEFAULTS.outputDir,
        validate: (v) => pathPromptValidator(v, 'Output dir'),
      }),
      ticketSystem: () => p.select({
        message: 'Ticket system',
        options: TICKET_OPTIONS,
        initialValue: defaults.ticketSystem || DEFAULTS.ticketSystem,
      }),
      gitProvider: () => p.select({
        message: 'Git provider',
        options: GIT_OPTIONS,
        initialValue: defaults.gitProvider || DEFAULTS.gitProvider,
      }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(130);
      },
    }
  );

  config.cliVersion = CLI_VERSION;

  // ── Summary ──
  const modeTag = mode === 'update'
    ? color.yellow(color.bold(' UPDATE'))
    : mode === 'fresh'
      ? color.red(color.bold(' FRESH'))
      : '';

  p.note(
    [
      `${color.dim('Project'.padEnd(16))}${color.bold(config.projectName)}`,
      `${color.dim('Author'.padEnd(16))}${color.bold(config.authorName || color.dim('(not set)'))}`,
      `${color.dim('Communication'.padEnd(16))}${color.bold(config.communicationLang)}`,
      `${color.dim('Documents'.padEnd(16))}${color.bold(config.documentLang)}`,
      `${color.dim('APED'.padEnd(16))}${color.bold(config.apedDir + '/')}  ${color.dim('engine')}`,
      `${color.dim('Output'.padEnd(16))}${color.bold(config.outputDir + '/')}  ${color.dim('artifacts')}`,
      `${color.dim('Tickets'.padEnd(16))}${color.bold(config.ticketSystem)}`,
      `${color.dim('Git'.padEnd(16))}${color.bold(config.gitProvider)}`,
    ].join('\n'),
    `Summary${modeTag}`
  );

  // Fresh mode is destructive — ask a second explicit confirmation listing what will be removed.
  if (mode === 'fresh') {
    p.log.warn(color.red(color.bold('Fresh install will delete:')));
    p.log.message([
      `  • ${config.apedDir}/ ${color.dim('(engine)')}`,
      `  • ${config.outputDir}/ ${color.dim('(artifacts — brief, PRD, epics, stories, state.yaml)')}`,
      `  • .claude/skills/aped-*, .opencode/skills/aped-*, .agents/skills/aped-*, .codex/skills/aped-* ${color.dim('(skill symlinks)')}`,
    ].join('\n'));
    p.log.info(color.dim('A compressed backup will be written to .aped-backups/ before deletion.'));
    const confirmFresh = await p.confirm({ message: 'Confirm fresh install (destructive)?', initialValue: false });
    if (p.isCancel(confirmFresh) || !confirmFresh) {
      p.cancel('Fresh install cancelled.');
      return;
    }
  }

  const shouldProceed = await p.confirm({ message: 'Proceed?' });

  if (p.isCancel(shouldProceed) || !shouldProceed) {
    p.cancel('Operation cancelled.');
    return;
  }

  await runScaffold(config, mode);
}

function pathPromptValidator(value, label) {
  if (value === undefined || value === '') return undefined;
  try {
    validateSafePath(value, label);
    return undefined;
  } catch (err) {
    return err.message;
  }
}

async function runScaffold(config, mode) {
  const modeLabel = mode === 'update'
    ? color.yellow(color.bold('UPDATE'))
    : mode === 'fresh'
      ? color.red(color.bold('FRESH'))
      : color.green(color.bold('INSTALL'));

  p.log.step(`${modeLabel} ${color.dim('Scaffolding APED Method...')}`);

  // ── Phase 1: Clean if fresh (with backup) ──
  if (mode === 'fresh') {
    await p.tasks([
      {
        title: 'Backing up existing installation...',
        async task() {
          const backupPath = await backupExisting(config);
          await sleep(200);
          return backupPath
            ? `Backup written to ${color.dim(backupPath)}`
            : 'No existing installation to back up';
        },
      },
      {
        title: 'Removing existing installation...',
        async task() {
          const { rmSync, readdirSync } = await import('node:fs');
          // TARGET_CATALOG is the full historical set of symlink locations
          // APED has ever written to — broader than the current active
          // defaults — so --fresh cleans up legacy symlinks (e.g.,
          // pre-3.7.5 .claude/skills/ links) that no longer belong.
          const { TARGET_CATALOG } = await import('./templates/symlinks.js');
          const cwd = process.cwd();
          try { rmSync(join(cwd, config.apedDir), { recursive: true, force: true }); } catch { /* ok */ }
          try { rmSync(join(cwd, config.outputDir), { recursive: true, force: true }); } catch { /* ok */ }
          // Sweep the legacy .claude/commands/aped-*.md stubs left over from
          // pre-4.0 installs so a `--fresh` actually wipes the slate.
          try {
            const legacyCmdDir = join(cwd, '.claude', 'commands');
            for (const f of readdirSync(legacyCmdDir)) {
              if (f.startsWith('aped-') && f.endsWith('.md')) rmSync(join(legacyCmdDir, f), { force: true });
            }
          } catch { /* ok */ }
          for (const targetBase of TARGET_CATALOG) {
            try {
              const dir = join(cwd, targetBase);
              for (const f of readdirSync(dir)) {
                if (f.startsWith('aped-')) rmSync(join(dir, f), { force: true, recursive: true });
              }
            } catch { /* dir may not exist */ }
          }
          await sleep(300);
          return 'Previous installation removed';
        },
      },
    ]);
  }

  // ── Phase 2: Scaffold ──
  const { created, updated, skipped } = await scaffoldWithProgress(config, mode);

  // ── Phase 3: Post-install tasks ──
  const total = created + updated;
  await p.tasks([
    {
      title: 'Installing guardrail hook...',
      async task() {
        await sleep(400);
        return 'Guardrail hook installed';
      },
    },
    // 4.1.0 — run state.yaml schema migration on --update. The newly-installed
    // migrate-state.sh handles v1 → v2 (corrections split) and is idempotent
    // on v2, so re-running this on an already-migrated scaffold is a no-op.
    // Skipped on --fresh (no existing state to migrate).
    ...(mode === 'update'
      ? [
          {
            title: 'Migrating state.yaml schema...',
            async task() {
              const { spawnSync } = await import('node:child_process');
              const cwd = process.cwd();
              const script = join(cwd, config.apedDir, 'scripts/migrate-state.sh');
              if (!existsSync(script)) return 'Skipped (no migrate-state.sh)';
              const r = spawnSync('bash', [script], {
                cwd,
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'pipe'],
              });
              if (r.status === 0) {
                // Migration is non-destructive — the last stderr line is the
                // human-readable summary ("Migration complete..." or "no
                // migration needed"). Show it to the user. stdout is unused
                // by migrate-state.sh.
                const summary = (r.stderr || r.stdout || '').trim().split('\n').pop() || 'Schema is up to date';
                return summary;
              }
              // Failure path: show full stderr (multi-line errors reveal the
              // root cause — missing yq, malformed schema_version, etc.). A
              // single-line summary truncates the error and forces the user
              // to dig into the logs. Better to surface everything here.
              const fullErr = (r.stderr || '').trim() || (r.stdout || '').trim() || '(no output)';
              const indented = fullErr.split('\n').map((line) => `  ${line}`).join('\n');
              const backupRel = join(config.outputDir, 'state.yaml.pre-v2-migration.bak');
              p.log.error(
                `migrate-state.sh exited ${r.status}. The state.yaml backup at ${backupRel} (if present) is your rollback. Full output:\n${indented}`
              );
              return color.yellow(
                `Migration failed (exit ${r.status}) — see error above. State.yaml not bumped; existing scaffold remains usable on the previous schema.`
              );
            },
          },
        ]
      : []),
    {
      title: 'Verifying installation...',
      async task() {
        await sleep(300);
        return `Verified — ${color.bold(String(total))} files`;
      },
    },
  ]);

  // ── Done ──
  printDone(created, updated, skipped, mode);
}

// Write a timestamped tar.gz backup of the existing install. Silently skips if
// `tar` is unavailable or nothing to back up — never blocks the fresh install.
async function backupExisting(config) {
  const { existsSync, mkdirSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');
  const cwd = process.cwd();
  const targets = [config.apedDir, config.outputDir].filter((d) => existsSync(join(cwd, d)));
  if (targets.length === 0) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(cwd, '.aped-backups');
  mkdirSync(backupDir, { recursive: true });
  const archive = join(backupDir, `aped-${stamp}.tar.gz`);

  const result = spawnSync('tar', ['-czf', archive, ...targets], { cwd, stdio: 'ignore' });
  if (result.status !== 0) return null;
  return archive.replace(cwd + '/', '');
}

async function scaffoldWithProgress(config, mode) {
  const { getTemplates } = await import('./templates/index.js');
  const { mkdirSync, writeFileSync, chmodSync, existsSync, symlinkSync, lstatSync, readlinkSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');

  const cwd = process.cwd();

  // Ensure `.claude/` exists so the symlink auto-detect picks Claude Code
  // up on a fresh project — APED is Claude-Code-first and 4.0.0 routes all
  // skill discovery through `.claude/skills/aped-*/SKILL.md`.
  mkdirSync(join(cwd, '.claude'), { recursive: true });

  const templates = [
    ...getTemplates(config),
    ...getInstalledOptionalTemplates(config, cwd),
  ];

  const groups = [
    { key: 'config',     label: 'Config & State',    items: [] },
    { key: 'templates',  label: 'Templates',         items: [] },
    { key: 'skills',     label: 'Skills',             items: [] },
    { key: 'symlinks',   label: 'Skill Symlinks',     items: [] },
    { key: 'scripts',    label: 'Validation Scripts', items: [] },
    { key: 'references', label: 'Reference Docs',    items: [] },
    { key: 'hooks',      label: 'Hooks & Settings',  items: [] },
  ];

  const groupMap = Object.fromEntries(groups.map((g) => [g.key, g]));

  for (const tpl of templates) {
    if (tpl.type === 'symlink')                                { groupMap.symlinks.items.push(tpl); continue; }
    const pt = tpl.path;
    if (pt.includes('/hooks/') || pt.includes('settings'))     groupMap.hooks.items.push(tpl);
    else if (pt.includes('/scripts/'))                         groupMap.scripts.items.push(tpl);
    else if (pt.includes('/references/'))                      groupMap.references.items.push(tpl);
    else if (pt.includes('SKILL.md'))                          groupMap.skills.items.push(tpl);
    else if (pt.includes('/templates/'))                       groupMap.templates.items.push(tpl);
    else                                                       groupMap.config.items.push(tpl);
  }

  // Artifacts that must survive an `--update`.
  const preserveOnUpdate = new Set([
    join(config.outputDir, 'state.yaml'),
    // 4.1.0 — corrections live outside state.yaml (schema v2). Preserve the
    // user's accumulated corrections through engine updates, same as state.yaml.
    // The path here matches the default `state.corrections_path` in config.yaml;
    // a user who customizes that key will see the default path emitted on
    // first install and their custom path used at runtime — both coexist
    // safely (the default is the seed, the custom path is where writes go).
    join(config.outputDir, 'state-corrections.yaml'),
  ]);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const activeGroups = groups.filter((g) => g.items.length > 0);

  await p.tasks(
    activeGroups.map((group) => ({
      title: `${group.label}...`,
      async task(message) {
        let groupCreated = 0;
        let groupUpdated = 0;
        let groupSkipped = 0;

        for (let i = 0; i < group.items.length; i++) {
          const tpl = group.items[i];
          const fullPath = join(cwd, tpl.path);
          const fileName = tpl.path.split('/').pop();

          message(`${group.label} ${color.dim(`(${i + 1}/${group.items.length})`)} ${color.dim(fileName)}`);

          mkdirSync(dirname(fullPath), { recursive: true });

          if (tpl.type === 'symlink') {
            let existingLink = null;
            try { existingLink = lstatSync(fullPath); } catch { /* absent */ }
            if (existingLink && existingLink.isSymbolicLink() && readlinkSync(fullPath) === tpl.target) {
              groupSkipped++;
              skipped++;
            } else if (existingLink && existingLink.isSymbolicLink()) {
              rmSync(fullPath, { force: true });
              symlinkSync(tpl.target, fullPath, 'dir');
              groupUpdated++;
              updated++;
            } else if (existingLink) {
              groupSkipped++;
              skipped++;
            } else {
              symlinkSync(tpl.target, fullPath, 'dir');
              groupCreated++;
              created++;
            }
            await sleep(10);
            continue;
          }

          const fileExists = existsSync(fullPath);
          if (!fileExists) {
            writeFileSync(fullPath, tpl.content, 'utf-8');
            if (tpl.executable) chmodSync(fullPath, 0o755);
            groupCreated++;
            created++;
          } else if (mode === 'update') {
            if (preserveOnUpdate.has(tpl.path)) {
              groupSkipped++;
              skipped++;
            } else if (tpl.path.endsWith('settings.local.json')) {
              mergeSettings(fullPath, tpl.content);
              groupUpdated++;
              updated++;
            } else {
              writeFileSync(fullPath, tpl.content, 'utf-8');
              if (tpl.executable) chmodSync(fullPath, 0o755);
              groupUpdated++;
              updated++;
            }
          } else if (mode === 'fresh') {
            writeFileSync(fullPath, tpl.content, 'utf-8');
            if (tpl.executable) chmodSync(fullPath, 0o755);
            groupCreated++;
            created++;
          } else {
            groupSkipped++;
            skipped++;
          }

          await sleep(30 + Math.random() * 50);
        }

        const parts = [];
        if (groupCreated > 0) parts.push(color.green(`+${groupCreated}`));
        if (groupUpdated > 0) parts.push(color.yellow(`↑${groupUpdated}`));
        if (groupSkipped > 0) parts.push(color.dim(`=${groupSkipped}`));
        const stats = parts.join(' ') || color.dim('0');

        return `${group.label}  ${color.dim('(')}${stats}${color.dim(')')}`;
      },
    }))
  );

  return { created, updated, skipped };
}

function getInstalledOptionalTemplates(config, cwd = process.cwd()) {
  const templates = [];
  const settingsPath = join(cwd, '.claude/settings.local.json');
  const settingsContent = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf-8') : '';

  if (existsSync(join(cwd, config.apedDir, 'scripts', 'statusline.js')) || settingsContent.includes('/scripts/statusline.js')) {
    templates.push(...statuslineTemplates(config));
  }
  if (existsSync(join(cwd, config.apedDir, 'hooks', 'safe-bash.js')) || settingsContent.includes('/hooks/safe-bash.js')) {
    templates.push(...safeBashTemplates(config));
  }
  if (existsSync(join(cwd, config.apedDir, 'hooks', 'post-edit-typescript.js')) || settingsContent.includes('/hooks/post-edit-typescript.js')) {
    templates.push(...typeScriptQualityTemplates(config));
  }

  return templates;
}

function mergeSettings(filePath, newContent, options = {}) {
  try {
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    const incoming = JSON.parse(newContent);

    if (incoming.hooks) {
      if (!existing.hooks) existing.hooks = {};
      for (const [event, handlers] of Object.entries(incoming.hooks)) {
        if (!existing.hooks[event]) {
          existing.hooks[event] = handlers;
        } else {
          for (const handler of handlers) {
            const hookCmds = handler.hooks || [];
            for (const hook of hookCmds) {
              const alreadyExists = existing.hooks[event].some((h) =>
                (h.hooks || []).some((hk) => hk.command === hook.command)
              );
              if (!alreadyExists) {
                existing.hooks[event].push(handler);
              }
            }
          }
        }
      }
    }

    if (incoming.permissions?.allow) {
      const allow = new Set([
        ...((existing.permissions && existing.permissions.allow) || []),
        ...incoming.permissions.allow,
      ]);
      existing.permissions = {
        ...(existing.permissions || {}),
        allow: [...allow],
      };
    }

    if (incoming.mcpServers) {
      if (!existing.mcpServers) existing.mcpServers = {};
      Object.assign(existing.mcpServers, incoming.mcpServers);
    }

    if (incoming.statusLine) {
      const shouldOverwrite = options.overwriteStatusLine
        || !existing.statusLine
        || existing.statusLine.command === incoming.statusLine.command
        || String(existing.statusLine.command || '').includes('/.aped/scripts/statusline.');
      if (shouldOverwrite) {
        existing.statusLine = incoming.statusLine;
      }
    }

    writeFS(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  } catch {
    writeFS(filePath, newContent, 'utf-8');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printDone(created, updated, skipped, mode) {
  const total = created + updated;

  if (mode === 'update') {
    p.log.success(`Update complete  ${color.green(`+${created}`)} created  ${color.yellow(`↑${updated}`)} updated  ${color.dim(`=${skipped}`)} kept`);
  } else {
    p.log.success(`${color.bold(String(total))} files scaffolded — pipeline ready`);
  }

  p.note(
    [
      `${color.green(color.bold('aped-analyze'))}      ${color.dim('Analyze — parallel research → product brief')}`,
      `${color.green(color.bold('aped-prd'))}          ${color.dim('PRD — autonomous generation from brief')}`,
      `${color.magenta(color.bold('aped-ux'))}           ${color.dim('UX — screen flows, wireframes, components')}`,
      `${color.blue(color.bold('aped-arch'))}         ${color.dim('Architecture — collaborative solution design')}`,
      `${color.yellow(color.bold('aped-epics'))}        ${color.dim('Epics — requirements decomposition')}`,
      `${color.yellow(color.bold('aped-story'))}        ${color.dim('Story — prepare next story for dev')}`,
      `${color.green(color.bold('aped-dev'))}          ${color.dim('Dev — TDD story implementation')}`,
      `${color.red(color.bold('aped-review'))}        ${color.dim('Review — adversarial code review')}`,
      '',
      `${color.cyan(color.bold('aped-status'))}        ${color.dim('Sprint status — progress dashboard')}`,
      `${color.cyan(color.bold('aped-course'))}        ${color.dim('Correct course — manage scope changes')}`,
      `${color.cyan(color.bold('aped-context'))}       ${color.dim('Project context — brownfield analysis')}`,
      `${color.cyan(color.bold('aped-qa'))}           ${color.dim('QA — generate E2E & integration tests')}`,
      `${color.cyan(color.bold('aped-quick'))}        ${color.dim('Quick fix/feature — bypass pipeline')}`,
      `${color.cyan(color.bold('aped-checkpoint'))}   ${color.dim('Checkpoint — review changes, halt for approval')}`,
      `${color.cyan(color.bold('aped-claude'))}       ${color.dim('Sync APED rules into CLAUDE.md')}`,
    ].join('\n'),
    'Pipeline skills (invoke via the Skill tool or natural-language triggers)'
  );

  p.outro(color.dim('Guardrail hook active — pipeline coherence enforced'));
  process.stdout.write('\n\n');
}

// Exported for unit tests AND for the subcommands module (circular import:
// subcommands.js reads DEFAULTS / CLI_VERSION / validateSafePath / UserError /
// mergeSettings / detectExisting via this barrel). Not part of the stable
// public API — may be renamed or moved between modules without a major bump.
export {
  UserError,
  DEFAULTS,
  CLI_VERSION,
  validateSafePath,
  semverCompare,
  detectExisting,
  parseArgs,
  mergeSettings,
};
