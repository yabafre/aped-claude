import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'src', 'templates', 'skills');
const SCHEMA_PATH = join(ROOT, 'src', 'templates', 'data', 'state.yaml.schema.v3.json');

// 6.2.0 contract — skill body prose that names a state.yaml field must
// reference a field actually in the v3 schema. Otherwise the skill is
// teaching the runtime to invent drift, which is exactly what spec S
// is closing.
//
// Two patterns are extracted:
//   sprint.stories.{KEY}.<field>       → must be a key of story properties
//   pipeline.phases.<phase>.<field>    → must be a key of phase properties
//
// Allowlisted fields cover prose where the literal token doubles as a
// taxonomy label (e.g. "ticket_sync" appears as both a state field and a
// status value).

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));

const STORY_FIELDS = new Set(Object.keys(schema.$defs.story.properties));
const PHASE_FIELDS = new Set(Object.keys(schema.$defs.phase.properties));

const STORY_FIELD_ALLOWLIST = new Set([
  // Status appears in many forms (status: ready-for-dev, etc.); the schema
  // models status — adding here is no-op, just makes intent explicit.
]);

const PHASE_FIELD_ALLOWLIST = new Set([
  // Phase fields documented in the schema cover the canonical surface;
  // any genuine drift surfaces here.
]);

function walkMd(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkMd(full, out);
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

const allFiles = walkMd(SKILLS_DIR)
  .filter((p) => !relative(SKILLS_DIR, p).startsWith('aped-skills/'))
  .map((abs) => ({
    abs,
    rel: relative(SKILLS_DIR, abs).replace(/\\/g, '/'),
    content: readFileSync(abs, 'utf-8'),
  }));

const STORY_FIELD_RE = /\bsprint\.stories\.(?:\{[^}]+\}|[A-Za-z0-9_-]+)\.([a-z][a-z_]*)\b/g;
const PHASE_FIELD_RE = /\bpipeline\.phases\.[a-z][a-z0-9_]*\.([a-z][a-z_]*)\b/g;

describe('skill bodies reference only schema-known story fields (6.2.0 S)', () => {
  it.each(allFiles.map((f) => [f.rel, f]))(
    '%s: every sprint.stories.<key>.<field> mention is in the v3 schema',
    (_rel, file) => {
      const violations = new Set();
      for (const m of file.content.matchAll(STORY_FIELD_RE)) {
        const field = m[1];
        if (STORY_FIELDS.has(field)) continue;
        if (STORY_FIELD_ALLOWLIST.has(field)) continue;
        violations.add(field);
      }
      expect(
        Array.from(violations),
        `${_rel}: unknown story field(s) -> ${Array.from(violations).join(', ')}\n  Allowed: ${Array.from(STORY_FIELDS).join(', ')}`,
      ).toEqual([]);
    },
  );
});

describe('skill bodies reference only schema-known phase fields (6.2.0 S)', () => {
  it.each(allFiles.map((f) => [f.rel, f]))(
    '%s: every pipeline.phases.<phase>.<field> mention is in the v3 schema',
    (_rel, file) => {
      const violations = new Set();
      for (const m of file.content.matchAll(PHASE_FIELD_RE)) {
        const field = m[1];
        if (PHASE_FIELDS.has(field)) continue;
        if (PHASE_FIELD_ALLOWLIST.has(field)) continue;
        violations.add(field);
      }
      expect(
        Array.from(violations),
        `${_rel}: unknown phase field(s) -> ${Array.from(violations).join(', ')}\n  Allowed: ${Array.from(PHASE_FIELDS).join(', ')}`,
      ).toEqual([]);
    },
  );
});
