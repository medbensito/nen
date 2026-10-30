import { describe, expect, it } from 'vitest';
import { degreesToRadians, secondsToTicks } from './units';

describe('secondsToTicks', () => {
  it('converts seconds to the nearest whole tick', () => {
    expect(secondsToTicks(1, 30)).toBe(30);
    expect(secondsToTicks(0.5, 30)).toBe(15);
    expect(secondsToTicks(0.8, 30)).toBe(24);
    expect(secondsToTicks(0.01, 30)).toBe(0);
    expect(secondsToTicks(0, 30)).toBe(0);
  });
});

describe('degreesToRadians', () => {
  it('converts degrees to radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 12);
  });
});
