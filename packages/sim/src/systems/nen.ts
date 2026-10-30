import type { System, TickContext } from '../core/simulation';
import { isAlive, type Entity } from '../state/game-state';

/**
 * Spends nen. Emptying the gauge exhausts the entity: it takes more damage
 * and cannot cast until the gauge refills to the recovery threshold.
 */
export function spendNen(ctx: TickContext, entity: Entity, amount: number): void {
  const nen = entity.nen;
  if (!nen) return;
  nen.current = Math.max(0, nen.current - amount);
  if (nen.current === 0 && !nen.exhausted) {
    nen.exhausted = true;
    ctx.events.push({ type: 'exhausted', entityId: entity.id });
  }
}

export function gainNen(ctx: TickContext, entity: Entity, amount: number): void {
  const nen = entity.nen;
  if (!nen || amount <= 0) return;
  nen.current = Math.min(nen.max, nen.current + amount);
  recoverIfRefilled(ctx, entity);
}

/**
 * Regeneration: slow out of combat, none (by default) in combat. A unit is in
 * combat for a while after it dealt or took damage from an enemy.
 */
export const nenSystem: System = (state, ctx) => {
  const rules = ctx.data.nen;
  for (const entity of state.entities) {
    const nen = entity.nen;
    if (!nen || !isAlive(entity)) continue;
    const inCombat = ctx.tick < (entity.combatUntil ?? 0);
    const regen = inCombat ? rules.regenInCombatPerTick : rules.regenOutOfCombatPerTick;
    nen.current = Math.min(nen.max, nen.current + regen);
    recoverIfRefilled(ctx, entity);
  }
};

function recoverIfRefilled(ctx: TickContext, entity: Entity): void {
  const nen = entity.nen;
  if (!nen?.exhausted) return;
  if (nen.current >= nen.max * ctx.data.nen.exhaustionRecoverAt) {
    nen.exhausted = false;
    ctx.events.push({ type: 'recovered', entityId: entity.id });
  }
}
