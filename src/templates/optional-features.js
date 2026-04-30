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

export function worktreeScopeTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/hooks/worktree-scope.js`,
      executable: true,
      content: substitute(loadTemplate('hooks/worktree-scope.js'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: `\${CLAUDE_PROJECT_DIR}/${a}/hooks/worktree-scope.js`,
                  // 5 s — Node cold-start + 2 realpath syscalls + a couple
                  // existsSync probes. Stays advisory; timeout = no warning,
                  // never blocks the tool call.
                  timeout: 5,
                },
              ],
            },
          ],
        },
      }),
    },
  ];
}

// MCP companion (opt-in via `aped-method enable-mcp`). Ships the
// aped-state MCP server + registers it under .claude/settings.local.json
// `mcpServers` so Claude Code launches it on session start.
//
// See src/templates/mcp/aped-state-server.mjs for the server itself.
export function mcpStateTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/mcp/state-schema.mjs`,
      executable: false,
      content: substitute(loadTemplate('mcp/state-schema.mjs'), c),
    },
    {
      path: `${a}/mcp/aped-state-server.mjs`,
      executable: true,
      content: substitute(loadTemplate('mcp/aped-state-server.mjs'), c),
    },
    {
      path: '.claude/settings.local.json',
      content: stringifySettings({
        mcpServers: {
          'aped-state': {
            command: 'node',
            args: [`\${CLAUDE_PROJECT_DIR}/${a}/mcp/aped-state-server.mjs`],
            env: { APED_DIR: a },
          },
        },
      }),
    },
  ];
}

export function tddRedMarkerTemplates(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/hooks/tdd-red-marker.js`,
      executable: true,
      content: substitute(loadTemplate('hooks/tdd-red-marker.js'), c),
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
                  command: `\${CLAUDE_PROJECT_DIR}/${a}/hooks/tdd-red-marker.js`,
                  // 6 s — Node cold-start + transcript tail (200 lines, a
                  // few KB on average) + regex scan. Stays advisory; on
                  // timeout no warning is emitted, never blocks.
                  timeout: 6,
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
