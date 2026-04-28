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

export function verifyClaimsTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/hooks/verify-claims.js`,
      executable: true,
      content: substitute(loadTemplate('hooks/verify-claims.js'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: `\${CLAUDE_PROJECT_DIR}/${a}/hooks/verify-claims.js`,
                  // 8 s — Node cold-start + reading config + scanning multi-MB
                  // test logs can exceed 3 s on shared CI runners. Hook stays
                  // advisory either way: timeout means "no advisory this turn",
                  // never blocks tool use.
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

// SessionStart hook (opt-in via `aped-method session-start`).
// Reads aped/skills/SKILL-INDEX.md and emits it as additionalContext at
// session start / clear / compact. The index file is generated at
// scaffold time by templates/scripts.js.
export function sessionStartTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/hooks/session-start.sh`,
      executable: true,
      content: substitute(loadTemplate('hooks/session-start.sh'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        hooks: {
          SessionStart: [
            {
              matcher: 'startup|clear|compact',
              hooks: [
                {
                  type: 'command',
                  // Wrap with bash -c so the hook runs even when CLAUDE_PROJECT_DIR
                  // is set but the OS doesn't honour the script's executable bit
                  // (e.g. some Windows / WSL configurations).
                  command: `bash \${CLAUDE_PROJECT_DIR}/${a}/hooks/session-start.sh`,
                  // 30s — cold WSL/macOS filesystems and large SKILL-INDEX.md
                  // files can take longer than the original 5s budget.
                  timeout: 30,
                },
              ],
            },
          ],
        },
      }),
    },
  ];
}

// Visual companion (opt-in via `aped-method visual-companion`). Copies the
// bash HTTP server + frame template into the project. No settings.json
// change — the user starts the server manually from /aped-brainstorm.
export function visualCompanionTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/visual-companion/start-server.sh`,
      executable: true,
      content: substitute(loadTemplate('visual-companion/start-server.sh'), c),
    },
    {
      path: `${a}/visual-companion/frame-template.html`,
      content: substitute(loadTemplate('visual-companion/frame-template.html'), c),
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
