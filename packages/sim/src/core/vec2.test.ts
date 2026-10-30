import { describe, expect, it } from 'vitest';
import {
  add,
  distance,
  dot,
  equalsApprox,
  length,
  lerp,
  normalize,
  scale,
  sub,
  vec2,
} from './vec2';

describe('vec2', () => {
  it('adds, subtracts and scales', () => {
    expect(add(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(vec2(1, 2), vec2(3, 4))).toEqual({ x: -2, y: -2 });
    expect(scale(vec2(1, -2), 3)).toEqual({ x: 3, y: -6 });
  });

  it('writes into the out vector instead of allocating', () => {
    const out = vec2();
    const result = add(vec2(1, 1), vec2(2, 2), out);
    expect(result).toBe(out);
    expect(out).toEqual({ x: 3, y: 3 });
  });

  it('allows out to alias an input', () => {
    const a = vec2(1, 2);
    add(a, vec2(1, 1), a);
    expect(a).toEqual({ x: 2, y: 3 });
  });

  it('measures length, distance and dot product', () => {
    expect(length(vec2(3, 4))).toBe(5);
    expect(distance(vec2(1, 1), vec2(4, 5))).toBe(5);
    expect(dot(vec2(1, 2), vec2(3, 4))).toBe(11);
  });

  it('normalizes, and maps the zero vector to zero', () => {
    expect(equalsApprox(normalize(vec2(10, 0)), vec2(1, 0))).toBe(true);
    expect(length(normalize(vec2(3, -7)))).toBeCloseTo(1, 12);
    expect(normalize(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it('interpolates linearly', () => {
    expect(lerp(vec2(0, 0), vec2(10, -10), 0.25)).toEqual({ x: 2.5, y: -2.5 });
  });
});
