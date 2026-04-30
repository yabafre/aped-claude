import { describe, it, expect } from 'vitest';
import { worktreeScopeTemplates } from '../src/templates/optional-features.js';

const config = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  cliVersion: 'test',
};

// 4.7.0 — installer template for the opt-in worktree-scope hook. Same
// pattern as verifyClaimsTemplates / safeBashTemplates / typeScriptQualityTemplates.
describe('worktreeScopeTemplates (4.7.0 — P4)', () => {
  const templates = worktreeScopeTemplates(config);

  it('returns exactly two templates: the hook + the settings.local.json patch', () => {
    expect(templates).toHaveLength(2);
  });

  it('first template is the hook script with executable bit', () => {
    const hook = templates[0];
    expect(hook.path).toBe('.aped/hooks/worktree-scope.js');
    expect(hook.executable).toBe(true);
    expect(hook.content).toContain('APED worktree-scope');
    expect(hook.content).toContain('PreToolUse');
    expect(hook.content).toContain('CLAUDE_PROJECT_DIR');
  });

  it('second template is the settings.local.json hook entry', () => {
    const settings = templates[1];
    expect(settings.path).toBe('.claude/settings.local.json');
    const parsed = JSON.parse(settings.content);
    expect(parsed.hooks.PreToolUse).toBeTruthy();
    expect(parsed.hooks.PreToolUse).toHaveLength(1);
    const entry = parsed.hooks.PreToolUse[0];
    expect(entry.matcher).toBe('Write|Edit|MultiEdit');
    expect(entry.hooks).toHaveLength(1);
    expect(entry.hooks[0].type).toBe('command');
    expect(entry.hooks[0].command).toBe('${CLAUDE_PROJECT_DIR}/.aped/hooks/worktree-scope.js');
    expect(entry.hooks[0].timeout).toBe(5);
  });

  it('uses the configured apedDir (not hardcoded `.aped`)', () => {
    const customConfig = { ...config, apedDir: 'aped' };
    const customTemplates = worktreeScopeTemplates(customConfig);
    expect(customTemplates[0].path).toBe('aped/hooks/worktree-scope.js');
    const settings = JSON.parse(customTemplates[1].content);
    expect(settings.hooks.PreToolUse[0].hooks[0].command).toBe(
      '${CLAUDE_PROJECT_DIR}/aped/hooks/worktree-scope.js',
    );
  });
});
