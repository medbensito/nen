import type { GameData } from '../schema/loader';
import { spawnEntity, type GameState, type PlayerId } from './game-state';

/** The only player of the solo MVP. A server will assign ids per connection. */
export const LOCAL_PLAYER_ID: PlayerId = 1;

/** Initial state of a match: the player's champion at its team's fountain. */
export function setupMatch(state: GameState, data: GameData): void {
  const { match } = data;
  const map = data.maps[match.map];
  const champion = data.champions[match.champion];
  const base = map?.bases.find((candidate) => candidate.team === match.team);
  if (!map || !champion || !base) {
    // The loader validates these references; reaching this means it was bypassed.
    throw new Error(`Invalid match setup: ${JSON.stringify(match)}`);
  }

  const entity = spawnEntity(state, {
    kind: 'champion',
    team: match.team,
    position: base.fountain,
    radius: champion.radius,
    movement: { speed: champion.moveSpeedPerTick, path: [] },
  });
  state.players.push({ id: LOCAL_PLAYER_ID, team: match.team, entityId: entity.id });
}
