import { z } from 'zod';
import { idSchema, teamSchema } from './common';
import { perSecondToPerTick, secondsToTicks } from './units';

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
  /** Share of max health and nen restored per second to units standing in their own fountain. */
  fountainRegen: z.number().nonnegative(),
});

export type CombatRulesDef = z.infer<typeof combatRulesSchema>;

export interface CombatRules {
  armorScale: number;
  respawnBaseTicks: number;
  respawnPerLevelTicks: number;
  /** Share of max health and nen per tick. */
  fountainRegenPerTick: number;
}

export function compileCombatRules(def: CombatRulesDef, tickRate: number): CombatRules {
  return {
    armorScale: def.armorScale,
    respawnBaseTicks: secondsToTicks(def.respawn.base, tickRate),
    respawnPerLevelTicks: secondsToTicks(def.respawn.perLevel, tickRate),
    fountainRegenPerTick: perSecondToPerTick(def.fountainRegen, tickRate),
  };
}

/** data/rules/nen.json */
export const nenRulesSchema = z.strictObject({
  /** Seconds after dealing or taking damage from an enemy during which a unit counts as in combat. */
  combatDuration: z.number().nonnegative(),
  /** Nen per second. */
  regen: z.strictObject({
    outOfCombat: z.number().nonnegative(),
    inCombat: z.number().nonnegative(),
  }),
  /** Reached when spending empties the gauge. */
  exhaustion: z.strictObject({
    damageTakenMultiplier: z.number().min(1),
    /** Share of the max gauge at which exhaustion ends. */
    recoverAt: z.number().min(0).max(1),
  }),
});

export type NenRulesDef = z.infer<typeof nenRulesSchema>;

export interface NenRules {
  combatTicks: number;
  regenOutOfCombatPerTick: number;
  regenInCombatPerTick: number;
  exhaustedDamageTakenMultiplier: number;
  exhaustionRecoverAt: number;
}

export function compileNenRules(def: NenRulesDef, tickRate: number): NenRules {
  return {
    combatTicks: secondsToTicks(def.combatDuration, tickRate),
    regenOutOfCombatPerTick: perSecondToPerTick(def.regen.outOfCombat, tickRate),
    regenInCombatPerTick: perSecondToPerTick(def.regen.inCombat, tickRate),
    exhaustedDamageTakenMultiplier: def.exhaustion.damageTakenMultiplier,
    exhaustionRecoverAt: def.exhaustion.recoverAt,
  };
}
