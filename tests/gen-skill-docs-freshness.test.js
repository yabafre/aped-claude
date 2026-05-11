// Freshness gate for the skill template generator. Re-runs the generator
// in-process against every committed .tmpl and asserts byte-equality with
// the sibling .md. A failure means someone edited a .tmpl, or an .md, or a
// resolver body without running `npm run gen:skill-docs`.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate, findTmplFiles } from '../scripts/gen-skill-docs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SKILLS_DIR = join(REPO_ROOT, 'src/templates/skills');

const tmplFiles = findTmplFiles(SKILLS_DIR);

describe('gen-skill-docs freshness', () => {
  it('finds at least one .tmpl (sanity)', () => {
    expect(tmplFiles.length).toBeGreaterThan(0);
  });

  for (const tmplPath of tmplFiles) {
    const relPath = relative(REPO_ROOT, tmplPath);
    const mdPath = tmplPath.replace(/\.tmpl$/, '');
    const relMd = relative(REPO_ROOT, mdPath);

    it(`${relPath} → generated .md is in sync`, () => {
      const content = readFileSync(tmplPath, 'utf-8');
      const expected = renderTemplate(content, relPath);
      expect(existsSync(mdPath), `Missing sibling .md for ${relPath}`).toBe(true);
      const actual = readFileSync(mdPath, 'utf-8');
      if (actual === expected) {
        expect(actual).toBe(expected);
        return;
      }
      const a = actual.split('\n');
      const e = expected.split('\n');
      let firstDiff = -1;
      for (let i = 0; i < Math.max(a.length, e.length); i++) {
        if (a[i] !== e[i]) {
          firstDiff = i;
          break;
        }
      }
      throw new Error(
        `Stale generated file: ${relMd}\n` +
          `First diff at line ${firstDiff + 1}:\n` +
          `  expected: ${e[firstDiff] ?? '<EOF>'}\n` +
          `  actual:   ${a[firstDiff] ?? '<EOF>'}\n` +
          `Fix: npm run gen:skill-docs`,
      );
    });

    it(`${relMd} → AUTO-GENERATED marker present`, () => {
      const md = readFileSync(mdPath, 'utf-8');
      expect(md).toContain('<!-- AUTO-GENERATED');
    });
  }
});
