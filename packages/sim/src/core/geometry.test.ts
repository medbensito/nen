import { describe, expect, it } from 'vitest';
import { distanceToRect, pointInRect } from './geometry';

const rect = { x: 10, y: 20, width: 30, height: 40 };

describe('pointInRect', () => {
  it('includes the inside and the edges', () => {
    expect(pointInRect({ x: 25, y: 40 }, rect)).toBe(true);
    expect(pointInRect({ x: 10, y: 20 }, rect)).toBe(true);
    expect(pointInRect({ x: 40, y: 60 }, rect)).toBe(true);
    expect(pointInRect({ x: 41, y: 40 }, rect)).toBe(false);
  });
});

describe('distanceToRect', () => {
  it('is zero inside, axis distance beside, corner distance diagonally', () => {
    expect(distanceToRect({ x: 25, y: 40 }, rect)).toBe(0);
    expect(distanceToRect({ x: 0, y: 40 }, rect)).toBe(10);
    expect(distanceToRect({ x: 25, y: 70 }, rect)).toBe(10);
    expect(distanceToRect({ x: 43, y: 64 }, rect)).toBe(5);
  });
});
