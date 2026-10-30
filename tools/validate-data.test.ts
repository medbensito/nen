import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DataValidationError, loadGameData } from '@nen/sim';
import { afterEach, describe, expect, it } from 'vitest';
import { DATA_DIR } from './paths';
import { readDataFiles } from './read-data';

const temporaryDirs: string[] = [];

function dataDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nen-data-'));
  temporaryDirs.push(root);
  for (const [file, content] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

afterEach(() => {
  for (const dir of temporaryDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('data/', () => {
  it('is valid', () => {
    expect(() => loadGameData(readDataFiles(DATA_DIR))).not.toThrow();
  });
});

describe('readDataFiles', () => {
  it('keys nested files by their path relative to data/, with forward slashes', () => {
    const files = readDataFiles(
      dataDir({
        'rules/simulation.json': '{"tickRate": 30, "maxStepsPerFrame": 5}',
        'maps/lane.json': '{}',
        'README.md': '# not data',
      }),
    );
    expect(Object.keys(files)).toEqual(['maps/lane.json', 'rules/simulation.json']);
  });

  it('accepts files saved with a UTF-8 byte order mark', () => {
    const files = readDataFiles(dataDir({ 'rules/simulation.json': '\uFEFF{"tickRate": 30}' }));
    expect(files['rules/simulation.json']).toEqual({ tickRate: 30 });
  });

  it('names every file that is not valid JSON', () => {
    const dir = dataDir({
      'rules/simulation.json': '{ "tickRate": 30, }',
      'locales/fr.json': '{ "app.title": "nen" ',
    });

    try {
      readDataFiles(dir);
      expect.unreachable('readDataFiles should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DataValidationError);
      expect((error as DataValidationError).issues.map((issue) => issue.file)).toEqual([
        'locales/fr.json',
        'rules/simulation.json',
      ]);
    }
  });
});
