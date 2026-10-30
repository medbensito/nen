/**
 * Runs the simulation benchmarks and fails when one exceeds its budget.
 * Usage: pnpm bench
 */
import { performance } from 'node:perf_hooks';
import { BENCHMARKS } from '../packages/sim/test/benchmarks';

const WARMUP_RUNS = 300;
const MEASURED_RUNS = 3000;

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index] ?? Number.NaN;
}

const format = (ms: number): string => `${ms.toFixed(4)} ms`;

let overBudget = 0;

for (const benchmark of BENCHMARKS) {
  const run = benchmark.setup();
  for (let i = 0; i < WARMUP_RUNS; i++) run();

  const durations: number[] = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const start = performance.now();
    run();
    durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);

  const mean = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const p95 = percentile(durations, 0.95);
  const withinBudget = p95 <= benchmark.budgetMs;
  if (!withinBudget) overBudget += 1;

  console.log(
    [
      `${withinBudget ? 'ok  ' : 'FAIL'} ${benchmark.name}`,
      `     mean ${format(mean)} | p50 ${format(percentile(durations, 0.5))} | p95 ${format(p95)} | max ${format(durations.at(-1) ?? Number.NaN)}`,
      `     budget p95 <= ${format(benchmark.budgetMs)}`,
    ].join('\n'),
  );
}

if (overBudget > 0) {
  console.error(`\n${overBudget} benchmark(s) over budget.`);
  process.exitCode = 1;
}
