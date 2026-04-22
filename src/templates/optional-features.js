// Loader for the three opt-in features (statusline, safe-bash hook,
// post-edit-typescript hook). Each feature has its runtime script in
// src/templates/{scripts,hooks}/*.js with {{APED_DIR}} / {{OUTPUT_DIR}}
// placeholders so the files stay reviewable on their own (syntax
// highlighting, `node --check`, diffs), then gets substituted at scaffold
// time. Settings-file entries stay inline here because they are small and
// their JSON shape doubles as documentation.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadTemplate(subpath) {
  return readFileSync(join(__dirname, subpath), 'utf-8');
}

function substitute(content, c) {
  return content
    .split('{{APED_DIR}}').join(c.apedDir)
    .split('{{OUTPUT_DIR}}').join(c.outputDir);
}

function stringifySettings(content) {
  return `${JSON.stringify(content, null, 2)}\n`;
}

export function statuslineTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/scripts/statusline.js`,
      executable: true,
      content: substitute(loadTemplate('scripts/statusline.js'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        statusLine: {
          type: 'command',
          command: `\${CLAUDE_PROJECT_DIR}/${a}/scripts/statusline.js`,
          padding: 0,
        },
      }),
    },
  ];
}

export function safeBashTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/hooks/safe-bash.js`,
      executable: true,
      content: substitute(loadTemplate('hooks/safe-bash.js'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: `\${CLAUDE_PROJECT_DIR}/${a}/hooks/safe-bash.js`,
                  timeout: 3,
                },
              ],
            },
          ],
        },
      }),
    },
  ];
}

export function typeScriptQualityTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/hooks/post-edit-typescript.js`,
      executable: true,
      content: substitute(loadTemplate('hooks/post-edit-typescript.js'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: `\${CLAUDE_PROJECT_DIR}/${a}/hooks/post-edit-typescript.js`,
                  timeout: 8,
                },
              ],
            },
          ],
        },
      }),
    },
  ];
}
