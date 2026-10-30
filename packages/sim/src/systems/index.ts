import type { System } from '../core/simulation';
import { combatSystem } from './combat';
import { movementSystem } from './movement';
import { ordersSystem } from './orders';
import { projectileSystem } from './projectiles';

/**
 * Game systems, in execution order: orders first, then attacks, movement and
 * projectile hits. Nen and abilities
 * arrive in M3; waves, minion AI and economy in M4; match rules in M5.
 */
export const DEFAULT_SYSTEMS: readonly System[] = [
  ordersSystem,
  combatSystem,
  movementSystem,
  projectileSystem,
];

export { combatSystem, movementSystem, ordersSystem, projectileSystem };
