import { z } from 'zod';

/** data/rules/simulation.json */
export const simulationRulesSchema = z.strictObject({
  /** Simulation ticks per second. Rendering interpolates between ticks. */
  tickRate: z.int().min(1).max(240),
  /**
   * Upper bound of ticks run in a single rendered frame. When the page stalls
   * (tab in background, breakpoint), the backlog beyond this bound is dropped
   * instead of freezing the game while it catches up.
   */
  maxStepsPerFrame: z.int().min(1).max(60),
});

export type SimulationRules = z.infer<typeof simulationRulesSchema>;
