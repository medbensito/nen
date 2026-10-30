import type { TickContext } from '../core/simulation';
import type { AbilityCost } from '../schema/ability';
import {
  findEntity,
  isAlive,
  type Entity,
  type GameState,
  type Projectile,
} from '../state/game-state';
import { gainNen } from './nen';

/**
 * Specialization rules are hooks: each rule kind changes one game rule at a
 * precise point. Emission's "detached aura" acts when an ability projectile hits.
 */

/** Nen an ability projectile will give back on hit, decided at cast time. */
export function hitRefundFor(caster: Readonly<Entity>, cost: AbilityCost, spent: number): number {
  const rule = caster.specializationRule;
  if (rule?.kind !== 'projectile-hit-refund') return 0;
  return (cost.kind === 'fixed' ? cost.amount : spent) * rule.share;
}

/**
 * Called when an ability projectile hits an enemy. Orb shots share their
 * orb's single refund: only the first hit of a cast pays back.
 */
export function onAbilityProjectileHit(
  state: GameState,
  ctx: TickContext,
  projectile: Readonly<Projectile>,
): void {
  let amount = projectile.refundAmount;
  if (projectile.refundTurretId !== null) {
    const turret = findEntity(state, projectile.refundTurretId)?.turret;
    if (turret && turret.refund > 0) {
      amount = turret.refund;
      turret.refund = 0;
    }
  }
  if (amount <= 0) return;

  const caster = findEntity(state, projectile.sourceId);
  if (!caster?.nen || !isAlive(caster)) return;
  gainNen(ctx, caster, amount);
  ctx.events.push({ type: 'nen-refund', entityId: caster.id, amount });
}
