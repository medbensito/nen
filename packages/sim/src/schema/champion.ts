import { z } from 'zod';
import { attackSchema, compileAttack, type AttackStats } from './attack';
import { idSchema, localeKeySchema } from './common';
import { perSecondToPerTick } from './units';

/** data/champions/<id>.json — nen and abilities arrive in M3, growth per level in M4. */
export const championSchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  /** Body radius, kept clear of walls by the navigation. */
  radius: z.number().positive(),
  /** Units per second. */
  moveSpeed: z.number().positive(),
  health: z.number().positive(),
  armor: z.number().nonnegative(),
  attack: attackSchema,
});

export type ChampionDef = z.infer<typeof championSchema>;

/** A champion as the simulation uses it: rates are per tick. */
export interface Champion {
  id: string;
  name: string;
  radius: number;
  moveSpeedPerTick: number;
  health: number;
  armor: number;
  attack: AttackStats;
}

export function compileChampion(def: ChampionDef, tickRate: number): Champion {
  return {
    id: def.id,
    name: def.name,
    radius: def.radius,
    moveSpeedPerTick: perSecondToPerTick(def.moveSpeed, tickRate),
    health: def.health,
    armor: def.armor,
    attack: compileAttack(def.attack, tickRate),
  };
}
