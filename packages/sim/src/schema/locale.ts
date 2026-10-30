import { z } from 'zod';
import { localeKeySchema } from './common';

/** data/locales/<lang>.json: translation key → displayed text. */
export const localeSchema = z.record(localeKeySchema, z.string().min(1));

export type Locale = z.infer<typeof localeSchema>;
