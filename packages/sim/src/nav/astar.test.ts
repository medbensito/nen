import { describe, expect, it } from 'vitest';
import type { MapDef } from '../schema/map';
import { findCellPath } from './astar';
import { buildNavGrid, isWalkableIndex, type NavGrid } from './nav-grid';

function gridWith(obstacles: MapDef['obstacles']): NavGrid {
  return buildNavGrid(
    {
      id: 'astar',
      name: 'map.astar.name',
      width: 100,
      height: 100,
      navCellSize: 10,
      obstacles,
      bases: [],
    },
    1,
  );
}

const at = (column: number, row: number) => row * 10 + column;

function expectContinuous(grid: NavGrid, path: readonly number[]): void {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] ?? 0;
    const b = path[i] ?? 0;
    expect(isWalkableIndex(grid, b)).toBe(true);
    expect(Math.abs((a % 10) - (b % 10))).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.floor(a / 10) - Math.floor(b / 10))).toBeLessThanOrEqual(1);
  }
}

describe('findCellPath', () => {
  it('goes straight on open ground', () => {
    const grid = gridWith([]);
    expect(findCellPath(grid, at(1, 5), at(4, 5))).toEqual([
      at(1, 5),
      at(2, 5),
      at(3, 5),
      at(4, 5),
    ]);
  });

  it('goes around a wall through walkable neighbours only', () => {
    const grid = gridWith([{ x: 50, y: 0, width: 10, height: 80 }]);
    const path = findCellPath(grid, at(2, 2), at(8, 2));
    expect(path?.[0]).toBe(at(2, 2));
    expect(path?.at(-1)).toBe(at(8, 2));
    expectContinuous(grid, path ?? []);
    expect(path?.some((cell) => Math.floor(cell / 10) >= 8)).toBe(true);
  });

  it('does not cut a corner between two diagonal walls', () => {
    const grid = gridWith([
      { x: 40, y: 50, width: 10, height: 10 },
      { x: 50, y: 40, width: 10, height: 10 },
    ]);
    const path = findCellPath(grid, at(4, 4), at(5, 5)) ?? [];
    expect(path.length).toBeGreaterThan(2);
    expectContinuous(grid, path);
  });

  it('returns null when the goal is walled in', () => {
    const grid = gridWith([
      { x: 60, y: 60, width: 30, height: 10 },
      { x: 60, y: 80, width: 30, height: 10 },
      { x: 60, y: 60, width: 10, height: 30 },
      { x: 80, y: 60, width: 10, height: 30 },
    ]);
    expect(findCellPath(grid, at(1, 1), at(7, 7))).toBeNull();
  });

  it('returns the same path every time', () => {
    const grid = gridWith([{ x: 50, y: 20, width: 10, height: 60 }]);
    expect(findCellPath(grid, at(1, 5), at(9, 5))).toEqual(findCellPath(grid, at(1, 5), at(9, 5)));
  });
});
