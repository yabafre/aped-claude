import { describe, it, expect } from 'vitest';
import { configFiles } from '../src/templates/config.js';

// Phase 1 contract: every fresh scaffold ships an empty out-of-scope KB
// (only the README), regardless of apedDir / outputDir customizations.
// The README content must render template-literal backticks correctly
// — early implementation had an escape-pollution regression that emitted
// literal `\`\`\`` in place of triple backticks.
describe('out-of-scope KB scaffolds correctly', () => {
  const config = {
    apedDir: '.aped',
    outputDir: 'docs/aped',
    projectName: 'demo',
    authorName: 'tester',
    communicationLang: 'english',
    documentLang: 'english',
    ticketSystem: 'none',
    gitProvider: 'github',
    cliVersion: '4.2.0',
  };

  it('emits .aped/.out-of-scope/README.md', () => {
    const files = configFiles(config);
    const oos = files.find((f) => f.path === '.aped/.out-of-scope/README.md');
    expect(oos, '.aped/.out-of-scope/README.md is registered').toBeTruthy();
    expect(oos.content).toMatch(/Out-of-scope knowledge base/);
    expect(oos.content).toMatch(/concept:/);
    expect(oos.content).toMatch(/Prior requests/);
    expect(oos.content).toMatch(/\[K\]`?\s*Keep the refusal/);
    expect(oos.content).toMatch(/\[O\]`?\s*Override/);
    expect(oos.content).toMatch(/\[U\]`?\s*Update/);
  });

  it('respects a custom apedDir', () => {
    const custom = { ...config, apedDir: '.custom-aped' };
    const files = configFiles(custom);
    const oos = files.find(
      (f) => f.path === '.custom-aped/.out-of-scope/README.md',
    );
    expect(oos, '.out-of-scope/README.md follows apedDir').toBeTruthy();
  });

  it('renders triple-backtick markdown fences correctly (anti-regression)', () => {
    const files = configFiles(config);
    const oos = files.find((f) => f.path === '.aped/.out-of-scope/README.md');
    // The README documents the entry format using a fenced markdown block.
    // The source uses `\`\`\`` to escape the backticks inside a template
    // literal; an over-escaped variant (`\\\`\\\`\\\``) leaks literal
    // backslashes into the rendered file. Catch that explicitly.
    expect(oos.content).toMatch(/```markdown/);
    expect(oos.content).not.toMatch(/\\`\\`\\`/);
  });

  it('is the only out-of-scope file emitted (KB ships empty)', () => {
    const files = configFiles(config);
    const oosFiles = files.filter((f) =>
      f.path.includes('/.out-of-scope/'),
    );
    expect(oosFiles).toHaveLength(1);
    expect(oosFiles[0].path).toMatch(/\/\.out-of-scope\/README\.md$/);
  });
});
