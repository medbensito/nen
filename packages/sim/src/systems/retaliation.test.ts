import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy } from '../../test/fixtures/test-sim';
import type { SimEvent } from '../core/events';

const IN_RANGE = { x: 250, y: 300 };
const attacksBy = (events: readonly SimEvent[], sourceId: number) =>
  events.filter((event) => event.type === 'attack' && event.sourceId === sourceId);

function setup() {
  return createTestSim((files) => {
    placeDummy(files, IN_RANGE);
    patch(files, 'units/test-dummy.json', { health: 10_000 });
    patch(files, 'champions/test-champion.json', { health: 10_000 });
  });
}

describe('retaliation', () => {
  it('leaves an idle champion alone', () => {
    const test = setup();
    expect(attacksBy(test.run(120), test.dummyId)).toHaveLength(0);
  });

  it('strikes back at the attacker', () => {
    const test = setup();
    test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });
    const events = test.run(90);
    expect(attacksBy(events, test.dummyId).length).toBeGreaterThan(0);
    expect(test.champion().health?.current).toBeLessThan(10_000);
  });

  it('calms down once its window after the last hit is over', () => {
    const test = setup();
    test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });
    test.run(30);
    test.sim.enqueue({ type: 'stop', entityId: test.championId });
    // The champion's last projectile may still be flying: 3 s window after it lands.
    test.run(100);
    expect(attacksBy(test.run(60), test.dummyId)).toHaveLength(0);
    expect(test.dummy().attack?.target).toBeNull();
  });

  it('never chases: out of range, it does not attack', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_RANGE);
      patch(files, 'units/test-dummy.json', { health: 10_000 });
      const dummy = files['units/test-dummy.json'] ?? {};
      patch(files, 'units/test-dummy.json', {
        attack: { ...(dummy.attack as object), range: 50 },
      });
    });
    test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });
    const events = test.run(90);
    expect(attacksBy(events, test.dummyId)).toHaveLength(0);
    expect(test.dummy().position).toEqual(IN_RANGE);
  });
});
