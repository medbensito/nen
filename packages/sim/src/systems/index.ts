import type { System } from '../core/simulation';
import { movementSystem } from './movement';
import { ordersSystem } from './orders';

/**
 * Game systems, in execution order. Combat arrives in M2, nen and abilities
 * in M3, waves, AI and economy in M4, match rules in M5.
 */
export const DEFAULT_SYSTEMS: readonly System[] = [ordersSystem, movementSystem];

export { movementSystem, ordersSystem };
