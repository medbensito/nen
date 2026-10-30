import { createRng, createRngState } from '../src/core/rng';
import { createSimulation } from '../src/core/simulation';
import { buildNavGrid } from '../src/nav/nav-grid';
import { findPath } from '../src/nav/pathfinding';
import type { MapDef } from '../src/schema/map';
import { spawnEntity } from '../src/state/game-state';
import { fixtureGameData } from './fixtures/game-data';
import { jitter, spawnAtStart } from './fixtures/systems';

export interface Benchmark {
  readonly name: string;
  /** Maximum allowed 95th percentile, in milliseconds. */
  readonly budgetMs: number;
  /** Builds the scenario and returns the operation to measure. */
  readonly setup: () => () => void;
}

/**
 * Lane-sized map (5000 × 1500, 25-unit cells: 200 × 60 grid) with walls
 * along the lane and rocks in it. Its own copy, independent from data/.
 */
const LANE_LIKE_MAP: MapDef = {
  id: 'bench-lane',
  name: 'map.bench-lane.name',
  width: 5000,
  height: 1500,
  navCellSize: 25,
  obstacles: [
    { x: 800, y: 0, width: 3400, height: 380 },
    { x: 800, y: 1120, width: 3400, height: 380 },
    { x: 1450, y: 380, width: 260, height: 120 },
    { x: 1950, y: 620, width: 160, height: 240 },
    { x: 2850, y: 560, width: 140, height: 200 },
  ],
  bases: [],
  units: [],
};

/** Scenarios measured by `pnpm bench` (runner: tools/bench.ts). */
export const BENCHMARKS: readonly Benchmark[] = [
  {
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
  {
    name: 'sim.step, 100 units walking their paths',
    budgetMs: 2,
    setup: () => {
      const data = fixtureGameData();
      const sim = createSimulation({
        data,
        seed: 1,
        setup: (state) => {
          const rng = createRng(createRngState(3));
          for (let i = 0; i < 100; i++) {
            // Long back-and-forth paths so every unit keeps walking during the run.
            const path = Array.from({ length: 400 }, (_, step) =>
              step % 2 === 0 ? { x: 60, y: rng.range(40, 560) } : { x: 300, y: rng.range(40, 560) },
            );
            spawnEntity(state, {
              kind: 'walker',
              team: 'blue',
              position: { x: 60, y: 300 },
              radius: 30,
              movement: { speed: 10, path },
            });
          }
        },
      });
      return () => sim.step();
    },
  },
  {
    name: 'findPath across a lane-sized map (200 × 60 cells)',
    budgetMs: 2,
    setup: () => {
      const grid = buildNavGrid(LANE_LIKE_MAP, 35);
      const rng = createRng(createRngState(11));
      return () => {
        findPath(grid, { x: 300, y: rng.range(500, 1000) }, { x: 4700, y: rng.range(500, 1000) });
      };
    },
  },
];
