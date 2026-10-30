import { describe, expect, it } from 'vitest';
import type { MapDef } from '../schema/map';
import { hasLineOfSight } from './line-of-sight';
import { buildNavGrid } from './nav-grid';

function gridWith(obstacles: MapDef['obstacles']) {
  // Clearance 1 blocks the cells an obstacle covers and nothing around them.
  return buildNavGrid(
    {
      id: 'los',
      name: 'map.los.name',
      width: 200,
      height: 100,
      navCellSize: 10,
      obstacles,
      bases: [],
    },
    1,
  );
}

describe('hasLineOfSight', () => {
  const grid = gridWith([{ x: 80, y: 0, width: 40, height: 60 }]);

  it('sees along a free line', () => {
    expect(hasLineOfSight(grid, { x: 10, y: 80 }, { x: 190, y: 80 })).toBe(true);
    expect(hasLineOfSight(grid, { x: 190, y: 80 }, { x: 10, y: 80 })).toBe(true);
  });

  it('is blocked by an obstacle', () => {
    expect(hasLineOfSight(grid, { x: 10, y: 30 }, { x: 190, y: 30 })).toBe(false);
    expect(hasLineOfSight(grid, { x: 10, y: 10 }, { x: 190, y: 90 })).toBe(false);
  });

  it('sees within a single cell', () => {
    expect(hasLineOfSight(grid, { x: 11, y: 81 }, { x: 18, y: 88 })).toBe(true);
  });

  it('starts blocked from inside an obstacle', () => {
    expect(hasLineOfSight(grid, { x: 100, y: 30 }, { x: 100, y: 90 })).toBe(false);
  });

  it('accepts an end point lying exactly on a cell corner', () => {
    // Ends exactly on the corner (100, 70): the walk must stop there, not step past it.
    const wall = gridWith([{ x: 100, y: 50, width: 10, height: 10 }]);
    expect(hasLineOfSight(wall, { x: 95, y: 85 }, { x: 100, y: 70 })).toBe(true);
  });

  it('rejects an end point inside a blocked cell', () => {
    expect(hasLineOfSight(grid, { x: 70, y: 80 }, { x: 90, y: 40 })).toBe(false);
  });

  it('does not slip between two walls that touch at a corner', () => {
    const corner = gridWith([
      { x: 50, y: 50, width: 10, height: 10 },
      { x: 60, y: 40, width: 10, height: 10 },
    ]);
    // Through the shared corner (60, 50), from bottom-left to top-right.
    expect(hasLineOfSight(corner, { x: 45, y: 65 }, { x: 75, y: 35 })).toBe(false);
    // Through the other diagonal, where the side cells are free.
    expect(hasLineOfSight(corner, { x: 45, y: 35 }, { x: 55, y: 45 })).toBe(true);
  });
});
