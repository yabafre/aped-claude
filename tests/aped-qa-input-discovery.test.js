import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');
const SKILL = readSkillContent(SKILLS_DIR, 'aped-qa');

// 4.2.1 contract — aped-qa now ships a standard Input Discovery block
// before Scope Selection (paralleling aped-dev / aped-prd / aped-arch /
// aped-epics). Pre-4.2.1 the skill jumped from Setup straight to Scope
// Selection with no story-existence guard and no framework-detection HALT,
// so the agent could invent ACs and pick the wrong framework.
describe('aped-qa Input Discovery contract (4.2.1)', () => {
  it('declares an Input Discovery section between Setup and Scope Selection', () => {
    const idxSetup = SKILL.indexOf('\n## Setup\n');
    const idxDiscovery = SKILL.indexOf('\n## Input Discovery\n');
    const idxScope = SKILL.indexOf('\n## Scope Selection\n');
    expect(idxSetup).toBeGreaterThan(0);
    expect(idxDiscovery, 'Input Discovery section is present').toBeGreaterThan(idxSetup);
    expect(idxScope, 'Scope Selection comes after Input Discovery').toBeGreaterThan(idxDiscovery);
  });

  it('declares glob discovery locations', () => {
    const section = SKILL.slice(SKILL.indexOf('## Input Discovery'));
    expect(section).toMatch(/\{\{OUTPUT_DIR\}\}\/\*\*/);
    expect(section).toMatch(/\{\{APED_DIR\}\}\/\*\*/);
    expect(section).toMatch(/docs\/\*\*/);
  });

  it('declares a required-input HALT for completed story files', () => {
    const section = SKILL.slice(SKILL.indexOf('## Input Discovery'));
    // ✱ marker on the required artefact
    expect(section).toMatch(/✱[^\n]*stor/i);
    // HALT keyword present in this section, with the no-story message
    expect(section).toMatch(/HALT/);
    expect(section).toMatch(/[Nn]o (?:completed )?story/);
  });

  it('declares a framework-detection HALT covering the major ecosystems', () => {
    const section = SKILL.slice(SKILL.indexOf('## Input Discovery'));
    expect(section).toMatch(/[Ff]ramework detection/);
    expect(section).toMatch(/HALT/);
    // Mentions the specific framework markers the discovery looks for
    expect(section).toMatch(/playwright/i);
    expect(section).toMatch(/cypress/i);
    expect(section).toMatch(/vitest/i);
    expect(section).toMatch(/pytest/i);
    expect(section).toMatch(/package\.json/);
    expect(section).toMatch(/pyproject\.toml/);
  });

  it('halts with a [C] continuation menu and a discovery report', () => {
    const section = SKILL.slice(SKILL.indexOf('## Input Discovery'));
    expect(section).toMatch(/\[C\] Continue/);
    expect(section).toMatch(/⏸/);
    expect(section).toMatch(/Discovery report/);
  });
});
