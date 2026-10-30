import type { DeepReadonly, GameData, GameState, SimEvent } from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, THEME } from '../theme';

const FLASH_POOL = 3;
const FLASH_MS = 260;

/**
 * Ability presentation that is not a unit or a projectile: the outline of a
 * beam being channelled, and the flash of a beam firing.
 */
export class AbilityEffects {
  private readonly scene: Phaser.Scene;
  private readonly data: GameData;
  private readonly preview: Phaser.GameObjects.Graphics;
  private readonly flashes: Phaser.GameObjects.Rectangle[] = [];
  private nextFlash = 0;

  constructor(scene: Phaser.Scene, data: GameData) {
    this.scene = scene;
    this.data = data;
    this.preview = scene.add.graphics().setDepth(DEPTH.markers);
    for (let i = 0; i < FLASH_POOL; i++) {
      this.flashes.push(
        scene.add
          .rectangle(0, 0, 1, 1, THEME.beam, 0.9)
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.projectiles)
          .setVisible(false),
      );
    }
  }

  /** Channel outlines grow brighter as the release tick approaches. */
  render(state: DeepReadonly<GameState>): void {
    this.preview.clear();
    for (const entity of state.entities) {
      const channel = entity.channel;
      const abilityId = channel ? entity.abilities?.[channel.slot]?.abilityId : undefined;
      const effect = abilityId ? this.data.abilities[abilityId]?.effect : undefined;
      if (!channel || effect?.type !== 'beam') continue;

      const progress = 1 - Math.max(0, channel.releaseTick - state.tick) / effect.channelTicks;
      const { x, y } = entity.position;
      const angle = Math.atan2(channel.direction.y, channel.direction.x);
      const along = { x: Math.cos(angle), y: Math.sin(angle) };
      const side = { x: -along.y * (effect.width / 2), y: along.x * (effect.width / 2) };
      const end = { x: x + along.x * effect.length, y: y + along.y * effect.length };

      this.preview.fillStyle(THEME.channelPreview, 0.06 + 0.16 * progress);
      this.preview.lineStyle(2, THEME.channelPreview, 0.3 + 0.5 * progress);
      const corners = [
        { x: x + side.x, y: y + side.y },
        { x: end.x + side.x, y: end.y + side.y },
        { x: end.x - side.x, y: end.y - side.y },
        { x: x - side.x, y: y - side.y },
      ];
      this.preview.beginPath();
      corners.forEach((corner, index) =>
        index === 0
          ? this.preview.moveTo(corner.x, corner.y)
          : this.preview.lineTo(corner.x, corner.y),
      );
      this.preview.closePath();
      this.preview.fillPath();
      this.preview.strokePath();
    }
  }

  handle(events: readonly SimEvent[]): void {
    for (const event of events) {
      if (event.type === 'beam') this.flashBeam(event.from, event.to, event.width);
    }
  }

  private flashBeam(
    from: Readonly<{ x: number; y: number }>,
    to: Readonly<{ x: number; y: number }>,
    width: number,
  ): void {
    const flash = this.flashes[this.nextFlash];
    if (!flash) return;
    this.nextFlash = (this.nextFlash + 1) % this.flashes.length;

    const length = Math.hypot(to.x - from.x, to.y - from.y);
    this.scene.tweens.killTweensOf(flash);
    flash
      .setPosition(from.x, from.y)
      .setSize(length, width)
      .setRotation(Math.atan2(to.y - from.y, to.x - from.x))
      .setAlpha(0.9)
      .setVisible(true);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: FLASH_MS,
      ease: 'Quad.easeOut',
      onComplete: () => flash.setVisible(false),
    });
  }
}
