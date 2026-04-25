import { describe, it, expect } from 'vitest';
import { skills } from '../src/templates/skills.js';
import { commands } from '../src/templates/commands.js';
import { configFiles } from '../src/templates/config.js';

const ctx = {
  apedDir: '.aped',
  outputDir: '.aped-out',
  commandsDir: '.claude/commands',
  cliVersion: '1.7.1',
  ticketSystem: 'linear',
  gitProvider: 'github',
  projectName: 'demo',
  authorName: 'fred',
  communicationLang: 'en',
  documentLang: 'en',
};

describe('aped-from-ticket wiring', () => {
  it('skills() includes aped-from-ticket with substituted placeholders', () => {
    const all = skills(ctx);
    const entry = all.find((s) => s.path === '.aped/aped-from-ticket/SKILL.md');
    expect(entry).toBeDefined();
    expect(entry.content).toContain('name: aped-from-ticket');
    expect(entry.content).not.toContain('{{APED_DIR}}');
    expect(entry.content).not.toContain('{{OUTPUT_DIR}}');
    expect(entry.content).not.toContain('{{CLI_VERSION}}');
    expect(entry.content).toContain('.aped/config.yaml');
  });

  it('commands() includes aped-from-ticket pointing to the matching SKILL.md', () => {
    const all = commands(ctx);
    const entry = all.find((c) => c.path === '.claude/commands/aped-from-ticket.md');
    expect(entry).toBeDefined();
    expect(entry.content).toContain('name: aped-from-ticket');
    expect(entry.content).toContain('argument-hint: "<ticket-id-or-url>"');
    expect(entry.content).toContain(
      '.aped/aped-from-ticket/SKILL.md',
    );
  });

  it('configFiles() emits a from_ticket section with the documented defaults', () => {
    const cfg = configFiles(ctx).find((f) => f.path === '.aped/config.yaml');
    expect(cfg).toBeDefined();
    expect(cfg.content).toMatch(/^from_ticket:/m);
    expect(cfg.content).toMatch(/^ {2}story_placement:/m);
    expect(cfg.content).toMatch(/^ {4}mode: ask$/m);
    expect(cfg.content).toMatch(/^ {4}bucket_epic: external-tickets$/m);
    expect(cfg.content).toMatch(/^ {2}ticket_comment:/m);
    expect(cfg.content).toMatch(/^ {4}enabled: false$/m);
    expect(cfg.content).toMatch(/^ {2}sprint_integration:/m);
    expect(cfg.content).toMatch(/^ {4}auto_add: false$/m);
    expect(cfg.content).toMatch(/^ {2}handoff:/m);
    expect(cfg.content).toMatch(/^ {4}after_story: ask$/m);
  });
});
