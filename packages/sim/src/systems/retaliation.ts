import type { System } from '../core/simulation';
import { isAlive } from '../state/game-state';

/**
 * Units that retaliate target whoever hit them last, until their retaliation
 * window closes. They never move: the combat system only attacks in range.
 */
export const retaliationSystem: System = (state, ctx) => {
  for (const entity of state.entities) {
    const { retaliation, attack } = entity;
    if (!retaliation || !attack || !isAlive(entity)) continue;

    if (retaliation.targetId !== null && ctx.tick < retaliation.untilTick) {
      attack.target = retaliation.targetId;
    } else if (retaliation.targetId !== null) {
      retaliation.targetId = null;
      attack.target = null;
      attack.windupLeft = 0;
    }
  }
};
