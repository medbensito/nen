import type { Command } from '../commands/command';
import type { CastRejection } from '../core/events';
import type { System, TickContext } from '../core/simulation';
import { distance, normalize, vec2, type Vec2 } from '../core/vec2';
import type { Ability, AbilityEffect } from '../schema/ability';
import {
  findEntity,
  isAlive,
  isHostile,
  spawnEntity,
  type Entity,
  type GameState,
} from '../state/game-state';
import { championLevel } from '../state/progression';
import { cancelAttack, dealDamage } from './damage';
import { spendNen } from './nen';
import { hitRefundFor } from './specialization';

type CastCommand = Extract<Command, { type: 'cast' }>;

/**
 * Abilities: cooldowns, channels that complete this tick, then new casts.
 *
 * A cast is checked before anything is spent: locked, busy (channelling or
 * dashing), on cooldown, exhausted or short on nen means it is refused, with
 * a `cast-rejected` event and nothing consumed.
 */
export const abilitiesSystem: System = (state, ctx) => {
  for (const entity of state.entities) {
    for (const slot of entity.abilities ?? []) {
      if (slot.cooldownTicks > 0) slot.cooldownTicks -= 1;
    }
  }

  for (const entity of state.entities) {
    if (entity.channel && isAlive(entity) && ctx.tick >= entity.channel.releaseTick) {
      releaseChannel(state, ctx, entity);
    }
  }

  for (const command of ctx.commands) {
    if (command.type === 'cast') cast(state, ctx, command);
  }
};

function cast(state: GameState, ctx: TickContext, command: CastCommand): void {
  const entity = findEntity(state, command.entityId);
  const slot = entity?.abilities?.[command.slot];
  const nen = entity?.nen;
  if (!entity || !slot || !nen || !isAlive(entity)) return;
  const ability = ctx.data.abilities[slot.abilityId];
  const { target } = command;
  if (!ability || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;

  const reject = (reason: CastRejection): void => {
    ctx.events.push({ type: 'cast-rejected', entityId: entity.id, slot: command.slot, reason });
  };
  if (championLevel(entity) < ability.unlockLevel) return reject('locked');
  if (entity.channel || entity.dash) return reject('busy');
  if (slot.cooldownTicks > 0) return reject('cooldown');
  if (nen.exhausted) return reject('exhausted');
  const needed = ability.cost.kind === 'fixed' ? ability.cost.amount : ability.cost.minimum;
  if (nen.current < needed) return reject('nen');

  const direction = aim(entity.position, target);
  ctx.events.push({
    type: 'cast',
    entityId: entity.id,
    slot: command.slot,
    abilityId: ability.id,
  });

  const { effect } = ability;
  if (effect.type === 'beam') {
    // Nothing is spent until the beam fires: cancelling costs nothing.
    startChannel(ctx, entity, command.slot, direction, effect.channelTicks);
    return;
  }

  // Fixed-cost abilities only reach here (beams are the all-remaining kind).
  const spent = ability.cost.kind === 'fixed' ? ability.cost.amount : nen.current;
  spendNen(ctx, entity, spent);
  slot.cooldownTicks = ability.cooldownTicks;
  applyEffect(state, ctx, entity, ability, effect, direction, target, spent);
}

function applyEffect(
  state: GameState,
  ctx: TickContext,
  caster: Entity,
  ability: Ability,
  effect: Exclude<AbilityEffect, { type: 'beam' }>,
  direction: Vec2,
  target: Readonly<Vec2>,
  spent: number,
): void {
  switch (effect.type) {
    case 'skillshot':
      state.projectiles.push({
        id: state.nextProjectileId,
        kind: 'skillshot',
        sourceId: caster.id,
        team: caster.team,
        position: {
          x: caster.position.x + direction.x * caster.radius,
          y: caster.position.y + direction.y * caster.radius,
        },
        direction,
        remaining: effect.range,
        speed: effect.speed,
        radius: effect.radius,
        damage: effect.damage,
        refundAmount: hitRefundFor(caster, ability.cost, spent),
        refundTurretId: null,
      });
      state.nextProjectileId += 1;
      return;

    case 'dash':
      interrupt(caster);
      caster.dash = { direction, speed: effect.speed, remaining: effect.distance };
      return;

    case 'turret': {
      // At the target when in reach, otherwise as far as allowed toward it.
      const inReach = distance(caster.position, target) <= effect.placementRange;
      const position = inReach
        ? { x: target.x, y: target.y }
        : {
            x: caster.position.x + direction.x * effect.placementRange,
            y: caster.position.y + direction.y * effect.placementRange,
          };
      spawnEntity(state, {
        kind: 'summon',
        defId: ability.id,
        team: caster.team,
        position,
        radius: effect.radius,
        turret: {
          casterId: caster.id,
          untilTick: ctx.tick + effect.durationTicks,
          intervalTicks: effect.intervalTicks,
          nextShotTick: ctx.tick + effect.intervalTicks,
          acquisitionRange: effect.acquisitionRange,
          shotDamage: effect.shot.damage,
          shotSpeed: effect.shot.speed,
          shotRadius: effect.shot.radius,
          refund: hitRefundFor(caster, ability.cost, spent),
        },
      });
      return;
    }
  }
}

function startChannel(
  ctx: TickContext,
  caster: Entity,
  slot: number,
  direction: Vec2,
  channelTicks: number,
): void {
  interrupt(caster);
  caster.channel = { slot, direction, releaseTick: ctx.tick + channelTicks };
}

/** The channel completes: spend everything left and fire the beam. */
function releaseChannel(state: GameState, ctx: TickContext, caster: Entity): void {
  const channel = caster.channel;
  const slot = channel ? caster.abilities?.[channel.slot] : undefined;
  const ability = slot ? ctx.data.abilities[slot.abilityId] : undefined;
  delete caster.channel;
  if (!channel || !slot || !ability || ability.effect.type !== 'beam' || !caster.nen) return;

  const { effect } = ability;
  const spent = caster.nen.current;
  spendNen(ctx, caster, spent);
  slot.cooldownTicks = ability.cooldownTicks;

  const from = vec2(caster.position.x, caster.position.y);
  const to = vec2(
    from.x + channel.direction.x * effect.length,
    from.y + channel.direction.y * effect.length,
  );
  ctx.events.push({ type: 'beam', sourceId: caster.id, from, to, width: effect.width });

  const damage = effect.baseDamage + effect.damagePerNen * spent;
  const halfWidth = effect.width / 2;
  // Collect first: damage may kill, and a death must not change who the beam touches.
  const hits = state.entities.filter(
    (entity) =>
      isAlive(entity) &&
      isHostile(caster, entity) &&
      distanceToSegment(entity.position, from, to) <= halfWidth + entity.radius,
  );
  for (const target of hits) dealDamage(state, ctx, target, damage, caster.id);
}

/** Dashing or channelling stops walking and any attack still winding up; the attack target stays. */
function interrupt(caster: Entity): void {
  if (caster.movement) caster.movement.path = [];
  const target = caster.attack?.target ?? null;
  cancelAttack(caster, { refundWindup: true });
  if (caster.attack) caster.attack.target = target;
}

/** Unit vector from `from` toward `to`; straight right when they coincide. */
function aim(from: Readonly<Vec2>, to: Readonly<Vec2>): Vec2 {
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y });
  return direction.x === 0 && direction.y === 0 ? vec2(1, 0) : direction;
}

function distanceToSegment(point: Readonly<Vec2>, a: Readonly<Vec2>, b: Readonly<Vec2>): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq));
  return distance(point, { x: a.x + abx * t, y: a.y + aby * t });
}
