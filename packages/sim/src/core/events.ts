import type { EntityId } from '../state/game-state';
import type { Vec2 } from './vec2';

/** Why a cast was refused. Nothing is spent when a cast is refused. */
export type CastRejection = 'cooldown' | 'nen' | 'exhausted' | 'locked' | 'busy';

/**
 * What happened during a tick, for presentation (damage numbers, sounds,
 * effects). Events are output, not state: replaying the commands replays them.
 */
export type SimEvent =
  /** A basic attack landed (instant) or launched its projectile. */
  | { readonly type: 'attack'; readonly sourceId: EntityId; readonly targetId: EntityId }
  /** Damage after armor and multipliers. */
  | {
      readonly type: 'damage';
      readonly sourceId: EntityId;
      readonly targetId: EntityId;
      readonly amount: number;
      readonly position: Readonly<Vec2>;
    }
  | { readonly type: 'death'; readonly entityId: EntityId; readonly position: Readonly<Vec2> }
  | { readonly type: 'respawn'; readonly entityId: EntityId }
  /** An ability went off (or started channelling). */
  | {
      readonly type: 'cast';
      readonly entityId: EntityId;
      readonly slot: number;
      readonly abilityId: string;
    }
  | {
      readonly type: 'cast-rejected';
      readonly entityId: EntityId;
      readonly slot: number;
      readonly reason: CastRejection;
    }
  | { readonly type: 'channel-cancelled'; readonly entityId: EntityId; readonly slot: number }
  /** A beam fired, from one point to another. */
  | {
      readonly type: 'beam';
      readonly sourceId: EntityId;
      readonly from: Readonly<Vec2>;
      readonly to: Readonly<Vec2>;
      readonly width: number;
    }
  | { readonly type: 'nen-refund'; readonly entityId: EntityId; readonly amount: number }
  | { readonly type: 'exhausted'; readonly entityId: EntityId }
  | { readonly type: 'recovered'; readonly entityId: EntityId };
