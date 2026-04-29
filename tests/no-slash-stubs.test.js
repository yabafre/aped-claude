import { describe, it, expect } from 'vitest';
import { getTemplates } from '../src/templates/index.js';
import { configFiles } from '../src/templates/config.js';

// 4.0.0 contract: scaffolded templates must not contain any
// .claude/commands/aped-*.md stub, and the scaffolded aped/config.yaml
// must not carry a `commands_path` key. The two checks are independent —
// one guards the engine, the other guards the user-edited config surface.
describe('no slash-command stubs are scaffolded (4.0.0 contract)', () => {
  const config = {
    apedDir: '.aped',
    outputDir: 'docs/aped',
    projectName: 'demo',
    authorName: 'tester',
    communicationLang: 'english',
    documentLang: 'english',
    ticketSystem: 'none',
    gitProvider: 'github',
    cliVersion: '4.0.0',
  };

  it('emits no template under .claude/commands/', () => {
    const all = getTemplates(config);
    const stubs = all.filter((t) => t.path.startsWith('.claude/commands/'));
    expect(stubs).toEqual([]);
  });

  it('emits no aped-*.md template at the .claude root either', () => {
    const all = getTemplates(config);
    const slashStubs = all.filter((t) => /^\.claude\/.*aped-[a-z0-9-]+\.md$/.test(t.path));
    expect(slashStubs).toEqual([]);
  });

  it('scaffolded aped/config.yaml has no commands_path key', () => {
    const cfgFiles = configFiles(config);
    const yaml = cfgFiles.find((f) => f.path === '.aped/config.yaml');
    expect(yaml, '.aped/config.yaml is registered').toBeTruthy();
    expect(yaml.content).not.toMatch(/^[ \t]*commands_path[ \t]*:/m);
  });
});
