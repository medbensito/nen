import { distanceToRect } from '../core/geometry';
import type { DeepReadonly } from '../core/types';
import { vec2, type Vec2 } from '../core/vec2';
import type { MapDef } from '../schema/map';

/**
 * Walkability of the map for agents of one radius.
 *
 * Obstacles are inflated by the agent radius ("clearance") once, at build
 * time, so pathfinding can treat the agent as a point: any point inside a
 * walkable cell keeps the agent's body clear of walls, give or take half a
 * cell diagonal.
 *
 * Built from map data only, so it lives beside the game state, not in it.
 */
export interface NavGrid {
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
  /** Radius of the agents this grid is built for. */
  readonly clearance: number;
  /** 1 when an agent's center may stand at the cell center. Index: `row * columns + column`. */
  readonly walkable: Uint8Array;
}

export function buildNavGrid(map: DeepReadonly<MapDef>, clearance: number): NavGrid {
  const cellSize = map.navCellSize;
  const columns = Math.ceil(map.width / cellSize);
  const rows = Math.ceil(map.height / cellSize);
  const walkable = new Uint8Array(columns * rows);
  const center = vec2();

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      center.x = (column + 0.5) * cellSize;
      center.y = (row + 0.5) * cellSize;
      walkable[row * columns + column] = isClear(map, center, clearance) ? 1 : 0;
    }
  }

  return { cellSize, columns, rows, width: map.width, height: map.height, clearance, walkable };
}

/** Whether a body of radius `clearance` centered on `point` stays inside the map and off every obstacle. */
export function isClear(
  map: DeepReadonly<MapDef>,
  point: Readonly<Vec2>,
  clearance: number,
): boolean {
  if (
    point.x < clearance ||
    point.y < clearance ||
    point.x > map.width - clearance ||
    point.y > map.height - clearance
  ) {
    return false;
  }
  return map.obstacles.every((obstacle) => distanceToRect(point, obstacle) >= clearance);
}

export function isWalkable(grid: NavGrid, column: number, row: number): boolean {
  return (
    column >= 0 &&
    row >= 0 &&
    column < grid.columns &&
    row < grid.rows &&
    grid.walkable[row * grid.columns + column] === 1
  );
}

export function isWalkableIndex(grid: NavGrid, index: number): boolean {
  return grid.walkable[index] === 1;
}

/** Index of the cell containing `point`; points outside the map map to the nearest edge cell. */
export function cellIndexOf(grid: NavGrid, point: Readonly<Vec2>): number {
  const column = clamp(Math.floor(point.x / grid.cellSize), 0, grid.columns - 1);
  const row = clamp(Math.floor(point.y / grid.cellSize), 0, grid.rows - 1);
  return row * grid.columns + column;
}

export function cellCenter(grid: NavGrid, index: number, out: Vec2 = vec2()): Vec2 {
  out.x = ((index % grid.columns) + 0.5) * grid.cellSize;
  out.y = (Math.floor(index / grid.columns) + 0.5) * grid.cellSize;
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
