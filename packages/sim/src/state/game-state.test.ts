import { describe, expect, it } from 'vitest';
import { createGameState, findEntity, removeEntity, spawnEntity } from './game-state';

const dummy = { kind: 'dummy', team: 'neutral', position: { x: 0, y: 0 } } as const;

describe('game state', () => {
  it('assigns growing ids and keeps entities sorted by id', () => {
    const state = createGameState(1);
    const ids = [
      spawnEntity(state, dummy),
      spawnEntity(state, dummy),
      spawnEntity(state, dummy),
    ].map((entity) => entity.id);
    expect(ids).toEqual([1, 2, 3]);
    expect(state.entities.map((entity) => entity.id)).toEqual([1, 2, 3]);
  });

  it('does not share the position object passed at spawn', () => {
    const state = createGameState(1);
    const position = { x: 5, y: 5 };
    const entity = spawnEntity(state, { ...dummy, position });
    position.x = 99;
    expect(entity.position.x).toBe(5);
  });

  it('finds and removes entities by id, and never reuses an id', () => {
    const state = createGameState(1);
    for (let i = 0; i < 10; i++) spawnEntity(state, dummy);

    expect(findEntity(state, 7)?.id).toBe(7);
    expect(removeEntity(state, 7)).toBe(true);
    expect(findEntity(state, 7)).toBeUndefined();
    expect(removeEntity(state, 7)).toBe(false);
    expect(findEntity(state, 8)?.id).toBe(8);
    expect(spawnEntity(state, dummy).id).toBe(11);
  });

  it('is plain JSON data', () => {
    const state = createGameState(3);
    spawnEntity(state, dummy);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
