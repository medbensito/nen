import type { System } from '../core/simulation';

/**
 * Game systems, in execution order. Empty in M0: movement arrives in M1,
 * combat in M2, nen and abilities in M3, waves, AI and economy in M4, match
 * rules in M5.
 */
export const DEFAULT_SYSTEMS: readonly System[] = [];
