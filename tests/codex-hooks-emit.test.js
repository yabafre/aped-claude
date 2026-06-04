// Pure-builder contract for .codex/hooks.json projection from Claude hooks.
import { describe, it, expect } from 'vitest';
import { buildCodexHooksJson } from '../src/templates/codex.js';

// Shape mirrors what APED's opt-in features merge into settings.local.json.
const CLAUDE_HOOKS = {
  PreToolUse: [
    { matcher: 'Bash', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.aped/hooks/safe-bash.js', timeout: 3 }] },
    { matcher: 'Write|Edit|MultiEdit', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.aped/hooks/worktree-scope.js', timeout: 5 }] },
  ],
  PostToolUse: [
    { matcher: 'Bash', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.aped/hooks/verify-claims.js', timeout: 8 }] },
    { matcher: 'Write|Edit|MultiEdit', hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.aped/hooks/tdd-red-marker.js', timeout: 6 }] },
  ],
  SessionStart: [
    { matcher: 'startup|clear|compact', hooks: [{ type: 'command', command: 'bash ${CLAUDE_PROJECT_DIR}/.aped/hooks/session-start.sh', timeout: 30 }] },
  ],
};

describe('buildCodexHooksJson', () => {
  const parsed = JSON.parse(buildCodexHooksJson(CLAUDE_HOOKS));

  it('wraps events under a top-level "hooks" key', () => {
    expect(parsed.hooks).toBeDefined();
    expect(parsed.hooks.PreToolUse).toBeInstanceOf(Array);
  });

  it('keeps Bash matchers 1:1 and rewrites commands cwd-relative', () => {
    const pre = parsed.hooks.PreToolUse.find((g) => g.matcher === 'Bash');
    expect(pre.hooks[0].command).toBe('.aped/hooks/safe-bash.js');
    expect(pre.hooks[0].timeout).toBe(3);
    const post = parsed.hooks.PostToolUse.find((g) => g.matcher === 'Bash');
    expect(post.hooks[0].command).toBe('.aped/hooks/verify-claims.js');
  });

  it('preserves the Write|Edit matcher (advisory-inert under Codex, but conventional)', () => {
    const g = parsed.hooks.PreToolUse.find((x) => x.matcher === 'Write|Edit|MultiEdit');
    expect(g).toBeDefined();
    expect(g.hooks[0].command).toBe('.aped/hooks/worktree-scope.js');
  });

  it('rewrites the SessionStart matcher to Codex session events and unwraps bash command', () => {
    const ss = parsed.hooks.SessionStart[0];
    expect(ss.matcher).toBe('startup|resume');
    expect(ss.hooks[0].command).toBe('bash .aped/hooks/session-start.sh');
  });

  it('never leaves a CLAUDE_PROJECT_DIR literal anywhere', () => {
    expect(JSON.stringify(parsed)).not.toMatch(/CLAUDE_PROJECT_DIR/);
  });

  it('drops matcher for UserPromptSubmit and Stop', () => {
    const out = JSON.parse(buildCodexHooksJson({
      UserPromptSubmit: [{ matcher: 'whatever', hooks: [{ type: 'command', command: '.aped/x.js' }] }],
      Stop: [{ matcher: 'foo', hooks: [{ type: 'command', command: '.aped/y.js' }] }],
    }));
    expect(out.hooks.UserPromptSubmit[0].matcher).toBeUndefined();
    expect(out.hooks.Stop[0].matcher).toBeUndefined();
  });

  it('skips non-command handlers and unknown events', () => {
    const out = buildCodexHooksJson({
      PostToolUse: [{ matcher: 'Bash', hooks: [{ type: 'prompt', command: 'x' }] }],
      Notification: [{ hooks: [{ type: 'command', command: 'x' }] }],
    });
    expect(out).toBeNull();
  });

  it('returns null when there are no hooks', () => {
    expect(buildCodexHooksJson({})).toBeNull();
    expect(buildCodexHooksJson(undefined)).toBeNull();
  });
});
