import { describe, expect, it } from 'vitest';
import { mitigatedDamage } from './damage';

describe('mitigatedDamage', () => {
  it('applies raw × scale / (scale + armor)', () => {
    expect(mitigatedDamage(100, 25, 100)).toBe(80);
    expect(mitigatedDamage(50, 50, 100)).toBeCloseTo(33.333, 3);
    expect(mitigatedDamage(52, 10, 100)).toBeCloseTo(47.273, 3);
  });

  it('leaves damage untouched without armor, and ignores negative armor', () => {
    expect(mitigatedDamage(60, 0, 100)).toBe(60);
    expect(mitigatedDamage(60, -30, 100)).toBe(60);
  });
});
