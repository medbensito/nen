import type { AttackStats } from '../schema/attack';
import type { GameData } from '../schema/loader';
import { spawnEntity, type Attack, type GameState, type PlayerId } from './game-state';

/** The only player of the solo MVP. A server will assign ids per connection. */
export const LOCAL_PLAYER_ID: PlayerId = 1;

/** Levels arrive in M4; until then every champion is level 1. */
const CHAMPION_LEVEL = 1;

/**
 * Initial state of a match: the player's champion at its team's fountain,
 * and the units the map places.
 */
export function setupMatch(state: GameState, data: GameData): void {
  const { match, combat } = data;
  const map = data.maps[match.map];
  const champion = data.champions[match.champion];
  const base = map?.bases.find((candidate) => candidate.team === match.team);
  if (!map || !champion || !base) {
    // The loader validates these references; reaching this means it was bypassed.
    throw new Error(`Invalid match setup: ${JSON.stringify(match)}`);
  }

  const entity = spawnEntity(state, {
    kind: 'champion',
    defId: champion.id,
    team: match.team,
    position: base.fountain,
    radius: champion.radius,
    movement: { speed: champion.moveSpeedPerTick, path: [] },
    health: { current: champion.health, max: champion.health },
    armor: champion.armor,
    attack: createAttack(champion.attack),
    respawn: {
      home: base.fountain,
      delayTicks: combat.respawnBaseTicks + combat.respawnPerLevelTicks * CHAMPION_LEVEL,
    },
  });
  state.players.push({ id: LOCAL_PLAYER_ID, team: match.team, entityId: entity.id });

  for (const placed of map.units) {
    const unit = data.units[placed.unit];
    if (!unit) throw new Error(`Unknown unit "${placed.unit}"`);
    spawnEntity(state, {
      kind: 'unit',
      defId: unit.id,
      team: placed.team,
      position: placed.position,
      radius: unit.radius,
      health: { current: unit.health, max: unit.health },
      armor: unit.armor,
      attack: createAttack(unit.attack),
      ...(unit.respawnTicks === null
        ? {}
        : { respawn: { home: placed.position, delayTicks: unit.respawnTicks } }),
      ...(unit.retaliationTicks === null
        ? {}
        : { retaliation: { durationTicks: unit.retaliationTicks, targetId: null, untilTick: 0 } }),
    });
  }
}

export function createAttack(stats: Readonly<AttackStats>): Attack {
  return { ...stats, target: null, cooldownTicks: 0, windupLeft: 0, repathTick: 0 };
}
