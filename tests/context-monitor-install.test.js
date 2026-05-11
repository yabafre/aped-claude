// Template-shape contract for the context-monitor opt-in install.
import { describe, it, expect } from 'vitest';
import { contextMonitorTemplates } from '../src/templates/optional-features.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';

describe('contextMonitorTemplates (6.7.0 install template)', () => {
  it('produces the hook script and a settings.local.json patch', () => {
    const tpls = contextMonitorTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    expect(tpls).toHaveLength(2);

    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/context-monitor.js`);
    expect(hook).toBeDefined();
    expect(hook.executable).toBe(true);
    expect(hook.content).toMatch(/CONTEXT WARNING/);
    expect(hook.content).toMatch(/CONTEXT CRITICAL/);
    expect(hook.content).toMatch(/WARNING_THRESHOLD = 35/);
    expect(hook.content).toMatch(/CRITICAL_THRESHOLD = 25/);

    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings.content);
    expect(parsed.hooks.PostToolUse).toBeDefined();
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('.*');
    expect(parsed.hooks.PostToolUse[0].hooks[0].timeout).toBe(10);
    expect(parsed.hooks.PostToolUse[0].hooks[0].command).toBe(
      `\${CLAUDE_PROJECT_DIR}/${APED_DIR}/hooks/context-monitor.js`,
    );
  });

  it('substitutes {{APED_DIR}} and {{OUTPUT_DIR}} consistently when paths are non-default', () => {
    const tpls = contextMonitorTemplates({ apedDir: 'aped', outputDir: 'docs/aped' });
    const hook = tpls.find((t) => t.path === 'aped/hooks/context-monitor.js');
    expect(hook).toBeDefined();
    // No raw template tokens left in the rendered hook.
    expect(hook.content).not.toMatch(/\{\{APED_DIR\}\}/);
    expect(hook.content).not.toMatch(/\{\{OUTPUT_DIR\}\}/);
    // Both resolved paths show up — the hook joins them at runtime via path.join.
    expect(hook.content).toContain("'aped'");
    expect(hook.content).toContain("'docs/aped'");
    expect(hook.content).toContain("'state.yaml'");
  });

  it('registers on every tool call (broad matcher — context burns everywhere)', () => {
    const tpls = contextMonitorTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    const parsed = JSON.parse(settings.content);
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('.*');
  });

  it('hook ships a disable-via-config gate readable from config.local.yaml first then config.yaml', () => {
    const tpls = contextMonitorTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/context-monitor.js`);
    expect(hook.content).toMatch(/context_monitor:\\s\*false/);
    // config.local.yaml must be probed first so per-developer disable beats team setting.
    const localIdx = hook.content.indexOf('config.local.yaml');
    const teamIdx = hook.content.indexOf('config.yaml');
    expect(localIdx).toBeLessThan(teamIdx);
  });

  it('hook computes 1M context window for opus 4-7 1m model id', () => {
    const tpls = contextMonitorTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/context-monitor.js`);
    expect(hook.content).toContain('1m context');
    expect(hook.content).toContain('1_000_000');
    expect(hook.content).toContain('200_000');
  });
});
