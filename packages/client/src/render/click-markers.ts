import type { Vec2 } from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, THEME } from '../theme';

const POOL_SIZE = 6;
const RADIUS = 18;
const DURATION_MS = 380;

/** Short-lived ring where a move order was given. Rings come from a fixed pool. */
export class ClickMarkers {
  private readonly scene: Phaser.Scene;
  private readonly rings: Phaser.GameObjects.Arc[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < POOL_SIZE; i++) {
      this.rings.push(
        scene.add
          .circle(0, 0, RADIUS)
          .setStrokeStyle(3, THEME.moveMarker)
          .setDepth(DEPTH.markers)
          .setVisible(false),
      );
    }
  }

  show(at: Readonly<Vec2>, color: number = THEME.moveMarker): void {
    const ring = this.rings[this.next];
    if (!ring) return;
    this.next = (this.next + 1) % this.rings.length;

    this.scene.tweens.killTweensOf(ring);
    ring.setStrokeStyle(3, color).setPosition(at.x, at.y).setScale(1).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: ring,
      scale: 0.35,
      alpha: 0,
      duration: DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => ring.setVisible(false),
    });
  }
}
