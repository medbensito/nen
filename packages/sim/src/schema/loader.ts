import type { z } from 'zod';
import type { DeepReadonly } from '../core/types';
import { DataValidationError, formatIssuePath, ROOT_PATH, type DataIssue } from './errors';
import { localeSchema, type Locale } from './locale';
import { mapSchema, type MapDef } from './map';
import { simulationRulesSchema, type SimulationRules } from './rules';

/**
 * Raw content of the data/ folder: relative path (forward slashes) → parsed JSON.
 *
 * The loader never reads files itself, so the same code runs in the browser
 * (files bundled by Vite), in Node (tools, tests) and on a future server.
 */
export type RawDataFiles = Readonly<Record<string, unknown>>;

export type GameData = DeepReadonly<{
  simulation: SimulationRules;
  maps: Record<string, MapDef>;
  /** Language code (`fr`, `en`) → translations. */
  locales: Record<string, Locale>;
}>;

const SIMULATION_FILE = 'rules/simulation.json';
const MAP_FILE = /^maps\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const LOCALE_FILE = /^locales\/([a-z]{2})\.json$/;
const EXPECTED_FILES = `${SIMULATION_FILE}, maps/<id>.json, locales/<lang>.json`;

interface LocaleReference {
  readonly file: string;
  readonly path: string;
  readonly key: string;
}

/**
 * Validates every data file and assembles the game data.
 * Collects all problems before failing, so one run lists every mistake.
 *
 * @throws DataValidationError naming each faulty file and field.
 */
export function loadGameData(files: RawDataFiles): GameData {
  const issues: DataIssue[] = [];
  const references: LocaleReference[] = [];
  const maps: Record<string, MapDef> = {};
  const locales: Record<string, Locale> = {};
  let simulation: SimulationRules | undefined;

  for (const file of Object.keys(files).sort()) {
    const raw = files[file];

    if (file === SIMULATION_FILE) {
      simulation = parseFile(simulationRulesSchema, file, raw, issues);
      continue;
    }

    const mapMatch = MAP_FILE.exec(file);
    if (mapMatch) {
      const map = parseFile(mapSchema, file, raw, issues);
      if (map) {
        if (map.id !== mapMatch[1]) {
          issues.push({ file, path: 'id', message: `must match the file name ("${mapMatch[1]}")` });
        }
        maps[map.id] = map;
        references.push({ file, path: 'name', key: map.name });
      }
      continue;
    }

    const localeMatch = LOCALE_FILE.exec(file);
    if (localeMatch?.[1]) {
      const locale = parseFile(localeSchema, file, raw, issues);
      if (locale) locales[localeMatch[1]] = locale;
      continue;
    }

    issues.push({
      file,
      path: ROOT_PATH,
      message: `unrecognized data file (expected ${EXPECTED_FILES})`,
    });
  }

  if (simulation === undefined && !(SIMULATION_FILE in files)) {
    issues.push({ file: SIMULATION_FILE, path: ROOT_PATH, message: 'required file is missing' });
  }
  if (!Object.keys(files).some((file) => LOCALE_FILE.test(file))) {
    issues.push({
      file: 'locales/',
      path: ROOT_PATH,
      message: 'at least one locale file is required',
    });
  }

  checkLocaleConsistency(locales, issues);
  checkLocaleReferences(references, locales, issues);

  if (issues.length > 0 || simulation === undefined) {
    throw new DataValidationError(issues);
  }
  return { simulation, maps, locales };
}

function parseFile<T>(
  schema: z.ZodType<T>,
  file: string,
  raw: unknown,
  issues: DataIssue[],
): T | undefined {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  for (const issue of result.error.issues) {
    if (issue.code === 'unrecognized_keys') {
      // A typo in a field name must point at that field, not at its parent.
      for (const key of issue.keys) {
        issues.push({
          file,
          path: formatIssuePath([...issue.path, key]),
          message: 'unknown field (typo?)',
        });
      }
    } else {
      issues.push({ file, path: formatIssuePath(issue.path), message: issue.message });
    }
  }
  return undefined;
}

/** Every language must translate the same keys, so no text goes missing in one language. */
function checkLocaleConsistency(locales: Record<string, Locale>, issues: DataIssue[]): void {
  const languages = Object.keys(locales).sort();
  const allKeys = new Set(languages.flatMap((language) => Object.keys(locales[language] ?? {})));

  for (const language of languages) {
    const locale = locales[language] ?? {};
    for (const key of [...allKeys].sort()) {
      if (!(key in locale)) {
        const presentIn = languages.filter((other) => key in (locales[other] ?? {}));
        issues.push({
          file: `locales/${language}.json`,
          path: key,
          message: `missing translation (present in ${presentIn.join(', ')})`,
        });
      }
    }
  }
}

function checkLocaleReferences(
  references: readonly LocaleReference[],
  locales: Record<string, Locale>,
  issues: DataIssue[],
): void {
  const languages = Object.keys(locales);
  if (languages.length === 0) return;

  for (const reference of references) {
    const missingIn = languages.filter((language) => !(reference.key in (locales[language] ?? {})));
    if (missingIn.length > 0) {
      issues.push({
        file: reference.file,
        path: reference.path,
        message: `translation key "${reference.key}" is missing in locales: ${missingIn.sort().join(', ')}`,
      });
    }
  }
}
