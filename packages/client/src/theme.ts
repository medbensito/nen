/** Visual constants only. Gameplay values belong in data/. */
export const THEME = {
  void: 0x07080c,
  ground: 0x10131b,
  gridMinor: 0x1a1f2b,
  gridMajor: 0x283044,
  border: 0x4a5878,
  hudText: '#9fb3c8',
} as const;

export const GRID = {
  /** World units between two minor grid lines. */
  minorSpacing: 100,
  /** World units between two major grid lines. */
  majorSpacing: 500,
} as const;

export const DEPTH = {
  world: 0,
  hud: 1000,
} as const;
