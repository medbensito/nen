import {
  advanceClock,
  createFixedStepClock,
  LOCAL_PLAYER_ID,
  type DeepReadonly,
  type EntityId,
  type FixedStepClock,
  type MapDef,
  type Player,
  type Simulation,
  type Vec2,
} from '@nen/sim';
import * as Phaser from 'phaser';
import { createKeyMap } from '../input/key-bindings';
import { PlayerInput } from '../input/player-input';
import { CameraRig, type CameraStatus } from '../render/camera-rig';
import { ClickMarkers } from '../render/click-markers';
import { DamageNumbers } from '../render/damage-numbers';
import { createMapView } from '../render/map-view';
import { ProjectileViews } from '../render/projectile-views';
import { pickEnemyAt } from '../render/target-picking';
import { UnitViews } from '../render/unit-views';
import { PICK_TOLERANCE_PX, THEME } from '../theme';

export interface ArenaSceneDeps {
  readonly sim: Simulation;
  readonly map: DeepReadonly<MapDef>;
  /** Shared with the HUD, which displays it. */
  readonly cameraStatus: CameraStatus;
}

/**
 * Main scene: runs the simulation at its fixed tick rate, turns input into
 * commands and draws the state. It never writes to the state.
 */
export class ArenaScene extends Phaser.Scene {
  private readonly deps: ArenaSceneDeps;
  private readonly clock: FixedStepClock;
  private readonly player: DeepReadonly<Player>;
  private units: UnitViews | undefined;
  private projectiles: ProjectileViews | undefined;
  private damageNumbers: DamageNumbers | undefined;
  private rig: CameraRig | undefined;
  private playerInput: PlayerInput | undefined;
  private hoveringEnemy = false;

  constructor(deps: ArenaSceneDeps) {
    super('arena');
    this.deps = deps;
    const { tickRate, maxStepsPerFrame } = deps.sim.data.simulation;
    this.clock = createFixedStepClock(tickRate, maxStepsPerFrame);
    const player = deps.sim.state.players.find((candidate) => candidate.id === LOCAL_PLAYER_ID);
    if (!player) throw new Error('The match has no local player.');
    this.player = player;
  }

  create(): void {
    const { sim, map, cameraStatus } = this.deps;
    const { bindings, camera } = sim.data.input;

    createMapView(this, map);
    this.cameras.main.setBackgroundColor(THEME.void);

    const units = new UnitViews(this, { showPaths: import.meta.env.DEV });
    const rig = new CameraRig(this.cameras.main, camera, map, cameraStatus);
    const markers = new ClickMarkers(this);
    this.units = units;
    this.rig = rig;
    this.projectiles = new ProjectileViews(this);
    this.damageNumbers = new DamageNumbers(this, this.player.entityId);

    this.playerInput = new PlayerInput(
      this,
      {
        championId: this.player.entityId,
        keys: createKeyMap(bindings),
        moveRepeatMs: bindings.moveRepeatInterval * 1000,
        pickEnemy: (screen) => this.enemyAtScreen(screen),
      },
      {
        onCommand: (command) => sim.enqueue(command),
        onMoveClick: (target) => markers.show(target),
        onAttackClick: (targetId) => {
          const position = units.renderedPosition(targetId);
          if (position) markers.show(position, THEME.attackMarker);
        },
        onKeyAction: (action, pressed) => {
          if (action === 'toggleCameraLock' && pressed) rig.toggleLock();
          if (action === 'centerCamera') rig.setCentering(pressed);
        },
      },
    );
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) =>
        rig.zoomBy(dy),
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    units.render(sim.state, 0);
    rig.snapTo(this.focus());
  }

  override update(): void {
    const { sim } = this.deps;
    // Phaser's `delta` is smoothed, and clamped to 1/60 s while the window is
    // unfocused or just started: feeding it to the clock would slow the game
    // down. The simulation runs on real elapsed time.
    const elapsedMs = this.game.loop.rawDelta;

    this.playerInput?.update(elapsedMs);
    const { steps, alpha } = advanceClock(this.clock, elapsedMs);
    for (let i = 0; i < steps; i++) {
      this.units?.capturePrevious(sim.state);
      this.projectiles?.capturePrevious(sim.state);
      sim.step();
      this.damageNumbers?.handle(sim.events, sim.state);
    }
    this.units?.render(sim.state, alpha);
    this.projectiles?.render(sim.state, alpha);
    this.rig?.update(this.focus(), this.pointerOnScreen(), elapsedMs / 1000);
    this.updateCursor();
  }

  private enemyAtScreen(screen: Readonly<Vec2>): EntityId | null {
    const camera = this.cameras.main;
    const world = camera.getWorldPoint(screen.x, screen.y);
    return pickEnemyAt(
      this.deps.sim.state,
      this.player.team,
      { x: world.x, y: world.y },
      PICK_TOLERANCE_PX / camera.zoom,
    );
  }

  private updateCursor(): void {
    const pointer = this.pointerOnScreen();
    const hovering = pointer !== null && this.enemyAtScreen(pointer) !== null;
    if (hovering === this.hoveringEnemy) return;
    this.hoveringEnemy = hovering;
    this.input.setDefaultCursor(hovering ? 'crosshair' : 'default');
  }

  /** Where the camera looks when it follows: the champion as drawn this frame. */
  private focus(): Readonly<Vec2> {
    const championId = this.player.entityId;
    const drawn = this.units?.renderedPosition(championId);
    if (drawn) return drawn;
    const entity = this.deps.sim.state.entities.find((candidate) => candidate.id === championId);
    return entity?.position ?? { x: this.deps.map.width / 2, y: this.deps.map.height / 2 };
  }

  private pointerOnScreen(): Vec2 | null {
    if (!this.game.input.isOver) return null;
    const pointer = this.input.activePointer;
    return { x: pointer.x, y: pointer.y };
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
  }
}
