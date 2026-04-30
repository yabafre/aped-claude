import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'src', 'templates', 'hooks', 'post-edit-typescript.js');

function runHook(payload, projectDir) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
}

// 4.2.1 contract — the hook resolves symlinks before sandbox-checking the
// target file. Pre-4.2.1 the check was `absolutePath.startsWith(projectDir)`,
// which on macOS (/var → /private/var) and on any project containing a
// symlink that points outside its root, silently passed the prefix check
// and caused prettier/eslint to rewrite a file outside the project.
describe('post-edit-typescript symlink resolution (4.2.1)', () => {
  it('exits silently when the target resolves outside the project root via a symlink', () => {
    const root = mkdtempSync(join(tmpdir(), 'aped-pet-outside-'));
    const project = mkdtempSync(join(tmpdir(), 'aped-pet-project-'));
    const outsideFile = join(root, 'outside.ts');
    writeFileSync(outsideFile, 'export const x = 1;\n');

    // A symlink inside the project pointing to a file outside it.
    const escape = join(project, 'escape.ts');
    symlinkSync(outsideFile, escape);

    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: escape } },
        project,
      );
      // Hook must exit 0 with no stdout — silent rejection of out-of-project
      // target. Pre-4.2.1 it would have run prettier/eslint on outsideFile.
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('exits silently when the target file does not exist (no realpath crash)', () => {
    const project = mkdtempSync(join(tmpdir(), 'aped-pet-missing-'));
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: join(project, 'never-existed.ts') } },
        project,
      );
      // existsSync gate fires first — process.exit(0) with empty stdout.
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('does not crash on a regular project-internal .ts file (sanity)', () => {
    const project = mkdtempSync(join(tmpdir(), 'aped-pet-sanity-'));
    const internalFile = join(project, 'internal.ts');
    writeFileSync(internalFile, 'export const x = 1;\n');

    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: internalFile } },
        project,
      );
      // No prettier/eslint resolved in the bare tmp project → exits 0 with
      // empty stdout. The point: must not crash, must not error.
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('exits silently when tool_name is not Write/Edit/MultiEdit (sanity)', () => {
    const project = mkdtempSync(join(tmpdir(), 'aped-pet-toolname-'));
    try {
      const result = runHook(
        { tool_name: 'Read', tool_input: { file_path: join(project, 'whatever.ts') } },
        project,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
