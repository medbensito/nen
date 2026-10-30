import { z } from 'zod';
import { idSchema, localeKeySchema } from './common';

/**
 * data/maps/<id>.json
 *
 * M0 only knows the size of the world. Lanes, bases and obstacles arrive in M1.
 */
export const mapSchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  width: z.number().positive(),
  height: z.number().positive(),
});

export type MapDef = z.infer<typeof mapSchema>;
