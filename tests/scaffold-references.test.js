import { describe, it, expect } from 'vitest';
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
const universe = new Set(all.map((t) => t.path));
const skills = all.filter((t) => /^\.aped\/aped-[\w-]+\/SKILL\.md$/.test(t.path));

// 4.2.1 contract — every Read/bash reference in a scaffolded SKILL.md must
// point at a path the scaffolder actually produces. Catches the missing-slash
// substitution bug (`{{APED_DIR}}aped-X/...` → `.apedaped-X/...`) and any
// future drift between skill bodies and the references / scripts / templates
// modules.
describe('scaffolded skill bodies reference real files (4.2.1 regression guard)', () => {
  it('returns at least 20 skill SKILL.md files (sanity)', () => {
    expect(skills.length).toBeGreaterThan(20);
  });

  it('no template path leaks the .apedaped- missing-slash bug', () => {
    const leakedPaths = [...universe].filter((p) => p.includes('.apedaped-'));
    expect(leakedPaths, 'no template path should expand the missing-slash bug').toEqual([]);
  });

  it('no skill body contains a .apedaped- reference', () => {
    for (const skill of skills) {
      const m = skill.content.match(/\.apedaped-[\w-]+/);
      expect(
        m,
        m ? `skill ${skill.path} contains broken reference: ${m[0]}` : '',
      ).toBeNull();
    }
  });

  it('every .aped/aped-X/{references,scripts}/<file> referenced in a skill body exists in the scaffold', () => {
    const PATTERN = /\.aped\/aped-[\w-]+\/(?:references|scripts)\/[\w./-]+\.\w+/g;
    const offenders = [];
    for (const skill of skills) {
      const refs = new Set();
      for (const m of skill.content.matchAll(PATTERN)) refs.add(m[0]);
      for (const r of refs) {
        if (!universe.has(r)) offenders.push(`${skill.path} -> ${r}`);
      }
    }
    expect(offenders, 'skill body references files not produced by scaffolder').toEqual([]);
  });

  it('every .aped/templates/<file> referenced in a skill body exists in the scaffold', () => {
    const PATTERN = /\.aped\/templates\/[\w./-]+\.\w+/g;
    const offenders = [];
    for (const skill of skills) {
      const refs = new Set();
      for (const m of skill.content.matchAll(PATTERN)) refs.add(m[0]);
      for (const r of refs) {
        if (!universe.has(r)) offenders.push(`${skill.path} -> ${r}`);
      }
    }
    expect(offenders, 'skill body references templates not produced by scaffolder').toEqual([]);
  });
});
