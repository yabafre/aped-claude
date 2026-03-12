import { mkdirSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getTemplates } from './templates/index.js';

function dim(s) { return `\x1b[2m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }

function writeFile(path, content, executable = false) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    console.log(`  ${dim('skip')} ${path} ${dim('(already exists)')}`);
    return false;
  }
  writeFileSync(path, content, 'utf-8');
  if (executable) chmodSync(path, 0o755);
  console.log(`  ${green('+')} ${path}`);
  return true;
}

export async function scaffold(config) {
  const cwd = process.cwd();
  const templates = getTemplates(config);
  let count = 0;

  for (const tpl of templates) {
    const fullPath = join(cwd, tpl.path);
    if (writeFile(fullPath, tpl.content, tpl.executable)) {
      count++;
    }
  }

  return count;
}
