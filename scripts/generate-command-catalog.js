#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMAND_DEFS } from '../src/templates/commands.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputPath = join(root, 'docs', 'COMMANDS.md');

const categoryMeta = {
  pipeline: {
    title: 'Pipeline Commands',
    intro: 'Core phase commands in the APED delivery flow.',
  },
  ideation: {
    title: 'Ideation, Critique & Retrospective',
    intro: 'Upstream or horizontal commands that sharpen ideas and decisions.',
  },
  utility: {
    title: 'Utility Commands',
    intro: 'Operational commands around sprint execution, maintenance, and meta-work.',
  },
};

const groups = Object.entries(categoryMeta).map(([key, meta]) => ({
  ...meta,
  commands: COMMAND_DEFS.filter((command) => command.category === key),
}));

const lines = [
  '# APED Command Catalog',
  '',
  '> Generated from `src/templates/commands.js` by `npm run generate:catalog`.',
  '',
  '> **Deprecated since 3.12.0** — slash commands are deprecated in favor of direct skill invocation. Removal target: **4.0.0**. They continue to function on all 3.x versions. See README §Command catalog for the migration path.',
  '',
  'This file is the committed source-of-truth view of the APED command surface.',
  '',
];

function renderStatus(command) {
  if (command.deprecated) {
    if (!command.deprecatedSince || !command.removalTarget) {
      throw new Error(
        `COMMAND_DEFS entry '${command.name}' has deprecated:true but is missing deprecatedSince or removalTarget — partial metadata renders as a non-deprecated status, silently masking the deprecation in docs/COMMANDS.md.`
      );
    }
    return `Deprecated (${command.deprecatedSince} → ${command.removalTarget})`;
  }
  return '-';
}

for (const group of groups) {
  lines.push(`## ${group.title}`);
  lines.push('');
  lines.push(group.intro);
  lines.push('');
  lines.push('| Command | Phase | Arguments | Status | Purpose | Outputs |');
  lines.push('|---------|-------|-----------|--------|---------|---------|');
  for (const command of group.commands) {
    lines.push(
      `| \`/${command.name}\` | ${escapeCell(command.phase || '-')} | ${escapeCell(command.argumentHint || '-')} | ${escapeCell(renderStatus(command))} | ${escapeCell(command.description)} | ${escapeCell(command.outputs || '-')} |`
    );
  }
  lines.push('');
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|');
}
