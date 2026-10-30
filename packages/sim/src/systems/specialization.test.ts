import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy } from '../../test/fixtures/test-sim';
import type { SimEvent } from '../core/events';
import type { FixtureFiles } from '../../test/fixtures/game-data';

// Detached aura (fixture: 25 %): ability projectiles that hit give back a
// share of the ability cost, once per cast.
const IN_LINE = { x: 250, y: 300 };

const refunds = (events: readonly SimEvent[]) =>
  events.filter(
    (event): event is Extract<SimEvent, { type: 'nen-refund' }> => event.type === 'nen-refund',
  );

function withShare(share: number) {
  return (files: FixtureFiles) => {
    placeDummy(files, IN_LINE);
    patch(files, 'units/test-dummy.json', { health: 10_000 });
    const champion = files['champions/test-champion.json'] ?? {};
    const specialization = champion.specialization as { rule: object };
    patch(files, 'champions/test-champion.json', {
      specialization: { ...specialization, rule: { ...specialization.rule, share } },
    });
  };
}

describe('detached aura (projectile hit refund)', () => {
  it('gives back a share of the cost when a skillshot hits', () => {
    const withRule = createTestSim(withShare(0.25));
    const withoutRule = createTestSim(withShare(0));
    for (const test of [withRule, withoutRule]) {
      test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 0, target: IN_LINE });
    }
    const events = withRule.run(10);
    withoutRule.run(10);

    expect(refunds(events)).toEqual([
      { type: 'nen-refund', entityId: withRule.championId, amount: 7.5 },
    ]);
    // Same fight, same ticks: the only difference is the refund.
    const difference =
      (withRule.champion().nen?.current ?? 0) - (withoutRule.champion().nen?.current ?? 0);
    expect(difference).toBe(7.5);
  });

  it('gives nothing back for a miss', () => {
    const test = createTestSim(withShare(0.25));
    test.sim.enqueue({
      type: 'cast',
      entityId: test.championId,
      slot: 0,
      target: { x: 60, y: 590 },
    });
    expect(refunds(test.run(30))).toEqual([]);
  });

  it('pays once per cast, even when an orb hits several times', () => {
    const test = createTestSim((files) => {
      withShare(0.25)(files);
      placeDummy(files, { x: 300, y: 80 });
    });
    test.sim.enqueue({
      type: 'cast',
      entityId: test.championId,
      slot: 2,
      target: { x: 250, y: 80 },
    });
    const events = test.run(70);
    const hits = events.filter(
      (event) => event.type === 'damage' && event.targetId === test.dummyId,
    );
    expect(hits.length).toBeGreaterThan(1);
    expect(refunds(events)).toEqual([
      { type: 'nen-refund', entityId: test.championId, amount: 12.5 },
    ]);
  });

  it('does not apply to basic attacks or beams', () => {
    const test = createTestSim(withShare(0.25));
    test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });
    test.run(60);
    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 3, target: IN_LINE });
    expect(refunds(test.run(40))).toEqual([]);
  });
});
