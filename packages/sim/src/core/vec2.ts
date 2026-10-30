/**
 * 2D vector helpers.
 *
 * Every operation takes an optional `out` argument so hot loops can reuse a
 * vector instead of allocating one per entity and per tick.
 */
export interface Vec2 {
  x: number;
  y: number;
}

const EPSILON = 1e-9;

export function vec2(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function copy(a: Readonly<Vec2>, out: Vec2 = vec2()): Vec2 {
  out.x = a.x;
  out.y = a.y;
  return out;
}

export function add(a: Readonly<Vec2>, b: Readonly<Vec2>, out: Vec2 = vec2()): Vec2 {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  return out;
}

export function sub(a: Readonly<Vec2>, b: Readonly<Vec2>, out: Vec2 = vec2()): Vec2 {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  return out;
}

export function scale(a: Readonly<Vec2>, factor: number, out: Vec2 = vec2()): Vec2 {
  out.x = a.x * factor;
  out.y = a.y * factor;
  return out;
}

export function dot(a: Readonly<Vec2>, b: Readonly<Vec2>): number {
  return a.x * b.x + a.y * b.y;
}

export function lengthSq(a: Readonly<Vec2>): number {
  return a.x * a.x + a.y * a.y;
}

export function length(a: Readonly<Vec2>): number {
  return Math.sqrt(lengthSq(a));
}

export function distanceSq(a: Readonly<Vec2>, b: Readonly<Vec2>): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distance(a: Readonly<Vec2>, b: Readonly<Vec2>): number {
  return Math.sqrt(distanceSq(a, b));
}

/** Unit vector in the direction of `a`, or the zero vector when `a` has no length. */
export function normalize(a: Readonly<Vec2>, out: Vec2 = vec2()): Vec2 {
  const len = length(a);
  if (len < EPSILON) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  out.x = a.x / len;
  out.y = a.y / len;
  return out;
}

export function lerp(a: Readonly<Vec2>, b: Readonly<Vec2>, t: number, out: Vec2 = vec2()): Vec2 {
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  return out;
}

export function equalsApprox(a: Readonly<Vec2>, b: Readonly<Vec2>, epsilon = EPSILON): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}
