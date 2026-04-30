// session-start.sh runtime contract — emits BOTH:
//   - hookSpecificOutput.additionalContext (SKILL-INDEX.md content, agent-side)
//   - systemMessage (user-visible banner: "✓ APED v<X.Y.Z> ready · N skills…")
//
// Pre-4.12.1 the hook only emitted additionalContext; users couldn't tell
// whether the hook fired. The banner closes that visibility gap. CC docs:
// https://code.claude.com/docs/en/hooks — `systemMessage` field is shown
// to the user; SessionStart `additionalContext` is added to Claude's
// context.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sessionStartTemplates } from '../src/templates/optional-features.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-session-banner-'));
  mkdirSync(join(root, APED_DIR, 'hooks'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'skills'), { recursive: true });
  return root;
}

function installHook(root) {
  const tpls = sessionStartTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
  const hookTpl = tpls.find((t) => t.path.endsWith('session-start.sh'));
  const dest = join(root, hookTpl.path);
  writeFileSync(dest, hookTpl.content);
  chmodSync(dest, 0o755);
  return dest;
}

function writeIndex(root, skills) {
  const path = join(root, APED_DIR, 'skills', 'SKILL-INDEX.md');
  const body = [
    '# APED Skill Index',
    '',
    '<!-- AUTO-GENERATED -->',
    '',
    ...skills.map((s) => `- ${s} — Sample description for ${s}.`),
    '',
  ].join('\n');
  writeFileSync(path, body);
  return path;
}

function writeConfig(root, fields) {
  const path = join(root, APED_DIR, 'config.yaml');
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(path, lines.join('\n') + '\n');
  return path;
}

function runHook(root) {
  const hook = join(root, APED_DIR, 'hooks', 'session-start.sh');
  const r = spawnSync('bash', [hook], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('session-start.sh banner (4.12.1)', () => {
  it('exits silently when SKILL-INDEX.md is missing (pre-scaffold safety)', () => {
    installHook(sandbox);
    const r = runHook(sandbox);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('emits both systemMessage and additionalContext when index is present', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd', 'aped-dev', 'aped-review']);
    writeConfig(sandbox, {
      aped_version: '"4.12.1"',
      ticket_system: 'linear',
      git_provider: 'github',
    });
    const r = runHook(sandbox);
    expect(r.code).toBe(0);
    expect(r.stdout).not.toBe('');
    const payload = JSON.parse(r.stdout);
    expect(payload.systemMessage).toBeDefined();
    expect(payload.hookSpecificOutput).toBeDefined();
    expect(payload.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(payload.hookSpecificOutput.additionalContext).toMatch(/# APED Skill Index/);
  });

  it('banner includes APED version when aped_version is set in config.yaml', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd', 'aped-dev']);
    writeConfig(sandbox, { aped_version: '4.12.1', ticket_system: 'none', git_provider: 'github' });
    const r = runHook(sandbox);
    const payload = JSON.parse(r.stdout);
    expect(payload.systemMessage).toMatch(/✓ APED v4\.12\.1 ready/);
  });

  it('banner counts skills correctly from SKILL-INDEX.md', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd', 'aped-dev', 'aped-review', 'aped-arch', 'aped-epics']);
    writeConfig(sandbox, { aped_version: '4.12.1', ticket_system: 'linear', git_provider: 'github' });
    const r = runHook(sandbox);
    const payload = JSON.parse(r.stdout);
    expect(payload.systemMessage).toMatch(/5 skills indexed/);
  });

  it('banner includes ticket_system + git_provider', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd']);
    writeConfig(sandbox, { aped_version: '4.12.1', ticket_system: 'linear', git_provider: 'gitlab' });
    const r = runHook(sandbox);
    const payload = JSON.parse(r.stdout);
    expect(payload.systemMessage).toMatch(/tickets: linear/);
    expect(payload.systemMessage).toMatch(/git: gitlab/);
  });

  it('banner gracefully degrades when config.yaml is missing', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd', 'aped-dev']);
    // No config.yaml.
    const r = runHook(sandbox);
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout);
    // Banner still emitted; just no version / providers segment.
    expect(payload.systemMessage).toMatch(/✓ APED ready · 2 skills indexed/);
    // No version slot.
    expect(payload.systemMessage).not.toMatch(/v\d/);
  });

  it('banner gracefully degrades when ticket_system / git_provider are absent', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd']);
    writeConfig(sandbox, { aped_version: '4.12.1' }); // no ticket/git keys
    const r = runHook(sandbox);
    const payload = JSON.parse(r.stdout);
    expect(payload.systemMessage).toMatch(/✓ APED v4\.12\.1 ready · 1 skills indexed/);
    // No tickets / git segments when keys are missing.
    expect(payload.systemMessage).not.toMatch(/tickets:/);
    expect(payload.systemMessage).not.toMatch(/git:/);
  });

  it('JSON is well-formed (no trailing comma, escaped properly)', () => {
    installHook(sandbox);
    writeIndex(sandbox, ['aped-prd']);
    writeConfig(sandbox, {
      aped_version: '4.12.1',
      ticket_system: 'linear',
      git_provider: 'github',
    });
    const r = runHook(sandbox);
    expect(r.code).toBe(0);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });

  it('banner shows 0 skills when SKILL-INDEX.md has no aped-* entries (grep -c discipline)', () => {
    installHook(sandbox);
    const indexPath = join(sandbox, APED_DIR, 'skills', 'SKILL-INDEX.md');
    writeFileSync(indexPath, '# APED Skill Index\n\n<!-- AUTO-GENERATED -->\n\n');
    writeConfig(sandbox, { aped_version: '4.13.1', ticket_system: 'none', git_provider: 'github' });
    const r = runHook(sandbox);
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.systemMessage).toMatch(/0 skills indexed/);
  });

  it('escapes special characters (quotes, backslashes, newlines) in banner', () => {
    installHook(sandbox);
    // Inject an awkward provider name to test escaping. The yaml_get
    // helper strips quotes — single double-quote around a value is
    // tolerated; we test the post-strip raw value passes through escape.
    writeIndex(sandbox, ['aped-prd']);
    // Use a value with backslashes / quotes — config.yaml allows quoted
    // strings. The hook should escape these in the JSON output.
    writeConfig(sandbox, {
      aped_version: '4.12.1',
      ticket_system: '"value with \\"escaped\\" quotes"',
      git_provider: 'github',
    });
    const r = runHook(sandbox);
    expect(r.code).toBe(0);
    // Crucial: the JSON must still parse.
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });
});
