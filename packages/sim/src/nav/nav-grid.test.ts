import { describe, expect, it } from 'vitest';
import type { MapDef } from '../schema/map';
import { buildNavGrid, cellCenter, cellIndexOf, isClear, isWalkable } from './nav-grid';

/** 200 × 100 map, 10-unit cells, one wall hanging from the top edge at x 80..120. */
const map: MapDef = {
  id: 'grid-test',
  name: 'map.grid-test.name',
  width: 200,
  height: 100,
  navCellSize: 10,
  obstacles: [{ x: 80, y: 0, width: 40, height: 60 }],
  bases: [],
  units: [],
};

describe('buildNavGrid', () => {
  it('sizes the grid from the map and the cell size', () => {
    const grid = buildNavGrid(map, 15);
    expect([grid.columns, grid.rows, grid.walkable.length]).toEqual([20, 10, 200]);
  });

  it('blocks cells closer to the map edge than the clearance', () => {
    const grid = buildNavGrid(map, 15);
    expect(isWalkable(grid, 0, 5)).toBe(false); // center x = 5
    expect(isWalkable(grid, 2, 5)).toBe(true); // center (25, 55)
    expect(isWalkable(grid, 2, 9)).toBe(false); // center y = 95
  });

  it('inflates obstacles by the clearance', () => {
    const grid = buildNavGrid(map, 15);
    expect(isWalkable(grid, 9, 2)).toBe(false); // inside the wall
    expect(isWalkable(grid, 7, 2)).toBe(false); // center x = 75, 5 from the wall
    expect(isWalkable(grid, 6, 2)).toBe(true); // center x = 65, exactly 15 from the wall
    expect(isWalkable(grid, 9, 8)).toBe(true); // center y = 85, 25 below the wall
  });

  it('blocks more cells for a larger clearance', () => {
    const count = (clearance: number) =>
      buildNavGrid(map, clearance).walkable.reduce((sum, cell) => sum + cell, 0);
    expect(count(30)).toBeLessThan(count(15));
  });

  it('treats out-of-range cells as not walkable', () => {
    const grid = buildNavGrid(map, 15);
    expect(isWalkable(grid, -1, 5)).toBe(false);
    expect(isWalkable(grid, 20, 5)).toBe(false);
  });
});

describe('cells and points', () => {
  const grid = buildNavGrid(map, 15);

  it('finds the cell of a point and clamps points outside the map', () => {
    expect(cellIndexOf(grid, { x: 25, y: 55 })).toBe(5 * 20 + 2);
    expect(cellIndexOf(grid, { x: -50, y: 500 })).toBe(9 * 20 + 0);
  });

  it('returns the center of a cell', () => {
    expect(cellCenter(grid, 5 * 20 + 2)).toEqual({ x: 25, y: 55 });
  });

  it('checks a body against edges and obstacles', () => {
    expect(isClear(map, { x: 50, y: 50 }, 15)).toBe(true);
    expect(isClear(map, { x: 70, y: 50 }, 15)).toBe(false);
    expect(isClear(map, { x: 50, y: 90 }, 15)).toBe(false);
  });
});
