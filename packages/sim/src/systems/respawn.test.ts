import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy } from '../../test/fixtures/test-sim';

const IN_RANGE = { x: 250, y: 300 };

describe('death', () => {
  it('kills a unit at 0 health and drops the attacker target', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_RANGE);
      patch(files, 'units/test-dummy.json', { health: 60 }); // 2 hits of 33.33
    });
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });

    const events = test.run(60);
    const deaths = events.filter((event) => event.type === 'death');
    expect(deaths).toEqual([{ type: 'death', entityId: dummyId, position: IN_RANGE }]);
    expect(test.dummy().health?.current).toBe(0);
    expect(test.dummy().deadUntil).toBeDefined();
    test.run(1);
    expect(test.champion().attack?.target).toBeNull();
  });

  it('respawns a unit where it was placed, with full health, after its delay', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_RANGE);
      patch(files, 'units/test-dummy.json', { health: 30 }); // one hit
    });
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });

    let tick = 0;
    while (test.dummy().deadUntil === undefined && tick < 100) {
      test.run(1);
      tick += 1;
    }
    expect(test.dummy().deadUntil).toBeDefined();

    // respawnTime 2 s: 60 ticks dead.
    const dead = test.run(59);
    expect(dead.some((event) => event.type === 'respawn')).toBe(false);
    expect(test.run(1)).toContainEqual({ type: 'respawn', entityId: dummyId });
    expect(test.dummy()).toMatchObject({ position: IN_RANGE, health: { current: 30, max: 30 } });
    expect(test.dummy().deadUntil).toBeUndefined();
  });

  it('removes a unit that does not respawn', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_RANGE);
      const dummy: Record<string, unknown> = { ...files['units/test-dummy.json'], health: 30 };
      delete dummy.respawnTime;
      files['units/test-dummy.json'] = dummy;
    });
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    test.run(40);
    expect(sim.state.entities.some((entity) => entity.id === dummyId)).toBe(false);
  });

  it('respawns the champion at its fountain after base + per-level delay, and ignores orders meanwhile', () => {
    // The dummy retaliates with 30 damage: a 30-health champion dies on the first riposte.
    const test = createTestSim((files) => {
      placeDummy(files, IN_RANGE);
      patch(files, 'champions/test-champion.json', { health: 30 });
      patch(files, 'units/test-dummy.json', { health: 10_000 });
    });
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });

    let tick = 0;
    while (test.champion().deadUntil === undefined && tick < 200) {
      test.run(1);
      tick += 1;
    }
    expect(test.champion().deadUntil).toBeDefined();

    sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 500 } });
    // Respawn delay: 2 s + 1 s × level 1 = 90 ticks.
    const dead = test.run(89);
    expect(dead.some((event) => event.type === 'respawn')).toBe(false);
    expect(test.run(1)).toContainEqual({ type: 'respawn', entityId: championId });
    expect(test.champion()).toMatchObject({
      position: { x: 60, y: 300 },
      health: { current: 30, max: 30 },
      movement: { path: [] },
    });
  });
});
