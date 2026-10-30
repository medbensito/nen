/**
 * Fixed-step clock: turns the variable time between rendered frames into a
 * whole number of simulation ticks, plus the fraction of the next tick that has
 * already elapsed (used by rendering to interpolate positions).
 *
 * Pure bookkeeping: the caller measures elapsed time, so this stays usable in
 * the browser, in tests and on a server loop.
 */
export interface FixedStepClock {
  readonly stepMs: number;
  readonly maxStepsPerFrame: number;
  accumulatorMs: number;
}

export interface ClockAdvance {
  /** Ticks to run now. */
  readonly steps: number;
  /** Elapsed fraction of the next tick, in [0, 1). */
  readonly alpha: number;
}

export function createFixedStepClock(tickRate: number, maxStepsPerFrame: number): FixedStepClock {
  return { stepMs: 1000 / tickRate, maxStepsPerFrame, accumulatorMs: 0 };
}

export function advanceClock(clock: FixedStepClock, elapsedMs: number): ClockAdvance {
  clock.accumulatorMs += Math.max(0, elapsedMs);

  let steps = Math.floor(clock.accumulatorMs / clock.stepMs);
  if (steps > clock.maxStepsPerFrame) {
    steps = clock.maxStepsPerFrame;
    // Drop the backlog instead of freezing the page to catch up on it.
    clock.accumulatorMs = clock.accumulatorMs % clock.stepMs;
  } else {
    clock.accumulatorMs -= steps * clock.stepMs;
  }

  return { steps, alpha: clock.accumulatorMs / clock.stepMs };
}
