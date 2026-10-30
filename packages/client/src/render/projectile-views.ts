import type { DeepReadonly, GameState, ProjectileId, Team, Vec2 } from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, THEME } from '../theme';

interface ProjectileView {
  readonly dot: Phaser.GameObjects.Arc;
  readonly previous: Vec2;
}

/**
 * Draws projectiles, interpolated between ticks. Their dots come from a pool:
 * projectiles appear and vanish many times per second.
 */
export class ProjectileViews {
  private readonly scene: Phaser.Scene;
  private readonly views = new Map<ProjectileId, ProjectileView>();
  private readonly pool: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  capturePrevious(state: DeepReadonly<GameState>): void {
    for (const projectile of state.projectiles) {
      const view = this.views.get(projectile.id);
      if (view) {
        view.previous.x = projectile.position.x;
        view.previous.y = projectile.position.y;
      }
    }
  }

  render(state: DeepReadonly<GameState>, alpha: number): void {
    const seen = new Set<ProjectileId>();
    for (const projectile of state.projectiles) {
      seen.add(projectile.id);
      let view = this.views.get(projectile.id);
      if (!view) {
        view = this.createView(projectile.position, projectile.radius, projectile.team);
        this.views.set(projectile.id, view);
      }
      view.dot.setPosition(
        view.previous.x + (projectile.position.x - view.previous.x) * alpha,
        view.previous.y + (projectile.position.y - view.previous.y) * alpha,
      );
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      view.dot.setVisible(false);
      this.pool.push(view.dot);
      this.views.delete(id);
    }
  }

  private createView(position: Readonly<Vec2>, radius: number, team: Team): ProjectileView {
    const dot = this.pool.pop() ?? this.scene.add.circle(0, 0, 1).setDepth(DEPTH.projectiles);
    dot
      .setRadius(radius)
      .setFillStyle(THEME.team[team], 1)
      .setStrokeStyle(2, THEME.projectileGlow, 0.8)
      .setPosition(position.x, position.y)
      .setVisible(true);
    return { dot, previous: { x: position.x, y: position.y } };
  }
}
