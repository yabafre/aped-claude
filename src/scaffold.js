import { mkdirSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getTemplates } from './templates/index.js';

export async function scaffold(config) {
  const cwd = process.cwd();
  const templates = getTemplates(config);
  let count = 0;

  for (const tpl of templates) {
    const fullPath = join(cwd, tpl.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    if (!existsSync(fullPath)) {
      writeFileSync(fullPath, tpl.content, 'utf-8');
      if (tpl.executable) chmodSync(fullPath, 0o755);
      count++;
    }
  }

  return count;
}
