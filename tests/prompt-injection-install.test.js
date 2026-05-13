// Template-shape contract for the prompt-injection opt-in install (6.8.0).
import { describe, it, expect } from 'vitest';
import { promptInjectionTemplates } from '../src/templates/optional-features.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';

describe('promptInjectionTemplates (6.8.0 install template)', () => {
  it('produces the hook script and a settings.local.json patch', () => {
    const tpls = promptInjectionTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    expect(tpls).toHaveLength(2);

    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/prompt-injection.js`);
    expect(hook).toBeDefined();
    expect(hook.executable).toBe(true);
    expect(hook.content).toMatch(/READ INJECTION SCAN/);
    expect(hook.content).toMatch(/INJECTION_PATTERNS/);
    expect(hook.content).toMatch(/HIGH_SEVERITY_THRESHOLD = 3/);

    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings.content);
    expect(parsed.hooks.PostToolUse).toBeDefined();
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('.*');
    expect(parsed.hooks.PostToolUse[0].hooks[0].timeout).toBe(5);
    expect(parsed.hooks.PostToolUse[0].hooks[0].command).toBe(
      `\${CLAUDE_PROJECT_DIR}/${APED_DIR}/hooks/prompt-injection.js`,
    );
  });

  it('substitutes {{APED_DIR}} consistently when paths are non-default', () => {
    const tpls = promptInjectionTemplates({ apedDir: 'aped', outputDir: 'docs/aped' });
    const hook = tpls.find((t) => t.path === 'aped/hooks/prompt-injection.js');
    expect(hook).toBeDefined();
    expect(hook.content).not.toMatch(/\{\{APED_DIR\}\}/);
    expect(hook.content).toContain("'aped'");
  });

  it('uses broad PostToolUse matcher (hook filters on tool_name internally)', () => {
    const tpls = promptInjectionTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const settings = tpls.find((t) => t.path === '.claude/settings.local.json');
    const parsed = JSON.parse(settings.content);
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('.*');
  });

  it('hook ships a disable-via-config gate readable from config.local.yaml first then config.yaml', () => {
    const tpls = promptInjectionTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/prompt-injection.js`);
    expect(hook.content).toMatch(/prompt_injection:\\s\*false/);
    const localIdx = hook.content.indexOf('config.local.yaml');
    const teamIdx = hook.content.indexOf("'config.yaml'");
    expect(localIdx).toBeLessThan(teamIdx);
  });

  it('hook scans only Read tool output (tool_name === Read gate)', () => {
    const tpls = promptInjectionTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const hook = tpls.find((t) => t.path === `${APED_DIR}/hooks/prompt-injection.js`);
    expect(hook.content).toMatch(/data\.tool_name !== 'Read'/);
  });
});
