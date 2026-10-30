import { createRngState, type RngState } from '../core/rng';
import type { Vec2 } from '../core/vec2';

export type EntityId = number;
export type Team = 'blue' | 'red' | 'neutral';

/**
 * Base entity: identity, team and position. Gameplay components (movement,
 * health, nen…) are added by the milestones that need them.
 */
export interface Entity {
  id: EntityId;
  kind: string;
  team: Team;
  position: Vec2;
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
  /** Always sorted by id: ids only grow, and systems iterate in this order. */
  entities: Entity[];
}

export function createGameState(seed: number): GameState {
  return { tick: 0, rng: createRngState(seed), nextEntityId: 1, entities: [] };
}

export function spawnEntity(state: GameState, init: Omit<Entity, 'id'>): Entity {
  const entity: Entity = { ...init, position: { ...init.position }, id: state.nextEntityId };
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
