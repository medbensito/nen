import type { System } from '../core/simulation';
import { distance } from '../core/vec2';
import { isAlive, type Entity } from '../state/game-state';

/**
 * Orbs shoot the nearest enemy in reach every interval, and vanish when their
 * time is up. They have no health: nothing can target them.
 */
export const turretSystem: System = (state, ctx) => {
  for (const orb of state.entities) {
    const turret = orb.turret;
    if (!turret || orb.deadUntil !== undefined) continue;
    if (ctx.tick >= turret.untilTick) {
      orb.deadUntil = ctx.tick; // removed at the end of the tick
      continue;
    }
    if (ctx.tick < turret.nextShotTick) continue;

    let target: Entity | undefined;
    let nearest = Number.POSITIVE_INFINITY;
    for (const entity of state.entities) {
      if (entity.team === orb.team || !isAlive(entity)) continue;
      const gap = distance(orb.position, entity.position);
      if (gap - entity.radius - orb.radius <= turret.acquisitionRange && gap < nearest) {
        target = entity;
        nearest = gap;
      }
    }
    // Without a target the orb holds its shot until one comes in reach.
    if (!target) continue;

    state.projectiles.push({
      id: state.nextProjectileId,
      kind: 'homing',
      sourceId: turret.casterId,
      team: orb.team,
      targetId: target.id,
      position: { x: orb.position.x, y: orb.position.y },
      speed: turret.shotSpeed,
      radius: turret.shotRadius,
      damage: turret.shotDamage,
      refundAmount: 0,
      refundTurretId: orb.id,
    });
    state.nextProjectileId += 1;
    turret.nextShotTick = ctx.tick + turret.intervalTicks;
  }
};
