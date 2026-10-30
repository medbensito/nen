import { createRngState, type RngState } from '../core/rng';
import { copy, type Vec2 } from '../core/vec2';

export type EntityId = number;
export type PlayerId = number;
export type Team = 'blue' | 'red' | 'neutral';

export interface Movement {
  /** World units per tick. */
  speed: number;
  /** Waypoints still to reach, in order. Empty when the entity stands still. */
  path: Vec2[];
}

/**
 * An entity is plain data; optional components (movement today; health, nen…
 * later) say what it can do.
 */
export interface Entity {
  id: EntityId;
  kind: string;
  team: Team;
  position: Vec2;
  /** Body radius, in world units. */
  radius: number;
  movement?: Movement;
}

export interface Player {
  id: PlayerId;
  team: Team;
  /** The champion this player controls. */
  entityId: EntityId;
}

/**
 * The whole game, as plain JSON-serializable data. Snapshots, hashes and,
 * later, network sync all rely on that.
 */
export interface GameState {
  tick: number;
  /** Shared by every system through the tick context. Never replace this object. */
  rng: RngState;
  nextEntityId: EntityId;
  players: Player[];
  /** Always sorted by id: ids only grow, and systems iterate in this order. */
  entities: Entity[];
}

export function createGameState(seed: number): GameState {
  return { tick: 0, rng: createRngState(seed), nextEntityId: 1, players: [], entities: [] };
}

export function spawnEntity(state: GameState, init: Omit<Entity, 'id'>): Entity {
  // Copy nested data so the caller's objects never alias the state.
  const entity: Entity = { ...init, id: state.nextEntityId, position: copy(init.position) };
  if (init.movement) {
    entity.movement = { speed: init.movement.speed, path: init.movement.path.map((p) => copy(p)) };
  }
  state.nextEntityId += 1;
  state.entities.push(entity);
  return entity;
}

export function findEntity(state: GameState, id: EntityId): Entity | undefined {
  const index = indexOfEntity(state, id);
  return index === -1 ? undefined : state.entities[index];
}

export function removeEntity(state: GameState, id: EntityId): boolean {
  const index = indexOfEntity(state, id);
  if (index === -1) return false;
  state.entities.splice(index, 1);
  return true;
}

function indexOfEntity(state: GameState, id: EntityId): number {
  const { entities } = state;
  let low = 0;
  let high = entities.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const middleId = entities[middle]?.id ?? 0;
    if (middleId === id) return middle;
    if (middleId < id) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}
