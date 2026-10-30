import * as Phaser from 'phaser';
import type { Translate } from '../i18n';
import { FpsCounter } from '../ui/fps-counter';

export interface HudSceneDeps {
  readonly t: Translate;
}

/**
 * Screen-space overlay, drawn above the arena with its own camera so the
 * world zoom never scales the HUD.
 */
export class HudScene extends Phaser.Scene {
  private readonly deps: HudSceneDeps;
  private fpsCounter: FpsCounter | undefined;

  constructor(deps: HudSceneDeps) {
    super({ key: 'hud', active: true });
    this.deps = deps;
  }

  create(): void {
    this.fpsCounter = new FpsCounter(this, this.deps.t);
  }

  override update(_time: number, delta: number): void {
    this.fpsCounter?.update(delta, this.game.loop.actualFps);
  }
}
