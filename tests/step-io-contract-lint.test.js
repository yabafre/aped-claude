// step-io-contract-lint (v6.0.0+) — enforces typed I/O frontmatter on every
// step file under aped-*/steps/. Aligns APED with Anthropic's "code execution
// with MCP" pattern (typed tools as first-class citizens) and Carlini's "be
// strict about machine-readable contracts" lesson. The frontmatter declares
// what the step reads and writes so future tooling (audit, MCP, dependency
// graph) can reason about it without parsing prose.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(import.meta.dirname, '..', 'src', 'templates', 'skills');

function listStepFiles() {
  const out = [];
  for (const skill of readdirSync(SKILLS_DIR)) {
    if (!skill.startsWith('aped-') || skill === 'aped-skills') continue;
    const stepsDir = join(SKILLS_DIR, skill, 'steps');
    if (!existsSync(stepsDir)) continue;
    for (const f of readdirSync(stepsDir).sort()) {
      if (!/^step-\d+-.+\.md$/.test(f)) continue;
      const content = readFileSync(join(stepsDir, f), 'utf8');
      out.push({ skill, file: f, content });
    }
  }
  return out;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return content.slice(4, end);
}

describe('step I/O contract lint (v6.0.0)', () => {
  const steps = listStepFiles();

  it('discovers step files in decomposed phase skills', () => {
    expect(steps.length).toBeGreaterThanOrEqual(82);
  });

  for (const { skill, file, content } of steps) {
    describe(`${skill}/${file}`, () => {
      const fm = parseFrontmatter(content);

      it('starts with YAML frontmatter', () => {
        expect(fm, `${skill}/${file} must start with --- frontmatter block`).not.toBeNull();
      });

      it('declares the step number', () => {
        if (!fm) return;
        const stepNumMatch = fm.match(/^step:\s*(\d+)\s*$/m);
        expect(stepNumMatch, `${skill}/${file} must declare \`step: <int>\``).not.toBeNull();
        const fileStepNum = parseInt(file.match(/^step-(\d+)/)[1], 10);
        expect(parseInt(stepNumMatch[1], 10)).toBe(fileStepNum);
      });

      it('declares reads (array, possibly empty)', () => {
        if (!fm) return;
        expect(fm).toMatch(/^reads:/m);
      });

      it('declares writes (array, possibly empty)', () => {
        if (!fm) return;
        expect(fm).toMatch(/^writes:/m);
      });

      it('declares mutates_state (boolean)', () => {
        if (!fm) return;
        const m = fm.match(/^mutates_state:\s*(true|false)\s*$/m);
        expect(m, `${skill}/${file} must declare \`mutates_state: true|false\``).not.toBeNull();
      });

      it('reads/writes entries follow the path syntax', () => {
        if (!fm) return;
        // Quick sanity scan: any quoted entry under reads:/writes: should match
        // a known prefix. Not exhaustive — just catches typos.
        const validPrefixes = [
          '{{OUTPUT_DIR}}', '{{APED_DIR}}',
          'state.yaml', 'config.yaml',
          'git/', 'tasks', 'subagent/', 'mcp/', 'ticket/', 'pr/',
          'src/', 'tests/', 'docs/',
        ];
        const entryRe = /^\s+-\s+"([^"]+)"\s*$/gm;
        let match;
        while ((match = entryRe.exec(fm)) !== null) {
          const entry = match[1];
          const ok = validPrefixes.some((p) => entry.startsWith(p));
          expect(ok, `${skill}/${file} entry "${entry}" must start with a known prefix (${validPrefixes.join(', ')})`).toBe(true);
        }
      });
    });
  }
});
