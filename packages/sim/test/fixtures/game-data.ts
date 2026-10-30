import { loadGameData, type GameData } from '../../src/schema/loader';

/**
 * Minimal game data for rule tests. Independent from data/ on purpose:
 * rebalancing the game must never break a rule test.
 */
export function fixtureGameData(): GameData {
  return loadGameData({
    'rules/simulation.json': { tickRate: 30, maxStepsPerFrame: 5 },
    'rules/match.json': { map: 'test-arena' },
    'maps/test-arena.json': {
      id: 'test-arena',
      name: 'map.test-arena.name',
      width: 800,
      height: 600,
    },
    'locales/fr.json': { 'map.test-arena.name': 'Arène de test' },
  });
}
