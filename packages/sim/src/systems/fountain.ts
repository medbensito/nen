import type { System } from '../core/simulation';
import { distance } from '../core/vec2';
import { isAlive } from '../state/game-state';
import { gainNen } from './nen';

/** Units standing in their own team's fountain quickly regain health and nen. */
export const fountainSystem: System = (state, ctx) => {
  const share = ctx.data.combat.fountainRegenPerTick;
  if (share === 0) return;
  for (const entity of state.entities) {
    if (!isAlive(entity)) continue;
    const base = ctx.nav.map.bases.find((candidate) => candidate.team === entity.team);
    if (!base || distance(entity.position, base.fountain) > base.fountainRadius) continue;

    const { health, nen } = entity;
    if (health) health.current = Math.min(health.max, health.current + health.max * share);
    if (nen) gainNen(ctx, entity, nen.max * share);
  }
};
