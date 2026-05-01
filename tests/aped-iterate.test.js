import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSkillContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

// Phase 1 contract for aped-iterate. 6.0.0: skill moved to directory format.
describe('aped-iterate skill contract', () => {
  const content = readSkillContent(SKILLS_DIR, 'aped-iterate');

  it('declares the required frontmatter keys', () => {
    // Frontmatter is the first --- block.
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    expect(match, 'frontmatter block exists').toBeTruthy();
    const frontmatter = match[1];

    expect(frontmatter).toMatch(/^name:\s*aped-iterate\s*$/m);
    expect(frontmatter).toMatch(/^keep-coding-instructions:\s*true\s*$/m);
    expect(frontmatter).toMatch(/^license:\s*MIT\s*$/m);
    // Description triggers must include the canonical phrases the spec
    // promised the skill would route on.
    expect(frontmatter).toMatch(/iterate/i);
    expect(frontmatter).toMatch(/post-ship/i);
    expect(frontmatter).toMatch(/after merge/i);
  });

  it('contains the Out-of-Scope KB Scan section', () => {
    expect(content).toMatch(/^## Out-of-Scope KB Scan\s*$/m);
    // K/O/U menu must be present so the integration matches the
    // canonical pattern from aped-from-ticket / aped-quick.
    expect(content).toMatch(/\[K\] Keep refusal/);
    expect(content).toMatch(/\[O\] Override/);
    expect(content).toMatch(/\[U\] Update/);
  });

  it('carries the Iron Law verbatim', () => {
    // The Iron Law is the load-bearing assertion of this router skill.
    // It must read exactly so future edits don't soften it into prose.
    expect(content).toMatch(/\*\*Classify FIRST, route SECOND\.\*\*/);
  });

  it('declares the disposition vs aped-course explicitly', () => {
    // The boundary between aped-iterate (post-ship) and aped-course
    // (mid-sprint) is non-obvious and must stay documented in the body.
    expect(content).toMatch(/## Disposition vs `aped-course`/);
    expect(content).toMatch(/Active worktree detected/);
  });
});
