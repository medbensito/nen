import { z } from 'zod';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

/** Data id, e.g. `ressac`, `ressac-trait`. */
export const idSchema = z.string().regex(KEBAB_CASE, 'must be kebab-case, e.g. "ressac-trait"');

/** Translation key, e.g. `map.lane.name`. Displayed text never lives outside data/locales/. */
export const localeKeySchema = z
  .string()
  .regex(LOCALE_KEY, 'must be a translation key with dot-separated segments, e.g. "map.lane.name"');

/** The two playable teams. Entities may also be `neutral`, but data never assigns it. */
export const teamSchema = z.enum(['blue', 'red']);
export const PLAYABLE_TEAMS = teamSchema.options;

export const pointSchema = z.strictObject({ x: z.number(), y: z.number() });

export const rectSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});
