import { loadGameData } from '@nen/sim';
import { describe, expect, it } from 'vitest';
import { TEXT } from '../packages/client/src/ui/text-keys';
import { DATA_DIR } from './paths';
import { readDataFiles } from './read-data';

describe('client text keys', () => {
  const { locales } = loadGameData(readDataFiles(DATA_DIR));

  for (const [language, locale] of Object.entries(locales)) {
    it(`are all translated in locales/${language}.json`, () => {
      const missing = Object.values(TEXT).filter((key) => !(key in locale));
      expect(missing).toEqual([]);
    });
  }
});
