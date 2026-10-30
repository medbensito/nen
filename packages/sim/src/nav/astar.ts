import { MinHeap } from './min-heap';
import { isWalkable, isWalkableIndex, type NavGrid } from './nav-grid';

const DIAGONAL_COST = Math.SQRT2;
const NEIGHBORS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A* over the grid, 8 directions. A diagonal step is allowed only when both
 * cells it brushes are walkable, so paths never squeeze between two walls
 * that touch at a corner.
 *
 * @returns cell indices from `start` to `goal` inclusive, or null when `goal`
 * cannot be reached.
 */
export function findCellPath(grid: NavGrid, start: number, goal: number): number[] | null {
  if (!isWalkableIndex(grid, start) || !isWalkableIndex(grid, goal)) return null;
  if (start === goal) return [start];

  const { columns } = grid;
  const cellCount = columns * grid.rows;
  const cost = new Float64Array(cellCount).fill(Number.POSITIVE_INFINITY);
  const parent = new Int32Array(cellCount).fill(-1);
  const closed = new Uint8Array(cellCount);
  const goalColumn = goal % columns;
  const goalRow = Math.floor(goal / columns);
  const heuristic = (column: number, row: number): number => {
    const dx = Math.abs(column - goalColumn);
    const dy = Math.abs(row - goalRow);
    return dx + dy + (DIAGONAL_COST - 2) * Math.min(dx, dy);
  };

  const open = new MinHeap();
  cost[start] = 0;
  open.push(start, heuristic(start % columns, Math.floor(start / columns)), 0);

  while (open.size > 0) {
    const current = open.pop() ?? -1;
    if (current === goal) return reconstruct(parent, goal);
    if (closed[current] === 1) continue;
    closed[current] = 1;

    const column = current % columns;
    const row = Math.floor(current / columns);
    const currentCost = cost[current] ?? 0;

    for (const [dx, dy] of NEIGHBORS) {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (!isWalkable(grid, nextColumn, nextRow)) continue;
      const diagonal = dx !== 0 && dy !== 0;
      if (
        diagonal &&
        (!isWalkable(grid, column + dx, row) || !isWalkable(grid, column, row + dy))
      ) {
        continue;
      }

      const next = nextRow * columns + nextColumn;
      if (closed[next] === 1) continue;
      const nextCost = currentCost + (diagonal ? DIAGONAL_COST : 1);
      if (nextCost < (cost[next] ?? Number.POSITIVE_INFINITY)) {
        cost[next] = nextCost;
        parent[next] = current;
        const h = heuristic(nextColumn, nextRow);
        open.push(next, nextCost + h, h);
      }
    }
  }
  return null;
}

function reconstruct(parent: Int32Array, goal: number): number[] {
  const path = [goal];
  let node = parent[goal] ?? -1;
  while (node !== -1) {
    path.push(node);
    node = parent[node] ?? -1;
  }
  return path.reverse();
}
