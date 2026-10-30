import { describe, expect, it } from 'vitest';
import { distance } from '../core/vec2';
import type { MapDef } from '../schema/map';
import { hasLineOfSight } from './line-of-sight';
import { buildNavGrid, isClear } from './nav-grid';
import { findPath } from './pathfinding';

/** Same layout as the test fixture: 800 × 600 with a wall at x 350..450, y 150..450. */
const arena: MapDef = {
  id: 'path-test',
  name: 'map.path-test.name',
  width: 800,
  height: 600,
  navCellSize: 25,
  obstacles: [{ x: 350, y: 150, width: 100, height: 300 }],
  bases: [],
};
const CLEARANCE = 30;
const grid = buildNavGrid(arena, CLEARANCE);

function legs(from: { x: number; y: number }, path: readonly { x: number; y: number }[]) {
  return path.map(
    (point, index) => [index === 0 ? from : (path[index - 1] ?? from), point] as const,
  );
}

describe('findPath', () => {
  it('goes straight to a visible target', () => {
    expect(findPath(grid, { x: 100, y: 100 }, { x: 250, y: 120 })).toEqual([{ x: 250, y: 120 }]);
  });

  it('goes around the wall in legs that all have a clear line of sight', () => {
    const from = { x: 100, y: 300 };
    const to = { x: 700, y: 300 };
    const path = findPath(grid, from, to) ?? [];

    expect(path.length).toBeGreaterThan(1);
    expect(path.at(-1)).toEqual(to);
    for (const [a, b] of legs(from, path)) expect(hasLineOfSight(grid, a, b)).toBe(true);
  });

  it('keeps few waypoints once smoothed', () => {
    expect(
      (findPath(grid, { x: 100, y: 300 }, { x: 700, y: 300 }) ?? []).length,
    ).toBeLessThanOrEqual(4);
  });

  it('replaces a target inside the wall by the nearest walkable point', () => {
    const target = { x: 360, y: 300 };
    const end = findPath(grid, { x: 100, y: 300 }, target)?.at(-1);

    expect(end).toBeDefined();
    expect(isClear(arena, end ?? target, CLEARANCE)).toBe(true);
    expect(distance(end ?? target, target)).toBeLessThan(CLEARANCE + 25);
  });

  it('clamps a target outside the map onto it', () => {
    const end = findPath(grid, { x: 100, y: 300 }, { x: -500, y: 300 })?.at(-1);
    expect(end?.x).toBeGreaterThanOrEqual(CLEARANCE);
    expect(end?.x).toBeLessThan(CLEARANCE + 25);
  });

  it('returns null for a target that cannot be reached', () => {
    const pocket = buildNavGrid(
      {
        ...arena,
        obstacles: [
          { x: 500, y: 200, width: 200, height: 20 },
          { x: 500, y: 380, width: 200, height: 20 },
          { x: 500, y: 200, width: 20, height: 200 },
          { x: 680, y: 200, width: 20, height: 200 },
        ],
      },
      CLEARANCE,
    );
    expect(findPath(pocket, { x: 100, y: 100 }, { x: 600, y: 300 })).toBeNull();
  });

  it('first steps back onto walkable ground when starting too close to a wall', () => {
    const from = { x: 20, y: 300 };
    const path = findPath(grid, from, { x: 200, y: 300 }) ?? [];
    expect(path.length).toBe(2);
    expect(isClear(arena, path[0] ?? from, CLEARANCE)).toBe(true);
  });
});
