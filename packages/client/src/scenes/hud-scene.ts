import * as Phaser from 'phaser';
import type { Translate } from '../i18n';
import type { CameraStatus } from '../render/camera-rig';
import { DEPTH, THEME } from '../theme';
import { FpsCounter } from '../ui/fps-counter';
import { TEXT } from '../ui/text-keys';

export interface HudSceneDeps {
  readonly t: Translate;
  readonly cameraStatus: Readonly<CameraStatus>;
}

/**
 * Screen-space overlay, drawn above the arena with its own camera so the
 * world zoom never scales the HUD.
 */
export class HudScene extends Phaser.Scene {
  private readonly deps: HudSceneDeps;
  private fpsCounter: FpsCounter | undefined;
  private cameraText: Phaser.GameObjects.Text | undefined;
  private shownLocked: boolean | undefined;

  constructor(deps: HudSceneDeps) {
    super({ key: 'hud', active: true });
    this.deps = deps;
  }

  create(): void {
    this.fpsCounter = new FpsCounter(this, this.deps.t);
    this.cameraText = this.add
      .text(12, 30, '', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '14px',
        color: THEME.hudText,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) =>
      this.cameras.resize(size.width, size.height),
    );
  }

  override update(_time: number, delta: number): void {
    this.fpsCounter?.update(delta, this.game.loop.actualFps);

    const { locked } = this.deps.cameraStatus;
    if (locked !== this.shownLocked) {
      this.shownLocked = locked;
      this.cameraText?.setText(this.deps.t(locked ? TEXT.cameraLocked : TEXT.cameraFree));
    }
  }
}
