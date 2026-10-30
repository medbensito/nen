import type { System } from '../core/simulation';
import { cellIndexOf, isWalkableIndex } from '../nav/nav-grid';
import { isAlive } from '../state/game-state';

/** Dashes cover their distance at their speed, and stop short against a wall. */
export const dashSystem: System = (state, ctx) => {
  for (const entity of state.entities) {
    const dash = entity.dash;
    if (!dash || !isAlive(entity)) continue;

    const step = Math.min(dash.speed, dash.remaining);
    const next = {
      x: entity.position.x + dash.direction.x * step,
      y: entity.position.y + dash.direction.y * step,
    };
    const grid = ctx.nav.gridFor(entity.radius);
    if (!isWalkableIndex(grid, cellIndexOf(grid, next))) {
      delete entity.dash;
      continue;
    }

    entity.position.x = next.x;
    entity.position.y = next.y;
    dash.remaining -= step;
    if (dash.remaining <= 0) delete entity.dash;
  }
};
