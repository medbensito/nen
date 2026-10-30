/**
 * Seeded pseudo-random generator.
 *
 * The state is a single uint32 stored inside the game state, so it serializes
 * with the rest of the game and a snapshot resumes the exact same sequence.
 * Algorithm: mulberry32. Not cryptographic, but fast and well distributed,
 * which is all gameplay needs.
 */
export interface RngState {
  s: number;
}

/** Read-only view of the generator handed to systems through the tick context. */
export interface Rng {
  /** Float in [0, 1). */
  float(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, maxExclusive). */
  int(min: number, maxExclusive: number): number;
}

const UINT32_RANGE = 4294967296;

export function createRngState(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function nextUint32(state: RngState): number {
  state.s = (state.s + 0x6d2b79f5) >>> 0;
  let t = state.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextFloat(state: RngState): number {
  return nextUint32(state) / UINT32_RANGE;
}

export function createRng(state: RngState): Rng {
  return {
    float: () => nextFloat(state),
    range: (min, max) => min + nextFloat(state) * (max - min),
    int: (min, maxExclusive) => {
      if (!Number.isInteger(min) || !Number.isInteger(maxExclusive) || maxExclusive <= min) {
        throw new RangeError(
          `rng.int expects integers with min < maxExclusive (got ${min}, ${maxExclusive})`,
        );
      }
      return min + Math.floor(nextFloat(state) * (maxExclusive - min));
    },
  };
}
