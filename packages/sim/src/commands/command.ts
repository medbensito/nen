import type { EntityId } from '../state/game-state';

/**
 * Everything a player can ask of the simulation. Local input produces these
 * today; a network layer will carry the very same objects later.
 *
 * M1 adds `move`, M2 `attack`, M3 `cast`.
 */
export type Command = { readonly type: 'stop'; readonly entityId: EntityId };
