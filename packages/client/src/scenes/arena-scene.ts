import {
  advanceClock,
  createFixedStepClock,
  LOCAL_PLAYER_ID,
  type DeepReadonly,
  type EntityId,
  type FixedStepClock,
  type MapDef,
  type Simulation,
  type Vec2,
} from '@nen/sim';
import * as Phaser from 'phaser';
import { createKeyMap } from '../input/key-bindings';
import { PlayerInput } from '../input/player-input';
import { ClickMarkers } from '../render/click-markers';
import { createMapView } from '../render/map-view';
import { UnitViews } from '../render/unit-views';
import { THEME } from '../theme';

export interface ArenaSceneDeps {
  readonly sim: Simulation;
  readonly map: DeepReadonly<MapDef>;
}

/**
 * Main scene: runs the simulation at its fixed tick rate, turns input into
 * commands and draws the state. It never writes to the state.
 */
export class ArenaScene extends Phaser.Scene {
  private readonly deps: ArenaSceneDeps;
  private readonly clock: FixedStepClock;
  private readonly championId: EntityId;
  private views: UnitViews | undefined;
  private playerInput: PlayerInput | undefined;

  constructor(deps: ArenaSceneDeps) {
    super('arena');
    this.deps = deps;
    const { tickRate, maxStepsPerFrame } = deps.sim.data.simulation;
    this.clock = createFixedStepClock(tickRate, maxStepsPerFrame);
    const player = deps.sim.state.players.find((candidate) => candidate.id === LOCAL_PLAYER_ID);
    if (!player) throw new Error('The match has no local player.');
    this.championId = player.entityId;
  }

  create(): void {
    const { sim, map } = this.deps;
    const { bindings } = sim.data.input;

    createMapView(this, map);
    this.cameras.main.setBackgroundColor(THEME.void);

    const views = new UnitViews(this, { showPaths: import.meta.env.DEV });
    const markers = new ClickMarkers(this);
    this.views = views;

    this.playerInput = new PlayerInput(
      this,
      {
        championId: this.championId,
        keys: createKeyMap(bindings),
        moveRepeatMs: bindings.moveRepeatInterval * 1000,
      },
      {
        onCommand: (command) => sim.enqueue(command),
        onMoveClick: (target) => markers.show(target),
        // Camera actions arrive with the camera rig.
        onKeyAction: () => undefined,
      },
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    views.render(sim.state, 0);
    this.followChampion();
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
      this.views?.capturePrevious(sim.state);
      sim.step();
    }
    this.views?.render(sim.state, alpha);
    this.followChampion();
  }

  private followChampion(): void {
    const focus = this.focus();
    this.cameras.main.centerOn(focus.x, focus.y);
  }

  /** Where the camera looks when it follows: the champion as drawn this frame. */
  private focus(): Readonly<Vec2> {
    const drawn = this.views?.renderedPosition(this.championId);
    if (drawn) return drawn;
    const entity = this.deps.sim.state.entities.find(
      (candidate) => candidate.id === this.championId,
    );
    return entity?.position ?? { x: this.deps.map.width / 2, y: this.deps.map.height / 2 };
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
  }
}
