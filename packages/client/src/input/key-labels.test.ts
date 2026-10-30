import { describe, expect, it } from 'vitest';
import { keyLabel } from './key-labels';

describe('keyLabel', () => {
  it('shows the printed character from the layout when available', () => {
    const azerty = new Map([
      ['KeyQ', 'a'],
      ['KeyW', 'z'],
    ]);
    expect(keyLabel('KeyQ', azerty)).toBe('A');
    expect(keyLabel('KeyW', azerty)).toBe('Z');
  });

  it('falls back to the QWERTY letter or digit', () => {
    expect(keyLabel('KeyQ')).toBe('Q');
    expect(keyLabel('Digit4')).toBe('4');
    expect(keyLabel('Space')).toBe('Space');
  });
});
