import type { DeepReadonly } from '../core/types';
import type { Entity } from './game-state';

/**
 * Level of a champion. Levels arrive in M4; until then every champion is
 * level 1, which is why abilities that unlock later have `unlockLevel: 1` in
 * data for now.
 */
export function championLevel(_entity: DeepReadonly<Entity>): number {
  return 1;
}
