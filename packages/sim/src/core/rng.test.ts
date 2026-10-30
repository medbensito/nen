import { describe, expect, it } from 'vitest';
import { createRng, createRngState, nextUint32 } from './rng';

function sequence(seed: number, length: number): number[] {
  const state = createRngState(seed);
  return Array.from({ length }, () => nextUint32(state));
}

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sequence(42, 100)).toEqual(sequence(42, 100));
  });

  it('produces different sequences for different seeds', () => {
    expect(sequence(1, 20)).not.toEqual(sequence(2, 20));
  });

  it('resumes the same sequence after a JSON round trip of its state', () => {
    const state = createRngState(7);
    for (let i = 0; i < 10; i++) nextUint32(state);
    const restored = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(nextUint32(restored)).toBe(nextUint32(state));
  });

  it('keeps float, range and int within their bounds', () => {
    const rng = createRng(createRngState(123));
    for (let i = 0; i < 10_000; i++) {
      const f = rng.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);

      const r = rng.range(-5, 5);
      expect(r).toBeGreaterThanOrEqual(-5);
      expect(r).toBeLessThan(5);

      const n = rng.int(3, 7);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThan(7);
    }
  });

  it('is roughly uniform', () => {
    const rng = createRng(createRngState(99));
    const samples = 20_000;
    let sum = 0;
    for (let i = 0; i < samples; i++) sum += rng.float();
    expect(sum / samples).toBeCloseTo(0.5, 1);
  });

  it('rejects an empty or non-integer int range', () => {
    const rng = createRng(createRngState(1));
    expect(() => rng.int(5, 5)).toThrow(RangeError);
    expect(() => rng.int(0, 1.5)).toThrow(RangeError);
  });
});
