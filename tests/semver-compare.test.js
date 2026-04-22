import { describe, it, expect } from 'vitest';
import { semverCompare } from '../src/index.js';

describe('semverCompare', () => {
  it('returns 0 for identical versions', () => {
    expect(semverCompare('1.2.3', '1.2.3')).toBe(0);
    expect(semverCompare('0.0.0', '0.0.0')).toBe(0);
    expect(semverCompare('10.20.30', '10.20.30')).toBe(0);
  });

  it('compares major versions', () => {
    expect(semverCompare('2.0.0', '1.0.0')).toBe(1);
    expect(semverCompare('1.0.0', '2.0.0')).toBe(-1);
    expect(semverCompare('10.0.0', '9.99.99')).toBe(1);
  });

  it('compares minor versions when major is equal', () => {
    expect(semverCompare('1.2.0', '1.1.0')).toBe(1);
    expect(semverCompare('1.1.0', '1.2.0')).toBe(-1);
    expect(semverCompare('3.7.0', '3.5.9')).toBe(1);
  });

  it('compares patch versions when major and minor are equal', () => {
    expect(semverCompare('1.2.4', '1.2.3')).toBe(1);
    expect(semverCompare('1.2.3', '1.2.4')).toBe(-1);
    expect(semverCompare('3.7.1', '3.7.0')).toBe(1);
  });

  it('treats missing segments as 0', () => {
    expect(semverCompare('1.0', '1.0.0')).toBe(0);
    expect(semverCompare('1', '1.0.0')).toBe(0);
    expect(semverCompare('1.0.0', '1')).toBe(0);
    expect(semverCompare('2', '1.9.9')).toBe(1);
    expect(semverCompare('1.0.0', '1.0.1')).toBe(-1);
  });

  it('real-world upgrade paths', () => {
    // v3.5.x → v3.7.0 upgrade detection
    expect(semverCompare('3.7.0', '3.5.9')).toBe(1);
    expect(semverCompare('3.5.9', '3.7.0')).toBe(-1);
    // v3.7.0 → v3.7.1 patch
    expect(semverCompare('3.7.1', '3.7.0')).toBe(1);
    // installed newer than CLI
    expect(semverCompare('3.6.0', '3.7.0')).toBe(-1);
  });
});
