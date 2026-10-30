import { hashState, type Simulation } from '@nen/sim';

/** Read-only probes for the browser console and the smoke test. Dev builds only. */
export interface NenDebug {
  readonly tick: () => number;
  readonly hash: () => string;
}

declare global {
  interface Window {
    __NEN_DEBUG__?: NenDebug;
  }
}

export function installDebugHook(sim: Simulation): void {
  window.__NEN_DEBUG__ = {
    tick: () => sim.state.tick,
    hash: () => hashState(sim.state),
  };
}
