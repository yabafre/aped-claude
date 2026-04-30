// Template-shape contract for the tdd-red-marker opt-in install.
import { describe, it, expect } from 'vitest';
import { tddRedMarkerTemplates } from '../src/templates/optional-features.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';

describe('tddRedMarkerTemplates (4.10.0 install template)', () => {
  it('produces the hook script and a settings.local.json patch', () => {
    const tpls = tddRedMarkerTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    expect(tpls).toHaveLength(2);

    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/tdd-red-marker.js`);
    expect(hook).toBeDefined();
    expect(hook.executable).toBe(true);
    expect(hook.content).toMatch(/Pocock workshop discipline/);
    expect(hook.content).toMatch(/Confirmed RED:/);

    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings.content);
    expect(parsed.hooks.PostToolUse).toBeDefined();
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('Write|Edit|MultiEdit');
    expect(parsed.hooks.PostToolUse[0].hooks[0].timeout).toBe(6);
    expect(parsed.hooks.PostToolUse[0].hooks[0].command).toBe(
      `\${CLAUDE_PROJECT_DIR}/${APED_DIR}/hooks/tdd-red-marker.js`
    );
  });

  it('substitutes {{APED_DIR}} consistently when apedDir is non-default', () => {
    const tpls = tddRedMarkerTemplates({ apedDir: 'aped', outputDir: 'docs/aped' });
    const hook = tpls.find((t) => t.path === 'aped/hooks/tdd-red-marker.js');
    expect(hook).toBeDefined();
    // The hook source itself doesn't reference APED_DIR (it discovers via
    // payload), so substitution shouldn't change much — but the path must
    // reflect the chosen apedDir.
    expect(hook.path.startsWith('aped/')).toBe(true);
  });

  it('does NOT register itself for Bash tool (correct matcher scope)', () => {
    const tpls = tddRedMarkerTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    const parsed = JSON.parse(settings.content);
    // Matcher should NOT include Bash — that's verify-claims's territory.
    expect(parsed.hooks.PostToolUse[0].matcher).not.toMatch(/Bash/);
  });

  it('hook code uses test-path heuristics that cover .test, .spec, _test, test_, .e2e, .cy, /__tests__/, /spec/', () => {
    const tpls = tddRedMarkerTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/tdd-red-marker.js`);
    const c = hook.content;
    expect(c).toMatch(/\\.test\\.\[jt\]sx\?\$/);
    expect(c).toMatch(/\\.spec\\.\[jt\]sx\?\$/);
    expect(c).toMatch(/_test\\.go\$/);
    expect(c).toMatch(/test_\[\^\/\]\+\\.py\$/);
    expect(c).toMatch(/\\.e2e\\.\[jt\]sx\?\$/);
    expect(c).toMatch(/\\.cy\\.\[jt\]sx\?\$/);
    expect(c).toMatch(/__tests__/);
    expect(c).toMatch(/\\\/spec\\\//);
  });
});
