#!/usr/bin/env node
// APED allowed-paths-scope hook (opt-in via `aped-method allowed-paths-scope`).
//
// PreToolUse advisory hook. Reads the active skill's `allowed-paths` frontmatter
// and emits an advisory when Write/Edit/MultiEdit targets a file outside scope.
//
// Active-skill detection: reads the last `aped-*.md` skill invocation from the
// session marker at `<apedDir>/.active-skill`. The session-start hook or skill
// invocation writes this marker. If missing, the hook silently exits (no skill
// context = no scope to enforce).
//
// v5.0.0: advisory only (additionalContext). v6.0.0+: may flip to deny.

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { minimatch } from 'node:path';

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const APED_DIR = process.env.APED_DIR || '.aped';
const SKILLS_DIR = join(PROJECT_ROOT, APED_DIR, 'skills');
const MARKER_FILE = join(PROJECT_ROOT, APED_DIR, '.active-skill');

function getActiveSkill() {
  if (!existsSync(MARKER_FILE)) return null;
  try {
    return readFileSync(MARKER_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function parseAllowedPaths(skillFile) {
  if (!existsSync(skillFile)) return null;
  try {
    const content = readFileSync(skillFile, 'utf-8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const writeMatch = fm.match(/write:\s*\[([^\]]*)\]/);
    const readMatch = fm.match(/read-only:\s*\[([^\]]*)\]/);
    const parse = (m) => m ? m[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')) : [];
    return { write: parse(writeMatch), readOnly: parse(readMatch) };
  } catch {
    return null;
  }
}

function resolveGlob(pattern) {
  return pattern
    .replace(/\{\{OUTPUT_DIR\}\}/g, process.env.APED_OUTPUT_DIR || 'docs/aped')
    .replace(/\{\{APED_DIR\}\}/g, APED_DIR);
}

function isInScope(filePath, patterns) {
  const rel = filePath.startsWith('/') ? filePath.slice(PROJECT_ROOT.length + 1) : filePath;
  for (const pattern of patterns) {
    const resolved = resolveGlob(pattern);
    if (rel.startsWith(resolved.replace('/**', '')) || rel === resolved) {
      return true;
    }
  }
  return false;
}

// Hook entry point — reads from stdin per CC hooks spec.
async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let event;
  try {
    event = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolName = event?.tool?.name || '';
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const targetFile = event?.tool?.input?.file_path || event?.tool?.input?.path || '';
  if (!targetFile) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const activeSkill = getActiveSkill();
  if (!activeSkill) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const skillFile = join(SKILLS_DIR, activeSkill);
  const paths = parseAllowedPaths(skillFile);
  if (!paths) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  if (!isInScope(targetFile, paths.write)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        additionalContext: `[advisory] ${toolName} to "${targetFile}" is outside allowed-paths.write for ${activeSkill}. Allowed write paths: ${paths.write.map(resolveGlob).join(', ')}. Proceed with caution.`,
      },
    }));
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({}));
}

main().catch(() => process.exit(0));
