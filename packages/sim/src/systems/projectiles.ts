import type { System, TickContext } from '../core/simulation';
import { distance, dot } from '../core/vec2';
import {
  findEntity,
  isAlive,
  type Entity,
  type GameState,
  type HomingProjectile,
  type SkillshotProjectile,
} from '../state/game-state';
import { dealDamage } from './damage';
import { onAbilityProjectileHit } from './specialization';

/**
 * Homing projectiles fly toward their target's current position and hit when
 * they reach its body; one whose target died or vanished fizzles.
 * Skillshots fly straight, hit the first enemy their path touches, and vanish
 * after their range. Both fly over walls.
 */
export const projectileSystem: System = (state, ctx) => {
  let kept = 0;
  const flying = state.projectiles;

  for (const projectile of flying) {
    const stillFlying =
      projectile.kind === 'homing'
        ? advanceHoming(state, ctx, projectile)
        : advanceSkillshot(state, ctx, projectile);
    if (stillFlying) {
      flying[kept] = projectile;
      kept += 1;
    }
  }
  flying.length = kept;
};

function advanceHoming(state: GameState, ctx: TickContext, projectile: HomingProjectile): boolean {
  const target = findEntity(state, projectile.targetId);
  if (!target || !isAlive(target)) return false;

  const gap = distance(projectile.position, target.position);
  if (gap - target.radius - projectile.radius <= projectile.speed) {
    hit(state, ctx, projectile, target);
    return false;
  }
  projectile.position.x += ((target.position.x - projectile.position.x) / gap) * projectile.speed;
  projectile.position.y += ((target.position.y - projectile.position.y) / gap) * projectile.speed;
  return true;
}

function advanceSkillshot(
  state: GameState,
  ctx: TickContext,
  projectile: SkillshotProjectile,
): boolean {
  const step = Math.min(projectile.speed, projectile.remaining);
  const { position, direction } = projectile;

  // First enemy whose body the swept segment touches, by distance along it.
  let target: Entity | undefined;
  let earliest = Number.POSITIVE_INFINITY;
  for (const entity of state.entities) {
    if (entity.team === projectile.team || !isAlive(entity)) continue;
    const along = dot(
      { x: entity.position.x - position.x, y: entity.position.y - position.y },
      direction,
    );
    const t = Math.min(step, Math.max(0, along));
    const closest = { x: position.x + direction.x * t, y: position.y + direction.y * t };
    if (distance(closest, entity.position) <= entity.radius + projectile.radius && t < earliest) {
      target = entity;
      earliest = t;
    }
  }

  if (target) {
    position.x += direction.x * earliest;
    position.y += direction.y * earliest;
    hit(state, ctx, projectile, target);
    return false;
  }

  position.x += direction.x * step;
  position.y += direction.y * step;
  projectile.remaining -= step;
  return projectile.remaining > 0;
}

function hit(
  state: GameState,
  ctx: TickContext,
  projectile: HomingProjectile | SkillshotProjectile,
  target: Entity,
): void {
  dealDamage(state, ctx, target, projectile.damage, projectile.sourceId);
  onAbilityProjectileHit(state, ctx, projectile);
}
