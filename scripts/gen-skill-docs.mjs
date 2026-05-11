#!/usr/bin/env node
// Skill template generator. Walks src/templates/skills/**/*.tmpl, resolves
// {{PLACEHOLDER}} and {{PLACEHOLDER:arg1:arg2}} tokens via RESOLVERS, and
// writes a sibling .md alongside each .tmpl. Scaffold-time placeholders
// ({{APED_DIR}}, {{OUTPUT_DIR}}, {{CLI_VERSION}}) pass through untouched —
// they get resolved later by src/templates/skills.js:substitute() at install
// time. Unknown placeholders fail loudly with file:line.
//
// CLI:
//   node scripts/gen-skill-docs.mjs           write .md siblings, exit 0
//   node scripts/gen-skill-docs.mjs --check   diff in-memory, exit 1 on drift
//
// The freshness test in tests/gen-skill-docs-freshness.test.js imports
// renderTemplate + RESOLVERS and runs the same pipeline in-process.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SKILLS_DIR = join(REPO_ROOT, 'src/templates/skills');

const ACTIVATION_GUARD_BODY =
  '**Activation guard (6.2.0):** Before any other action, run `bash {{APED_DIR}}/scripts/check-enabled.sh`. If it exits non-zero, print "APED disabled — run aped-method enable" and HALT.';

const CONFIG_PREAMBLE_BODY = [
  'Before any other action, read `{{APED_DIR}}/config.yaml` and resolve:',
  '- `{user_name}` — for greeting and direct address',
  '- `{communication_language}` — for ALL conversation with the user',
  '- `{document_output_language}` — for artefacts written under `{{OUTPUT_DIR}}/`',
  '- `{ticket_system}` / `{git_provider}` — routing for ticket / PR I/O (skip if `none`)',
  '',
  '✅ YOU MUST speak `{communication_language}` in every message to the user.',
  '✅ YOU MUST write artefact content in `{document_output_language}`.',
  '✅ If `{{APED_DIR}}/config.yaml` is missing or unreadable, HALT and tell the user to run `npx aped-method`.',
].join('\n');

const LANGUAGE_DIRECTIVE_BODY = [
  '✅ YOU MUST speak `{communication_language}` in every message to the user.',
  '✅ YOU MUST write artefact content in `{document_output_language}`.',
].join('\n');

function arity(name, expected, actual, ctx) {
  if (actual !== expected) {
    throw new Error(
      `${ctx.file}:${ctx.line}: ${name} requires ${expected} arg(s), got ${actual}`,
    );
  }
}

export const RESOLVERS = {
  ACTIVATION_GUARD: (args, ctx) => {
    arity('ACTIVATION_GUARD', 0, args.length, ctx);
    return ACTIVATION_GUARD_BODY;
  },
  CONFIG_PREAMBLE: (args, ctx) => {
    arity('CONFIG_PREAMBLE', 0, args.length, ctx);
    return CONFIG_PREAMBLE_BODY;
  },
  CONFIG_PREAMBLE_INLINE: (args, ctx) => {
    arity('CONFIG_PREAMBLE_INLINE', 1, args.length, ctx);
    const artefact = args[0];
    return (
      'Read `{{APED_DIR}}/config.yaml` and resolve `{user_name}` / ' +
      '`{communication_language}` / `{document_output_language}`. ' +
      '✅ YOU MUST speak in `{communication_language}` and write `' +
      artefact +
      '` in `{document_output_language}`. HALT if config is missing.'
    );
  },
  LANGUAGE_DIRECTIVE: (args, ctx) => {
    arity('LANGUAGE_DIRECTIVE', 0, args.length, ctx);
    return LANGUAGE_DIRECTIVE_BODY;
  },
};

const SCAFFOLD_TIME_ALLOWLIST = new Set(['APED_DIR', 'OUTPUT_DIR', 'CLI_VERSION']);

const PLACEHOLDER_RE = /\{\{([A-Z_]+)(?::([^}]*))?\}\}/g;

function lineOf(content, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (content.charCodeAt(i) === 10) line++;
  return line;
}

function frontmatterEndOf(content) {
  if (!content.startsWith('---\n')) return -1;
  const closeIdx = content.indexOf('\n---\n', 4);
  if (closeIdx === -1) return -1;
  return closeIdx + 5; // past the trailing \n
}

export function renderTemplate(content, filePath) {
  const rendered = content.replace(PLACEHOLDER_RE, (match, name, argString, matchIdx) => {
    if (SCAFFOLD_TIME_ALLOWLIST.has(name)) return match;
    const resolver = RESOLVERS[name];
    const line = lineOf(content, matchIdx);
    if (!resolver) {
      throw new Error(`Unknown placeholder {{${name}}} at ${filePath}:${line}`);
    }
    const args = argString === undefined ? [] : argString.split(':');
    return resolver(args, { name, file: filePath, line });
  });

  const sourceName = basename(filePath);
  const marker = `<!-- AUTO-GENERATED from ${sourceName}. Edits will be overwritten. Run: npm run gen:skill-docs -->`;
  const fmEnd = frontmatterEndOf(rendered);
  if (fmEnd === -1) {
    return `${marker}\n\n${rendered}`;
  }
  return rendered.slice(0, fmEnd) + marker + '\n' + rendered.slice(fmEnd);
}

export function findTmplFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findTmplFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.tmpl')) results.push(full);
  }
  return results;
}

function firstDiffLine(actual, expected) {
  const a = actual.split('\n');
  const e = expected.split('\n');
  const max = Math.max(a.length, e.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== e[i]) {
      return { line: i + 1, actual: a[i], expected: e[i] };
    }
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const tmplFiles = findTmplFiles(SKILLS_DIR);

  if (tmplFiles.length === 0) {
    console.log('[gen-skill-docs] no .tmpl files found — nothing to do.');
    return;
  }

  let drift = 0;
  for (const tmplPath of tmplFiles) {
    const content = readFileSync(tmplPath, 'utf-8');
    const relPath = relative(REPO_ROOT, tmplPath);
    const rendered = renderTemplate(content, relPath);
    const mdPath = tmplPath.replace(/\.tmpl$/, '');
    const relMd = relative(REPO_ROOT, mdPath);

    if (checkMode) {
      const current = existsSync(mdPath) ? readFileSync(mdPath, 'utf-8') : null;
      if (current === rendered) continue;
      drift++;
      console.error(`stale: ${relMd}`);
      if (drift === 1) {
        if (current === null) {
          console.error('  (file missing — run `npm run gen:skill-docs`)');
        } else {
          const d = firstDiffLine(current, rendered);
          if (d) {
            console.error(`  first diff at line ${d.line}:`);
            console.error(`    expected: ${d.expected ?? '<EOF>'}`);
            console.error(`    actual:   ${d.actual ?? '<EOF>'}`);
          }
        }
      }
    } else {
      writeFileSync(mdPath, rendered);
    }
  }

  if (checkMode && drift > 0) {
    console.error(`\n${drift} stale generated file(s). Fix: npm run gen:skill-docs`);
    process.exit(1);
  }
  if (!checkMode) {
    console.log(`[gen-skill-docs] regenerated ${tmplFiles.length} file(s).`);
  }
}

const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) main();
