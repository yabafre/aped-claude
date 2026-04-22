import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/index.js';

// parseArgs reads from position 2 of the array (node, script, ...flags), so
// every test prefixes two placeholder strings.
const argv = (...flags) => ['node', 'aped-method', ...flags];

describe('parseArgs', () => {
  it('returns an empty result when no flags are given', () => {
    expect(parseArgs(argv())).toEqual({ _unknown: [] });
  });

  it('parses --yes and -y', () => {
    expect(parseArgs(argv('--yes'))).toEqual({ _unknown: [], yes: true });
    expect(parseArgs(argv('-y'))).toEqual({ _unknown: [], yes: true });
  });

  it('parses --update / -u into mode: "update"', () => {
    expect(parseArgs(argv('--update'))).toEqual({ _unknown: [], mode: 'update' });
    expect(parseArgs(argv('-u'))).toEqual({ _unknown: [], mode: 'update' });
  });

  it('parses --fresh and --force into mode: "fresh"', () => {
    expect(parseArgs(argv('--fresh'))).toEqual({ _unknown: [], mode: 'fresh' });
    expect(parseArgs(argv('--force'))).toEqual({ _unknown: [], mode: 'fresh' });
  });

  it('parses --version / -v / --help / -h / --debug', () => {
    expect(parseArgs(argv('--version'))).toEqual({ _unknown: [], version: true });
    expect(parseArgs(argv('-v'))).toEqual({ _unknown: [], version: true });
    expect(parseArgs(argv('--help'))).toEqual({ _unknown: [], help: true });
    expect(parseArgs(argv('-h'))).toEqual({ _unknown: [], help: true });
    expect(parseArgs(argv('--debug'))).toEqual({ _unknown: [], debug: true });
  });

  it('parses --key=value flags into the args map', () => {
    expect(parseArgs(argv('--project=my-app'))).toEqual({
      _unknown: [],
      project: 'my-app',
    });
    expect(parseArgs(argv('--author=jane'))).toEqual({
      _unknown: [],
      author: 'jane',
    });
  });

  it('converts kebab-case flag names to camelCase', () => {
    expect(parseArgs(argv('--doc-lang=english'))).toEqual({
      _unknown: [],
      docLang: 'english',
    });
    expect(parseArgs(argv('--project-name=x'))).toEqual({
      _unknown: [],
      projectName: 'x',
    });
  });

  it('collects unknown flags instead of erroring', () => {
    expect(parseArgs(argv('--not-a-flag'))).toEqual({
      _unknown: ['--not-a-flag'],
    });
    expect(parseArgs(argv('--foo=bar'))).toEqual({
      _unknown: ['--foo=bar'],
    });
    expect(parseArgs(argv('positional'))).toEqual({
      _unknown: ['positional'],
    });
  });

  it('combines multiple flags', () => {
    expect(
      parseArgs(argv('--yes', '--project=app', '--tickets=linear', '--git=github')),
    ).toEqual({
      _unknown: [],
      yes: true,
      project: 'app',
      tickets: 'linear',
      git: 'github',
    });
  });

  it('accepts = values that contain slashes, dots, and spaces', () => {
    expect(parseArgs(argv('--aped=.aped'))).toEqual({ _unknown: [], aped: '.aped' });
    expect(parseArgs(argv('--output=docs/aped'))).toEqual({
      _unknown: [],
      output: 'docs/aped',
    });
  });
});
