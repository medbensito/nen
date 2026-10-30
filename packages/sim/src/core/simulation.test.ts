import { describe, expect, it } from 'vitest';
import type { Command } from '../commands/command';
import { fixtureGameData } from '../../test/fixtures/game-data';
import { createSimulation, type System } from './simulation';

describe('simulation', () => {
  it('advances one tick per step', () => {
    const sim = createSimulation({ data: fixtureGameData(), seed: 1, systems: [] });
    sim.step();
    sim.step();
    expect(sim.state.tick).toBe(2);
  });

  it('delivers queued commands to the next step only, in order', () => {
    const received: (readonly Command[])[] = [];
    const recorder: System = (_state, ctx) => {
      received.push(ctx.commands);
    };
    const sim = createSimulation({ data: fixtureGameData(), seed: 1, systems: [recorder] });

    sim.enqueue({ type: 'stop', entityId: 1 });
    sim.enqueue({ type: 'stop', entityId: 2 });
    sim.step();
    sim.step();

    expect(received).toEqual([
      [
        { type: 'stop', entityId: 1 },
        { type: 'stop', entityId: 2 },
      ],
      [],
    ]);
  });

  it('runs systems in order and gives them the current tick', () => {
    const calls: string[] = [];
    const first: System = (_state, ctx) => {
      calls.push(`first@${ctx.tick}`);
    };
    const second: System = (_state, ctx) => {
      calls.push(`second@${ctx.tick}`);
    };
    const sim = createSimulation({ data: fixtureGameData(), seed: 1, systems: [first, second] });

    sim.step();
    sim.step();

    expect(calls).toEqual(['first@0', 'second@0', 'first@1', 'second@1']);
  });
});
