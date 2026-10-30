import type { System } from '../../src/core/simulation';
import { findEntity, spawnEntity } from '../../src/state/game-state';

/**
 * Throwaway systems that exercise the pipeline (rng, commands, entities)
 * before real gameplay systems exist.
 */

/** Spawns `count` entities at random positions on the first tick. */
export function spawnAtStart(count: number): System {
  return (state, ctx) => {
    if (ctx.tick !== 0) return;
    for (let i = 0; i < count; i++) {
      spawnEntity(state, {
        kind: 'wanderer',
        team: ctx.rng.float() < 0.5 ? 'blue' : 'red',
        position: { x: ctx.rng.range(0, 800), y: ctx.rng.range(0, 600) },
        radius: 10,
      });
    }
  };
}

/** Spawns one entity at a random position every `interval` ticks. */
export function spawnEvery(interval: number): System {
  return (state, ctx) => {
    if (ctx.tick % interval !== 0) return;
    spawnEntity(state, {
      kind: 'wanderer',
      team: 'neutral',
      position: { x: ctx.rng.range(0, 800), y: ctx.rng.range(0, 600) },
      radius: 10,
    });
  };
}

/** A `stop` command sends its entity back to the origin: visible, arbitrary, deterministic. */
export const stopTeleportsToOrigin: System = (state, ctx) => {
  for (const command of ctx.commands) {
    if (command.type !== 'stop') continue;
    const entity = findEntity(state, command.entityId);
    if (entity) {
      entity.position.x = 0;
      entity.position.y = 0;
    }
  }
};

/** Moves every entity by a small random offset each tick. */
export const jitter: System = (state, ctx) => {
  for (const entity of state.entities) {
    entity.position.x += ctx.rng.range(-2, 2);
    entity.position.y += ctx.rng.range(-2, 2);
  }
};
