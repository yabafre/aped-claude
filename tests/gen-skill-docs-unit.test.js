// Unit tests for the skill template generator. Pin the canonical resolver
// bodies, assert error behaviour for malformed placeholders, and cover the
// frontmatter detection edge cases (CRLF, mid-file HR).
import { describe, it, expect } from 'vitest';
import { renderTemplate, RESOLVERS } from '../scripts/gen-skill-docs.mjs';

const CTX = { name: 'X', file: 'test.tmpl', line: 1 };

describe('resolver bodies (canonical)', () => {
  it('ACTIVATION_GUARD emits the verbatim 6.2.0 line', () => {
    const out = RESOLVERS.ACTIVATION_GUARD([], CTX);
    expect(out).toBe(
      '**Activation guard (6.2.0):** Before any other action, run `bash {{APED_DIR}}/scripts/check-enabled.sh`. If it exits non-zero, print "APED disabled — run aped-method enable" and HALT.',
    );
  });

  it('CONFIG_PREAMBLE emits the 9-line expanded block', () => {
    const out = RESOLVERS.CONFIG_PREAMBLE([], CTX);
    expect(out.split('\n')).toHaveLength(9);
    expect(out).toContain('Before any other action, read `{{APED_DIR}}/config.yaml`');
    expect(out).toContain('✅ YOU MUST speak `{communication_language}`');
    expect(out).toContain('✅ YOU MUST write artefact content');
    expect(out).toContain('npx aped-method');
  });

  it('CONFIG_PREAMBLE_INLINE names the artefact in the canonical shape', () => {
    const out = RESOLVERS.CONFIG_PREAMBLE_INLINE(['glossary.md'], CTX);
    expect(out).toBe(
      'Read `{{APED_DIR}}/config.yaml` and resolve `{user_name}` / `{communication_language}` / `{document_output_language}`. ✅ YOU MUST speak in `{communication_language}` and write `glossary.md` in `{document_output_language}`. HALT if config is missing.',
    );
  });

  it('LANGUAGE_DIRECTIVE emits the two ✅ YOU MUST lines', () => {
    const out = RESOLVERS.LANGUAGE_DIRECTIVE([], CTX);
    expect(out).toBe(
      '✅ YOU MUST speak `{communication_language}` in every message to the user.\n✅ YOU MUST write artefact content in `{document_output_language}`.',
    );
  });
});

describe('arity validation', () => {
  it('ACTIVATION_GUARD rejects args', () => {
    expect(() => RESOLVERS.ACTIVATION_GUARD(['extra'], CTX)).toThrow(/requires 0 arg/);
  });

  it('CONFIG_PREAMBLE_INLINE rejects zero args', () => {
    expect(() => RESOLVERS.CONFIG_PREAMBLE_INLINE([], CTX)).toThrow(/requires 1 arg/);
  });

  it('CONFIG_PREAMBLE_INLINE rejects empty-string arg', () => {
    expect(() => RESOLVERS.CONFIG_PREAMBLE_INLINE([''], CTX)).toThrow(/non-empty/);
  });

  it('CONFIG_PREAMBLE_INLINE rejects multi-arg', () => {
    expect(() => RESOLVERS.CONFIG_PREAMBLE_INLINE(['a', 'b'], CTX)).toThrow(/requires 1 arg.*got 2/);
  });
});

describe('renderTemplate placeholders', () => {
  it('passes scaffold-time placeholders through untouched', () => {
    const tmpl = '---\nname: x\n---\nHello {{APED_DIR}} and {{CLI_VERSION}}.';
    const out = renderTemplate(tmpl, 'test.tmpl');
    expect(out).toContain('{{APED_DIR}}');
    expect(out).toContain('{{CLI_VERSION}}');
  });

  it('throws on scaffold-time placeholder with args', () => {
    const tmpl = '---\nname: x\n---\n{{APED_DIR:something}}';
    expect(() => renderTemplate(tmpl, 'test.tmpl')).toThrow(/does not accept args/);
  });

  it('throws on unknown placeholder with file:line', () => {
    const tmpl = '---\nname: x\n---\n\nbody\n{{UNKNOWN_PLACEHOLDER}}\n';
    expect(() => renderTemplate(tmpl, 'foo.tmpl')).toThrow(/Unknown placeholder \{\{UNKNOWN_PLACEHOLDER\}\} at foo\.tmpl:6/);
  });

  it('ignores single-letter user-prose tokens like {{N}}', () => {
    const tmpl = '---\nname: x\n---\nReport `{{N}}` candidates.';
    const out = renderTemplate(tmpl, 'test.tmpl');
    expect(out).toContain('{{N}}');
  });

  it('resolves multiple placeholders in one file', () => {
    const tmpl = '---\nname: x\n---\n{{ACTIVATION_GUARD}}\n\n{{LANGUAGE_DIRECTIVE}}';
    const out = renderTemplate(tmpl, 'test.tmpl');
    expect(out).toContain('Activation guard (6.2.0)');
    expect(out).toContain('YOU MUST speak');
  });
});

describe('AUTO-GENERATED marker placement', () => {
  it('places marker on the line after closing --- when frontmatter present', () => {
    const tmpl = '---\nname: x\n---\n\nbody.\n';
    const out = renderTemplate(tmpl, 'test.tmpl');
    const lines = out.split('\n');
    expect(lines[0]).toBe('---');
    expect(lines[1]).toBe('name: x');
    expect(lines[2]).toBe('---');
    expect(lines[3]).toContain('AUTO-GENERATED from test.tmpl');
  });

  it('prepends marker when no frontmatter', () => {
    const tmpl = 'plain body.\n';
    const out = renderTemplate(tmpl, 'test.tmpl');
    expect(out.startsWith('<!-- AUTO-GENERATED')).toBe(true);
  });

  it('handles CRLF frontmatter without corruption', () => {
    const tmpl = '---\r\nname: x\r\n---\r\n\r\nbody.\r\n';
    const out = renderTemplate(tmpl, 'test.tmpl');
    // Marker comes after the closing ---, never before the opening one.
    const fmClose = out.indexOf('---\r\n', 4);
    const markerIdx = out.indexOf('<!-- AUTO-GENERATED');
    expect(markerIdx).toBeGreaterThan(fmClose);
  });

  it('does not confuse a mid-file --- (markdown HR) with frontmatter close', () => {
    const tmpl = '---\nname: x\n---\n\nopening body.\n\n---\n\nsection after HR.\n';
    const out = renderTemplate(tmpl, 'test.tmpl');
    const lines = out.split('\n');
    // Marker on line 4 (after the real closing ---), HR on line 8 untouched.
    expect(lines[3]).toContain('AUTO-GENERATED');
    expect(out).toMatch(/opening body\.\n\n---\n\nsection after HR/);
  });
});
