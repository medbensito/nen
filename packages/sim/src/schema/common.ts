import { z } from 'zod';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

/** Data id, e.g. `ressac`, `ressac-trait`. */
export const idSchema = z.string().regex(KEBAB_CASE, 'must be kebab-case, e.g. "ressac-trait"');

/** Translation key, e.g. `map.lane.name`. Displayed text never lives outside data/locales/. */
export const localeKeySchema = z
  .string()
  .regex(LOCALE_KEY, 'must be a translation key with dot-separated segments, e.g. "map.lane.name"');
