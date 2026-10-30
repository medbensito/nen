import type { EntityId } from '../state/game-state';
import type { Vec2 } from './vec2';

/**
 * What happened during a tick, for presentation (damage numbers, sounds,
 * effects). Events are output, not state: replaying the commands replays them.
 */
export type SimEvent =
  /** An attack landed (instant) or launched its projectile. */
  | { readonly type: 'attack'; readonly sourceId: EntityId; readonly targetId: EntityId }
  /** Damage after armor. */
  | {
      readonly type: 'damage';
      readonly sourceId: EntityId;
      readonly targetId: EntityId;
      readonly amount: number;
      readonly position: Readonly<Vec2>;
    }
  | { readonly type: 'death'; readonly entityId: EntityId; readonly position: Readonly<Vec2> }
  | { readonly type: 'respawn'; readonly entityId: EntityId };
