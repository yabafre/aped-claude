import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { guardrail } from '../src/templates/guardrail.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_HOOKS = guardrail({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const GUARDRAIL_TPL = ALL_HOOKS.find((h) => h.path.endsWith('guardrail.sh'));

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-guardrail-test-'));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'hooks'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  const dest = join(root, GUARDRAIL_TPL.path);
  writeFileSync(dest, GUARDRAIL_TPL.content);
  chmodSync(dest, 0o755);
  return { root, hook: dest };
}

// Pipe a fake UserPromptSubmit JSON payload through the hook and capture
// stdout. The hook returns either an empty string (silent allow) or a
// JSON object with hookSpecificOutput.additionalContext when it warns.
function runHook(hook, prompt, root, env = {}) {
  // Trailing newline mirrors how Claude Code actually pipes the JSON payload
  // to the hook in production. Without it, the hook's `read -r` returns EOF
  // before reading a complete line and exits 0 silently — masking real bugs.
  const payload = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt }) + '\n';
  try {
    const out = execSync(`bash ${hook}`, {
      input: payload,
      env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return out;
  } catch (e) {
    throw new Error(`guardrail.sh exited ${e.status}: ${e.stderr}`);
  }
}

function writeStateWithStoryInReview(root) {
  writeFileSync(
    join(root, OUTPUT_DIR, 'state.yaml'),
    `pipeline:
  current_phase: "sprint"
  phases: {}
sprint:
  stories:
    1-1-foo:
      status: "review"
`,
  );
  // Scaffold a brief, prd, and epics file so guardrail's HAS_* detection mirrors
  // a real project (rules 2/3 are about missing artefacts and would otherwise
  // fire spuriously).
  writeFileSync(join(root, OUTPUT_DIR, 'product-brief.md'), '# brief');
  writeFileSync(join(root, OUTPUT_DIR, 'prd.md'), '# prd');
  writeFileSync(join(root, OUTPUT_DIR, 'epics.md'), '# epics');
}

function writeStateNoStoryInReview(root) {
  writeFileSync(
    join(root, OUTPUT_DIR, 'state.yaml'),
    `pipeline:
  current_phase: "sprint"
  phases: {}
sprint:
  stories: {}
`,
  );
  writeFileSync(join(root, OUTPUT_DIR, 'product-brief.md'), '# brief');
  writeFileSync(join(root, OUTPUT_DIR, 'prd.md'), '# prd');
  writeFileSync(join(root, OUTPUT_DIR, 'epics.md'), '# epics');
}

let sb;
beforeEach(() => { sb = setupSandbox(); });
afterEach(() => { rmSync(sb.root, { recursive: true, force: true }); });

describe('guardrail.sh — semantic intent detection', () => {
  it('the user-reported false-positive case emits no warning', () => {
    // The exact prompt that motivated this refactor. Bare-keyword matching
    // on "review" + "prd" used to trip PREMATURE_REVIEW; intent detection
    // now classifies it as conversational (connectors: "petite", "par
    // rapport à", "ta proposition") and stays silent.
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, 'bon petite review par rapport à ta proposition pour le prd', sb.root);
    expect(out).toBe('');
  });

  it('genuine /aped-review slash command still fires PREMATURE_REVIEW', () => {
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, '/aped-review', sb.root);
    expect(out).toContain('PREMATURE_REVIEW');
  });

  it('imperative-at-start short prompt is treated as command intent', () => {
    // "review this code please" — short, no connectors, starts with "review".
    // Acceptable trigger per the spec I/O matrix.
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, 'review this code please', sb.root);
    expect(out).toContain('PREMATURE_REVIEW');
  });

  it('imperative-not-at-start ("let me review...") does NOT fire', () => {
    // The prompt starts with "let me", not "review", so head_starts_with_any
    // returns false and no command intent is detected. No conversational
    // connector required for this case — head mismatch alone is enough.
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, 'let me review the architecture document with you', sb.root);
    expect(out).toBe('');
  });

  it('question form ("prd?") does NOT fire MISSING_ARTIFACT', () => {
    // Edge case from review: "prd?" used to collapse to "prd" via tr-strip
    // of all punctuation, then trimmed_equals_any matched. The trim now
    // preserves internal/trailing punctuation, and the helper bails on a
    // trailing "?" since questions are never command intent.
    writeFileSync(join(sb.root, OUTPUT_DIR, 'state.yaml'),
      `pipeline:\n  current_phase: "none"\n  phases: {}\nsprint:\n  stories: {}\n`);
    const out = runHook(sb.hook, 'prd?', sb.root);
    expect(out).toBe('');
  });

  it('single-word with trailing dot ("review.") still fires', () => {
    // Trailing terminators (. , ! :) are kept as command-ish.
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, 'review.', sb.root);
    expect(out).toContain('PREMATURE_REVIEW');
  });

  it('empty prompt exits silently', () => {
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, '', sb.root);
    expect(out).toBe('');
  });

  it('single-word "review" prompt counts as command intent', () => {
    // One-word commands are unambiguous.
    writeStateNoStoryInReview(sb.root);
    const out = runHook(sb.hook, 'review', sb.root);
    expect(out).toContain('PREMATURE_REVIEW');
  });

  it('conversational prompt about the prd does NOT fire MISSING_ARTIFACT', () => {
    // No prd scaffolded + conversational mention of "prd". Bare-keyword
    // logic would trip rule 2/3; intent detection should stay silent.
    writeFileSync(join(sb.root, OUTPUT_DIR, 'state.yaml'),
      `pipeline:\n  current_phase: "none"\n  phases: {}\nsprint:\n  stories: {}\n`);
    const out = runHook(sb.hook, 'tu peux résumer ta proposition pour le prd ?', sb.root);
    expect(out).toBe('');
  });
});
