import type { Vec2 } from '../core/vec2';
import { isWalkable, type NavGrid } from './nav-grid';

const CORNER_EPSILON = 1e-9;

/**
 * Whether the straight segment from `a` to `b` only crosses walkable cells.
 *
 * Walks every cell the segment touches (Amanatides–Woo traversal). When the
 * segment passes exactly through a cell corner, both side cells must be
 * walkable, matching the no-corner-cutting rule of the pathfinder.
 */
export function hasLineOfSight(grid: NavGrid, a: Readonly<Vec2>, b: Readonly<Vec2>): boolean {
  const size = grid.cellSize;
  let column = Math.floor(a.x / size);
  let row = Math.floor(a.y / size);
  const endColumn = Math.floor(b.x / size);
  const endRow = Math.floor(b.y / size);
  if (!isWalkable(grid, column, row) || !isWalkable(grid, endColumn, endRow)) return false;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepColumn = Math.sign(dx);
  const stepRow = Math.sign(dy);
  const tDeltaX = dx === 0 ? Number.POSITIVE_INFINITY : size / Math.abs(dx);
  const tDeltaY = dy === 0 ? Number.POSITIVE_INFINITY : size / Math.abs(dy);
  let tMaxX =
    dx > 0
      ? ((column + 1) * size - a.x) / dx
      : dx < 0
        ? (column * size - a.x) / dx
        : Number.POSITIVE_INFINITY;
  let tMaxY =
    dy > 0
      ? ((row + 1) * size - a.y) / dy
      : dy < 0
        ? (row * size - a.y) / dy
        : Number.POSITIVE_INFINITY;

  // A segment crosses at most columns + rows cells; the bound guards against float drift.
  for (let guard = grid.columns + grid.rows + 2; guard > 0; guard--) {
    if (column === endColumn && row === endRow) return true;
    // No boundary left before the end of the segment: `b` sits on the edge of
    // the current cell, and crossing it there touches nothing new.
    if (Math.min(tMaxX, tMaxY) >= 1) return true;

    if (Math.abs(tMaxX - tMaxY) < CORNER_EPSILON) {
      if (!isWalkable(grid, column + stepColumn, row) || !isWalkable(grid, column, row + stepRow)) {
        return false;
      }
      column += stepColumn;
      row += stepRow;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
    } else if (tMaxX < tMaxY) {
      column += stepColumn;
      tMaxX += tDeltaX;
    } else {
      row += stepRow;
      tMaxY += tDeltaY;
    }

    if (!isWalkable(grid, column, row)) return false;
  }
  return false;
}
