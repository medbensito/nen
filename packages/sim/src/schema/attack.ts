import { z } from 'zod';
import { perSecondToPerTick, secondsToTicks } from './units';

/** Basic attack, shared by champions and units. */
export const attackSchema = z.strictObject({
  damage: z.number().positive(),
  /** Attacks per second. */
  perSecond: z.number().positive(),
  /** Reach, from the attacker's edge to the target's edge. */
  range: z.number().nonnegative(),
  /**
   * Share of the attack period spent winding up before the hit (or the
   * projectile launch). A move order during the wind-up cancels the attack.
   */
  windup: z.number().min(0).max(1),
  /** Ranged attacks launch a homing projectile; without one, the hit lands at the end of the wind-up. */
  projectile: z
    .strictObject({
      speed: z.number().positive(),
      radius: z.number().positive(),
    })
    .optional(),
});

export type AttackDef = z.infer<typeof attackSchema>;

/** An attack as the simulation uses it: durations in ticks, speeds per tick. */
export interface AttackStats {
  damage: number;
  range: number;
  /** Ticks from the start of one attack to the start of the next. */
  periodTicks: number;
  /** Ticks from the start of an attack to the hit or launch; always below `periodTicks`. */
  windupTicks: number;
  /** 0 for an attack without projectile. */
  projectileSpeed: number;
  projectileRadius: number;
}

export function compileAttack(def: AttackDef, tickRate: number): AttackStats {
  const periodTicks = Math.max(1, secondsToTicks(1 / def.perSecond, tickRate));
  return {
    damage: def.damage,
    range: def.range,
    periodTicks,
    windupTicks: Math.min(periodTicks - 1, Math.round(periodTicks * def.windup)),
    projectileSpeed: def.projectile ? perSecondToPerTick(def.projectile.speed, tickRate) : 0,
    projectileRadius: def.projectile?.radius ?? 0,
  };
}
