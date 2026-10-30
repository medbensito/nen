import type { System } from '../core/simulation';

/**
 * Brings dead entities back at their home with full health once their delay
 * is over, and removes dead entities that never respawn. Runs last, so an
 * entity killed this tick is gone before anything reads the next state.
 */
export const respawnSystem: System = (state, ctx) => {
  const { entities } = state;
  for (let index = entities.length - 1; index >= 0; index--) {
    const entity = entities[index];
    if (!entity || entity.deadUntil === undefined || ctx.tick < entity.deadUntil) continue;

    if (!entity.respawn) {
      entities.splice(index, 1);
      continue;
    }

    delete entity.deadUntil;
    entity.position.x = entity.respawn.home.x;
    entity.position.y = entity.respawn.home.y;
    if (entity.health) entity.health.current = entity.health.max;
    if (entity.attack) entity.attack.cooldownTicks = 0;
    if (entity.nen) {
      entity.nen.current = entity.nen.max;
      entity.nen.exhausted = false;
    }
    if (entity.combatUntil !== undefined) entity.combatUntil = 0;
    ctx.events.push({ type: 'respawn', entityId: entity.id });
  }
};
