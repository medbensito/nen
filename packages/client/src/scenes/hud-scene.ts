import { LOCAL_PLAYER_ID, type Simulation } from '@nen/sim';
import * as Phaser from 'phaser';
import type { Translate } from '../i18n';
import type { CameraStatus } from '../render/camera-rig';
import { DEPTH, THEME } from '../theme';
import { FpsCounter } from '../ui/fps-counter';
import { TEXT } from '../ui/text-keys';

export interface HudSceneDeps {
  readonly sim: Simulation;
  readonly t: Translate;
  readonly cameraStatus: Readonly<CameraStatus>;
}

const SMALL_TEXT = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: '14px',
  color: THEME.hudText,
};

/**
 * Screen-space overlay, drawn above the arena with its own camera so the
 * world zoom never scales the HUD. Reads the simulation, never writes to it.
 */
export class HudScene extends Phaser.Scene {
  private readonly deps: HudSceneDeps;
  private fpsCounter: FpsCounter | undefined;
  private cameraText: Phaser.GameObjects.Text | undefined;
  private respawnText: Phaser.GameObjects.Text | undefined;
  private shownLocked: boolean | undefined;
  private shownRespawn = '';

  constructor(deps: HudSceneDeps) {
    super({ key: 'hud', active: true });
    this.deps = deps;
  }

  create(): void {
    this.fpsCounter = new FpsCounter(this, this.deps.t);
    this.cameraText = this.add.text(12, 30, '', SMALL_TEXT).setScrollFactor(0).setDepth(DEPTH.hud);
    this.respawnText = this.add
      .text(0, 0, '', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: THEME.damageTaken,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
      this.layout();
    });
  }

  override update(_time: number, delta: number): void {
    this.fpsCounter?.update(delta, this.game.loop.actualFps);
    this.updateCameraText();
    this.updateRespawnText();
  }

  private updateCameraText(): void {
    const { locked } = this.deps.cameraStatus;
    if (locked === this.shownLocked) return;
    this.shownLocked = locked;
    this.cameraText?.setText(this.deps.t(locked ? TEXT.cameraLocked : TEXT.cameraFree));
  }

  /** "Respawn in N s" while the player's champion is dead. */
  private updateRespawnText(): void {
    const { sim, t } = this.deps;
    const player = sim.state.players.find((candidate) => candidate.id === LOCAL_PLAYER_ID);
    const champion = sim.state.entities.find((entity) => entity.id === player?.entityId);
    const deadUntil = champion?.deadUntil;
    const text =
      deadUntil === undefined
        ? ''
        : t(TEXT.respawnIn, {
            seconds: Math.max(
              1,
              Math.ceil((deadUntil - sim.state.tick) / sim.data.simulation.tickRate),
            ),
          });
    if (text === this.shownRespawn) return;
    this.shownRespawn = text;
    this.respawnText?.setText(text);
  }

  private layout(): void {
    this.respawnText?.setPosition(this.scale.width / 2, 64);
  }
}
