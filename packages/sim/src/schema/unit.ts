import { z } from 'zod';
import { attackSchema, compileAttack, type AttackStats } from './attack';
import { idSchema, localeKeySchema } from './common';
import { secondsToTicks } from './units';

/**
 * data/units/<id>.json — units that are not champions. M2 has the training
 * dummy; minions, towers and bases join in M4 and M5.
 */
export const unitSchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  radius: z.number().positive(),
  health: z.number().positive(),
  armor: z.number().nonnegative(),
  attack: attackSchema,
  /** Seconds before the unit comes back where it was placed. Without it, a dead unit is gone. */
  respawnTime: z.number().positive().optional(),
  /** Strikes back at whoever hits it, for this many seconds after the last hit. Never chases. */
  retaliation: z.strictObject({ duration: z.number().positive() }).optional(),
});

export type UnitDef = z.infer<typeof unitSchema>;

export interface Unit {
  id: string;
  name: string;
  radius: number;
  health: number;
  armor: number;
  attack: AttackStats;
  /** null: the unit does not respawn. */
  respawnTicks: number | null;
  /** null: the unit does not retaliate. */
  retaliationTicks: number | null;
}

export function compileUnit(def: UnitDef, tickRate: number): Unit {
  return {
    id: def.id,
    name: def.name,
    radius: def.radius,
    health: def.health,
    armor: def.armor,
    attack: compileAttack(def.attack, tickRate),
    respawnTicks: def.respawnTime === undefined ? null : secondsToTicks(def.respawnTime, tickRate),
    retaliationTicks:
      def.retaliation === undefined ? null : secondsToTicks(def.retaliation.duration, tickRate),
  };
}
