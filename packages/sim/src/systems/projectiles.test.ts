import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy } from '../../test/fixtures/test-sim';

describe('projectiles', () => {
  it('home in on the target and are removed on impact', () => {
    const test = createTestSim((files) => {
      placeDummy(files, { x: 250, y: 300 });
      patch(files, 'units/test-dummy.json', { health: 10_000 });
    });
    test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });
    test.run(16);
    expect(test.sim.state.projectiles).toHaveLength(1);
    expect(test.sim.state.projectiles[0]).toMatchObject({
      sourceId: test.championId,
      targetId: test.dummyId,
      damage: 50,
    });
    test.run(6);
    expect(test.sim.state.projectiles).toHaveLength(0);
  });

  it('fizzle when the target dies before impact', () => {
    // A fast attack (every 3 ticks) keeps two projectiles in flight (6 ticks each):
    // the first one kills the dummy, the second one must vanish.
    const test = createTestSim((files) => {
      placeDummy(files, { x: 250, y: 300 });
      patch(files, 'units/test-dummy.json', { health: 30 });
      const champion = files['champions/test-champion.json'] ?? {};
      patch(files, 'champions/test-champion.json', {
        attack: { ...(champion.attack as object), perSecond: 10, windup: 0 },
      });
    });
    test.sim.enqueue({ type: 'attack', entityId: test.championId, targetId: test.dummyId });

    let inFlight = 0;
    const events = [];
    for (let tick = 0; tick < 30; tick++) {
      events.push(...test.run(1));
      inFlight = Math.max(inFlight, test.sim.state.projectiles.length);
    }
    const hits = events.filter(
      (event) => event.type === 'damage' && event.targetId === test.dummyId,
    );
    expect(inFlight).toBeGreaterThanOrEqual(2);
    expect(hits).toHaveLength(1);
    expect(test.sim.state.projectiles).toHaveLength(0);
  });
});
