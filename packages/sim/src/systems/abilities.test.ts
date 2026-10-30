import { describe, expect, it } from 'vitest';
import { createTestSim, patch, placeDummy, type TestSim } from '../../test/fixtures/test-sim';
import type { SimEvent } from '../core/events';
import { distanceToRect } from '../core/geometry';
import type { FixtureFiles } from '../../test/fixtures/game-data';

// Slots: 0 test-shot (30 nen, 30-tick cooldown), 1 test-dash (20 nen),
// 2 test-orb (50 nen), 3 test-beam (all, 60 minimum, 30-tick channel).
// Champion at (60, 300), radius 30, 200 nen; dummy radius 40, 50 armor (×2/3).
const IN_LINE = { x: 250, y: 300 };
const AWAY = { x: 60, y: 590 };

const damageTo = (events: readonly SimEvent[], targetId: number) =>
  events.filter(
    (event): event is Extract<SimEvent, { type: 'damage' }> =>
      event.type === 'damage' && event.targetId === targetId,
  );
const rejection = (events: readonly SimEvent[]) =>
  events.find(
    (event): event is Extract<SimEvent, { type: 'cast-rejected' }> =>
      event.type === 'cast-rejected',
  )?.reason;

function cast(test: TestSim, slot: number, target: { x: number; y: number }): void {
  test.sim.enqueue({ type: 'cast', entityId: test.championId, slot, target });
}

function setAbility(files: FixtureFiles, id: string, fields: Record<string, unknown>): void {
  patch(files, `abilities/${id}.json`, fields);
}

describe('casting', () => {
  it('spends the cost and starts the cooldown', () => {
    const test = createTestSim();
    cast(test, 0, AWAY);
    const events = test.run(1);
    expect(events).toContainEqual({
      type: 'cast',
      entityId: test.championId,
      slot: 0,
      abilityId: 'test-shot',
    });
    // 200 − 30, then +1 regeneration out of combat on the same tick.
    expect(test.champion().nen?.current).toBe(171);
    expect(test.champion().abilities?.[0]?.cooldownTicks).toBe(30);
  });

  it('refuses a cast on cooldown without spending anything', () => {
    const test = createTestSim();
    cast(test, 0, AWAY);
    test.run(1);
    const nen = test.champion().nen?.current;
    cast(test, 0, AWAY);
    const events = test.run(1);
    expect(rejection(events)).toBe('cooldown');
    expect(test.champion().nen?.current).toBe((nen ?? 0) + 1);
    expect(test.sim.state.projectiles).toHaveLength(1);
  });

  it('allows the cast again exactly when the cooldown is over', () => {
    const test = createTestSim();
    cast(test, 0, AWAY);
    test.run(30);
    cast(test, 0, AWAY);
    expect(rejection(test.run(1))).toBeUndefined();
  });

  it('refuses a cast without enough nen', () => {
    const test = createTestSim((files) =>
      patch(files, 'champions/test-champion.json', { nen: 40 }),
    );
    cast(test, 2, AWAY); // orb: 50
    expect(rejection(test.run(1))).toBe('nen');
    expect(test.champion().nen?.current).toBe(40);
    expect(test.sim.state.entities.some((entity) => entity.kind === 'summon')).toBe(false);
  });

  it('refuses an ability above the champion level', () => {
    const test = createTestSim((files) => setAbility(files, 'test-shot', { unlockLevel: 2 }));
    cast(test, 0, AWAY);
    expect(rejection(test.run(1))).toBe('locked');
  });

  it('follows the cost and cooldown from data', () => {
    const test = createTestSim((files) =>
      setAbility(files, 'test-shot', { cost: 80, cooldown: 2 }),
    );
    cast(test, 0, AWAY);
    test.run(1);
    expect(test.champion().nen?.current).toBe(121);
    expect(test.champion().abilities?.[0]?.cooldownTicks).toBe(60);
  });

  it('ignores a slot that does not exist and a target that is not a number', () => {
    const test = createTestSim();
    cast(test, 7, AWAY);
    cast(test, 0, { x: Number.NaN, y: 0 });
    const events = test.run(1);
    expect(
      events.filter((event) => event.type === 'cast' || event.type === 'cast-rejected'),
    ).toEqual([]);
    expect(test.champion().nen?.current).toBe(200);
  });
});

describe('skillshot', () => {
  it('hits the first enemy in its path', () => {
    const test = createTestSim((files) => placeDummy(files, IN_LINE));
    cast(test, 0, IN_LINE);
    const hits = damageTo(test.run(10), test.dummyId);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.amount).toBeCloseTo(40, 6); // 60 × 100 / 150
    expect(test.sim.state.projectiles).toHaveLength(0);
  });

  it('misses when aimed away, and vanishes after its range', () => {
    const test = createTestSim((files) => placeDummy(files, IN_LINE));
    cast(test, 0, AWAY);
    expect(damageTo(test.run(19), test.dummyId)).toHaveLength(0);
    expect(test.sim.state.projectiles).toHaveLength(1);
    test.run(1); // 400 range at 20 per tick: 20 ticks
    expect(test.sim.state.projectiles).toHaveLength(0);
  });

  it('flies through allies', () => {
    const test = createTestSim((files) =>
      patch(files, 'maps/test-arena.json', {
        units: [{ unit: 'test-dummy', team: 'blue', position: IN_LINE }],
      }),
    );
    cast(test, 0, IN_LINE);
    expect(damageTo(test.run(20), test.dummyId)).toHaveLength(0);
  });
});

describe('dash', () => {
  it('covers its distance at its speed, then stands still', () => {
    const test = createTestSim();
    cast(test, 1, { x: 600, y: 300 });
    test.run(5); // 200 units at 40 per tick
    expect(test.champion().position).toEqual({ x: 260, y: 300 });
    expect(test.champion().dash).toBeUndefined();
    test.run(5);
    expect(test.champion().position).toEqual({ x: 260, y: 300 });
  });

  it('stops short against a wall', () => {
    const test = createTestSim((files) =>
      setAbility(files, 'test-dash', { effect: { type: 'dash', distance: 600, speed: 1200 } }),
    );
    cast(test, 1, { x: 700, y: 300 });
    test.run(20);
    const wall = { x: 350, y: 150, width: 100, height: 300 };
    expect(test.champion().dash).toBeUndefined();
    expect(test.champion().position.x).toBeLessThan(350);
    // Kept clear of the wall, give or take half a navigation cell diagonal.
    expect(distanceToRect(test.champion().position, wall)).toBeGreaterThan(30 - 18);
  });
});

describe('orb', () => {
  const NEAR_DUMMY = { x: 250, y: 80 }; // the dummy stands at (300, 80)

  it('shoots the nearest enemy every interval, then vanishes', () => {
    const test = createTestSim();
    cast(test, 2, NEAR_DUMMY);
    const events = test.run(70);
    const orbShots = damageTo(events, test.dummyId);
    // Shots on ticks 15, 30 and 45; the orb expires on tick 60.
    expect(orbShots).toHaveLength(3);
    expect(orbShots[0]?.amount).toBeCloseTo(10, 6); // 15 × 2/3
    expect(test.sim.state.entities.some((entity) => entity.kind === 'summon')).toBe(false);
  });

  it('is placed at the target, or at most its placement range away', () => {
    const near = createTestSim();
    cast(near, 2, NEAR_DUMMY);
    near.run(1);
    expect(near.sim.state.entities.find((entity) => entity.kind === 'summon')?.position).toEqual(
      NEAR_DUMMY,
    );

    const far = createTestSim();
    cast(far, 2, { x: 60, y: 1000 });
    far.run(1);
    expect(far.sim.state.entities.find((entity) => entity.kind === 'summon')?.position).toEqual({
      x: 60,
      y: 600,
    });
  });

  it('cannot be attacked', () => {
    const test = createTestSim();
    cast(test, 2, NEAR_DUMMY);
    test.run(1);
    const orb = test.sim.state.entities.find((entity) => entity.kind === 'summon');
    test.sim.enqueue({ type: 'attack', entityId: test.dummyId, targetId: orb?.id ?? -1 });
    test.run(1);
    expect(test.dummy().attack?.target).toBeNull();
  });
});

describe('channelled beam', () => {
  it('fires after the channel, spends all nen and scales damage with it', () => {
    const test = createTestSim((files) => {
      placeDummy(files, IN_LINE);
      patch(files, 'units/test-dummy.json', { health: 1000 });
    });
    cast(test, 3, IN_LINE);
    const channel = test.run(30);
    expect(channel.some((event) => event.type === 'beam')).toBe(false);
    expect(test.champion().channel).toBeDefined();

    const release = test.run(1);
    expect(release.some((event) => event.type === 'beam')).toBe(true);
    // 100 + 1 × 200 nen spent = 300 raw, × 2/3 armor.
    expect(damageTo(release, test.dummyId)[0]?.amount).toBeCloseTo(200, 6);
    expect(test.champion().nen?.exhausted).toBe(true);
    expect(test.champion().abilities?.[3]?.cooldownTicks).toBe(300);
  });

  it('keeps the champion in place while channelling', () => {
    const test = createTestSim();
    test.sim.enqueue({ type: 'move', entityId: test.championId, target: { x: 60, y: 500 } });
    test.run(3);
    cast(test, 3, AWAY);
    const position = { ...test.champion().position };
    test.run(20);
    expect(test.champion().position).toEqual(position);
  });

  it('is cancelled by a move order, at no cost and without cooldown', () => {
    const test = createTestSim((files) => placeDummy(files, IN_LINE));
    cast(test, 3, IN_LINE);
    test.run(10);
    test.sim.enqueue({ type: 'move', entityId: test.championId, target: { x: 60, y: 500 } });
    const events = test.run(40);
    expect(events).toContainEqual({
      type: 'channel-cancelled',
      entityId: test.championId,
      slot: 3,
    });
    expect(events.some((event) => event.type === 'beam')).toBe(false);
    expect(test.champion().nen).toMatchObject({ current: 200, exhausted: false });
    expect(test.champion().abilities?.[3]?.cooldownTicks).toBe(0);
  });

  it('needs its minimum nen to start', () => {
    const test = createTestSim((files) =>
      patch(files, 'champions/test-champion.json', { nen: 50 }),
    );
    cast(test, 3, AWAY);
    expect(rejection(test.run(1))).toBe('nen');
    expect(test.champion().channel).toBeUndefined();
  });

  it('refuses other casts while channelling', () => {
    const test = createTestSim();
    cast(test, 3, AWAY);
    test.run(1);
    cast(test, 0, AWAY);
    expect(rejection(test.run(1))).toBe('busy');
  });
});
