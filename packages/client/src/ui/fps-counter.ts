import type * as Phaser from 'phaser';
import type { Translate } from '../i18n';
import { DEPTH, THEME } from '../theme';
import { TEXT } from './text-keys';

const REFRESH_MS = 250;

/** Frames-per-second readout, fixed to the screen. */
export class FpsCounter {
  private readonly text: Phaser.GameObjects.Text;
  private readonly t: Translate;
  private sinceRefreshMs = Number.POSITIVE_INFINITY;

  constructor(scene: Phaser.Scene, t: Translate) {
    this.t = t;
    this.text = scene.add
      .text(12, 10, '', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '14px',
        color: THEME.hudText,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
  }

  update(deltaMs: number, fps: number): void {
    this.sinceRefreshMs += deltaMs;
    if (this.sinceRefreshMs < REFRESH_MS) return;
    this.sinceRefreshMs = 0;
    this.text.setText(this.t(TEXT.hudFps, { value: Math.round(fps) }));
  }
}
