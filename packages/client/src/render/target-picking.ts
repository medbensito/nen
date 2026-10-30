import {
  distanceSq,
  isAlive,
  type DeepReadonly,
  type EntityId,
  type GameState,
  type Team,
  type Vec2,
} from '@nen/sim';

/**
 * The living enemy of `team` under `point`: its body, widened by
 * `tolerance`, contains the point. The closest center wins when bodies overlap.
 */
export function pickEnemyAt(
  state: DeepReadonly<GameState>,
  team: Team,
  point: Readonly<Vec2>,
  tolerance: number,
): EntityId | null {
  let best: EntityId | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entity of state.entities) {
    if (entity.team === team || !isAlive(entity)) continue;
    const reach = entity.radius + tolerance;
    const distance = distanceSq(entity.position, point);
    if (distance <= reach * reach && distance < bestDistance) {
      best = entity.id;
      bestDistance = distance;
    }
  }
  return best;
}
