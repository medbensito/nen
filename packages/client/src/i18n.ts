import type { DeepReadonly, Locale } from '@nen/sim';

export type MessageParams = Readonly<Record<string, string | number>>;
export type Translate = (key: string, params?: MessageParams) => string;

/** Replaces `{name}` placeholders; unknown placeholders are left as they are. */
export function formatMessage(template: string, params: MessageParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

/**
 * First available language among the user's preferences (`fr-FR` matches `fr`),
 * otherwise the fallback, otherwise the first available one.
 */
export function pickLanguage(
  available: readonly string[],
  preferred: readonly string[],
  fallback: string,
): string {
  for (const tag of preferred) {
    const language = tag.split('-')[0]?.toLowerCase();
    if (language && available.includes(language)) return language;
  }
  if (available.includes(fallback)) return fallback;
  return available[0] ?? fallback;
}

/** A missing key renders as the key itself, so the gap is visible on screen. */
export function createTranslator(locale: DeepReadonly<Locale>): Translate {
  return (key, params) => {
    const template = locale[key];
    return template === undefined ? key : formatMessage(template, params);
  };
}
