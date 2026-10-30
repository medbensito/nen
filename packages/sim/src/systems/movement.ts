import type { System } from '../core/simulation';
import { distance } from '../core/vec2';

/**
 * Moves entities along their path at their speed. A tick's movement budget
 * carries over corners, so speed stays exact even on paths with many turns.
 */
export const movementSystem: System = (state) => {
  for (const entity of state.entities) {
    const movement = entity.movement;
    if (!movement || movement.path.length === 0) continue;

    const { position } = entity;
    const { path } = movement;
    let budget = movement.speed;
    while (budget > 0) {
      const next = path[0];
      if (!next) break;
      const remaining = distance(position, next);
      if (remaining <= budget) {
        position.x = next.x;
        position.y = next.y;
        budget -= remaining;
        path.shift();
      } else {
        position.x += ((next.x - position.x) / remaining) * budget;
        position.y += ((next.y - position.y) / remaining) * budget;
        budget = 0;
      }
    }
  }
};
