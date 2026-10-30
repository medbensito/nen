import type { Command } from '../commands/command';
import type { GameData } from '../schema/loader';
import { createGameState, type GameState } from '../state/game-state';
import { DEFAULT_SYSTEMS } from '../systems';
import { createRng, type Rng } from './rng';
import type { DeepReadonly } from './types';

export interface TickContext {
  readonly tick: number;
  readonly data: GameData;
  readonly rng: Rng;
  /** Commands queued since the previous tick, in the order they were queued. */
  readonly commands: readonly Command[];
}

/** A system reads the context and mutates the state. It is the only place where state changes. */
export type System = (state: GameState, ctx: TickContext) => void;

export interface SimulationOptions {
  readonly data: GameData;
  readonly seed: number;
  /** Defaults to the game's systems; tests pass their own. */
  readonly systems?: readonly System[];
}

export interface Simulation {
  readonly data: GameData;
  /** Read-only view for rendering and tests. Only systems mutate the state, inside step(). */
  readonly state: DeepReadonly<GameState>;
  /** Queues a command, applied by the next step(). */
  enqueue(command: Command): void;
  /** Advances the game by exactly one tick. */
  step(): void;
}

export function createSimulation(options: SimulationOptions): Simulation {
  const { data } = options;
  const systems = [...(options.systems ?? DEFAULT_SYSTEMS)];
  const state = createGameState(options.seed);
  const rng = createRng(state.rng);
  let queue: Command[] = [];

  return {
    data,
    state,
    enqueue(command) {
      queue.push(command);
    },
    step() {
      const commands = queue;
      queue = [];
      const ctx: TickContext = { tick: state.tick, data, rng, commands };
      for (const system of systems) system(state, ctx);
      state.tick += 1;
    },
  };
}
