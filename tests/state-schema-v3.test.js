import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv/dist/2019.js';
import addFormats from 'ajv-formats';
import { configFiles } from '../src/templates/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 6.2.0 contract — the seeded state.yaml emitted by configFiles() must
// validate clean against the canonical v3 schema. The seed IS the
// canonical example: any divergence is either a schema bug or a seed
// bug. WARN-only at runtime; this test is the build-time gate.

const schemaPath = join(
  __dirname,
  '..',
  'src',
  'templates',
  'data',
  'state.yaml.schema.v3.json',
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const baseConfig = {
  apedDir: '.aped',
  outputDir: 'docs/aped',
  projectName: 'demo',
  authorName: 'tester',
  communicationLang: 'english',
  documentLang: 'english',
  ticketSystem: 'none',
  gitProvider: 'github',
  cliVersion: '6.2.0',
};

function getSeededState(overrides = {}) {
  const cfgFiles = configFiles({ ...baseConfig, ...overrides });
  const stateFile = cfgFiles.find((f) => f.path === 'docs/aped/state.yaml');
  if (!stateFile) throw new Error('seeded state.yaml not found in configFiles');
  return yaml.load(stateFile.content);
}

describe('state.yaml.schema.v3 — seeded state validates clean', () => {
  it('compiles without errors', () => {
    expect(validate.errors).toBeNull();
  });

  it('seeded state.yaml validates against the v3 schema', () => {
    const state = getSeededState();
    const ok = validate(state);
    expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('reports schema_version === 3 on the seeded state', () => {
    const state = getSeededState();
    expect(state.schema_version).toBe(3);
  });
});

describe('state.yaml.schema.v3 — drift fields are rejected', () => {
  it('rejects an invented sub-block under pipeline.phases.<phase>', () => {
    const state = getSeededState();
    state.pipeline.phases.ux = {
      status: 'in-progress',
      design_system: { primary: 'blue' }, // not in schema
    };
    expect(validate(state)).toBe(false);
  });

  it('rejects an out-of-taxonomy story status', () => {
    const state = getSeededState();
    state.sprint.stories['1-1-setup'] = { status: 'complete' }; // not in enum
    expect(validate(state)).toBe(false);
  });

  it('rejects a free-form story field (e.g. verdict / review_notes / dev_completed_at)', () => {
    const state = getSeededState();
    state.sprint.stories['1-1-setup'] = {
      status: 'done',
      verdict: 'approved',
      review_notes: 'lgtm',
      dev_completed_at: '2026-05-07T00:00:00Z',
    };
    expect(validate(state)).toBe(false);
  });

  it('rejects sprint.parallel_limit / sprint.review_limit (moved to config.yaml in v3)', () => {
    const state = getSeededState();
    state.sprint.parallel_limit = 3;
    expect(validate(state)).toBe(false);
  });

  it('rejects an unknown top-level block', () => {
    const state = getSeededState();
    state.councils_retired = ['security']; // invented
    expect(validate(state)).toBe(false);
  });
});

describe('state.yaml.schema.v3 — provider-shape latitude on ticket_sync', () => {
  it('accepts Linear-shaped projects + arbitrary keys (additionalProperties: true)', () => {
    const state = getSeededState();
    state.ticket_sync = {
      provider: 'linear',
      sync_id: 'abc',
      synced_at: '2026-05-07T00:00:00Z',
      sync_log: 'docs/sync-logs/2026-05-07.json',
      projects: { 'project-a': { name: 'Project A', id: 'lin_123', lead: 'alex' } },
      milestones: { 'epic-1': 'lin_milestone_1' },
      modified_tickets: [],
      totals: { issues_created: 5 },
      // Provider-specific extension that schema can't predict:
      cycle_id: 'lin_cycle_42',
    };
    expect(validate(state)).toBe(true);
  });

  it('accepts a populated sprint.stories shape', () => {
    const state = getSeededState();
    state.sprint = {
      project: 'demo',
      active_epic: 1,
      umbrella_branch: 'sprint/epic-1',
      stories: {
        '1-1-setup': {
          status: 'in-progress',
          ticket: 'LIN-123',
          worktree: '.worktrees/1-1-setup',
          branch: 'feature/lin-123-setup',
          depends_on: [],
          started_at: '2026-05-07T10:00:00Z',
          merged_into_umbrella: false,
        },
        '1-2-auth': {
          status: 'done',
          ticket: 'LIN-124',
          worktree: null,
          depends_on: ['1-1-setup'],
          started_at: '2026-05-07T11:00:00Z',
          merged_into_umbrella: true,
        },
      },
    };
    expect(validate(state), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });
});
