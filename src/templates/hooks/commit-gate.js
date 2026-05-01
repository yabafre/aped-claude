#!/usr/bin/env node
// APED commit-gate hook (5.5.0). PostToolUse advisory.
//
// After N Write/Edit/MultiEdit tool calls without a git commit,
// emits an advisory reminding the agent that aped-dev requires
// one commit per GREEN gate.
//
// This is structural enforcement (Superpowers #463): compliance
// is detectable by artifact (commit count vs edit count), not
// by honor system.
//
// Neutral files (.md, .json, .yaml, .toml, CHANGELOG, README, .aped/)
// are excluded — only production/test file edits count.

const NEUTRAL_EXTENSIONS = new Set([
  '.md', '.json', '.yaml', '.yml', '.toml', '.lock', '.env',
]);
const NEUTRAL_PATHS = [
  'CHANGELOG', 'README', 'LICENSE', '.aped/', 'docs/aped/',
  'node_modules/', '.git/',
];

function isNeutralFile(path) {
  if (!path) return true;
  const ext = '.' + path.split('.').pop();
  if (NEUTRAL_EXTENSIONS.has(ext)) return true;
  return NEUTRAL_PATHS.some((p) => path.includes(p));
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let event;
  try {
    event = JSON.parse(input);
  } catch {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const toolName = event?.tool?.name || '';
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const filePath = event?.tool?.input?.file_path || event?.tool?.input?.path || '';
  if (isNeutralFile(filePath)) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  // Count uncommitted file changes via git status
  const { spawnSync } = await import('node:child_process');
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const r = spawnSync('git', ['status', '--porcelain'], {
    encoding: 'utf-8',
    cwd: projectDir,
    timeout: 5000,
  });

  if (r.status !== 0) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const changed = (r.stdout || '').split('\n').filter((l) => l.trim()).length;
  const THRESHOLD = 5;

  if (changed >= THRESHOLD) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        additionalContext:
          `[commit-gate] ${changed} uncommitted file changes detected. ` +
          `aped-dev requires one commit per GREEN gate — do not batch all changes at the end. ` +
          `If you have passed a GREEN gate, commit now before continuing.`,
      },
    }));
    return;
  }

  process.stdout.write(JSON.stringify({}));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({}));
});
