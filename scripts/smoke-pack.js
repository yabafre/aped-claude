#!/usr/bin/env node
// Pack-and-run smoke test. Builds the npm tarball, extracts it to a temp
// directory, and exercises the CLI from the extracted tree exactly the way
// a `npx aped-method` user would. Catches missing-file regressions in the
// `files` allowlist that plain `node bin/...` can't (since locally every
// source file exists regardless of what would actually ship).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (result.status !== 0) {
    console.error(`[smoke:pack] command failed: ${cmd} ${args.join(' ')}`);
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  return result.stdout;
}

const packDir = mkdtempSync(join(tmpdir(), 'aped-smoke-pack-'));
const extractDir = mkdtempSync(join(tmpdir(), 'aped-smoke-extract-'));

try {
  // 1. Produce the exact tarball that `npm publish` would upload.
  run('npm', ['pack', '--pack-destination', packDir, '--silent'], { cwd: projectDir });
  const tgz = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
  if (!tgz) {
    console.error('[smoke:pack] no tarball produced by npm pack');
    process.exit(1);
  }

  // 2. Extract to a tmp dir. `--strip-components=1` peels the "package/" prefix.
  run('tar', ['-xzf', join(packDir, tgz), '-C', extractDir, '--strip-components=1']);

  // 2.5 Assert tarball contains files load-bearing for opt-in features. Catches
  //     non-recursive globs in package.json `files` (e.g. `skills/*.md` not
  //     covering `skills/aped-skills/*.md`, or visual-companion/ omitted).
  const requiredInTarball = [
    'src/templates/skills/aped-skills/anthropic-best-practices.md',
    'src/templates/skills/aped-skills/persuasion-principles.md',
    'src/templates/skills/aped-skills/testing-skills-with-subagents.md',
    'src/templates/visual-companion/start-server.sh',
    'src/templates/visual-companion/frame-template.html',
    'src/templates/hooks/session-start.sh',
  ];
  const missingInTarball = requiredInTarball.filter((p) => !existsSync(join(extractDir, p)));
  if (missingInTarball.length) {
    console.error('[smoke:pack] tarball missing required files:');
    missingInTarball.forEach((m) => console.error('  - ' + m));
    process.exit(1);
  }

  // 3. Point node_modules at the project's own — `npm install` on the
  //    extracted tree would work too but adds a network round-trip for no
  //    extra signal. A symlink gives runtime resolution identical to a
  //    post-install npx environment.
  const projectNodeModules = join(projectDir, 'node_modules');
  if (!existsSync(projectNodeModules)) {
    console.error('[smoke:pack] run `npm install` first — node_modules missing in project.');
    process.exit(1);
  }
  symlinkSync(projectNodeModules, join(extractDir, 'node_modules'), 'dir');

  // 4. Run the CLI as a user would — this triggers full ESM import
  //    resolution, so any file missing from the `files` allowlist blows up.
  const bin = join(extractDir, 'bin', 'aped-method.js');
  run('node', [bin, '--version']);
  run('node', [bin, '--help'], { stdio: ['ignore', 'ignore', 'pipe'] });

  // 5. doctor exercises subcommands.js — will fail-fast if the file is not
  //    in the tarball (precisely the bug that shipped in 3.7.2). Note that
  //    doctor exits non-zero when the cwd has no APED install, so we
  //    don't assert on status here; only on import resolution success.
  const doctor = spawnSync('node', [bin, 'doctor'], {
    cwd: tmpdir(),
    encoding: 'utf8',
  });
  if (doctor.error || /Cannot find module|ERR_MODULE_NOT_FOUND/.test(doctor.stderr || '')) {
    console.error('[smoke:pack] `aped-method doctor` failed to load — likely a missing file in the tarball.');
    console.error(doctor.stderr);
    process.exit(1);
  }

  console.log('[smoke:pack] OK');
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(extractDir, { recursive: true, force: true });
}
