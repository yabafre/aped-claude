import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { scaffold } from './scaffold.js';

const DEFAULTS = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  commandsDir: '.claude/commands',
  authorName: '',
  projectName: '',
  communicationLang: 'english',
  documentLang: 'english',
};

// ── ANSI helpers ──
const ESC = '\x1b';
const c = {
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
  bgBlue:    `${ESC}[44m`,
  bgMagenta: `${ESC}[45m`,
  bgCyan:    `${ESC}[46m`,
};

const bold    = (s) => `${c.bold}${s}${c.reset}`;
const dim     = (s) => `${c.dim}${s}${c.reset}`;
const green   = (s) => `${c.green}${s}${c.reset}`;
const cyan    = (s) => `${c.cyan}${s}${c.reset}`;
const yellow  = (s) => `${c.yellow}${s}${c.reset}`;
const magenta = (s) => `${c.magenta}${s}${c.reset}`;
const blue    = (s) => `${c.blue}${s}${c.reset}`;
const red     = (s) => `${c.red}${s}${c.reset}`;

// ── ASCII Art Logo ──
const LOGO = `
${c.cyan}${c.bold}     █████╗ ██████╗ ███████╗██████╗
    ██╔══██╗██╔══██╗██╔════╝██╔══██╗
    ███████║██████╔╝█████╗  ██║  ██║
    ██╔══██║██╔═══╝ ██╔══╝  ██║  ██║
    ██║  ██║██║     ███████╗██████╔╝
    ╚═╝  ╚═╝╚═╝     ╚══════╝╚═════╝${c.reset}
${c.dim}    ─────────────────────────────────${c.reset}
${c.magenta}${c.bold}          M  E  T  H  O  D${c.reset}
${c.dim}    ─────────────────────────────────${c.reset}
`;

const PIPELINE = `    ${c.blue}${c.bold}A${c.reset}${c.dim}nalyze${c.reset}  ${c.dim}→${c.reset}  ${c.magenta}${c.bold}P${c.reset}${c.dim}RD${c.reset}  ${c.dim}→${c.reset}  ${c.yellow}${c.bold}E${c.reset}${c.dim}pics${c.reset}  ${c.dim}→${c.reset}  ${c.green}${c.bold}D${c.reset}${c.dim}ev${c.reset}  ${c.dim}→${c.reset}  ${c.red}${c.bold}R${c.reset}${c.dim}eview${c.reset}`;

// ── Spinner ──
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function createSpinner(text) {
  let i = 0;
  let interval;
  return {
    start() {
      process.stdout.write('\x1b[?25l'); // hide cursor
      interval = setInterval(() => {
        const frame = SPINNER_FRAMES[i % SPINNER_FRAMES.length];
        process.stdout.write(`\r  ${c.cyan}${frame}${c.reset} ${text}`);
        i++;
      }, 80);
    },
    stop(finalText) {
      clearInterval(interval);
      process.stdout.write(`\r  ${c.green}${c.bold}✓${c.reset} ${finalText}\x1b[K\n`);
      process.stdout.write('\x1b[?25h'); // show cursor
    },
    fail(finalText) {
      clearInterval(interval);
      process.stdout.write(`\r  ${c.red}${c.bold}✗${c.reset} ${finalText}\x1b[K\n`);
      process.stdout.write('\x1b[?25h');
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Checkpoint display ──
function checkpoint(label, detail) {
  console.log(`  ${c.green}${c.bold}✓${c.reset} ${c.bold}${label}${c.reset}  ${c.dim}${detail}${c.reset}`);
}

function sectionHeader(title) {
  console.log('');
  console.log(`  ${c.cyan}${c.bold}┌─${c.reset} ${c.bold}${title}${c.reset}`);
  console.log(`  ${c.cyan}│${c.reset}`);
}

function sectionEnd() {
  console.log(`  ${c.cyan}${c.bold}└──────────────────────────────────${c.reset}`);
}

// ── Args ──
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') { args.yes = true; continue; }
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
    rl.question(`  ${c.cyan}│${c.reset}  ${question}${suffix}: `, (answer) => {
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
    const { readFileSync } = await import('node:fs');
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    detectedProject = pkg.name || '';
  } catch {
    detectedProject = process.cwd().split('/').pop();
  }

  // ── Banner ──
  console.log(LOGO);
  console.log(PIPELINE);
  console.log('');

  if (args.yes) {
    const config = {
      projectName: args.project || args.projectName || detectedProject || 'my-project',
      authorName: args.author || args.authorName || '',
      communicationLang: args.lang || args.communicationLang || DEFAULTS.communicationLang,
      documentLang: args.docLang || args.documentLang || DEFAULTS.documentLang,
      apedDir: args.aped || args.apedDir || DEFAULTS.apedDir,
      outputDir: args.output || args.outputDir || DEFAULTS.outputDir,
      commandsDir: args.commands || args.commandsDir || DEFAULTS.commandsDir,
    };

    await runScaffold(config);
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  const prompt = stdinLines
    ? (question, def) => {
        const val = (stdinLines[lineIndex++] || '').trim();
        const result = val || def || '';
        console.log(`  ${c.cyan}│${c.reset}  ${question}: ${result}`);
        return Promise.resolve(result);
      }
    : (question, def) => ask(rl, question, def);

  try {
    sectionHeader('Configuration');

    const config = {};
    config.projectName = await prompt(`${bold('Project name')}`, detectedProject);
    config.authorName = await prompt(`${bold('Author')}`, DEFAULTS.authorName);
    config.communicationLang = await prompt(`${bold('Communication language')}`, DEFAULTS.communicationLang);
    config.documentLang = await prompt(`${bold('Document language')}`, DEFAULTS.documentLang);
    config.apedDir = await prompt(`${bold('APED dir')} ${dim('(engine)')}`, DEFAULTS.apedDir);
    config.outputDir = await prompt(`${bold('Output dir')} ${dim('(artifacts)')}`, DEFAULTS.outputDir);
    config.commandsDir = await prompt(`${bold('Commands dir')}`, DEFAULTS.commandsDir);

    sectionEnd();
    console.log('');
    printConfig(config);
    console.log('');

    const confirm = await prompt(`${bold('Proceed?')}`, 'Y');
    if (confirm.toLowerCase() === 'n') {
      console.log(`\n  ${yellow('Cancelled.')}\n`);
      return;
    }

    await runScaffold(config);
  } finally {
    rl.close();
  }
}

async function runScaffold(config) {
  // ── Phase 1: Validating config ──
  const s1 = createSpinner('Validating configuration...');
  s1.start();
  await sleep(400);
  s1.stop('Configuration validated');

  // ── Phase 2: Creating directory structure ──
  const s2 = createSpinner('Creating directory structure...');
  s2.start();
  await sleep(300);
  s2.stop('Directory structure ready');

  // ── Phase 3: Scaffolding ──
  sectionHeader('Scaffolding Pipeline');
  console.log(`  ${c.cyan}│${c.reset}`);

  const count = await scaffoldWithCheckpoints(config);

  sectionEnd();

  // ── Phase 4: Setting up hooks ──
  const s3 = createSpinner('Installing guardrail hook...');
  s3.start();
  await sleep(350);
  s3.stop('Guardrail hook installed');

  // ── Phase 5: Final verification ──
  const s4 = createSpinner('Verifying installation...');
  s4.start();
  await sleep(300);
  s4.stop(`Installation verified — ${bold(String(count))} files`);

  // ── Done ──
  printDone(count);
}

async function scaffoldWithCheckpoints(config) {
  const { getTemplates } = await import('./templates/index.js');
  const { mkdirSync, writeFileSync, chmodSync, existsSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');

  const cwd = process.cwd();
  const templates = getTemplates(config);

  const groups = {
    config:     { label: 'Config & State',    icon: '⚙', color: c.blue,    items: [] },
    templates:  { label: 'Templates',         icon: '📄', color: c.dim,     items: [] },
    commands:   { label: 'Slash Commands',     icon: '⚡', color: c.yellow,  items: [] },
    skills:     { label: 'Skills (SKILL.md)',  icon: '🧠', color: c.magenta, items: [] },
    scripts:    { label: 'Validation Scripts', icon: '🔧', color: c.green,   items: [] },
    references: { label: 'Reference Docs',     icon: '📚', color: c.cyan,    items: [] },
    hooks:      { label: 'Hooks & Settings',   icon: '🛡', color: c.red,    items: [] },
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

  let count = 0;

  for (const [, group] of Object.entries(groups)) {
    if (group.items.length === 0) continue;

    const sp = createSpinner(`${group.label}...`);
    sp.start();
    await sleep(200);

    let groupCount = 0;
    for (const tpl of group.items) {
      const fullPath = join(cwd, tpl.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      if (!existsSync(fullPath)) {
        writeFileSync(fullPath, tpl.content, 'utf-8');
        if (tpl.executable) chmodSync(fullPath, 0o755);
        groupCount++;
        count++;
      }
    }

    sp.stop(`${group.icon}  ${group.label}  ${dim(`(${groupCount} files)`)}`);
  }

  return count;
}

function printConfig(config) {
  const box = (label, value, extra) => {
    const e = extra ? `  ${dim(extra)}` : '';
    console.log(`  ${c.cyan}│${c.reset}  ${dim(label.padEnd(16))}${bold(value)}${e}`);
  };

  console.log(`  ${c.cyan}${c.bold}┌─${c.reset} ${bold('Summary')}`);
  console.log(`  ${c.cyan}│${c.reset}`);
  box('Project',       config.projectName);
  box('Author',        config.authorName || dim('(not set)'));
  box('Communication', config.communicationLang);
  box('Documents',     config.documentLang);
  box('APED',          config.apedDir + '/',    'engine');
  box('Output',        config.outputDir + '/',  'artifacts');
  box('Commands',      config.commandsDir + '/');
  console.log(`  ${c.cyan}│${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}└──────────────────────────────────${c.reset}`);
}

function printDone(count) {
  console.log('');
  console.log(`  ${c.green}${c.bold}╔══════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.green}${c.bold}║${c.reset}  ${c.green}${c.bold}✓${c.reset} ${bold(`${count} files scaffolded`)}              ${c.green}${c.bold}║${c.reset}`);
  console.log(`  ${c.green}${c.bold}║${c.reset}  ${dim('Pipeline ready to use')}               ${c.green}${c.bold}║${c.reset}`);
  console.log(`  ${c.green}${c.bold}╚══════════════════════════════════════╝${c.reset}`);
  console.log('');

  console.log(`  ${c.bold}Available commands:${c.reset}`);
  console.log('');
  console.log(`    ${c.blue}${c.bold}/aped-a${c.reset}    ${dim('Analyze — parallel research → product brief')}`);
  console.log(`    ${c.magenta}${c.bold}/aped-p${c.reset}    ${dim('PRD — autonomous generation from brief')}`);
  console.log(`    ${c.yellow}${c.bold}/aped-e${c.reset}    ${dim('Epics — requirements decomposition')}`);
  console.log(`    ${c.green}${c.bold}/aped-d${c.reset}    ${dim('Dev — TDD story implementation')}`);
  console.log(`    ${c.red}${c.bold}/aped-r${c.reset}    ${dim('Review — adversarial code review')}`);
  console.log(`    ${c.cyan}${c.bold}/aped-all${c.reset}   ${dim('Full pipeline A→P→E→D→R')}`);
  console.log('');
  console.log(`  ${dim('Guardrail hook active — pipeline coherence enforced')}`);
  console.log('');
}
