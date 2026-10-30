import type { DeepReadonly, Entity, EntityId, GameState, Vec2 } from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, THEME } from '../theme';

interface UnitView {
  readonly body: Phaser.GameObjects.Arc;
  readonly nose: Phaser.GameObjects.Arc;
  /** Position at the previous tick, for interpolation. */
  readonly previous: Vec2;
  /** Position drawn this frame. */
  readonly rendered: Vec2;
  facing: number;
}

const NOSE_OFFSET = 0.62;
const NOSE_SIZE = 0.28;

/**
 * Draws entities from the simulation state, interpolated between the last two
 * ticks so motion stays smooth at any frame rate. Read-only on the state.
 */
export class UnitViews {
  private readonly scene: Phaser.Scene;
  private readonly views = new Map<EntityId, UnitView>();
  private readonly paths: Phaser.GameObjects.Graphics | undefined;

  constructor(scene: Phaser.Scene, options: { showPaths: boolean }) {
    this.scene = scene;
    this.paths = options.showPaths ? scene.add.graphics().setDepth(DEPTH.debug) : undefined;
  }

  /** Call right before each simulation step. */
  capturePrevious(state: DeepReadonly<GameState>): void {
    for (const entity of state.entities) {
      const view = this.views.get(entity.id);
      if (view) {
        view.previous.x = entity.position.x;
        view.previous.y = entity.position.y;
      }
    }
  }

  /** `alpha`: elapsed fraction of the current tick, from the fixed-step clock. */
  render(state: DeepReadonly<GameState>, alpha: number): void {
    const seen = new Set<EntityId>();
    this.paths?.clear();

    for (const entity of state.entities) {
      seen.add(entity.id);
      const view = this.views.get(entity.id) ?? this.createView(entity);
      const x = view.previous.x + (entity.position.x - view.previous.x) * alpha;
      const y = view.previous.y + (entity.position.y - view.previous.y) * alpha;
      view.rendered.x = x;
      view.rendered.y = y;

      const next = entity.movement?.path[0];
      if (next) view.facing = Math.atan2(next.y - y, next.x - x);

      view.body.setPosition(x, y);
      view.nose.setPosition(
        x + Math.cos(view.facing) * entity.radius * NOSE_OFFSET,
        y + Math.sin(view.facing) * entity.radius * NOSE_OFFSET,
      );
      this.drawPath(view.rendered, entity);
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      view.body.destroy();
      view.nose.destroy();
      this.views.delete(id);
    }
  }

  /** Where an entity was drawn this frame. */
  renderedPosition(id: EntityId): Readonly<Vec2> | undefined {
    return this.views.get(id)?.rendered;
  }

  private createView(entity: DeepReadonly<Entity>): UnitView {
    const color = THEME.team[entity.team];
    const { x, y } = entity.position;
    const body = this.scene.add
      .circle(x, y, entity.radius, color, 1)
      .setStrokeStyle(3, THEME.unitOutline)
      .setDepth(DEPTH.units);
    const nose = this.scene.add
      .circle(x, y, entity.radius * NOSE_SIZE, THEME.unitOutline, 0.85)
      .setDepth(DEPTH.units);
    const view: UnitView = { body, nose, previous: { x, y }, rendered: { x, y }, facing: 0 };
    this.views.set(entity.id, view);
    return view;
  }

  private drawPath(from: Readonly<Vec2>, entity: DeepReadonly<Entity>): void {
    const path = entity.movement?.path;
    if (!this.paths || !path || path.length === 0) return;
    this.paths.lineStyle(2, THEME.debugPath, 0.35);
    this.paths.beginPath();
    this.paths.moveTo(from.x, from.y);
    for (const point of path) this.paths.lineTo(point.x, point.y);
    this.paths.strokePath();
  }
}
