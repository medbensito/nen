import type { DeepReadonly, EntityId, GameState, SimEvent } from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, THEME } from '../theme';

const POOL_SIZE = 24;
const RISE = 42;
const DURATION_MS = 750;

/**
 * Floating numbers for damage taken, from the simulation events. Damage to
 * the player's own champion shows in another color than damage it deals.
 */
export class DamageNumbers {
  private readonly scene: Phaser.Scene;
  private readonly playerChampionId: EntityId;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene, playerChampionId: EntityId) {
    this.scene = scene;
    this.playerChampionId = playerChampionId;
    for (let i = 0; i < POOL_SIZE; i++) {
      this.texts.push(
        scene.add
          .text(0, 0, '', {
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: THEME.damageDealt,
            stroke: '#000000',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.floatingText)
          .setVisible(false),
      );
    }
  }

  handle(events: readonly SimEvent[], state: DeepReadonly<GameState>): void {
    for (const event of events) {
      if (event.type === 'damage') {
        const target = state.entities.find((entity) => entity.id === event.targetId);
        const top = event.position.y - (target?.radius ?? 0) - 18;
        const taken = event.targetId === this.playerChampionId;
        this.show(
          event.position.x,
          top,
          String(Math.round(event.amount)),
          taken ? THEME.damageTaken : THEME.damageDealt,
        );
      } else if (event.type === 'nen-refund') {
        const caster = state.entities.find((entity) => entity.id === event.entityId);
        if (!caster) continue;
        const top = caster.position.y - caster.radius - 34;
        this.show(caster.position.x, top, `+${Math.round(event.amount)}`, THEME.nenGain);
      }
    }
  }

  private show(x: number, y: number, label: string, color: string): void {
    const text = this.texts[this.next];
    if (!text) return;
    this.next = (this.next + 1) % this.texts.length;

    this.scene.tweens.killTweensOf(text);
    text.setText(label).setColor(color).setPosition(x, y).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: text,
      y: y - RISE,
      alpha: 0,
      duration: DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => text.setVisible(false),
    });
  }
}
