import type { Vec2 } from '../core/vec2';
import type { EntityId } from '../state/game-state';

/**
 * Everything a player can ask of the simulation. Local input produces these
 * today; a network layer will carry the very same objects later.
 *
 * M2 adds `attack`, M3 `cast`.
 */
export type Command =
  /** Walk to `target`, around obstacles; a target inside a wall means the nearest walkable point. */
  | { readonly type: 'move'; readonly entityId: EntityId; readonly target: Readonly<Vec2> }
  /** Drop the current order and stand still. */
  | { readonly type: 'stop'; readonly entityId: EntityId };
