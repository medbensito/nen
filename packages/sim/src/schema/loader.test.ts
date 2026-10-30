import { describe, expect, it } from 'vitest';
import { fixtureFiles, type FixtureFiles } from '../../test/fixtures/game-data';
import { DataValidationError, formatIssuePath, type DataIssue } from './errors';
import { loadGameData, type RawDataFiles } from './loader';

function validFiles(): FixtureFiles {
  const files = fixtureFiles();
  files['locales/en.json'] = { 'map.test-arena.name': 'Test arena' };
  return files;
}

/** Valid files with one file replaced, or with fields of one file replaced. */
function withFile(file: string, content: Record<string, unknown>): FixtureFiles {
  const files = validFiles();
  files[file] = content;
  return files;
}

function withFields(file: string, fields: Record<string, unknown>): FixtureFiles {
  const files = validFiles();
  files[file] = { ...files[file], ...fields };
  return files;
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
    expect(data.match.map).toBe('test-arena');
    expect(data.maps['test-arena']?.width).toBe(800);
    expect(Object.keys(data.locales).sort()).toEqual(['en', 'fr']);
  });

  it('names the file and the field of a wrong value', () => {
    const issues = issuesOf(withFields('rules/simulation.json', { tickRate: 'fast' }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: 'rules/simulation.json', path: 'tickRate' });
  });

  it('puts the file and the field in the error message', () => {
    expect(() => loadGameData(withFields('maps/test-arena.json', { width: -1 }))).toThrow(
      /maps\/test-arena\.json › width: /,
    );
  });

  it('points a misspelled field at the field itself', () => {
    expect(issuesOf(withFields('rules/simulation.json', { tickrate: 60 }))).toEqual([
      { file: 'rules/simulation.json', path: 'tickrate', message: 'unknown field (typo?)' },
    ]);
  });

  it('reports every problem in one run, grouped by file', () => {
    const files = withFields('rules/simulation.json', { tickRate: 0 });
    files['maps/test-arena.json'] = { ...files['maps/test-arena.json'], height: undefined };

    expect(issuesOf(files).map((issue) => `${issue.file} › ${issue.path}`)).toEqual([
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

  it('requires the match rules', () => {
    const files = validFiles();
    delete files['rules/match.json'];
    expect(issuesOf(files)).toEqual([
      { file: 'rules/match.json', path: '(root)', message: 'required file is missing' },
    ]);
  });

  it('requires the match map to exist', () => {
    expect(issuesOf(withFields('rules/match.json', { map: 'missing-map' }))).toEqual([
      expect.objectContaining({ file: 'rules/match.json', path: 'map' }),
    ]);
  });

  it('requires a map id to match its file name', () => {
    expect(issuesOf(withFields('maps/test-arena.json', { id: 'other' }))).toContainEqual(
      expect.objectContaining({ file: 'maps/test-arena.json', path: 'id' }),
    );
  });

  it('requires every language to translate the same keys', () => {
    const files = withFile('locales/fr.json', {
      'map.test-arena.name': 'Arène de test',
      'hud.fps': 'FPS : {value}',
    });
    expect(issuesOf(files)).toEqual([
      { file: 'locales/en.json', path: 'hud.fps', message: 'missing translation (present in fr)' },
    ]);
  });

  it('requires referenced translation keys to exist', () => {
    expect(issuesOf(withFields('maps/test-arena.json', { name: 'map.unknown.name' }))).toEqual([
      expect.objectContaining({ file: 'maps/test-arena.json', path: 'name' }),
    ]);
  });
});

describe('map rules', () => {
  const blueBase = { team: 'blue', fountain: { x: 60, y: 300 }, fountainRadius: 40 };

  it('requires obstacles to lie inside the map', () => {
    const files = withFields('maps/test-arena.json', {
      obstacles: [{ x: 700, y: 0, width: 200, height: 50 }],
    });
    expect(issuesOf(files)).toEqual([
      expect.objectContaining({ file: 'maps/test-arena.json', path: 'obstacles[0]' }),
    ]);
  });

  it('requires exactly one base per team', () => {
    expect(issuesOf(withFields('maps/test-arena.json', { bases: [blueBase] }))).toEqual([
      expect.objectContaining({ path: 'bases', message: expect.stringContaining('"red"') }),
    ]);
  });

  it('rejects a fountain outside the map or inside an obstacle', () => {
    const files = withFields('maps/test-arena.json', {
      bases: [
        { ...blueBase, fountain: { x: -10, y: 300 } },
        { team: 'red', fountain: { x: 400, y: 300 }, fountainRadius: 40 },
      ],
    });
    expect(issuesOf(files).map((issue) => issue.path)).toEqual([
      'bases[0].fountain',
      'bases[1].fountain',
    ]);
  });
});

describe('formatIssuePath', () => {
  it('formats nested object and array paths', () => {
    expect(formatIssuePath(['abilities', 0, 'cost'])).toBe('abilities[0].cost');
    expect(formatIssuePath([])).toBe('(root)');
  });
});
