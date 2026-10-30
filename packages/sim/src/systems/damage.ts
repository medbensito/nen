import type { TickContext } from '../core/simulation';
import type { Entity, EntityId, GameState } from '../state/game-state';
import { findEntity, isAlive } from '../state/game-state';

/** Damage left after armor: raw × scale / (scale + armor). Negative armor counts as none. */
export function mitigatedDamage(raw: number, armor: number, armorScale: number): number {
  return (raw * armorScale) / (armorScale + Math.max(0, armor));
}

/**
 * Applies a hit: armor, exhaustion, health, combat timers, retaliation, and
 * death at 0 health.
 */
export function dealDamage(
  state: GameState,
  ctx: TickContext,
  target: Entity,
  raw: number,
  sourceId: EntityId,
): void {
  const health = target.health;
  if (!health || !isAlive(target)) return;

  const { nen: nenRules, combat } = ctx.data;
  const exhausted = target.nen?.exhausted === true;
  const amount =
    mitigatedDamage(raw, target.armor ?? 0, combat.armorScale) *
    (exhausted ? nenRules.exhaustedDamageTakenMultiplier : 1);
  health.current = Math.max(0, health.current - amount);

  // Both sides of a fight count as in combat, which pauses nen regeneration.
  const combatUntil = ctx.tick + nenRules.combatTicks;
  if (target.combatUntil !== undefined) target.combatUntil = combatUntil;
  const source = findEntity(state, sourceId);
  if (source?.combatUntil !== undefined) source.combatUntil = combatUntil;

  ctx.events.push({
    type: 'damage',
    sourceId,
    targetId: target.id,
    amount,
    position: { x: target.position.x, y: target.position.y },
  });

  if (target.retaliation) {
    target.retaliation.targetId = sourceId;
    target.retaliation.untilTick = ctx.tick + target.retaliation.durationTicks;
  }
  if (health.current <= 0) kill(state, ctx, target);
}

/**
 * Death drops every order. The entity stays in the state until it respawns;
 * one without `respawn` is removed at the end of the tick by the respawn system.
 */
export function kill(_state: GameState, ctx: TickContext, entity: Entity): void {
  ctx.events.push({
    type: 'death',
    entityId: entity.id,
    position: { x: entity.position.x, y: entity.position.y },
  });
  if (entity.movement) entity.movement.path = [];
  if (entity.attack) cancelAttack(entity, { refundWindup: false });
  if (entity.retaliation) entity.retaliation.targetId = null;
  delete entity.channel;
  delete entity.dash;
  entity.deadUntil = ctx.tick + (entity.respawn?.delayTicks ?? 0);
}

/**
 * Drops the attack order. Cancelling during the wind-up means the attack never
 * happened, so its cooldown is given back.
 */
export function cancelAttack(entity: Entity, options: { refundWindup: boolean }): void {
  const attack = entity.attack;
  if (!attack) return;
  if (options.refundWindup && attack.windupLeft > 0) attack.cooldownTicks = 0;
  attack.target = null;
  attack.windupLeft = 0;
}
