import { loadGameData, type GameData, type RawDataFiles } from '@nen/sim';

// Bundled at build time. In dev, editing a data file reloads the page.
const modules = import.meta.glob<unknown>('@data/**/*.json', { eager: true, import: 'default' });

const DATA_SEGMENT = '/data/';

/** Data files keyed like the loader expects: path relative to data/. */
export function bundledDataFiles(): RawDataFiles {
  const files: Record<string, unknown> = {};
  for (const [path, content] of Object.entries(modules)) {
    files[path.slice(path.lastIndexOf(DATA_SEGMENT) + DATA_SEGMENT.length)] = content;
  }
  return files;
}

export function loadBundledGameData(): GameData {
  return loadGameData(bundledDataFiles());
}
