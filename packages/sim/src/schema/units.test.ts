import { describe, expect, it } from 'vitest';
import { degreesToRadians, perSecondToPerTick, secondsToTicks } from './units';

describe('secondsToTicks', () => {
  it('converts seconds to the nearest whole tick', () => {
    expect(secondsToTicks(1, 30)).toBe(30);
    expect(secondsToTicks(0.5, 30)).toBe(15);
    expect(secondsToTicks(0.8, 30)).toBe(24);
    expect(secondsToTicks(0.01, 30)).toBe(0);
    expect(secondsToTicks(0, 30)).toBe(0);
  });
});

describe('perSecondToPerTick', () => {
  it('spreads a per-second rate over the ticks of a second', () => {
    expect(perSecondToPerTick(330, 30)).toBe(11);
    expect(perSecondToPerTick(8, 30)).toBeCloseTo(0.2667, 4);
  });
});

describe('degreesToRadians', () => {
  it('converts degrees to radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 12);
  });
});
