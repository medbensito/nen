import type { Vec2 } from '@nen/sim';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface ZoomSettings {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** -1, 0 or 1 per axis: the direction a free camera scrolls when the pointer nears a screen edge. */
export function edgeScrollDirection(
  pointer: Readonly<Vec2>,
  viewport: Viewport,
  margin: number,
): Vec2 {
  const axis = (position: number, size: number): number =>
    position <= margin ? -1 : position >= size - margin ? 1 : 0;
  return { x: axis(pointer.x, viewport.width), y: axis(pointer.y, viewport.height) };
}

/**
 * World distance to scroll this frame. Speed is in world units per second at
 * zoom 1; dividing by the zoom keeps the on-screen speed the same at any zoom.
 */
export function edgeScrollDelta(
  direction: Readonly<Vec2>,
  speed: number,
  elapsedSeconds: number,
  zoom: number,
): Vec2 {
  const distance = (speed * elapsedSeconds) / zoom;
  return { x: direction.x * distance, y: direction.y * distance };
}

/** Next zoom after a wheel notch: wheel up zooms in, wheel down zooms out, within bounds. */
export function stepZoom(current: number, wheelDeltaY: number, settings: ZoomSettings): number {
  if (wheelDeltaY === 0) return current;
  const next = current + (wheelDeltaY < 0 ? settings.step : -settings.step);
  const clamped = Math.min(settings.max, Math.max(settings.min, next));
  // Avoid 0.30000000000000004-style drift after many notches.
  return Math.round(clamped * 1000) / 1000;
}
