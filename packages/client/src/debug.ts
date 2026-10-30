import { hashState, LOCAL_PLAYER_ID, type Simulation } from '@nen/sim';
import type { CameraStatus } from './render/camera-rig';

/** Read-only probes for the browser console and the smoke tests. Dev builds only. */
export interface NenDebug {
  readonly tick: () => number;
  readonly hash: () => string;
  /** Position of the local player's champion and whether it is walking. */
  readonly champion: () => { x: number; y: number; moving: boolean } | null;
  readonly cameraLocked: () => boolean;
}

declare global {
  interface Window {
    __NEN_DEBUG__?: NenDebug;
  }
}

export function installDebugHook(sim: Simulation, cameraStatus: Readonly<CameraStatus>): void {
  window.__NEN_DEBUG__ = {
    tick: () => sim.state.tick,
    hash: () => hashState(sim.state),
    champion: () => {
      const player = sim.state.players.find((candidate) => candidate.id === LOCAL_PLAYER_ID);
      const entity = sim.state.entities.find((candidate) => candidate.id === player?.entityId);
      if (!entity) return null;
      return {
        x: entity.position.x,
        y: entity.position.y,
        moving: (entity.movement?.path.length ?? 0) > 0,
      };
    },
    cameraLocked: () => cameraStatus.locked,
  };
}
