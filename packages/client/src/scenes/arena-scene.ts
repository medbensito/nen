import {
  advanceClock,
  createFixedStepClock,
  type DeepReadonly,
  type FixedStepClock,
  type MapDef,
  type Simulation,
} from '@nen/sim';
import * as Phaser from 'phaser';
import { drawWorldGrid } from '../render/world-grid';
import { THEME } from '../theme';

/** Share of the screen used by the map in the overview, to keep its border visible. */
const FRAME_MARGIN = 0.92;

export interface ArenaSceneDeps {
  readonly sim: Simulation;
  readonly map: DeepReadonly<MapDef>;
}

/**
 * Main scene: drives the simulation at its fixed tick rate and draws it.
 * It reads the simulation state and never writes to it.
 */
export class ArenaScene extends Phaser.Scene {
  private readonly deps: ArenaSceneDeps;
  private readonly clock: FixedStepClock;

  constructor(deps: ArenaSceneDeps) {
    super('arena');
    this.deps = deps;
    const { tickRate, maxStepsPerFrame } = deps.sim.data.simulation;
    this.clock = createFixedStepClock(tickRate, maxStepsPerFrame);
  }

  create(): void {
    const { map } = this.deps;
    drawWorldGrid(this.add.graphics(), map.width, map.height);

    this.cameras.main.setBackgroundColor(THEME.void);
    this.frameWholeMap();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  override update(): void {
    // Phaser's `delta` is smoothed, and clamped to 1/60 s while the window is
    // unfocused or just started: feeding it to the clock would slow the game
    // down. The simulation runs on real elapsed time.
    const { steps } = advanceClock(this.clock, this.game.loop.rawDelta);
    for (let i = 0; i < steps; i++) this.deps.sim.step();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.frameWholeMap();
  }

  // M0 overview. M1 replaces it with a camera that follows the champion.
  private frameWholeMap(): void {
    const { map } = this.deps;
    const camera = this.cameras.main;
    const zoom = Math.min(camera.width / map.width, camera.height / map.height) * FRAME_MARGIN;
    camera.setZoom(zoom).centerOn(map.width / 2, map.height / 2);
  }
}
