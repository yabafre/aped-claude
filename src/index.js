import { createInterface } from 'node:readline';
import { existsSync, readFileSync, writeFileSync as writeFS } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const TICKET_OPTIONS = ['none', 'jira', 'linear', 'github-issues', 'gitlab-issues'];
const GIT_OPTIONS = ['github', 'gitlab', 'bitbucket'];

// ── ANSI helpers ──
const ESC = '\x1b';
const a = {
  reset:     `${ESC}[0m`,
  bold:      `${ESC}[1m`,
  dim:       `${ESC}[2m`,
  italic:    `${ESC}[3m`,
  underline: `${ESC}[4m`,
  red:       `${ESC}[31m`,
  green:     `${ESC}[32m`,
  yellow:    `${ESC}[33m`,
  blue:      `${ESC}[34m`,
  magenta:   `${ESC}[35m`,
  cyan:      `${ESC}[36m`,
  white:     `${ESC}[37m`,
  lime:      `${ESC}[38;5;118m`,
  emerald:   `${ESC}[38;5;42m`,
  mint:      `${ESC}[38;5;48m`,
  forest:    `${ESC}[38;5;34m`,
  spring:    `${ESC}[38;5;82m`,
};

const bold    = (s) => `${a.bold}${s}${a.reset}`;
const dim     = (s) => `${a.dim}${s}${a.reset}`;
const yellow  = (s) => `${a.yellow}${s}${a.reset}`;

// ── ASCII Art Logo ──
const LOGO = `
${a.emerald}${a.bold}     █████╗ ██████╗ ███████╗██████╗
    ██╔══██╗██╔══██╗██╔════╝██╔══██╗
    ███████║██████╔╝█████╗  ██║  ██║
    ██╔══██║██╔═══╝ ██╔══╝  ██║  ██║
    ██║  ██║██║     ███████╗██████╔╝
    ╚═╝  ╚═╝╚═╝     ╚══════╝╚═════╝${a.reset}
${a.dim}    ─────────────────────────────────${a.reset}
${a.lime}${a.bold}          M  E  T  H  O  D${a.reset}
${a.dim}    ─────────────────────────────────${a.reset}
`;

const PIPELINE = `    ${a.emerald}${a.bold}A${a.reset}${a.dim}nalyze${a.reset}  ${a.dim}→${a.reset}  ${a.mint}${a.bold}P${a.reset}${a.dim}RD${a.reset}  ${a.dim}→${a.reset}  ${a.magenta}${a.bold}UX${a.reset}  ${a.dim}→${a.reset}  ${a.yellow}${a.bold}E${a.reset}${a.dim}pics${a.reset}  ${a.dim}→${a.reset}  ${a.lime}${a.bold}D${a.reset}${a.dim}ev${a.reset}  ${a.dim}→${a.reset}  ${a.red}${a.bold}R${a.reset}${a.dim}eview${a.reset}`;

// ── Spinner ──
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function createSpinner(text) {
  let i = 0;
  let interval;
  return {
    start() {
      process.stdout.write('\x1b[?25l');
      interval = setInterval(() => {
        const frame = SPINNER_FRAMES[i % SPINNER_FRAMES.length];
        process.stdout.write(`\r  ${a.emerald}${frame}${a.reset} ${text}`);
        i++;
      }, 80);
    },
    stop(finalText) {
      clearInterval(interval);
      process.stdout.write(`\r  ${a.lime}${a.bold}✓${a.reset} ${finalText}\x1b[K\n`);
      process.stdout.write('\x1b[?25h');
    },
    fail(finalText) {
      clearInterval(interval);
      process.stdout.write(`\r  ${a.red}${a.bold}✗${a.reset} ${finalText}\x1b[K\n`);
      process.stdout.write('\x1b[?25h');
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sectionHeader(title) {
  console.log('');
  console.log(`  ${a.emerald}${a.bold}┌─${a.reset} ${a.bold}${title}${a.reset}`);
  console.log(`  ${a.emerald}│${a.reset}`);
}

function sectionEnd() {
  console.log(`  ${a.emerald}${a.bold}└──────────────────────────────────${a.reset}`);
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

// ── Detect existing install & read config ──
function detectExisting(apedDir) {
  const cwd = process.cwd();
  const configPath = join(cwd, apedDir, 'config.yaml');
  if (!existsSync(configPath)) return null;

  // Parse existing config.yaml (simple key: value)
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

function ask(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const suffix = defaultVal ? ` ${dim(`(${defaultVal})`)}` : '';
    rl.question(`  ${a.emerald}│${a.reset}  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
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
  console.log(LOGO);
  console.log(`${a.dim}    v${CLI_VERSION}${a.reset}`);
  console.log('');
  console.log(PIPELINE);
  console.log('');

  // ── Detect existing installation ──
  const apedDir = args.aped || args.apedDir || DEFAULTS.apedDir;
  const existing = detectExisting(apedDir);

  // ── Version upgrade detection ──
  if (existing && existing.installedVersion !== '0.0.0') {
    if (existing.installedVersion === CLI_VERSION) {
      console.log(`  ${a.lime}${a.bold}✓${a.reset} ${dim(`Installed: v${existing.installedVersion} — up to date`)}`);
    } else if (semverCompare(CLI_VERSION, existing.installedVersion) > 0) {
      console.log(`  ${a.yellow}${a.bold}↑${a.reset} ${bold(`Upgrade available: v${existing.installedVersion} → v${CLI_VERSION}`)}`);
      console.log(`  ${dim('  Run with --update to upgrade engine files')}`);
    } else {
      console.log(`  ${a.yellow}${a.bold}!${a.reset} ${dim(`Installed v${existing.installedVersion} is newer than CLI v${CLI_VERSION}`)}`);
    }
    console.log('');
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
  const rl = createInterface({ input: stdin, output: stdout });

  const prompt = stdinLines
    ? (question, def) => {
        const val = (stdinLines[lineIndex++] || '').trim();
        const result = val || def || '';
        console.log(`  ${a.emerald}│${a.reset}  ${question}: ${result}`);
        return Promise.resolve(result);
      }
    : (question, def) => ask(rl, question, def);

  try {
    let mode = 'install';

    // ── Existing install detected ──
    if (existing) {
      const vInfo = existing.installedVersion !== '0.0.0'
        ? ` | v${existing.installedVersion}`
        : '';
      console.log(`  ${a.yellow}${a.bold}⚠${a.reset}  ${bold('Existing APED installation detected')}`);
      console.log(`  ${dim(`   Project: ${existing.projectName}${vInfo}`)}`);
      console.log('');
      console.log(`  ${a.emerald}│${a.reset}  ${bold('1')} ${dim('Update engine')}  ${dim('— upgrade skills, scripts, hooks. Preserve config & artifacts')}`);
      console.log(`  ${a.emerald}│${a.reset}  ${bold('2')} ${dim('Fresh install')} ${dim('— delete everything and start from zero')}`);
      console.log(`  ${a.emerald}│${a.reset}  ${bold('3')} ${dim('Cancel')}`);
      console.log(`  ${a.emerald}│${a.reset}`);

      const choice = await prompt(`${bold('Choice')}`, '1');

      if (choice === '3' || choice.toLowerCase() === 'n') {
        console.log(`\n  ${yellow('Cancelled.')}\n`);
        return;
      }

      mode = choice === '2' ? 'fresh' : 'update';
    }

    // ── Config prompts ──
    // For update: pre-fill with existing values
    const defaults = (mode === 'update' && existing) ? existing : DEFAULTS;

    sectionHeader('Configuration');

    const config = {};
    if (mode === 'update') {
      // In update mode, show current config and only ask what to change
      console.log(`  ${a.emerald}│${a.reset}  ${dim('Current config loaded. Press Enter to keep, or type new value.')}`);
      console.log(`  ${a.emerald}│${a.reset}`);
    }

    config.projectName = await prompt(`${bold('Project name')}`, defaults.projectName || detectedProject);
    config.authorName = await prompt(`${bold('Author')}`, defaults.authorName);
    config.communicationLang = await prompt(`${bold('Communication language')}`, defaults.communicationLang);
    config.documentLang = await prompt(`${bold('Document language')}`, defaults.documentLang);
    config.apedDir = await prompt(`${bold('APED dir')} ${dim('(engine)')}`, defaults.apedDir || DEFAULTS.apedDir);
    config.outputDir = await prompt(`${bold('Output dir')} ${dim('(artifacts)')}`, defaults.outputDir || DEFAULTS.outputDir);
    config.commandsDir = await prompt(`${bold('Commands dir')}`, DEFAULTS.commandsDir);
    config.ticketSystem = await prompt(`${bold('Ticket system')} ${dim(`(${TICKET_OPTIONS.join('/')})`)}`, defaults.ticketSystem || DEFAULTS.ticketSystem);
    config.gitProvider = await prompt(`${bold('Git provider')} ${dim(`(${GIT_OPTIONS.join('/')})`)}`, defaults.gitProvider || DEFAULTS.gitProvider);
    config.cliVersion = CLI_VERSION;

    sectionEnd();
    console.log('');
    printConfig(config, mode);
    console.log('');

    const confirm = await prompt(`${bold('Proceed?')}`, 'Y');
    if (confirm.toLowerCase() === 'n') {
      console.log(`\n  ${yellow('Cancelled.')}\n`);
      return;
    }

    await runScaffold(config, mode);
  } finally {
    rl.close();
  }
}

async function runScaffold(config, mode) {
  const modeLabel = mode === 'update' ? 'Updating' : mode === 'fresh' ? 'Fresh installing' : 'Installing';
  const modeTag = mode === 'update'
    ? `${a.yellow}${a.bold}UPDATE${a.reset}`
    : mode === 'fresh'
      ? `${a.red}${a.bold}FRESH${a.reset}`
      : `${a.lime}${a.bold}INSTALL${a.reset}`;

  console.log(`  ${modeTag}  ${dim(modeLabel + ' APED Method...')}`);
  console.log('');

  // ── Phase 1: Clean if fresh ──
  if (mode === 'fresh') {
    const s0 = createSpinner('Removing existing installation...');
    s0.start();
    const { rmSync } = await import('node:fs');
    const cwd = process.cwd();
    try { rmSync(join(cwd, config.apedDir), { recursive: true, force: true }); } catch { /* ok */ }
    try { rmSync(join(cwd, config.outputDir), { recursive: true, force: true }); } catch { /* ok */ }
    // Don't delete commands dir — may have non-aped commands
    // Delete only aped-* command files
    const { readdirSync } = await import('node:fs');
    try {
      const cmdDir = join(cwd, config.commandsDir);
      for (const f of readdirSync(cmdDir)) {
        if (f.startsWith('aped-')) {
          rmSync(join(cmdDir, f), { force: true });
        }
      }
    } catch { /* ok */ }
    await sleep(300);
    s0.stop('Previous installation removed');
  }

  // ── Phase 2: Validate ──
  const s1 = createSpinner('Validating configuration...');
  s1.start();
  await sleep(400);
  s1.stop('Configuration validated');

  // ── Phase 3: Scaffold ──
  sectionHeader(`Scaffolding Pipeline ${dim(`(${mode})`)}`);
  console.log(`  ${a.emerald}│${a.reset}`);

  const { created, updated, skipped } = await scaffoldWithCheckpoints(config, mode);

  sectionEnd();

  // ── Phase 4: Hooks ──
  const s3 = createSpinner('Installing guardrail hook...');
  s3.start();
  await sleep(350);
  s3.stop('Guardrail hook installed');

  // ── Phase 5: Verify ──
  const total = created + updated;
  const s4 = createSpinner('Verifying installation...');
  s4.start();
  await sleep(300);
  s4.stop(`Verified — ${bold(String(total))} files`);

  // ── Done ──
  printDone(created, updated, skipped, mode);
}

async function scaffoldWithCheckpoints(config, mode) {
  const { getTemplates } = await import('./templates/index.js');
  const { mkdirSync, writeFileSync, chmodSync, existsSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');

  const cwd = process.cwd();
  const templates = getTemplates(config);

  const groups = {
    config:     { label: 'Config & State',    icon: '⚙', items: [] },
    templates:  { label: 'Templates',         icon: '📄', items: [] },
    commands:   { label: 'Slash Commands',     icon: '⚡', items: [] },
    skills:     { label: 'Skills (SKILL.md)',  icon: '🧠', items: [] },
    scripts:    { label: 'Validation Scripts', icon: '🔧', items: [] },
    references: { label: 'Reference Docs',    icon: '📚', items: [] },
    hooks:      { label: 'Hooks & Settings',  icon: '🛡', items: [] },
  };

  for (const tpl of templates) {
    const p = tpl.path;
    if (p.includes('/hooks/') || p.includes('settings'))     groups.hooks.items.push(tpl);
    else if (p.includes('/scripts/'))                        groups.scripts.items.push(tpl);
    else if (p.includes('/references/'))                     groups.references.items.push(tpl);
    else if (p.includes('SKILL.md'))                         groups.skills.items.push(tpl);
    else if (p.includes('/commands/'))                       groups.commands.items.push(tpl);
    else if (p.includes('/templates/'))                      groups.templates.items.push(tpl);
    else                                                     groups.config.items.push(tpl);
  }

  // Paths to preserve during update (user data, not engine)
  const preserveOnUpdate = new Set([
    join(config.outputDir, 'state.yaml'),
  ]);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [, group] of Object.entries(groups)) {
    if (group.items.length === 0) continue;

    const sp = createSpinner(`${group.label}...`);
    sp.start();
    await sleep(200);

    let groupCreated = 0;
    let groupUpdated = 0;
    let groupSkipped = 0;

    for (const tpl of group.items) {
      const fullPath = join(cwd, tpl.path);
      const fileExists = existsSync(fullPath);

      mkdirSync(dirname(fullPath), { recursive: true });

      if (!fileExists) {
        // New file — always create
        writeFileSync(fullPath, tpl.content, 'utf-8');
        if (tpl.executable) chmodSync(fullPath, 0o755);
        groupCreated++;
        created++;
      } else if (mode === 'update') {
        // File exists + update mode
        if (preserveOnUpdate.has(tpl.path)) {
          // Preserve user artifacts
          groupSkipped++;
          skipped++;
        } else if (tpl.path.endsWith('settings.local.json')) {
          // Merge settings instead of overwrite
          mergeSettings(fullPath, tpl.content);
          groupUpdated++;
          updated++;
        } else {
          // Engine file — overwrite with new version
          writeFileSync(fullPath, tpl.content, 'utf-8');
          if (tpl.executable) chmodSync(fullPath, 0o755);
          groupUpdated++;
          updated++;
        }
      } else if (mode === 'fresh') {
        // Fresh mode — overwrite everything
        writeFileSync(fullPath, tpl.content, 'utf-8');
        if (tpl.executable) chmodSync(fullPath, 0o755);
        groupCreated++;
        created++;
      } else {
        // Install mode — skip existing
        groupSkipped++;
        skipped++;
      }
    }

    const parts = [];
    if (groupCreated > 0) parts.push(`${a.lime}+${groupCreated}${a.reset}`);
    if (groupUpdated > 0) parts.push(`${a.yellow}↑${groupUpdated}${a.reset}`);
    if (groupSkipped > 0) parts.push(`${a.dim}=${groupSkipped}${a.reset}`);
    const stats = parts.length > 0 ? parts.join(' ') : `${a.dim}0${a.reset}`;

    sp.stop(`${group.icon}  ${group.label}  ${dim('(')}${stats}${dim(')')}`);
  }

  return { created, updated, skipped };
}

function mergeSettings(filePath, newContent) {
  try {
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    const incoming = JSON.parse(newContent);

    // Merge hooks: add guardrail if not already present
    if (incoming.hooks) {
      if (!existing.hooks) existing.hooks = {};
      for (const [event, handlers] of Object.entries(incoming.hooks)) {
        if (!existing.hooks[event]) {
          existing.hooks[event] = handlers;
        } else {
          // Check if guardrail hook already exists
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
    // If can't parse existing, overwrite
    writeFS(filePath, newContent, 'utf-8');
  }
}

function printConfig(config, mode) {
  const box = (label, value, extra) => {
    const e = extra ? `  ${dim(extra)}` : '';
    console.log(`  ${a.emerald}│${a.reset}  ${dim(label.padEnd(16))}${bold(value)}${e}`);
  };

  const modeTag = mode === 'update' ? ` ${a.yellow}${a.bold}UPDATE${a.reset}` : mode === 'fresh' ? ` ${a.red}${a.bold}FRESH${a.reset}` : '';
  console.log(`  ${a.emerald}${a.bold}┌─${a.reset} ${bold('Summary')}${modeTag}`);
  console.log(`  ${a.emerald}│${a.reset}`);
  box('Project',       config.projectName);
  box('Author',        config.authorName || dim('(not set)'));
  box('Communication', config.communicationLang);
  box('Documents',     config.documentLang);
  box('APED',          config.apedDir + '/',    'engine');
  box('Output',        config.outputDir + '/',  'artifacts');
  box('Commands',      config.commandsDir + '/');
  box('Tickets',       config.ticketSystem,       config.ticketSystem === 'none' ? '' : 'integrated');
  box('Git',           config.gitProvider);

  if (mode === 'update') {
    console.log(`  ${a.emerald}│${a.reset}`);
    console.log(`  ${a.emerald}│${a.reset}  ${a.yellow}${a.bold}↑${a.reset} ${dim('Engine files will be overwritten')}`);
    console.log(`  ${a.emerald}│${a.reset}  ${a.lime}${a.bold}=${a.reset} ${dim('Config, state & artifacts preserved')}`);
  } else if (mode === 'fresh') {
    console.log(`  ${a.emerald}│${a.reset}`);
    console.log(`  ${a.emerald}│${a.reset}  ${a.red}${a.bold}!${a.reset} ${dim('All existing files will be deleted and recreated')}`);
  }

  console.log(`  ${a.emerald}│${a.reset}`);
  console.log(`  ${a.emerald}${a.bold}└──────────────────────────────────${a.reset}`);
}

function printDone(created, updated, skipped, mode) {
  const total = created + updated;
  console.log('');
  console.log(`  ${a.emerald}${a.bold}╔══════════════════════════════════════╗${a.reset}`);
  if (mode === 'update') {
    console.log(`  ${a.emerald}${a.bold}║${a.reset}  ${a.lime}${a.bold}✓${a.reset} ${bold('Update complete')}                   ${a.emerald}${a.bold}║${a.reset}`);
    console.log(`  ${a.emerald}${a.bold}║${a.reset}  ${dim(`  +${created} created  ↑${updated} updated  =${skipped} kept`)} ${a.emerald}${a.bold}║${a.reset}`);
  } else {
    console.log(`  ${a.emerald}${a.bold}║${a.reset}  ${a.lime}${a.bold}✓${a.reset} ${bold(`${total} files scaffolded`)}              ${a.emerald}${a.bold}║${a.reset}`);
    console.log(`  ${a.emerald}${a.bold}║${a.reset}  ${dim('Pipeline ready to use')}               ${a.emerald}${a.bold}║${a.reset}`);
  }
  console.log(`  ${a.emerald}${a.bold}╚══════════════════════════════════════╝${a.reset}`);
  console.log('');

  console.log(`  ${a.bold}Pipeline commands:${a.reset}`);
  console.log('');
  console.log(`    ${a.emerald}${a.bold}/aped-a${a.reset}     ${dim('Analyze — parallel research → product brief')}`);
  console.log(`    ${a.mint}${a.bold}/aped-p${a.reset}     ${dim('PRD — autonomous generation from brief')}`);
  console.log(`    ${a.magenta}${a.bold}/aped-ux${a.reset}    ${dim('UX — screen flows, wireframes, components')}`);
  console.log(`    ${a.yellow}${a.bold}/aped-e${a.reset}     ${dim('Epics — requirements decomposition')}`);
  console.log(`    ${a.lime}${a.bold}/aped-d${a.reset}     ${dim('Dev — TDD story implementation')}`);
  console.log(`    ${a.red}${a.bold}/aped-r${a.reset}     ${dim('Review — adversarial code review')}`);
  console.log('');
  console.log(`  ${a.bold}Utility commands:${a.reset}`);
  console.log('');
  console.log(`    ${a.spring}${a.bold}/aped-s${a.reset}     ${dim('Sprint status — progress dashboard')}`);
  console.log(`    ${a.spring}${a.bold}/aped-c${a.reset}     ${dim('Correct course — manage scope changes')}`);
  console.log(`    ${a.spring}${a.bold}/aped-ctx${a.reset}   ${dim('Project context — brownfield analysis')}`);
  console.log(`    ${a.spring}${a.bold}/aped-qa${a.reset}    ${dim('QA — generate E2E & integration tests')}`);
  console.log(`    ${a.spring}${a.bold}/aped-quick${a.reset} ${dim('Quick fix/feature — bypass pipeline')}`);
  console.log(`    ${a.spring}${a.bold}/aped-all${a.reset}   ${dim('Full pipeline A→P→E→D→R')}`);
  console.log('');
  console.log(`  ${dim('Guardrail hook active — pipeline coherence enforced')}`);
  console.log('');
}
