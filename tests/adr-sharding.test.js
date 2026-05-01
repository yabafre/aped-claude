// adr-sharding (v6.0.0+) — verifies that the scaffolder ships an ADR template
// and an empty adr/ directory under the output dir, and that aped-arch's
// step-04 + step-05 reference the ADR sharding pattern in their bodies.
//
// Pattern inspired by Matt Pocock's docs/adr/ convention (see references/pocock-skills/
// skills/engineering/grill-with-docs/ADR-FORMAT.md).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTemplates } from '../src/templates/index.js';

const config = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  projectName: 'demo',
  authorName: 'tester',
  communicationLang: 'english',
  documentLang: 'english',
  ticketSystem: 'linear',
  gitProvider: 'github',
  cliVersion: 'test',
};

const all = getTemplates(config);
const universe = new Map(all.map((t) => [t.path, t.content]));

describe('ADR sharding (v6.0.0)', () => {
  it('scaffolds the ADR template at .aped/templates/adr.md', () => {
    const adrTemplate = universe.get('.aped/templates/adr.md');
    expect(adrTemplate, '.aped/templates/adr.md must be in the scaffold').toBeDefined();
    expect(adrTemplate).toMatch(/Short title of the decision/);
    expect(adrTemplate).toMatch(/^## Context/m);
    expect(adrTemplate).toMatch(/^## Decision/m);
    expect(adrTemplate).toMatch(/^## Why/m);
  });

  it('scaffolds the docs/aped/adr/ directory via .gitkeep', () => {
    expect(universe.has('docs/aped/adr/.gitkeep'), 'docs/aped/adr/.gitkeep must be in the scaffold').toBe(true);
  });

  const SKILLS_DIR = join(import.meta.dirname, '..', 'src', 'templates', 'skills');

  it('aped-arch step-04 references ADR sharding with the 3 Pocock criteria', () => {
    const path = join(SKILLS_DIR, 'aped-arch', 'steps', 'step-04-technology-decisions.md');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/ADR SHARDING/);
    expect(content).toMatch(/Hard to reverse/);
    expect(content).toMatch(/Surprising without context/);
    expect(content).toMatch(/Real trade-off/i);
    expect(content).toMatch(/\{\{OUTPUT_DIR\}\}\/adr\//);
    expect(content).toMatch(/\{\{APED_DIR\}\}\/templates\/adr\.md/);
  });

  it('aped-arch step-05 instructs Council decisions to also write an ADR', () => {
    const path = join(SKILLS_DIR, 'aped-arch', 'steps', 'step-05-council-dispatch.md');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/ADR/);
    expect(content).toMatch(/\{\{OUTPUT_DIR\}\}\/adr\//);
  });

  it('aped-arch workflow.md mentions ADR sharding as a critical rule', () => {
    const path = join(SKILLS_DIR, 'aped-arch', 'workflow.md');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/ADR sharding/);
  });
});
