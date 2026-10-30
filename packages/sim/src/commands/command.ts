import type { Vec2 } from '../core/vec2';
import type { EntityId } from '../state/game-state';

/**
 * Everything a player can ask of the simulation. Local input produces these
 * today; a network layer will carry the very same objects later.
 */
export type Command =
  /** Walk to `target`, around obstacles; a target inside a wall means the nearest walkable point. */
  | { readonly type: 'move'; readonly entityId: EntityId; readonly target: Readonly<Vec2> }
  /** Chase `targetId` and attack it until it dies or another order replaces this one. */
  | { readonly type: 'attack'; readonly entityId: EntityId; readonly targetId: EntityId }
  /** Drop the current order and stand still. */
  | { readonly type: 'stop'; readonly entityId: EntityId }
  /** Use the ability in `slot` (0 to 3), aimed at `target`. */
  | {
      readonly type: 'cast';
      readonly entityId: EntityId;
      readonly slot: number;
      readonly target: Readonly<Vec2>;
    };
