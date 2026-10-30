import type { System } from '../core/simulation';
import { distance } from '../core/vec2';
import { findEntity, isAlive } from '../state/game-state';
import { dealDamage } from './damage';

/**
 * Homing projectiles fly toward their target's current position and hit when
 * they reach its body. A projectile whose target died or vanished fizzles.
 */
export const projectileSystem: System = (state, ctx) => {
  let kept = 0;
  const flying = state.projectiles;

  for (const projectile of flying) {
    const target = findEntity(state, projectile.targetId);
    if (!target || !isAlive(target)) continue;

    const gap = distance(projectile.position, target.position);
    const remaining = gap - target.radius - projectile.radius;
    if (remaining <= projectile.speed) {
      dealDamage(state, ctx, target, projectile.damage, projectile.sourceId);
      continue;
    }

    projectile.position.x += ((target.position.x - projectile.position.x) / gap) * projectile.speed;
    projectile.position.y += ((target.position.y - projectile.position.y) / gap) * projectile.speed;
    flying[kept] = projectile;
    kept += 1;
  }
  flying.length = kept;
};
