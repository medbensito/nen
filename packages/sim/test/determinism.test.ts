import { describe, expect, it } from 'vitest';
import type { Command } from '../src/commands/command';
import { hashState } from '../src/core/hash';
import { createSimulation } from '../src/core/simulation';
import { fixtureGameData } from './fixtures/game-data';
import { jitter, spawnEvery, stopTeleportsToOrigin } from './fixtures/systems';

type CommandScript = ReadonlyMap<number, readonly Command[]>;

const SCRIPT: CommandScript = new Map([
  [120, [{ type: 'stop', entityId: 1 }]],
  [480, [{ type: 'stop', entityId: 3 }]],
  [
    900,
    [
      { type: 'stop', entityId: 2 },
      { type: 'stop', entityId: 5 },
    ],
  ],
]);

/** Runs a game and returns the state hash after every tick. */
function run(seed: number, script: CommandScript, ticks = 1000): string[] {
  const sim = createSimulation({
    data: fixtureGameData(),
    seed,
    systems: [spawnEvery(50), stopTeleportsToOrigin, jitter],
  });
  const hashes: string[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    for (const command of script.get(tick) ?? []) sim.enqueue(command);
    sim.step();
    hashes.push(hashState(sim.state));
  }
  return hashes;
}

/** Same check with the real game systems and move orders across the arena. */
function runGame(seed: number, ticks = 1000): string[] {
  const sim = createSimulation({ data: fixtureGameData(), seed });
  const entityId = sim.state.players[0]?.entityId ?? -1;
  const targets = [
    { x: 740, y: 300 },
    { x: 400, y: 560 },
    { x: 60, y: 60 },
    { x: 400, y: 300 },
  ];
  const hashes: string[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    if (tick % 120 === 0) {
      sim.enqueue({
        type: 'move',
        entityId,
        target: targets[(tick / 120) % targets.length] ?? { x: 0, y: 0 },
      });
    }
    sim.step();
    hashes.push(hashState(sim.state));
  }
  return hashes;
}

/** A fight with the dummy: chase, projectiles, damage, deaths and respawns. */
function runFight(seed: number, ticks = 1500): string[] {
  const sim = createSimulation({ data: fixtureGameData(), seed });
  const championId = sim.state.players[0]?.entityId ?? -1;
  const dummyId = sim.state.entities.find((entity) => entity.kind === 'unit')?.id ?? -1;
  const hashes: string[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    if (tick % 200 === 0) sim.enqueue({ type: 'attack', entityId: championId, targetId: dummyId });
    if (tick % 200 === 150)
      sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 500 } });
    sim.step();
    hashes.push(hashState(sim.state));
  }
  return hashes;
}

/** Every ability, the nen gauge, exhaustion and refunds. */
function runAbilities(seed: number, ticks = 1200): string[] {
  const sim = createSimulation({ data: fixtureGameData(), seed });
  const entityId = sim.state.players[0]?.entityId ?? -1;
  const dummy = sim.state.entities.find((entity) => entity.kind === 'unit');
  const at = dummy ? { x: dummy.position.x, y: dummy.position.y } : { x: 300, y: 80 };
  const hashes: string[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    const slot = Math.floor(tick / 50) % 4;
    if (tick % 50 === 0) sim.enqueue({ type: 'cast', entityId, slot, target: at });
    if (tick % 50 === 25) sim.enqueue({ type: 'attack', entityId, targetId: dummy?.id ?? -1 });
    sim.step();
    hashes.push(hashState(sim.state));
  }
  return hashes;
}

describe('determinism', () => {
  it('holds with abilities, nen and exhaustion', () => {
    expect(runAbilities(5)).toEqual(runAbilities(5));
  });

  it('holds for the game systems and move orders', () => {
    expect(runGame(3)).toEqual(runGame(3));
  });

  it('holds through combat, deaths and respawns', () => {
    expect(runFight(4)).toEqual(runFight(4));
  });

  it('gives the same state, tick by tick, for the same seed and commands', () => {
    const first = run(2026, SCRIPT);
    const second = run(2026, SCRIPT);
    expect(first).toHaveLength(1000);
    expect(second).toEqual(first);
  });

  it('diverges with a different seed', () => {
    expect(run(1, SCRIPT).at(-1)).not.toBe(run(2, SCRIPT).at(-1));
  });

  it('diverges when a command arrives on a different tick', () => {
    const shifted: CommandScript = new Map(
      [...SCRIPT].map(([tick, commands]) => [tick + 1, commands]),
    );
    expect(run(2026, SCRIPT).at(-1)).not.toBe(run(2026, shifted).at(-1));
  });

  it('keeps a state that survives a JSON round trip unchanged', () => {
    const sim = createSimulation({
      data: fixtureGameData(),
      seed: 7,
      systems: [spawnEvery(10), jitter],
    });
    for (let tick = 0; tick < 200; tick++) sim.step();

    const snapshot = JSON.parse(JSON.stringify(sim.state)) as unknown;
    expect(snapshot).toEqual(sim.state);
    expect(hashState(snapshot)).toBe(hashState(sim.state));
  });
});
