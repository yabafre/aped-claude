import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'src', 'templates', 'hooks', 'worktree-scope.js');

function runHook(payload, projectDir) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
}

function makeWorktreeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'aped-wts-project-'));
  // Plant the WORKTREE marker the hook looks for.
  mkdirSync(join(dir, '.aped'));
  writeFileSync(join(dir, '.aped', 'WORKTREE'), 'story_key: 1-1-init\nticket: ABC-1\n');
  return dir;
}

// 4.7.0 — opt-in PreToolUse advisory hook. Fires only when the project has an
// active worktree marker AND the tool target resolves outside the worktree
// root. Advisory only — never blocks. Targets the parallel-sprint failure
// mode where exploration agents return main-checkout paths and Write/Edit
// lands changes on `main` instead of inside the worktree (Superpowers #1040).
describe('worktree-scope hook (4.7.0 — P4)', () => {
  it('exits silently for non-Write/Edit/MultiEdit tools', () => {
    const project = makeWorktreeProject();
    try {
      const result = runHook(
        { tool_name: 'Read', tool_input: { file_path: join(project, 'foo.ts') } },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('exits silently when no WORKTREE marker is present (not in worktree mode)', () => {
    const project = mkdtempSync(join(tmpdir(), 'aped-wts-no-marker-'));
    writeFileSync(join(project, 'foo.ts'), 'export const x = 1;\n');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: join(project, 'foo.ts') } },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('exits silently when target is inside the worktree root (sanity)', () => {
    const project = makeWorktreeProject();
    const internalFile = join(project, 'src', 'foo.ts');
    mkdirSync(join(project, 'src'));
    writeFileSync(internalFile, 'export const x = 1;\n');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: internalFile } },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('emits an advisory when the target resolves outside the worktree via a symlink', () => {
    const root = mkdtempSync(join(tmpdir(), 'aped-wts-outside-'));
    const project = makeWorktreeProject();
    const outsideFile = join(root, 'leaked.ts');
    writeFileSync(outsideFile, 'export const x = 1;\n');
    // Symlink inside the worktree pointing outside it.
    const escape = join(project, 'leaked.ts');
    symlinkSync(outsideFile, escape);
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: escape } },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout, 'advisory message emitted').not.toBe('');
      const payload = JSON.parse(result.stdout);
      expect(payload.hookSpecificOutput.hookEventName).toBe('PreToolUse');
      expect(payload.hookSpecificOutput.additionalContext).toMatch(/worktree-scope warning/);
      expect(payload.hookSpecificOutput.additionalContext).toMatch(/OUTSIDE this worktree/);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('emits an advisory when the target is an absolute path outside the worktree', () => {
    const root = mkdtempSync(join(tmpdir(), 'aped-wts-abs-'));
    const project = makeWorktreeProject();
    const outsideFile = join(root, 'leaked.ts');
    writeFileSync(outsideFile, 'export const x = 1;\n');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: outsideFile } },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).not.toBe('');
      const payload = JSON.parse(result.stdout);
      expect(payload.hookSpecificOutput.additionalContext).toMatch(/OUTSIDE this worktree/);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('exits silently when tool_input.file_path is missing (sanity)', () => {
    const project = makeWorktreeProject();
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: {} },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('handles new files that do not exist yet (Write to a new file in worktree)', () => {
    const project = makeWorktreeProject();
    mkdirSync(join(project, 'src'));
    const newFile = join(project, 'src', 'brand-new.ts');
    // Note: file does not exist, but parent directory does — hook resolves
    // parent's realpath and reconstructs the target path.
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: newFile } },
        project,
      );
      expect(result.status).toBe(0);
      // Target resolves under the worktree → no advisory.
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
