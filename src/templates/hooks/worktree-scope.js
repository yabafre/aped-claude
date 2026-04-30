#!/usr/bin/env node
// APED worktree-scope advisory hook. Opt-in via `aped-method worktree-scope`.
//
// PreToolUse on Write/Edit/MultiEdit. Fires only when the project has an
// active APED worktree marker (`.aped/WORKTREE` or `aped/WORKTREE`). When
// the marker is present and the tool target resolves to a path OUTSIDE the
// worktree root (CLAUDE_PROJECT_DIR, realpath-resolved), emits an advisory
// warning via additionalContext. Never blocks — Claude Code sees the
// warning and can correct the path before re-issuing the call.
//
// Targets the parallel-sprint failure mode where exploration agents return
// main-checkout paths and Write/Edit lands changes on `main` instead of
// inside the worktree (Superpowers issue #1040).
import { existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Advisory contract: never crash the user's tool call. Internal failures
// exit 0 silently.
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload = {};
  try { payload = input ? JSON.parse(input) : {}; } catch { payload = {}; }

  const toolName = payload.tool_name || '';
  if (!/^(Write|Edit|MultiEdit)$/.test(toolName)) process.exit(0);

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const filePath = payload.tool_input?.file_path;
  if (!filePath) process.exit(0);

  // Only fire when the project is in worktree mode. The marker is
  // <apedDir>/WORKTREE; we accept the two common defaults (`.aped` and
  // `aped`) without parsing config.yaml — exotic apedDirs simply skip the
  // advisory (acceptable false-negative for an opt-in advisory hook).
  const markersToCheck = [
    join(projectDir, '.aped', 'WORKTREE'),
    join(projectDir, 'aped', 'WORKTREE'),
  ];
  if (!markersToCheck.some((p) => existsSync(p))) process.exit(0);

  const absolutePath = filePath.startsWith('/') ? filePath : resolve(projectDir, filePath);

  // Resolve symlinks before the prefix check — string-prefix on raw paths
  // misses macOS /var → /private/var and any symlink in projectDir pointing
  // outside the worktree. The target file may not exist yet (Write
  // creates new files), so realpath might fail; fall back gracefully.
  let realFile, realProject;
  try {
    realProject = realpathSync(projectDir);
  } catch { process.exit(0); }
  try {
    realFile = realpathSync(absolutePath);
  } catch {
    // Target file doesn't exist yet (new Write) — resolve its parent
    // directory and append the basename. If parent doesn't exist either,
    // skip the check (rare edge case).
    try {
      const parent = realpathSync(resolve(absolutePath, '..'));
      realFile = join(parent, absolutePath.split('/').pop());
    } catch { process.exit(0); }
  }

  if (realFile.startsWith(realProject + '/') || realFile === realProject) {
    process.exit(0); // safe — target is inside worktree root
  }

  // Target escaped the worktree root. Emit advisory.
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext:
        'APED worktree-scope warning: tool target ' + realFile +
        ' is OUTSIDE this worktree root (' + realProject + '). ' +
        'In APED parallel-sprint mode, Writes/Edits should land inside the worktree, ' +
        'not on main. Verify the target path is correct before proceeding. ' +
        'This hook is advisory only — no action blocked.',
    },
  }) + '\n');
});
