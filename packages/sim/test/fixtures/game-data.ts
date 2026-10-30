import { loadGameData, type GameData } from '../../src/schema/loader';

export type FixtureFiles = Record<string, Record<string, unknown>>;

/**
 * Minimal raw data for rule tests. Independent from data/ on purpose:
 * rebalancing the game must never break a rule test.
 *
 * Test arena: 800 × 600, a 100 × 300 wall in the middle, one fountain per side.
 */
export function fixtureFiles(): FixtureFiles {
  return {
    'rules/simulation.json': { tickRate: 30, maxStepsPerFrame: 5 },
    'rules/match.json': { map: 'test-arena' },
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
    },
    'locales/fr.json': { 'map.test-arena.name': 'Arène de test' },
  };
}

/** Loads the fixture data, optionally edited first (e.g. to change one stat). */
export function fixtureGameData(edit?: (files: FixtureFiles) => void): GameData {
  const files = fixtureFiles();
  edit?.(files);
  return loadGameData(files);
}
