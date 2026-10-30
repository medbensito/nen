import { describe, expect, it } from 'vitest';
import { fixtureFiles, type FixtureFiles } from '../../test/fixtures/game-data';
import { DataValidationError, formatIssuePath, type DataIssue } from './errors';
import { loadGameData, type RawDataFiles } from './loader';

function validFiles(): FixtureFiles {
  const files = fixtureFiles();
  // Same keys as the French fixture locale, so the files are consistent.
  files['locales/en.json'] = Object.fromEntries(
    Object.keys(files['locales/fr.json'] ?? {}).map((key) => [key, `en:${key}`]),
  );
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
      ...validFiles()['locales/fr.json'],
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

describe('champions', () => {
  it('converts per-second rates and durations to ticks', () => {
    const data = loadGameData(validFiles());
    expect(data.champions['test-champion']).toEqual({
      id: 'test-champion',
      name: 'champion.test-champion.name',
      radius: 30,
      moveSpeedPerTick: 10,
      health: 500,
      armor: 0,
      attack: {
        damage: 50,
        range: 200,
        periodTicks: 30,
        windupTicks: 15,
        projectileSpeed: 20,
        projectileRadius: 5,
      },
      nen: 200,
      specialization: 'emission',
      rule: {
        kind: 'projectile-hit-refund',
        name: 'rule.test-refund.name',
        description: 'rule.test-refund.description',
        share: 0.25,
      },
      abilities: ['test-shot', 'test-dash', 'test-orb', 'test-beam'],
    });
  });

  it('requires the match champion to exist', () => {
    expect(issuesOf(withFields('rules/match.json', { champion: 'nobody' }))).toEqual([
      expect.objectContaining({ file: 'rules/match.json', path: 'champion' }),
    ]);
  });

  it('requires a champion id to match its file name', () => {
    expect(issuesOf(withFields('champions/test-champion.json', { id: 'other' }))).toContainEqual(
      expect.objectContaining({ file: 'champions/test-champion.json', path: 'id' }),
    );
  });
});

describe('units and combat', () => {
  it('compiles units, with optional respawn and retaliation', () => {
    const data = loadGameData(validFiles());
    expect(data.units['test-dummy']).toMatchObject({
      health: 300,
      armor: 50,
      attack: { periodTicks: 30, windupTicks: 0, projectileSpeed: 0 },
      respawnTicks: 60,
      retaliationTicks: 90,
    });

    const plain = { ...validFiles()['units/test-dummy.json'] };
    delete plain.respawnTime;
    delete plain.retaliation;
    const withoutOptions = loadGameData({ ...validFiles(), 'units/test-dummy.json': plain });
    expect(withoutOptions.units['test-dummy']).toMatchObject({
      respawnTicks: null,
      retaliationTicks: null,
    });
  });

  it('compiles the combat rules', () => {
    const files = withFields('rules/combat.json', { fountainRegen: 0.3 });
    expect(loadGameData(files).combat).toEqual({
      armorScale: 100,
      respawnBaseTicks: 60,
      respawnPerLevelTicks: 30,
      fountainRegenPerTick: 0.01,
    });
  });

  it('keeps the wind-up shorter than the attack period', () => {
    const files = withFields('units/test-dummy.json', {
      attack: { damage: 1, perSecond: 1, range: 1, windup: 1 },
    });
    expect(loadGameData(files).units['test-dummy']?.attack.windupTicks).toBe(29);
  });

  it('requires units placed on a map to exist', () => {
    const map = validFiles()['maps/test-arena.json'] ?? {};
    const files = withFields('maps/test-arena.json', {
      units: [{ unit: 'ghost', team: 'red', position: { x: 100, y: 100 } }],
    });
    expect(map).toBeDefined();
    expect(issuesOf(files)).toEqual([
      expect.objectContaining({ file: 'maps/test-arena.json', path: 'units[0].unit' }),
    ]);
  });

  it('rejects a unit placed inside an obstacle', () => {
    const files = withFields('maps/test-arena.json', {
      units: [{ unit: 'test-dummy', team: 'red', position: { x: 400, y: 300 } }],
    });
    expect(issuesOf(files)).toEqual([
      expect.objectContaining({
        path: 'units[0].position',
        message: 'must not lie inside an obstacle',
      }),
    ]);
  });
});

describe('nen and abilities', () => {
  it('compiles the nen rules', () => {
    expect(loadGameData(validFiles()).nen).toEqual({
      combatTicks: 60,
      regenOutOfCombatPerTick: 1,
      regenInCombatPerTick: 0,
      exhaustedDamageTakenMultiplier: 1.5,
      exhaustionRecoverAt: 0.25,
    });
  });

  it('compiles abilities: fixed or all-remaining costs, ticks and per-tick speeds', () => {
    const { abilities } = loadGameData(validFiles());
    expect(abilities['test-shot']).toMatchObject({
      cost: { kind: 'fixed', amount: 30 },
      cooldownTicks: 30,
      effect: { type: 'skillshot', speed: 20, range: 400 },
    });
    expect(abilities['test-orb']?.effect).toMatchObject({
      durationTicks: 60,
      intervalTicks: 15,
      shot: { speed: 30 },
    });
    expect(abilities['test-beam']).toMatchObject({
      cost: { kind: 'all', minimum: 60 },
      effect: { channelTicks: 30 },
    });
  });

  it('requires the champion abilities to exist', () => {
    const champion = validFiles()['champions/test-champion.json'] ?? {};
    const abilities = [...(champion.abilities as string[])];
    abilities[2] = 'missing';
    expect(issuesOf(withFields('champions/test-champion.json', { abilities }))).toEqual([
      expect.objectContaining({ path: 'abilities[2]' }),
    ]);
  });

  it('requires exactly four abilities', () => {
    expect(
      issuesOf(withFields('champions/test-champion.json', { abilities: ['test-shot'] })),
    ).toEqual([expect.objectContaining({ path: 'abilities' })]);
  });

  it('rejects an unknown effect type', () => {
    const shot = validFiles()['abilities/test-shot.json'] ?? {};
    expect(
      issuesOf(
        withFields('abilities/test-shot.json', {
          effect: { ...(shot.effect as object), type: 'meteor' },
        }),
      ),
    ).toEqual([expect.objectContaining({ file: 'abilities/test-shot.json', path: 'effect.type' })]);
  });

  it('requires a translated name for the specialization', () => {
    const files = validFiles();
    const fr = { ...files['locales/fr.json'] };
    const en = { ...files['locales/en.json'] };
    delete fr['specialization.emission.name'];
    delete en['specialization.emission.name'];
    files['locales/fr.json'] = fr;
    files['locales/en.json'] = en;
    expect(issuesOf(files)).toEqual([
      expect.objectContaining({
        file: 'champions/test-champion.json',
        path: 'specialization.type',
      }),
    ]);
  });
});

describe('input', () => {
  const keys = {
    ability1: 'KeyQ',
    ability2: 'KeyW',
    ability3: 'KeyE',
    ability4: 'KeyR',
    stop: 'KeyS',
    toggleCameraLock: 'KeyY',
    centerCamera: 'Space',
  };

  it('loads key bindings and camera settings', () => {
    const data = loadGameData(validFiles());
    expect(data.input.bindings.keys.stop).toBe('KeyS');
    expect(data.input.camera.startLocked).toBe(true);
  });

  it('rejects a key that is not a physical key code', () => {
    expect(issuesOf(withFields('input/bindings.json', { keys: { ...keys, stop: 's' } }))).toEqual([
      expect.objectContaining({ file: 'input/bindings.json', path: 'keys.stop' }),
    ]);
  });

  it('rejects two actions on the same key', () => {
    expect(
      issuesOf(withFields('input/bindings.json', { keys: { ...keys, toggleCameraLock: 'KeyS' } })),
    ).toEqual([
      {
        file: 'input/bindings.json',
        path: 'keys.toggleCameraLock',
        message: 'uses the same key as "stop" (KeyS)',
      },
    ]);
  });

  it('requires the initial zoom to sit between its bounds', () => {
    expect(
      issuesOf(
        withFields('input/camera.json', { zoom: { initial: 3, min: 0.5, max: 2, step: 0.1 } }),
      ),
    ).toEqual([expect.objectContaining({ file: 'input/camera.json', path: 'zoom.initial' })]);
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
