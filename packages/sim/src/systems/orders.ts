import type { System } from '../core/simulation';
import { findPath } from '../nav/pathfinding';
import { findEntity, isAlive, isHostile } from '../state/game-state';
import { cancelAttack } from './damage';

/**
 * Turns this tick's commands into orders on entities. Commands that cannot
 * be carried out (unknown or dead entity, ally target, unreachable point) are
 * ignored: they may come from a stale client, later from the network.
 *
 * A new order replaces the previous one: moving or stopping drops the attack
 * target, and cancels an attack still winding up.
 */
export const ordersSystem: System = (state, ctx) => {
  for (const command of ctx.commands) {
    if (command.type === 'cast') continue; // handled by the abilities system
    const entity = findEntity(state, command.entityId);
    if (!entity || !isAlive(entity)) continue;
    const { movement } = entity;

    // Any new order interrupts a channel, at no cost.
    if (entity.channel) {
      ctx.events.push({
        type: 'channel-cancelled',
        entityId: entity.id,
        slot: entity.channel.slot,
      });
      delete entity.channel;
    }

    switch (command.type) {
      case 'stop':
        cancelAttack(entity, { refundWindup: true });
        if (movement) movement.path = [];
        break;

      case 'move': {
        const { target } = command;
        if (!movement || !Number.isFinite(target.x) || !Number.isFinite(target.y)) break;
        const path = findPath(ctx.nav.gridFor(entity.radius), entity.position, target);
        // An unreachable target leaves the current order untouched.
        if (!path) break;
        cancelAttack(entity, { refundWindup: true });
        movement.path = path;
        break;
      }

      case 'attack': {
        const target = findEntity(state, command.targetId);
        const attack = entity.attack;
        if (!attack || !target || !isAlive(target) || !isHostile(entity, target)) break;
        if (attack.target !== target.id) {
          cancelAttack(entity, { refundWindup: true });
          attack.target = target.id;
          attack.repathTick = ctx.tick;
        }
        break;
      }
    }
  }
};
