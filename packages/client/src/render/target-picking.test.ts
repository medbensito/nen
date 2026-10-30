import type { DeepReadonly, Entity, GameState } from '@nen/sim';
import { describe, expect, it } from 'vitest';
import { pickEnemyAt } from './target-picking';

function unit(id: number, team: Entity['team'], x: number, extra: Partial<Entity> = {}): Entity {
  return {
    id,
    kind: 'unit',
    defId: 'test',
    team,
    position: { x, y: 0 },
    radius: 20,
    health: { current: 10, max: 10 },
    ...extra,
  };
}

function state(entities: Entity[]): DeepReadonly<GameState> {
  return {
    tick: 0,
    rng: { s: 0 },
    nextEntityId: 10,
    nextProjectileId: 1,
    players: [],
    entities,
    projectiles: [],
  };
}

describe('pickEnemyAt', () => {
  it('picks an enemy whose body, plus tolerance, contains the point', () => {
    const world = state([unit(1, 'blue', 0), unit(2, 'red', 100)]);
    expect(pickEnemyAt(world, 'blue', { x: 115, y: 0 }, 0)).toBe(2);
    expect(pickEnemyAt(world, 'blue', { x: 125, y: 0 }, 0)).toBeNull();
    expect(pickEnemyAt(world, 'blue', { x: 125, y: 0 }, 8)).toBe(2);
  });

  it('ignores allies and dead units', () => {
    const world = state([unit(1, 'blue', 0), unit(2, 'red', 100, { deadUntil: 50 })]);
    expect(pickEnemyAt(world, 'blue', { x: 0, y: 0 }, 0)).toBeNull();
    expect(pickEnemyAt(world, 'blue', { x: 100, y: 0 }, 0)).toBeNull();
  });

  it('prefers the closest center when bodies overlap', () => {
    const world = state([unit(2, 'red', 100), unit(3, 'red', 130)]);
    expect(pickEnemyAt(world, 'blue', { x: 120, y: 0 }, 0)).toBe(3);
  });
});
