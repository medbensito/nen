import { loadGameData, type GameData } from '../../src/schema/loader';

export type FixtureFiles = Record<string, Record<string, unknown>>;

/**
 * Minimal raw data for rule tests. Independent from data/ on purpose:
 * rebalancing the game must never break a rule test.
 *
 * Test arena: 800 × 600, a 100 × 300 wall in the middle, one fountain per side.
 * Test champion: radius 30, 300 units per second (10 per tick at 30 ticks/s),
 *   500 health, no armor; ranged attack: 50 damage, 1 per second (30 ticks,
 *   15 of wind-up), range 200, projectile 600 units/s (20 per tick).
 * Test dummy (red) at (300, 80): radius 40, 300 health, 50 armor (takes 2/3
 *   of raw damage); instant attack 30 damage, 1 per second, range 250;
 *   respawns after 2 s, retaliates for 3 s.
 * Combat: armor scale 100; champion respawn 2 s + 1 s per level.
 */
export function fixtureFiles(): FixtureFiles {
  return {
    'rules/simulation.json': { tickRate: 30, maxStepsPerFrame: 5 },
    'rules/match.json': { map: 'test-arena', champion: 'test-champion', team: 'blue' },
    'rules/combat.json': { armorScale: 100, respawn: { base: 2, perLevel: 1 } },
    'input/bindings.json': {
      keys: { stop: 'KeyS', toggleCameraLock: 'KeyY', centerCamera: 'Space' },
      moveRepeatInterval: 0.15,
    },
    'input/camera.json': {
      startLocked: true,
      edgeScrollMargin: 20,
      edgeScrollSpeed: 1000,
      zoom: { initial: 1, min: 0.5, max: 2, step: 0.1 },
    },
    'maps/test-arena.json': {
      id: 'test-arena',
      name: 'map.test-arena.name',
      width: 800,
      height: 600,
      navCellSize: 25,
      obstacles: [{ x: 350, y: 150, width: 100, height: 300 }],
      bases: [
        { team: 'blue', fountain: { x: 60, y: 300 }, fountainRadius: 40 },
        { team: 'red', fountain: { x: 740, y: 300 }, fountainRadius: 40 },
      ],
      units: [{ unit: 'test-dummy', team: 'red', position: { x: 300, y: 80 } }],
    },
    'champions/test-champion.json': {
      id: 'test-champion',
      name: 'champion.test-champion.name',
      radius: 30,
      moveSpeed: 300,
      health: 500,
      armor: 0,
      attack: {
        damage: 50,
        perSecond: 1,
        range: 200,
        windup: 0.5,
        projectile: { speed: 600, radius: 5 },
      },
    },
    'units/test-dummy.json': {
      id: 'test-dummy',
      name: 'unit.test-dummy.name',
      radius: 40,
      health: 300,
      armor: 50,
      attack: { damage: 30, perSecond: 1, range: 250, windup: 0 },
      respawnTime: 2,
      retaliation: { duration: 3 },
    },
    'locales/fr.json': {
      'map.test-arena.name': 'Arène de test',
      'champion.test-champion.name': 'Champion de test',
      'unit.test-dummy.name': 'Mannequin de test',
    },
  };
}

/** Loads the fixture data, optionally edited first (e.g. to change one stat). */
export function fixtureGameData(edit?: (files: FixtureFiles) => void): GameData {
  const files = fixtureFiles();
  edit?.(files);
  return loadGameData(files);
}
