import type { System } from '../core/simulation';
import { combatSystem } from './combat';
import { movementSystem } from './movement';
import { ordersSystem } from './orders';
import { projectileSystem } from './projectiles';
import { respawnSystem } from './respawn';
import { retaliationSystem } from './retaliation';

/**
 * Game systems, in execution order: orders first, then AI decisions, attacks,
 * movement, projectile hits, and death bookkeeping last. Nen and abilities
 * arrive in M3; waves, minion AI and economy in M4; match rules in M5.
 */
export const DEFAULT_SYSTEMS: readonly System[] = [
  ordersSystem,
  retaliationSystem,
  combatSystem,
  movementSystem,
  projectileSystem,
  respawnSystem,
];

export {
  combatSystem,
  movementSystem,
  ordersSystem,
  projectileSystem,
  respawnSystem,
  retaliationSystem,
};
