import { copy, distanceSq, vec2, type Vec2 } from '../core/vec2';
import { findCellPath } from './astar';
import { hasLineOfSight } from './line-of-sight';
import { cellCenter, cellIndexOf, isWalkable, isWalkableIndex, type NavGrid } from './nav-grid';

/**
 * Waypoints from `from` to (as close as possible to) `to`, ready to follow in
 * straight lines. The starting point is not included.
 *
 * - A target inside a wall is replaced by the nearest walkable point.
 * - A target outside the map is clamped onto it.
 * - When the target cannot be reached at all, returns null.
 */
export function findPath(grid: NavGrid, from: Readonly<Vec2>, to: Readonly<Vec2>): Vec2[] | null {
  const target = clampToMap(grid, to);
  let goal = cellIndexOf(grid, target);
  let goalPoint = target;
  if (!isWalkableIndex(grid, goal)) {
    goal = nearestWalkableCell(grid, goal, target);
    if (goal === -1) return null;
    goalPoint = cellCenter(grid, goal);
  }

  // A body pushed slightly into the clearance band first steps back to walkable ground.
  const start = cellIndexOf(grid, from);
  const startIsWalkable = isWalkableIndex(grid, start);
  const startCell = startIsWalkable ? start : nearestWalkableCell(grid, start, from);
  if (startCell === -1) return null;
  const startPoint = startIsWalkable ? copy(from) : cellCenter(grid, startCell);
  const prefix = startIsWalkable ? [] : [startPoint];

  if (hasLineOfSight(grid, startPoint, goalPoint)) return [...prefix, copy(goalPoint)];

  const cells = findCellPath(grid, startCell, goal);
  if (!cells) return null;

  const points = cells.map((cell) => cellCenter(grid, cell));
  points[0] = startPoint;
  points[points.length - 1] = copy(goalPoint);
  return [...prefix, ...smoothPath(grid, points)];
}

/**
 * String pulling: from each anchor, skip every waypoint that stays in direct
 * line of sight. Turns a staircase of cell centers into a few straight legs.
 */
export function smoothPath(grid: NavGrid, points: readonly Vec2[]): Vec2[] {
  const last = points[points.length - 1];
  if (!last) return [];
  const result: Vec2[] = [];
  let anchor = points[0] ?? last;

  for (let index = 2; index < points.length; index++) {
    const candidate = points[index];
    const previous = points[index - 1];
    if (candidate && previous && !hasLineOfSight(grid, anchor, candidate)) {
      result.push(previous);
      anchor = previous;
    }
  }
  result.push(last);
  return result;
}

/**
 * Walkable cell whose center is closest to `point`, searching in growing
 * square rings around `index`; -1 when the grid has no walkable cell.
 */
export function nearestWalkableCell(grid: NavGrid, index: number, point: Readonly<Vec2>): number {
  const originColumn = index % grid.columns;
  const originRow = Math.floor(index / grid.columns);
  const center = vec2();
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let firstHitRing = -1;

  const consider = (column: number, row: number): void => {
    if (!isWalkable(grid, column, row)) return;
    const candidate = row * grid.columns + column;
    const distance = distanceSq(cellCenter(grid, candidate, center), point);
    if (distance < bestDistance || (distance === bestDistance && candidate < best)) {
      best = candidate;
      bestDistance = distance;
    }
  };

  const maxRing = Math.max(grid.columns, grid.rows);
  for (let ring = 1; ring <= maxRing; ring++) {
    // A cell of a farther square ring can still be closer in straight-line
    // distance, up to a factor of √2: keep searching that far.
    if (firstHitRing !== -1 && ring > Math.ceil(firstHitRing * Math.SQRT2) + 1) break;
    for (let offset = -ring; offset <= ring; offset++) {
      consider(originColumn + offset, originRow - ring);
      consider(originColumn + offset, originRow + ring);
    }
    for (let offset = -ring + 1; offset <= ring - 1; offset++) {
      consider(originColumn - ring, originRow + offset);
      consider(originColumn + ring, originRow + offset);
    }
    if (best !== -1 && firstHitRing === -1) firstHitRing = ring;
  }
  return best;
}

function clampToMap(grid: NavGrid, point: Readonly<Vec2>): Vec2 {
  // Keep the point strictly inside so it falls in an existing cell.
  const inset = 1e-6;
  return vec2(
    Math.min(Math.max(point.x, 0), grid.width - inset),
    Math.min(Math.max(point.y, 0), grid.height - inset),
  );
}
