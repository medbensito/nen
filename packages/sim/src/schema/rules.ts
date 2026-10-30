import { z } from 'zod';
import { idSchema, teamSchema } from './common';
import { secondsToTicks } from './units';

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

/** data/rules/match.json */
export const matchRulesSchema = z.strictObject({
  /** Id of the map to play, from data/maps/. */
  map: idSchema,
  /** Id of the champion the player controls, from data/champions/. */
  champion: idSchema,
  /** Team of the player. */
  team: teamSchema,
});

export type MatchRules = z.infer<typeof matchRulesSchema>;

/** data/rules/combat.json */
export const combatRulesSchema = z.strictObject({
  /**
   * Damage taken = raw damage × armorScale / (armorScale + armor). With 100,
   * each point of armor adds 1 % of effective health.
   */
  armorScale: z.number().positive(),
  /** Champion respawn delay in seconds: base + perLevel × level. */
  respawn: z.strictObject({
    base: z.number().nonnegative(),
    perLevel: z.number().nonnegative(),
  }),
});

export type CombatRulesDef = z.infer<typeof combatRulesSchema>;

export interface CombatRules {
  armorScale: number;
  respawnBaseTicks: number;
  respawnPerLevelTicks: number;
}

export function compileCombatRules(def: CombatRulesDef, tickRate: number): CombatRules {
  return {
    armorScale: def.armorScale,
    respawnBaseTicks: secondsToTicks(def.respawn.base, tickRate),
    respawnPerLevelTicks: secondsToTicks(def.respawn.perLevel, tickRate),
  };
}
