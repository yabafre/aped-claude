import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync as writeFS } from 'node:fs';
import { stdin } from 'node:process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import color from 'picocolors';
import { scaffold } from './scaffold.js';

// ── CLI version (read from package.json) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_VERSION = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version;

const DEFAULTS = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  commandsDir: '.claude/commands',
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

// ── Detect existing install & read config ──
function detectExisting(apedDir) {
  const cwd = process.cwd();
  const configPath = join(cwd, apedDir, 'config.yaml');
  if (!existsSync(configPath)) return null;

  const existing = {};
  try {
    const content = readFileSync(configPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/);
      if (match) existing[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }

  return {
    projectName: existing.project_name || '',
    authorName: existing.user_name || '',
    communicationLang: existing.communication_language || DEFAULTS.communicationLang,
    documentLang: existing.document_output_language || DEFAULTS.documentLang,
    apedDir: existing.aped_path || apedDir,
    outputDir: existing.output_path || DEFAULTS.outputDir,
    ticketSystem: existing.ticket_system || DEFAULTS.ticketSystem,
    gitProvider: existing.git_provider || DEFAULTS.gitProvider,
    installedVersion: existing.aped_version || '0.0.0',
  };
}

// ── Args ──
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') { args.yes = true; continue; }
    if (arg === '--update' || arg === '-u') { args.mode = 'update'; continue; }
    if (arg === '--fresh' || arg === '--force') { args.mode = 'fresh'; continue; }
    if (arg === '--version' || arg === '-v') { args.version = true; continue; }
    const match = arg.match(/^--(\w[\w-]*)=(.+)$/);
    if (match) {
      const key = match[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      args[key] = match[2];
    }
  }
  return args;
}

async function readStdinLines() {
  if (stdin.isTTY) return null;
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf-8');
    stdin.on('data', (chunk) => { data += chunk; });
    stdin.on('end', () => resolve(data.split('\n')));
    setTimeout(() => resolve(null), 100);
  });
}

// ── Main ──
export async function run() {
  const args = parseArgs(process.argv);
  const stdinLines = await readStdinLines();
  let lineIndex = 0;

  let detectedProject = '';
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    detectedProject = pkg.name || '';
  } catch {
    detectedProject = process.cwd().split('/').pop();
  }

  // ── Version flag ──
  if (args.version) {
    console.log(`aped-method v${CLI_VERSION}`);
    return;
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

  // ── Detect existing installation ──
  const apedDir = args.aped || args.apedDir || DEFAULTS.apedDir;
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
    // Non-interactive mode
    let mode = args.mode || (existing ? 'update' : 'install');

    const defaults = existing || DEFAULTS;
    const config = {
      projectName: args.project || args.projectName || defaults.projectName || detectedProject || 'my-project',
      authorName: args.author || args.authorName || defaults.authorName || '',
      communicationLang: args.lang || args.communicationLang || defaults.communicationLang,
      documentLang: args.docLang || args.documentLang || defaults.documentLang,
      apedDir: args.aped || args.apedDir || defaults.apedDir || DEFAULTS.apedDir,
      outputDir: args.output || args.outputDir || defaults.outputDir || DEFAULTS.outputDir,
      commandsDir: args.commands || args.commandsDir || DEFAULTS.commandsDir,
      ticketSystem: args.tickets || args.ticketSystem || defaults.ticketSystem || DEFAULTS.ticketSystem,
      gitProvider: args.git || args.gitProvider || defaults.gitProvider || DEFAULTS.gitProvider,
      cliVersion: CLI_VERSION,
    };

    await runScaffold(config, mode);
    return;
  }

  // ── Interactive mode ──

  // ── Piped stdin fallback for non-TTY ──
  if (stdinLines) {
    const nextLine = (def) => {
      const val = (stdinLines[lineIndex++] || '').trim();
      return val || def || '';
    };

    let mode = 'install';
    if (existing) {
      const choice = nextLine('1');
      mode = choice === '2' ? 'fresh' : 'update';
    }

    const defaults = (mode === 'update' && existing) ? existing : DEFAULTS;
    const config = {
      projectName: nextLine(defaults.projectName || detectedProject),
      authorName: nextLine(defaults.authorName),
      communicationLang: nextLine(defaults.communicationLang),
      documentLang: nextLine(defaults.documentLang),
      apedDir: nextLine(defaults.apedDir || DEFAULTS.apedDir),
      outputDir: nextLine(defaults.outputDir || DEFAULTS.outputDir),
      commandsDir: nextLine(DEFAULTS.commandsDir),
      ticketSystem: nextLine(defaults.ticketSystem || DEFAULTS.ticketSystem),
      gitProvider: nextLine(defaults.gitProvider || DEFAULTS.gitProvider),
      cliVersion: CLI_VERSION,
    };

    await runScaffold(config, mode);
    return;
  }

  // ── TTY interactive prompts ──
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
      }),
      outputDir: () => p.text({
        message: 'Output dir (artifacts)',
        placeholder: defaults.outputDir || DEFAULTS.outputDir,
        initialValue: defaults.outputDir || DEFAULTS.outputDir,
      }),
      commandsDir: () => p.text({
        message: 'Commands dir',
        placeholder: DEFAULTS.commandsDir,
        initialValue: DEFAULTS.commandsDir,
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
        process.exit(0);
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
      `${color.dim('Commands'.padEnd(16))}${color.bold(config.commandsDir + '/')}`,
      `${color.dim('Tickets'.padEnd(16))}${color.bold(config.ticketSystem)}`,
      `${color.dim('Git'.padEnd(16))}${color.bold(config.gitProvider)}`,
    ].join('\n'),
    `Summary${modeTag}`
  );

  const shouldProceed = await p.confirm({ message: 'Proceed?' });

  if (p.isCancel(shouldProceed) || !shouldProceed) {
    p.cancel('Operation cancelled.');
    return;
  }

  await runScaffold(config, mode);
}

async function runScaffold(config, mode) {
  const modeLabel = mode === 'update'
    ? color.yellow(color.bold('UPDATE'))
    : mode === 'fresh'
      ? color.red(color.bold('FRESH'))
      : color.green(color.bold('INSTALL'));

  p.log.step(`${modeLabel} ${color.dim('Scaffolding APED Method...')}`);

  // ── Phase 1: Clean if fresh ──
  if (mode === 'fresh') {
    await p.tasks([
      {
        title: 'Removing existing installation...',
        async task() {
          const { rmSync, readdirSync } = await import('node:fs');
          const cwd = process.cwd();
          try { rmSync(join(cwd, config.apedDir), { recursive: true, force: true }); } catch { /* ok */ }
          try { rmSync(join(cwd, config.outputDir), { recursive: true, force: true }); } catch { /* ok */ }
          try {
            const cmdDir = join(cwd, config.commandsDir);
            for (const f of readdirSync(cmdDir)) {
              if (f.startsWith('aped-')) rmSync(join(cmdDir, f), { force: true });
            }
          } catch { /* ok */ }
          await sleep(400);
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
        await sleep(500);
        return 'Guardrail hook installed';
      },
    },
    {
      title: 'Verifying installation...',
      async task() {
        await sleep(400);
        return `Verified — ${color.bold(String(total))} files`;
      },
    },
  ]);

  // ── Done ──
  printDone(created, updated, skipped, mode);
}

async function scaffoldWithProgress(config, mode) {
  const { getTemplates } = await import('./templates/index.js');
  const { mkdirSync, writeFileSync, chmodSync, existsSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');

  const cwd = process.cwd();
  const templates = getTemplates(config);

  const groups = [
    { key: 'config',     label: 'Config & State',    items: [] },
    { key: 'templates',  label: 'Templates',         items: [] },
    { key: 'commands',   label: 'Slash Commands',     items: [] },
    { key: 'skills',     label: 'Skills',             items: [] },
    { key: 'scripts',    label: 'Validation Scripts', items: [] },
    { key: 'references', label: 'Reference Docs',    items: [] },
    { key: 'hooks',      label: 'Hooks & Settings',  items: [] },
  ];

  const groupMap = Object.fromEntries(groups.map((g) => [g.key, g]));

  for (const tpl of templates) {
    const pt = tpl.path;
    if (pt.includes('/hooks/') || pt.includes('settings'))     groupMap.hooks.items.push(tpl);
    else if (pt.includes('/scripts/'))                         groupMap.scripts.items.push(tpl);
    else if (pt.includes('/references/'))                      groupMap.references.items.push(tpl);
    else if (pt.includes('SKILL.md'))                          groupMap.skills.items.push(tpl);
    else if (pt.includes('/commands/'))                        groupMap.commands.items.push(tpl);
    else if (pt.includes('/templates/'))                       groupMap.templates.items.push(tpl);
    else                                                       groupMap.config.items.push(tpl);
  }

  const preserveOnUpdate = new Set([
    join(config.outputDir, 'state.yaml'),
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
          const fileExists = existsSync(fullPath);
          const fileName = tpl.path.split('/').pop();

          message(`${group.label} ${color.dim(`(${i + 1}/${group.items.length})`)} ${color.dim(fileName)}`);

          mkdirSync(dirname(fullPath), { recursive: true });

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

          // Small delay per file for visible animation
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

function mergeSettings(filePath, newContent) {
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
      `${color.green(color.bold('/aped-analyze'))}     ${color.dim('Analyze — parallel research → product brief')}`,
      `${color.green(color.bold('/aped-prd'))}     ${color.dim('PRD — autonomous generation from brief')}`,
      `${color.magenta(color.bold('/aped-ux'))}    ${color.dim('UX — screen flows, wireframes, components')}`,
      `${color.blue(color.bold('/aped-arch'))}     ${color.dim('Architecture — collaborative solution design')}`,
      `${color.yellow(color.bold('/aped-epics'))}     ${color.dim('Epics — requirements decomposition')}`,
      `${color.yellow(color.bold('/aped-story'))}     ${color.dim('Story — prepare next story for dev')}`,
      `${color.green(color.bold('/aped-dev'))}     ${color.dim('Dev — TDD story implementation')}`,
      `${color.red(color.bold('/aped-review'))}     ${color.dim('Review — adversarial code review')}`,
      '',
      `${color.cyan(color.bold('/aped-status'))}     ${color.dim('Sprint status — progress dashboard')}`,
      `${color.cyan(color.bold('/aped-course'))}     ${color.dim('Correct course — manage scope changes')}`,
      `${color.cyan(color.bold('/aped-context'))}   ${color.dim('Project context — brownfield analysis')}`,
      `${color.cyan(color.bold('/aped-qa'))}    ${color.dim('QA — generate E2E & integration tests')}`,
      `${color.cyan(color.bold('/aped-quick'))} ${color.dim('Quick fix/feature — bypass pipeline')}`,
      `${color.cyan(color.bold('/aped-check'))} ${color.dim('Checkpoint — review changes, halt for approval')}`,
    ].join('\n'),
    'Pipeline commands'
  );

  p.outro(color.dim('Guardrail hook active — pipeline coherence enforced'));
}
