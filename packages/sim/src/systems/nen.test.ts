import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy, type TestSim } from '../../test/fixtures/test-sim';
import type { SimEvent } from '../core/events';

// Fixture nen: 200 max, +1 per tick out of combat, none in combat (60 ticks
// after damage), exhausted at 0 until 50 (25 %), ×1.5 damage taken.
const IN_LINE = { x: 250, y: 300 };
const AWAY = { x: 60, y: 590 };

const nenOf = (test: TestSim) => test.champion().nen?.current ?? Number.NaN;

function noRefund(files: Parameters<Parameters<typeof createTestSim>[0] & object>[0]): void {
  const champion = files['champions/test-champion.json'] ?? {};
  const specialization = champion.specialization as { rule: object };
  patch(files, 'champions/test-champion.json', {
    specialization: { ...specialization, rule: { ...specialization.rule, share: 0 } },
  });
}

describe('nen regeneration', () => {
  it('pauses while in combat and resumes after the combat delay', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_LINE);
      noRefund(files);
      // A dummy that does not strike back, so the only damage is our hit.
      const dummy: Record<string, unknown> = { ...files['units/test-dummy.json'] };
      delete dummy.retaliation;
      files['units/test-dummy.json'] = dummy;
    });
    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 0, target: IN_LINE });

    let hit = false;
    for (let tick = 0; tick < 20 && !hit; tick++) {
      hit = test.run(1).some((event) => event.type === 'damage');
    }
    expect(hit).toBe(true);

    // In combat for 60 ticks from the hit tick: 59 more ticks without regeneration.
    const afterHit = nenOf(test);
    test.run(59);
    expect(nenOf(test)).toBe(afterHit);
    test.run(1);
    expect(nenOf(test)).toBe(afterHit + 1);
  });

  it('never goes above the max', () => {
    const test = createTestSim();
    test.run(100);
    expect(nenOf(test)).toBe(200);
  });
});

describe('exhaustion', () => {
  it('starts when spending empties the gauge', () => {
    const test = createTestSim((files) =>
      patch(files, 'champions/test-champion.json', { nen: 30 }),
    );
    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 0, target: AWAY });
    expect(test.run(1)).toContainEqual({ type: 'exhausted', entityId: test.championId });
    expect(test.champion().nen?.exhausted).toBe(true);
  });

  it('refuses casts while exhausted, without spending anything', () => {
    const test = createTestSim();
    // The beam spends all 200 nen; recovery needs 50, about 50 ticks away.
    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 3, target: AWAY });
    test.run(31);
    expect(test.champion().nen?.exhausted).toBe(true);
    const nen = nenOf(test);

    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 0, target: AWAY });
    const events = test.run(1);
    expect(events).toContainEqual({
      type: 'cast-rejected',
      entityId: test.championId,
      slot: 0,
      reason: 'exhausted',
    });
    expect(nenOf(test)).toBe(nen + 1);
    expect(test.sim.state.projectiles).toHaveLength(0);
  });

  it('makes the champion take more damage', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_LINE);
      patch(files, 'units/test-dummy.json', { health: 10_000 });
    });
    // The beam exhausts the champion and hits the dummy, which strikes back.
    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 3, target: IN_LINE });
    const hits = test
      .run(40)
      .filter(
        (event): event is Extract<SimEvent, { type: 'damage' }> =>
          event.type === 'damage' && event.targetId === test.championId,
      );
    // The dummy hits for 30 raw, the champion has no armor: 30 × 1.5 while exhausted.
    expect(test.champion().nen?.exhausted).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.amount).toBe(45);
  });

  it('ends once the gauge is back to the recovery share', () => {
    const test = createTestSim();
    // The beam spends everything; aimed away, it puts nobody in combat.
    test.sim.enqueue({ type: 'cast', entityId: test.championId, slot: 3, target: AWAY });

    let exhaustedAt = -1;
    let recoveredAt = -1;
    for (let tick = 0; tick < 200 && recoveredAt === -1; tick++) {
      for (const event of test.run(1)) {
        if (event.type === 'exhausted') exhaustedAt = tick;
        if (event.type === 'recovered') recoveredAt = tick;
      }
    }
    expect(exhaustedAt).toBe(30);
    // Back to 50 nen (25 % of 200) at 1 per tick, the release tick included.
    expect(recoveredAt - exhaustedAt).toBe(49);
    expect(nenOf(test)).toBeGreaterThanOrEqual(50);
  });
});

describe('fountain', () => {
  it('restores health and nen faster at its own fountain', () => {
    const atFountain = createTestSim((files) => {
      patch(files, 'rules/combat.json', {
        ...(files['rules/combat.json'] ?? {}),
        fountainRegen: 0.3,
      });
    });
    atFountain.sim.enqueue({
      type: 'cast',
      entityId: atFountain.championId,
      slot: 0,
      target: AWAY,
    });
    atFountain.run(1);
    const before = nenOf(atFountain);
    atFountain.run(1);
    // +1 out of combat, +2 (1 % of 200) from the fountain.
    expect(nenOf(atFountain) - before).toBeCloseTo(3, 6);
  });
});

describe('respawn', () => {
  it('comes back with a full gauge', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_LINE);
      patch(files, 'champions/test-champion.json', { health: 30 });
      patch(files, 'units/test-dummy.json', { health: 10_000 });
    });
    const { sim, championId, dummyId } = test;
    sim.enqueue({ type: 'cast', entityId: championId, slot: 0, target: AWAY });
    sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    const events = test.run(200);
    expect(events.some((event) => event.type === 'respawn')).toBe(true);
    expect(test.champion().nen).toEqual({ current: 200, max: 200, exhausted: false });
  });
});
