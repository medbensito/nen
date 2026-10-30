import type { Command } from '../commands/command';
import type { SimEvent } from './events';
import { createNavIndex, type NavIndex } from '../nav/nav-index';
import type { GameData } from '../schema/loader';
import { createGameState, type GameState } from '../state/game-state';
import { setupMatch } from '../state/setup-match';
import { DEFAULT_SYSTEMS } from '../systems';
import { createRng, type Rng } from './rng';
import type { DeepReadonly } from './types';

export interface TickContext {
  readonly tick: number;
  readonly data: GameData;
  readonly rng: Rng;
  /** Navigation grids of the match map. Static: derived from data, not from state. */
  readonly nav: NavIndex;
  /** Commands queued since the previous tick, in the order they were queued. */
  readonly commands: readonly Command[];
  /** Systems report what happened here; read back through `Simulation.events`. */
  readonly events: SimEvent[];
}

/** A system reads the context and mutates the state. It is the only place where state changes. */
export type System = (state: GameState, ctx: TickContext) => void;

export interface SimulationOptions {
  readonly data: GameData;
  readonly seed: number;
  /** Defaults to the game's systems; tests pass their own. */
  readonly systems?: readonly System[];
  /** Builds the initial state; defaults to the match setup from the data. */
  readonly setup?: (state: GameState, data: GameData) => void;
}

export interface Simulation {
  readonly data: GameData;
  readonly nav: NavIndex;
  /** Read-only view for rendering and tests. Only systems mutate the state, inside step(). */
  readonly state: DeepReadonly<GameState>;
  /** What happened during the last step. */
  readonly events: readonly SimEvent[];
  /** Queues a command, applied by the next step(). */
  enqueue(command: Command): void;
  /** Advances the game by exactly one tick. */
  step(): void;
}

export function createSimulation(options: SimulationOptions): Simulation {
  const { data } = options;
  const map = data.maps[data.match.map];
  if (!map) throw new Error(`Unknown match map "${data.match.map}"`);

  const nav = createNavIndex(map);
  const systems = [...(options.systems ?? DEFAULT_SYSTEMS)];
  const state = createGameState(options.seed);
  (options.setup ?? setupMatch)(state, data);
  const rng = createRng(state.rng);
  let queue: Command[] = [];
  let events: SimEvent[] = [];

  return {
    data,
    nav,
    state,
    get events() {
      return events;
    },
    enqueue(command) {
      queue.push(command);
    },
    step() {
      const commands = queue;
      queue = [];
      events = [];
      const ctx: TickContext = { tick: state.tick, data, rng, nav, commands, events };
      for (const system of systems) system(state, ctx);
      state.tick += 1;
    },
  };
}
