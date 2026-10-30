import { z } from 'zod';
import { idSchema, localeKeySchema } from './common';
import { perSecondToPerTick } from './units';

/** data/champions/<id>.json — M1 knows movement only; combat stats arrive in M2, nen in M3. */
export const championSchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  /** Body radius, kept clear of walls by the navigation. */
  radius: z.number().positive(),
  /** Units per second. */
  moveSpeed: z.number().positive(),
});

export type ChampionDef = z.infer<typeof championSchema>;

/** A champion as the simulation uses it: rates are per tick. */
export interface Champion {
  id: string;
  name: string;
  radius: number;
  moveSpeedPerTick: number;
}

export function compileChampion(def: ChampionDef, tickRate: number): Champion {
  return {
    id: def.id,
    name: def.name,
    radius: def.radius,
    moveSpeedPerTick: perSecondToPerTick(def.moveSpeed, tickRate),
  };
}
