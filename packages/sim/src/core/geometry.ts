import type { Vec2 } from './vec2';

/** Axis-aligned rectangle, top-left corner and size, in world units. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pointInRect(point: Readonly<Vec2>, rect: Readonly<Rect>): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Distance from a point to the closest point of a rectangle; 0 inside it. */
export function distanceToRect(point: Readonly<Vec2>, rect: Readonly<Rect>): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.sqrt(dx * dx + dy * dy);
}
