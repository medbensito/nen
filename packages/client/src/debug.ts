import { hashState, isAlive, LOCAL_PLAYER_ID, type Simulation } from '@nen/sim';
import type * as Phaser from 'phaser';
import type { CameraStatus } from './render/camera-rig';

/** Read-only probes for the browser console and the smoke tests. Dev builds only. */
export interface NenDebug {
  readonly tick: () => number;
  readonly hash: () => string;
  /** Position of the local player's champion and whether it is walking. */
  readonly champion: () => { x: number; y: number; moving: boolean } | null;
  readonly cameraLocked: () => boolean;
  /** Screen position of a world point in the arena camera, relative to the canvas. */
  readonly screenOf: (x: number, y: number) => { x: number; y: number } | null;
  /** Every unit with health: where it is, how it fares. */
  readonly units: () => {
    id: number;
    kind: string;
    defId: string;
    team: string;
    x: number;
    y: number;
    health: number;
    alive: boolean;
  }[];
}

declare global {
  interface Window {
    __NEN_DEBUG__?: NenDebug;
  }
}

export function installDebugHook(
  sim: Simulation,
  cameraStatus: Readonly<CameraStatus>,
  game: Phaser.Game,
): void {
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
    screenOf: (x, y) => {
      const camera = game.scene.getScene('arena')?.cameras.main;
      if (!camera) return null;
      return {
        x: (x - camera.worldView.x) * camera.zoom + camera.x,
        y: (y - camera.worldView.y) * camera.zoom + camera.y,
      };
    },
    units: () =>
      sim.state.entities
        .filter((entity) => entity.health !== undefined)
        .map((entity) => ({
          id: entity.id,
          kind: entity.kind,
          defId: entity.defId,
          team: entity.team,
          x: entity.position.x,
          y: entity.position.y,
          health: entity.health?.current ?? 0,
          alive: isAlive(entity),
        })),
  };
}
