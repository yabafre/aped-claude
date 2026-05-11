#!/usr/bin/env node
// Pack-and-run smoke test. Builds the npm tarball, extracts it to a temp
// directory, and exercises the CLI from the extracted tree exactly the way
// a `npx aped-method` user would. Catches missing-file regressions in the
// `files` allowlist that plain `node bin/...` can't (since locally every
// source file exists regardless of what would actually ship).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..');

// 6.5.0 (B16): derive the must-be-in-tarball list from `package.json.files`
// where possible. Walk `src/templates/skills/` and `src/templates/hooks/` for
// every `.md` / `.sh` file — these are scaffolded into user projects, so any
// file missed by the allowlist globs is a 3.7.2-class shipping bug.
function walkExt(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkExt(p, exts));
    else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

function expandRequiredScaffold() {
  const out = new Set();
  const skillsDir = join(projectDir, 'src/templates/skills');
  if (existsSync(skillsDir)) {
    for (const p of walkExt(skillsDir, ['.md', '.sh', '.mjs', '.csv'])) {
      out.add(relative(projectDir, p));
    }
  }
  const hooksDir = join(projectDir, 'src/templates/hooks');
  if (existsSync(hooksDir)) {
    for (const p of walkExt(hooksDir, ['.sh', '.js'])) {
      out.add(relative(projectDir, p));
    }
  }
  const ethos = join(projectDir, 'src/templates/ethos.md');
  if (existsSync(ethos)) out.add(relative(projectDir, ethos));
  return [...out].sort();
}

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
  //     6.5.0 (B16): the skills + hooks portions of the list are derived from
  //     the source tree so adding a new skill/.md auto-extends coverage; only
  //     visual-companion/ stays hand-curated (no .md extension to glob on).
  const requiredInTarball = [
    ...expandRequiredScaffold(),
    'src/templates/visual-companion/start-server.sh',
    'src/templates/visual-companion/frame-template.html',
  ];
  const missingInTarball = requiredInTarball.filter((p) => !existsSync(join(extractDir, p)));
  if (missingInTarball.length) {
    console.error('[smoke:pack] tarball missing required files:');
    missingInTarball.forEach((m) => console.error('  - ' + m));
    process.exit(1);
  }

  // 2.6 Assert no .tmpl files in tarball. Generator sources live alongside
  //     their generated .md, but the `files` allowlist enumerates extensions
  //     explicitly so .tmpl is excluded. A regression in package.json could
  //     let them slip — catch it here.
  const tmplsInTarball = walkExt(extractDir, ['.tmpl']);
  if (tmplsInTarball.length) {
    console.error('[smoke:pack] tarball contains .tmpl files (must be excluded):');
    tmplsInTarball.forEach((p) => console.error('  - ' + relative(extractDir, p)));
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
