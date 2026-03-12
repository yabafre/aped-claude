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

function bold(s) { return `\x1b[1m${s}\x1b[0m`; }
function dim(s) { return `\x1b[2m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function cyan(s) { return `\x1b[36m${s}\x1b[0m`; }

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') { args.yes = true; continue; }
    const match = arg.match(/^--(\w[\w-]*)=(.+)$/);
    if (match) {
      const key = match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = match[2];
    }
  }
  return args;
}

function ask(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const suffix = defaultVal ? ` ${dim(`(${defaultVal})`)}` : '';
    rl.question(`  ${question}${suffix}: `, (answer) => {
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

  console.log('');
  console.log(bold('  APED — Unified Dev Pipeline Installer'));
  console.log(dim('  Analyze → PRD → Epics → Dev → Review'));
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

    printConfig(config);
    console.log('');
    const count = await scaffold(config);
    printDone(count);
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  const prompt = stdinLines
    ? (question, def) => {
        const val = (stdinLines[lineIndex++] || '').trim();
        const result = val || def || '';
        console.log(`  ${question}: ${result}`);
        return Promise.resolve(result);
      }
    : (question, def) => ask(rl, question, def);

  try {
    const config = {};

    config.projectName = await prompt(`${cyan('Project name')}`, detectedProject);
    config.authorName = await prompt(`${cyan('Author name')}`, DEFAULTS.authorName);
    config.communicationLang = await prompt(`${cyan('Communication language')}`, DEFAULTS.communicationLang);
    config.documentLang = await prompt(`${cyan('Document output language')}`, DEFAULTS.documentLang);
    config.apedDir = await prompt(`${cyan('APED directory')} ${dim('(skills, config, templates)')}`, DEFAULTS.apedDir);
    config.outputDir = await prompt(`${cyan('Output directory')} ${dim('(generated artifacts)')}`, DEFAULTS.outputDir);
    config.commandsDir = await prompt(`${cyan('Commands directory')}`, DEFAULTS.commandsDir);

    console.log('');
    printConfig(config);
    console.log('');

    const confirm = await prompt(`${cyan('Proceed?')}`, 'Y');
    if (confirm.toLowerCase() === 'n') {
      console.log('  Cancelled.');
      return;
    }

    console.log('');
    const count = await scaffold(config);
    printDone(count);
  } finally {
    rl.close();
  }
}

function printConfig(config) {
  console.log(dim('  Configuration:'));
  console.log(`    Project:       ${bold(config.projectName)}`);
  console.log(`    Author:        ${bold(config.authorName || '(not set)')}`);
  console.log(`    Communication: ${bold(config.communicationLang)}`);
  console.log(`    Documents:     ${bold(config.documentLang)}`);
  console.log(`    APED:          ${bold(config.apedDir + '/')}  ${dim('skills + config + templates')}`);
  console.log(`    Output:        ${bold(config.outputDir + '/')}  ${dim('generated artifacts')}`);
  console.log(`    Commands:      ${bold(config.commandsDir + '/')}`);
}

function printDone(count) {
  console.log('');
  console.log(green(`  Done! ${count} files created.`));
  console.log('');
  console.log(dim('  Available commands:'));
  console.log(`    /aped-a    ${dim('Analyze — parallel research → product brief')}`);
  console.log(`    /aped-p    ${dim('PRD — autonomous generation from brief')}`);
  console.log(`    /aped-e    ${dim('Epics — requirements decomposition')}`);
  console.log(`    /aped-d    ${dim('Dev — TDD story implementation')}`);
  console.log(`    /aped-r    ${dim('Review — adversarial code review')}`);
  console.log(`    /aped-all  ${dim('Full pipeline A→P→E→D→R')}`);
  console.log('');
}
