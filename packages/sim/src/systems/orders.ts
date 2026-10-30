import type { System } from '../core/simulation';
import { findPath } from '../nav/pathfinding';
import { findEntity } from '../state/game-state';

/**
 * Turns this tick's commands into orders on entities. Commands for unknown
 * entities, or that cannot be carried out, are ignored: they may come from a
 * stale client, later from the network.
 */
export const ordersSystem: System = (state, ctx) => {
  for (const command of ctx.commands) {
    const entity = findEntity(state, command.entityId);
    const movement = entity?.movement;
    if (!entity || !movement) continue;

    switch (command.type) {
      case 'stop':
        movement.path = [];
        break;
      case 'move': {
        const { target } = command;
        if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) break;
        const path = findPath(ctx.nav.gridFor(entity.radius), entity.position, target);
        // An unreachable target leaves the current order untouched.
        if (path) movement.path = path;
        break;
      }
    }
  }
};
