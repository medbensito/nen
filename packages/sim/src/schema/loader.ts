import type { z } from 'zod';
import type { DeepReadonly } from '../core/types';
import { championSchema, compileChampion, type Champion } from './champion';
import { DataValidationError, formatIssuePath, ROOT_PATH, type DataIssue } from './errors';
import {
  cameraSettingsSchema,
  checkBindings,
  inputBindingsSchema,
  type CameraSettings,
  type InputBindings,
} from './input';
import { localeSchema, type Locale } from './locale';
import { checkMap, mapSchema, type MapDef } from './map';
import {
  combatRulesSchema,
  compileCombatRules,
  matchRulesSchema,
  simulationRulesSchema,
  type CombatRules,
  type MatchRules,
  type SimulationRules,
} from './rules';
import { compileUnit, unitSchema, type Unit } from './unit';

/**
 * Raw content of the data/ folder: relative path (forward slashes) → parsed JSON.
 *
 * The loader never reads files itself, so the same code runs in the browser
 * (files bundled by Vite), in Node (tools, tests) and on a future server.
 */
export type RawDataFiles = Readonly<Record<string, unknown>>;

export type GameData = DeepReadonly<{
  simulation: SimulationRules;
  match: MatchRules;
  combat: CombatRules;
  input: { bindings: InputBindings; camera: CameraSettings };
  maps: Record<string, MapDef>;
  champions: Record<string, Champion>;
  units: Record<string, Unit>;
  /** Language code (`fr`, `en`) → translations. */
  locales: Record<string, Locale>;
}>;

const ID = '[a-z0-9]+(?:-[a-z0-9]+)*';
const MAP_FILE = new RegExp(`^maps/(${ID})\\.json$`);
const CHAMPION_FILE = new RegExp(`^champions/(${ID})\\.json$`);
const UNIT_FILE = new RegExp(`^units/(${ID})\\.json$`);
const LOCALE_FILE = /^locales\/([a-z]{2})\.json$/;
const EXPECTED_FILES =
  'rules/simulation.json, rules/match.json, rules/combat.json, input/bindings.json, ' +
  'input/camera.json, maps/<id>.json, champions/<id>.json, units/<id>.json, locales/<lang>.json';

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
  const reader = new DataReader(files);

  const simulation = reader.single('rules/simulation.json', simulationRulesSchema);
  const match = reader.single('rules/match.json', matchRulesSchema);
  const combat = reader.single('rules/combat.json', combatRulesSchema);
  const bindings = reader.single('input/bindings.json', inputBindingsSchema);
  const camera = reader.single('input/camera.json', cameraSettingsSchema);
  const maps = reader.collection(MAP_FILE, mapSchema, { idMatchesFileName: true });
  const champions = reader.collection(CHAMPION_FILE, championSchema, { idMatchesFileName: true });
  const units = reader.collection(UNIT_FILE, unitSchema, { idMatchesFileName: true });
  const locales = reader.collection(LOCALE_FILE, localeSchema);
  reader.rejectUnclaimedFiles();

  if (bindings) {
    checkBindings(bindings, (path, message) => reader.report('input/bindings.json', path, message));
  }
  for (const { file, value: map } of maps.values()) {
    checkMap(map, (path, message) => reader.report(file, path, message));
    reader.reference(file, 'name', map.name);
    map.units.forEach((placed, index) =>
      reader.requireEntry(file, `units[${index}].unit`, placed.unit, units, 'units'),
    );
  }
  for (const { file, value: unit } of units.values()) {
    reader.reference(file, 'name', unit.name);
  }
  for (const { file, value: champion } of champions.values()) {
    reader.reference(file, 'name', champion.name);
  }

  if (locales.size === 0 && !Object.keys(files).some((file) => LOCALE_FILE.test(file))) {
    reader.report('locales/', ROOT_PATH, 'at least one locale file is required');
  }
  const localeValues = Object.fromEntries([...locales].map(([lang, { value }]) => [lang, value]));
  checkLocaleConsistency(localeValues, reader);
  reader.checkReferences(localeValues);

  if (match) {
    reader.requireEntry('rules/match.json', 'map', match.map, maps, 'maps');
    reader.requireEntry('rules/match.json', 'champion', match.champion, champions, 'champions');
  }

  if (
    reader.issues.length > 0 ||
    simulation === undefined ||
    match === undefined ||
    combat === undefined ||
    bindings === undefined ||
    camera === undefined
  ) {
    throw new DataValidationError(reader.sortedIssues());
  }
  return {
    simulation,
    match,
    combat: compileCombatRules(combat, simulation.tickRate),
    input: { bindings, camera },
    maps: Object.fromEntries([...maps].map(([id, { value }]) => [id, value])),
    champions: Object.fromEntries(
      [...champions].map(([id, { value }]) => [id, compileChampion(value, simulation.tickRate)]),
    ),
    units: Object.fromEntries(
      [...units].map(([id, { value }]) => [id, compileUnit(value, simulation.tickRate)]),
    ),
    locales: localeValues,
  };
}

interface Entry<T> {
  readonly file: string;
  readonly value: T;
}

/** Parses files, records issues, and remembers which files were recognized. */
class DataReader {
  readonly issues: DataIssue[] = [];
  private readonly files: RawDataFiles;
  private readonly claimed = new Set<string>();
  private readonly references: LocaleReference[] = [];

  constructor(files: RawDataFiles) {
    this.files = files;
  }

  /** A file that must exist exactly once. */
  single<T>(file: string, schema: z.ZodType<T>): T | undefined {
    this.claimed.add(file);
    if (!(file in this.files)) {
      this.report(file, ROOT_PATH, 'required file is missing');
      return undefined;
    }
    return this.parse(schema, file, this.files[file]);
  }

  /** Every file matching `pattern`, keyed by the name captured from its path. Invalid files are left out. */
  collection<T>(
    pattern: RegExp,
    schema: z.ZodType<T>,
    options: { idMatchesFileName?: boolean } = {},
  ): Map<string, Entry<T>> {
    const entries = new Map<string, Entry<T>>();
    for (const file of Object.keys(this.files).sort()) {
      const name = pattern.exec(file)?.[1];
      if (name === undefined) continue;
      this.claimed.add(file);

      const value = this.parse(schema, file, this.files[file]);
      if (value === undefined) continue;
      if (options.idMatchesFileName) {
        const id = (value as { id?: unknown }).id;
        if (id !== name) this.report(file, 'id', `must match the file name ("${name}")`);
      }
      entries.set(name, { file, value });
    }
    return entries;
  }

  rejectUnclaimedFiles(): void {
    for (const file of Object.keys(this.files)) {
      if (!this.claimed.has(file)) {
        this.report(file, ROOT_PATH, `unrecognized data file (expected ${EXPECTED_FILES})`);
      }
    }
  }

  /** `id` must name a valid entry of `collection`, unless its file exists but already failed validation. */
  requireEntry(
    file: string,
    path: string,
    id: string,
    collection: ReadonlyMap<string, unknown>,
    folder: string,
  ): void {
    if (collection.has(id) || `${folder}/${id}.json` in this.files) return;
    const known = [...collection.keys()].sort().join(', ') || 'none';
    this.report(file, path, `"${id}" is not defined in ${folder}/ (known: ${known})`);
  }

  reference(file: string, path: string, key: string): void {
    this.references.push({ file, path, key });
  }

  checkReferences(locales: Readonly<Record<string, Locale>>): void {
    const languages = Object.keys(locales).sort();
    if (languages.length === 0) return;
    for (const { file, path, key } of this.references) {
      const missingIn = languages.filter((language) => !(key in (locales[language] ?? {})));
      if (missingIn.length > 0) {
        this.report(
          file,
          path,
          `translation key "${key}" is missing in locales: ${missingIn.join(', ')}`,
        );
      }
    }
  }

  report(file: string, path: string, message: string): void {
    this.issues.push({ file, path, message });
  }

  /** Grouped by file, in file order; issues of one file keep their discovery order. */
  sortedIssues(): DataIssue[] {
    return [...this.issues].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  }

  private parse<T>(schema: z.ZodType<T>, file: string, raw: unknown): T | undefined {
    const result = schema.safeParse(raw);
    if (result.success) return result.data;

    for (const issue of result.error.issues) {
      if (issue.code === 'unrecognized_keys') {
        // A typo in a field name must point at that field, not at its parent.
        for (const key of issue.keys) {
          this.report(file, formatIssuePath([...issue.path, key]), 'unknown field (typo?)');
        }
      } else {
        this.report(file, formatIssuePath(issue.path), issue.message);
      }
    }
    return undefined;
  }
}

/** Every language must translate the same keys, so no text goes missing in one language. */
function checkLocaleConsistency(
  locales: Readonly<Record<string, Locale>>,
  reader: DataReader,
): void {
  const languages = Object.keys(locales).sort();
  const allKeys = [
    ...new Set(languages.flatMap((language) => Object.keys(locales[language] ?? {}))),
  ].sort();

  for (const language of languages) {
    const locale = locales[language] ?? {};
    for (const key of allKeys) {
      if (key in locale) continue;
      const presentIn = languages.filter((other) => key in (locales[other] ?? {}));
      reader.report(
        `locales/${language}.json`,
        key,
        `missing translation (present in ${presentIn.join(', ')})`,
      );
    }
  }
}
