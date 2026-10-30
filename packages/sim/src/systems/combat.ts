import type { System, TickContext } from '../core/simulation';
import type { DeepReadonly } from '../core/types';
import { distance } from '../core/vec2';
import { findPath } from '../nav/pathfinding';
import { findEntity, isAlive, isHostile, type Entity, type GameState } from '../state/game-state';
import { dealDamage } from './damage';

/**
 * How often a chasing attacker recomputes its path to a moving target.
 * Technical, not balance: a trade-off between pathfinding cost and how
 * closely the chase follows the target.
 */
const CHASE_REPATH_TICKS = 6;

/** Range is measured between the two bodies' edges. */
export function isInAttackRange(
  attacker: DeepReadonly<Entity>,
  target: DeepReadonly<Entity>,
  range: number,
): boolean {
  return distance(attacker.position, target.position) - attacker.radius - target.radius <= range;
}

/**
 * Basic attacks. With a target: out of range, chase it; in range, stand still
 * and attack every period. An attack winds up first, then lands (or launches
 * its projectile). Entities only attack what they are ordered to: no target
 * is picked automatically here.
 */
export const combatSystem: System = (state, ctx) => {
  for (const entity of state.entities) {
    const attack = entity.attack;
    if (!attack || !isAlive(entity)) continue;
    if (attack.cooldownTicks > 0) attack.cooldownTicks -= 1;

    const target = attack.target === null ? undefined : findEntity(state, attack.target);
    if (!target || !isAlive(target) || !isHostile(entity, target)) {
      attack.target = null;
      attack.windupLeft = 0;
      continue;
    }

    if (attack.windupLeft > 0) {
      attack.windupLeft -= 1;
      if (attack.windupLeft === 0) release(state, ctx, entity, target);
      continue;
    }

    if (!isInAttackRange(entity, target, attack.range)) {
      chase(ctx, entity, target);
      continue;
    }

    if (entity.movement) entity.movement.path = [];
    if (attack.cooldownTicks === 0) {
      attack.cooldownTicks = attack.periodTicks;
      if (attack.windupTicks === 0) release(state, ctx, entity, target);
      else attack.windupLeft = attack.windupTicks;
    }
  }
};

/** End of the wind-up: the hit lands now, or a projectile leaves toward the target. */
function release(state: GameState, ctx: TickContext, attacker: Entity, target: Entity): void {
  const attack = attacker.attack;
  if (!attack) return;
  ctx.events.push({ type: 'attack', sourceId: attacker.id, targetId: target.id });

  if (attack.projectileSpeed === 0) {
    dealDamage(state, ctx, target, attack.damage, attacker.id);
    return;
  }

  // Leaves from the edge of the attacker's body, facing the target.
  const gap = distance(attacker.position, target.position);
  const dx = gap === 0 ? 0 : (target.position.x - attacker.position.x) / gap;
  const dy = gap === 0 ? 0 : (target.position.y - attacker.position.y) / gap;
  state.projectiles.push({
    id: state.nextProjectileId,
    sourceId: attacker.id,
    targetId: target.id,
    position: {
      x: attacker.position.x + dx * attacker.radius,
      y: attacker.position.y + dy * attacker.radius,
    },
    speed: attack.projectileSpeed,
    radius: attack.projectileRadius,
    damage: attack.damage,
  });
  state.nextProjectileId += 1;
}

function chase(ctx: TickContext, attacker: Entity, target: Entity): void {
  const { attack, movement } = attacker;
  if (!attack || !movement || ctx.tick < attack.repathTick) return;
  attack.repathTick = ctx.tick + CHASE_REPATH_TICKS;
  const path = findPath(ctx.nav.gridFor(attacker.radius), attacker.position, target.position);
  if (path) movement.path = path;
}
