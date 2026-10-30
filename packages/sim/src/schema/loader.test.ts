import { describe, expect, it } from 'vitest';
import { DataValidationError, formatIssuePath, type DataIssue } from './errors';
import { loadGameData, type RawDataFiles } from './loader';

function validFiles(): Record<string, unknown> {
  return {
    'rules/simulation.json': { tickRate: 30, maxStepsPerFrame: 5 },
    'maps/test-arena.json': {
      id: 'test-arena',
      name: 'map.test-arena.name',
      width: 800,
      height: 600,
    },
    'locales/fr.json': { 'map.test-arena.name': 'Arène de test' },
    'locales/en.json': { 'map.test-arena.name': 'Test arena' },
  };
}

function issuesOf(files: RawDataFiles): readonly DataIssue[] {
  try {
    loadGameData(files);
  } catch (error) {
    if (error instanceof DataValidationError) return error.issues;
    throw error;
  }
  throw new Error('expected loadGameData to throw a DataValidationError');
}

describe('loadGameData', () => {
  it('loads valid data', () => {
    const data = loadGameData(validFiles());
    expect(data.simulation.tickRate).toBe(30);
    expect(data.maps['test-arena']?.width).toBe(800);
    expect(Object.keys(data.locales).sort()).toEqual(['en', 'fr']);
  });

  it('names the file and the field of a wrong value', () => {
    const files = validFiles();
    files['rules/simulation.json'] = { tickRate: 'fast', maxStepsPerFrame: 5 };

    const issues = issuesOf(files);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: 'rules/simulation.json', path: 'tickRate' });
  });

  it('puts the file and the field in the error message', () => {
    const files = validFiles();
    files['maps/test-arena.json'] = { ...(files['maps/test-arena.json'] as object), width: -1 };

    expect(() => loadGameData(files)).toThrow(/maps\/test-arena\.json › width: /);
  });

  it('points a misspelled field at the field itself', () => {
    const files = validFiles();
    files['rules/simulation.json'] = { tickRate: 30, maxStepsPerFrame: 5, tickrate: 60 };

    expect(issuesOf(files)).toEqual([
      { file: 'rules/simulation.json', path: 'tickrate', message: 'unknown field (typo?)' },
    ]);
  });

  it('reports every problem in one run', () => {
    const files = validFiles();
    files['rules/simulation.json'] = { tickRate: 0, maxStepsPerFrame: 5 };
    files['maps/test-arena.json'] = { id: 'test-arena', name: 'map.test-arena.name', width: 800 };

    const issues = issuesOf(files);
    expect(issues.map((issue) => `${issue.file} › ${issue.path}`)).toEqual([
      'maps/test-arena.json › height',
      'rules/simulation.json › tickRate',
    ]);
  });

  it('rejects an unrecognized file', () => {
    const files = { ...validFiles(), 'rules/simulaton.json': {} };
    expect(issuesOf(files)).toEqual([
      expect.objectContaining({ file: 'rules/simulaton.json', path: '(root)' }),
    ]);
  });

  it('requires the simulation rules and at least one locale', () => {
    const files = validFiles();
    delete files['rules/simulation.json'];
    delete files['locales/fr.json'];
    delete files['locales/en.json'];

    const issues = issuesOf(files);
    expect(issues).toContainEqual(
      expect.objectContaining({
        file: 'rules/simulation.json',
        message: 'required file is missing',
      }),
    );
    expect(issues).toContainEqual(expect.objectContaining({ file: 'locales/' }));
  });

  it('requires a map id to match its file name', () => {
    const files = validFiles();
    files['maps/test-arena.json'] = {
      id: 'other',
      name: 'map.test-arena.name',
      width: 1,
      height: 1,
    };

    expect(issuesOf(files)).toContainEqual(
      expect.objectContaining({ file: 'maps/test-arena.json', path: 'id' }),
    );
  });

  it('requires every language to translate the same keys', () => {
    const files = validFiles();
    files['locales/fr.json'] = {
      'map.test-arena.name': 'Arène de test',
      'hud.fps': 'FPS : {value}',
    };

    expect(issuesOf(files)).toEqual([
      {
        file: 'locales/en.json',
        path: 'hud.fps',
        message: 'missing translation (present in fr)',
      },
    ]);
  });

  it('requires referenced translation keys to exist', () => {
    const files = validFiles();
    files['maps/test-arena.json'] = {
      id: 'test-arena',
      name: 'map.unknown.name',
      width: 800,
      height: 600,
    };

    expect(issuesOf(files)).toEqual([
      expect.objectContaining({ file: 'maps/test-arena.json', path: 'name' }),
    ]);
  });
});

describe('formatIssuePath', () => {
  it('formats nested object and array paths', () => {
    expect(formatIssuePath(['abilities', 0, 'cost'])).toBe('abilities[0].cost');
    expect(formatIssuePath([])).toBe('(root)');
  });
});
