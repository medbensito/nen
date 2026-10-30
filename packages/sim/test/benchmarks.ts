import { createSimulation } from '../src/core/simulation';
import { fixtureGameData } from './fixtures/game-data';
import { jitter, spawnAtStart } from './fixtures/systems';

export interface Benchmark {
  readonly name: string;
  /** Maximum allowed 95th percentile, in milliseconds. */
  readonly budgetMs: number;
  /** Builds the scenario and returns the operation to measure. */
  readonly setup: () => () => void;
}

/** Scenarios measured by `pnpm bench` (runner: tools/bench.ts). */
export const BENCHMARKS: readonly Benchmark[] = [
  {
    // No gameplay system yet: this measures the step pipeline itself.
    name: 'sim.step, 100 entities, pipeline only',
    budgetMs: 2,
    setup: () => {
      const sim = createSimulation({
        data: fixtureGameData(),
        seed: 1,
        systems: [spawnAtStart(100), jitter],
      });
      sim.step();
      return () => sim.step();
    },
  },
];
