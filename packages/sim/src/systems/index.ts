import type { System } from '../core/simulation';
import { abilitiesSystem } from './abilities';
import { combatSystem } from './combat';
import { dashSystem } from './dash';
import { fountainSystem } from './fountain';
import { movementSystem } from './movement';
import { nenSystem } from './nen';
import { ordersSystem } from './orders';
import { projectileSystem } from './projectiles';
import { respawnSystem } from './respawn';
import { retaliationSystem } from './retaliation';
import { turretSystem } from './turrets';

/**
 * Game systems, in execution order: orders and casts first, then AI decisions,
 * attacks and orbs, movement and dashes, projectile hits, nen and fountain
 * regeneration, and death bookkeeping last. Waves, minion AI and economy
 * arrive in M4; match rules in M5.
 */
export const DEFAULT_SYSTEMS: readonly System[] = [
  ordersSystem,
  abilitiesSystem,
  retaliationSystem,
  combatSystem,
  turretSystem,
  movementSystem,
  dashSystem,
  projectileSystem,
  nenSystem,
  fountainSystem,
  respawnSystem,
];

export {
  abilitiesSystem,
  combatSystem,
  dashSystem,
  fountainSystem,
  movementSystem,
  nenSystem,
  ordersSystem,
  projectileSystem,
  respawnSystem,
  retaliationSystem,
  turretSystem,
};
