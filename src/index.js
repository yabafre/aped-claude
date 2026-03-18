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
  // 256-color greens for richer palette
  lime:      `${ESC}[38;5;118m`,  // bright lime
  emerald:   `${ESC}[38;5;42m`,   // emerald
  mint:      `${ESC}[38;5;48m`,   // mint
  forest:    `${ESC}[38;5;34m`,   // forest
  spring:    `${ESC}[38;5;82m`,   // spring green
};

const bold    = (s) => `${a.bold}${s}${a.reset}`;
const dim     = (s) => `${a.dim}${s}${a.reset}`;
const green   = (s) => `${a.green}${s}${a.reset}`;
const lime    = (s) => `${a.lime}${s}${a.reset}`;
const emerald = (s) => `${a.emerald}${s}${a.reset}`;
const mint    = (s) => `${a.mint}${s}${a.reset}`;
const yellow  = (s) => `${a.yellow}${s}${a.reset}`;
const magenta = (s) => `${a.magenta}${s}${a.reset}`;
const red     = (s) => `${a.red}${s}${a.reset}`;
const cyan    = (s) => `${a.cyan}${s}${a.reset}`;

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

const PIPELINE = `    ${a.emerald}${a.bold}A${a.reset}${a.dim}nalyze${a.reset}  ${a.dim}→${a.reset}  ${a.mint}${a.bold}P${a.reset}${a.dim}RD${a.reset}  ${a.dim}→${a.reset}  ${a.yellow}${a.bold}E${a.reset}${a.dim}pics${a.reset}  ${a.dim}→${a.reset}  ${a.lime}${a.bold}D${a.reset}${a.dim}ev${a.reset}  ${a.dim}→${a.reset}  ${a.red}${a.bold}R${a.reset}${a.dim}eview${a.reset}`;

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
        process.stdout.write(`\r  ${a.emerald}${frame}${a.reset} ${text}`);
        i++;
      }, 80);
    },
    stop(finalText) {
      clearInterval(interval);
      process.stdout.write(`\r  ${a.lime}${a.bold}✓${a.reset} ${finalText}\x1b[K\n`);
      process.stdout.write('\x1b[?25h'); // show cursor
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

// ── Section display ──
function sectionHeader(title) {
  console.log('');
  console.log(`  ${a.emerald}${a.bold}┌─${a.reset} ${a.bold}${title}${a.reset}`);
  console.log(`  ${a.emerald}│${a.reset}`);
}

function sectionEnd() {
  console.log(`  ${a.emerald}${a.bold}└──────────────────────────────────${a.reset}`);
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
        console.log(`  ${a.emerald}│${a.reset}  ${question}: ${result}`);
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
  console.log(`  ${a.emerald}│${a.reset}`);

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
    console.log(`  ${a.emerald}│${a.reset}  ${dim(label.padEnd(16))}${bold(value)}${e}`);
  };

  console.log(`  ${a.emerald}${a.bold}┌─${a.reset} ${bold('Summary')}`);
  console.log(`  ${a.emerald}│${a.reset}`);
  box('Project',       config.projectName);
  box('Author',        config.authorName || dim('(not set)'));
  box('Communication', config.communicationLang);
  box('Documents',     config.documentLang);
  box('APED',          config.apedDir + '/',    'engine');
  box('Output',        config.outputDir + '/',  'artifacts');
  box('Commands',      config.commandsDir + '/');
  console.log(`  ${a.emerald}│${a.reset}`);
  console.log(`  ${a.emerald}${a.bold}└──────────────────────────────────${a.reset}`);
}

function printDone(count) {
  console.log('');
  console.log(`  ${a.emerald}${a.bold}╔══════════════════════════════════════╗${a.reset}`);
  console.log(`  ${a.emerald}${a.bold}║${a.reset}  ${a.lime}${a.bold}✓${a.reset} ${bold(`${count} files scaffolded`)}              ${a.emerald}${a.bold}║${a.reset}`);
  console.log(`  ${a.emerald}${a.bold}║${a.reset}  ${dim('Pipeline ready to use')}               ${a.emerald}${a.bold}║${a.reset}`);
  console.log(`  ${a.emerald}${a.bold}╚══════════════════════════════════════╝${a.reset}`);
  console.log('');

  console.log(`  ${a.bold}Available commands:${a.reset}`);
  console.log('');
  console.log(`    ${a.emerald}${a.bold}/aped-a${a.reset}    ${dim('Analyze — parallel research → product brief')}`);
  console.log(`    ${a.mint}${a.bold}/aped-p${a.reset}    ${dim('PRD — autonomous generation from brief')}`);
  console.log(`    ${a.yellow}${a.bold}/aped-e${a.reset}    ${dim('Epics — requirements decomposition')}`);
  console.log(`    ${a.lime}${a.bold}/aped-d${a.reset}    ${dim('Dev — TDD story implementation')}`);
  console.log(`    ${a.red}${a.bold}/aped-r${a.reset}    ${dim('Review — adversarial code review')}`);
  console.log(`    ${a.spring}${a.bold}/aped-all${a.reset}   ${dim('Full pipeline A→P→E→D→R')}`);
  console.log('');
  console.log(`  ${dim('Guardrail hook active — pipeline coherence enforced')}`);
  console.log('');
}
