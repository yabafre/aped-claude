import { describe, it, expect } from 'vitest';
import { validateSafePath, UserError } from '../src/index.js';

describe('validateSafePath', () => {
  it('passes undefined/null/empty through unchanged', () => {
    expect(validateSafePath(undefined, 'x')).toBeUndefined();
    expect(validateSafePath(null, 'x')).toBeNull();
    expect(validateSafePath('', 'x')).toBe('');
  });

  it('accepts normal relative paths', () => {
    expect(validateSafePath('foo', 'x')).toBe('foo');
    expect(validateSafePath('foo/bar', 'x')).toBe('foo/bar');
    expect(validateSafePath('.aped', 'x')).toBe('.aped');
    expect(validateSafePath('docs/aped', 'x')).toBe('docs/aped');
    expect(validateSafePath('a/b/c/d', 'x')).toBe('a/b/c/d');
  });

  it('accepts dotted segments that are not exactly "..\"', () => {
    expect(validateSafePath('a/.../b', 'x')).toBe('a/.../b');
    expect(validateSafePath('.hidden', 'x')).toBe('.hidden');
    expect(validateSafePath('foo.bar', 'x')).toBe('foo.bar');
  });

  it('rejects non-string values', () => {
    expect(() => validateSafePath(42, 'field')).toThrow(UserError);
    expect(() => validateSafePath(42, 'field')).toThrow(/field must be a string/);
    expect(() => validateSafePath({}, 'field')).toThrow(UserError);
    expect(() => validateSafePath([], 'field')).toThrow(UserError);
    expect(() => validateSafePath(true, 'field')).toThrow(UserError);
  });

  it('rejects null bytes', () => {
    expect(() => validateSafePath('foo\0bar', 'x')).toThrow(/null byte/);
    expect(() => validateSafePath('\0', 'x')).toThrow(/null byte/);
  });

  it('rejects absolute POSIX paths', () => {
    expect(() => validateSafePath('/etc/passwd', 'x')).toThrow(/relative path/);
    expect(() => validateSafePath('/', 'x')).toThrow(/relative path/);
    expect(() => validateSafePath('/tmp/foo', 'x')).toThrow(/relative path/);
  });

  it('rejects paths with ".." segments (forward slash)', () => {
    expect(() => validateSafePath('..', 'x')).toThrow(/may not contain/);
    expect(() => validateSafePath('../foo', 'x')).toThrow(/may not contain/);
    expect(() => validateSafePath('foo/..', 'x')).toThrow(/may not contain/);
    expect(() => validateSafePath('foo/../bar', 'x')).toThrow(/may not contain/);
    expect(() => validateSafePath('a/b/../c', 'x')).toThrow(/may not contain/);
  });

  it('rejects paths with ".." segments (backslash, defense-in-depth)', () => {
    expect(() => validateSafePath('..\\foo', 'x')).toThrow(/may not contain/);
    expect(() => validateSafePath('foo\\..\\bar', 'x')).toThrow(/may not contain/);
  });

  it('includes the field name and offending value in error messages', () => {
    expect(() => validateSafePath('/etc', '--aped')).toThrow(/--aped/);
    expect(() => validateSafePath('/etc', '--aped')).toThrow(/\/etc/);
    expect(() => validateSafePath('../x', 'aped_path')).toThrow(/aped_path/);
  });
});
