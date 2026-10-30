import { describe, expect, it } from 'vitest';
import { createTranslator, formatMessage, pickLanguage } from './i18n';

describe('formatMessage', () => {
  it('fills placeholders and leaves unknown ones untouched', () => {
    expect(formatMessage('FPS : {value}', { value: 60 })).toBe('FPS : 60');
    expect(formatMessage('{a} and {b}', { a: 'x' })).toBe('x and {b}');
  });
});

describe('pickLanguage', () => {
  it('matches a regional preference to its base language', () => {
    expect(pickLanguage(['en', 'fr'], ['fr-FR', 'en-US'], 'en')).toBe('fr');
  });

  it('falls back when no preference is available', () => {
    expect(pickLanguage(['en', 'fr'], ['de-DE'], 'fr')).toBe('fr');
    expect(pickLanguage(['en'], ['de-DE'], 'fr')).toBe('en');
  });
});

describe('createTranslator', () => {
  it('translates known keys and shows unknown keys as is', () => {
    const t = createTranslator({ 'hud.fps': 'FPS: {value}' });
    expect(t('hud.fps', { value: 58 })).toBe('FPS: 58');
    expect(t('hud.missing')).toBe('hud.missing');
  });
});
