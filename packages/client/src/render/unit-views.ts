import {
  isAlive,
  type DeepReadonly,
  type Entity,
  type EntityId,
  type GameState,
  type Vec2,
} from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, HEALTH_BAR, THEME } from '../theme';

interface HealthBarView {
  readonly background: Phaser.GameObjects.Rectangle;
  readonly fill: Phaser.GameObjects.Rectangle;
  readonly width: number;
}

interface UnitView {
  readonly body: Phaser.GameObjects.Arc;
  readonly nose: Phaser.GameObjects.Arc;
  readonly bar: HealthBarView | undefined;
  /** Position at the previous tick, for interpolation. */
  readonly previous: Vec2;
  /** Position drawn this frame. */
  readonly rendered: Vec2;
  facing: number;
  wasAlive: boolean;
}

const NOSE_OFFSET = 0.62;
const NOSE_SIZE = 0.28;

/**
 * Draws entities from the simulation state, interpolated between the last two
 * ticks so motion stays smooth at any frame rate. Dead entities are hidden.
 * Read-only on the state.
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
      const alive = entity.health === undefined || isAlive(entity);

      // A respawn is a jump, not a move: do not interpolate across the map.
      if (alive && !view.wasAlive) {
        view.previous.x = entity.position.x;
        view.previous.y = entity.position.y;
      }
      view.wasAlive = alive;
      this.setVisible(view, alive);
      if (!alive) continue;

      const x = view.previous.x + (entity.position.x - view.previous.x) * alpha;
      const y = view.previous.y + (entity.position.y - view.previous.y) * alpha;
      view.rendered.x = x;
      view.rendered.y = y;

      const next = entity.movement?.path[0];
      const aim = entity.channel?.direction ?? entity.dash?.direction;
      if (aim) view.facing = Math.atan2(aim.y, aim.x);
      else if (next) view.facing = Math.atan2(next.y - y, next.x - x);

      // Exhausted units look drained.
      view.body.setAlpha(entity.nen?.exhausted ? 0.5 : 1);
      view.body.setPosition(x, y);
      const noseOffset = entity.kind === 'summon' ? 0 : NOSE_OFFSET;
      view.nose.setPosition(
        x + Math.cos(view.facing) * entity.radius * noseOffset,
        y + Math.sin(view.facing) * entity.radius * noseOffset,
      );
      this.placeBar(view, entity, x, y);
      this.drawPath(view.rendered, entity);
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      this.destroyView(view);
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
    // Summons (orbs) are glowing rings without a facing.
    const summon = entity.kind === 'summon';
    const body = this.scene.add
      .circle(x, y, entity.radius, color, summon ? 0.35 : 1)
      .setStrokeStyle(3, summon ? color : THEME.unitOutline)
      .setDepth(DEPTH.units);
    const nose = this.scene.add
      .circle(x, y, entity.radius * NOSE_SIZE, summon ? color : THEME.unitOutline, 0.85)
      .setDepth(DEPTH.units);
    const view: UnitView = {
      body,
      nose,
      bar: entity.health ? this.createBar(entity) : undefined,
      previous: { x, y },
      rendered: { x, y },
      facing: 0,
      wasAlive: true,
    };
    this.views.set(entity.id, view);
    return view;
  }

  private createBar(entity: DeepReadonly<Entity>): HealthBarView {
    const width = Math.max(HEALTH_BAR.minWidth, entity.radius * 2 + HEALTH_BAR.extraWidth);
    const background = this.scene.add
      .rectangle(0, 0, width + 2, HEALTH_BAR.height + 2, THEME.healthBarBackground)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.bars);
    const fill = this.scene.add
      .rectangle(0, 0, width, HEALTH_BAR.height, THEME.team[entity.team])
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.bars);
    return { background, fill, width };
  }

  private placeBar(view: UnitView, entity: DeepReadonly<Entity>, x: number, y: number): void {
    const { bar } = view;
    const health = entity.health;
    if (!bar || !health) return;
    const left = x - bar.width / 2;
    const top = y - entity.radius - HEALTH_BAR.gap;
    bar.background.setPosition(left - 1, top);
    bar.fill.setPosition(left, top);
    bar.fill.setScale(Math.max(0, Math.min(1, health.current / health.max)), 1);
  }

  private setVisible(view: UnitView, visible: boolean): void {
    view.body.setVisible(visible);
    view.nose.setVisible(visible);
    view.bar?.background.setVisible(visible);
    view.bar?.fill.setVisible(visible);
  }

  private destroyView(view: UnitView): void {
    view.body.destroy();
    view.nose.destroy();
    view.bar?.background.destroy();
    view.bar?.fill.destroy();
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
