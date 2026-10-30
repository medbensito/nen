import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy } from '../../test/fixtures/test-sim';
import type { SimEvent } from '../core/events';
import { distance } from '../core/vec2';
import { isInAttackRange } from './combat';

// Fixture: champion at (60, 300), radius 30, ranged attack 50 damage, 1 per
// second (30 ticks, 15 of wind-up), range 200, projectile 20 per tick.
// Dummy (red), radius 40, 300 health, 50 armor: each champion hit deals 33.33.

const IN_RANGE = { x: 250, y: 300 }; // edges 120 apart

const attacksBy = (events: readonly SimEvent[], sourceId: number) =>
  events.filter((event) => event.type === 'attack' && event.sourceId === sourceId);
const damageTo = (events: readonly SimEvent[], targetId: number) =>
  events.filter(
    (event): event is Extract<SimEvent, { type: 'damage' }> =>
      event.type === 'damage' && event.targetId === targetId,
  );

describe('attack command', () => {
  it('chases a target out of range, then stops and attacks', () => {
    const test = createTestSim();
    const { sim, championId, dummyId } = test;
    expect(isInAttackRange(test.champion(), test.dummy(), 200)).toBe(false);

    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    const events = test.run(60);

    expect(isInAttackRange(test.champion(), test.dummy(), 200)).toBe(true);
    expect(test.champion().movement?.path).toEqual([]);
    expect(attacksBy(events, championId).length).toBeGreaterThan(0);
  });

  it('launches after the wind-up and deals damage when the projectile arrives', () => {
    const test = createTestSim((files) => placeDummy(files, IN_RANGE));
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });

    // Command applied on tick 0, wind-up of 15 ticks: launch on tick 15.
    expect(attacksBy(test.run(15), championId)).toHaveLength(0);
    expect(attacksBy(test.run(1), championId)).toHaveLength(1);
    expect(test.dummy().health?.current).toBe(300);

    // Projectile starts at the champion's edge (90, 300), hits the dummy's edge (210, 300):
    // 120 units minus its own radius 5, at 20 per tick: 6 ticks.
    const flight = test.run(6);
    expect(damageTo(flight, dummyId)).toHaveLength(1);
    expect(damageTo(flight, dummyId)[0]?.amount).toBeCloseTo(33.333, 3);
    expect(test.dummy().health?.current).toBeCloseTo(266.667, 3);
  });

  it.each([
    [1, 3],
    [2, 6],
  ])(
    'keeps the rate from data: %d per second gives %d attacks in 3 seconds',
    (perSecond, count) => {
      const test = createTestSim((files) => {
        placeDummy(files, IN_RANGE);
        const champion = files['champions/test-champion.json'] ?? {};
        patch(files, 'champions/test-champion.json', {
          attack: { ...(champion.attack as object), perSecond },
        });
        patch(files, 'units/test-dummy.json', { health: 10_000 });
      });
      test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });
      expect(attacksBy(test.run(90), test.championId)).toHaveLength(count);
    },
  );

  it('never attacks without an order, even next to an enemy', () => {
    const test = createTestSim((files) => placeDummy(files, IN_RANGE));
    expect(attacksBy(test.run(120), test.championId)).toHaveLength(0);
  });

  it('cancels an attack still winding up when ordered to move, and refunds it', () => {
    const test = createTestSim((files) => placeDummy(files, IN_RANGE));
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    test.run(10);

    sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 320 } });
    const afterMove = test.run(20);
    expect(attacksBy(afterMove, championId)).toHaveLength(0);
    expect(test.champion().attack?.target).toBeNull();

    // Refunded: a new order winds up at once instead of waiting for a cooldown.
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    expect(attacksBy(test.run(16), championId)).toHaveLength(1);
  });

  it('stops attacking on a stop order', () => {
    const test = createTestSim((files) => placeDummy(files, IN_RANGE));
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    test.run(20);
    sim.enqueue({ type: 'stop', entityId: championId });
    expect(attacksBy(test.run(90), championId)).toHaveLength(0);
  });

  it('ignores attack orders on itself, on unknown or on dead entities', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_RANGE);
      patch(files, 'units/test-dummy.json', { health: 1, respawnTime: 10 });
    });
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'attack', entityId: championId, targetId: championId });
    sim.enqueue({ type: 'attack', entityId: championId, targetId: 999 });
    test.run(1);
    expect(test.champion().attack?.target).toBeNull();

    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    test.run(40); // first hit kills it
    expect(test.dummy().deadUntil).toBeDefined();
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    test.run(1);
    expect(test.champion().attack?.target).toBeNull();
  });

  it('follows a moving target', () => {
    const test = createTestSim((files) => {
      placeDummy(files, { x: 60, y: 100 });
      patch(files, 'units/test-dummy.json', { health: 10_000 });
    });
    const { sim, championId, dummyId } = test;
    // The dummy never moves, so make the champion walk away and come back to it.
    sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 560 } });
    test.run(20);
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    test.run(60);
    expect(distance(test.champion().position, test.dummy().position)).toBeLessThanOrEqual(270);
  });
});
