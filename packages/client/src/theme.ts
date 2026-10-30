/** Visual constants only. Gameplay values belong in data/. */
export const THEME = {
  void: 0x07080c,
  ground: 0x10131b,
  gridMinor: 0x171b26,
  gridMajor: 0x232a3b,
  border: 0x4a5878,
  obstacle: 0x2a2f3d,
  obstacleEdge: 0x3c4356,
  team: {
    blue: 0x4da3ff,
    red: 0xff6b5e,
    neutral: 0xb8c0cc,
  },
  fountainAlpha: 0.16,
  unitOutline: 0x0b0d12,
  moveMarker: 0x7dffb2,
  debugPath: 0x7dffb2,
  hudText: '#9fb3c8',
} as const;

export const GRID = {
  /** World units between two minor grid lines. */
  minorSpacing: 100,
  /** World units between two major grid lines. */
  majorSpacing: 500,
} as const;

export const DEPTH = {
  ground: 0,
  markers: 10,
  units: 20,
  debug: 30,
  hud: 1000,
} as const;

/** World units the camera may show beyond the map edges. */
export const CAMERA_BOUNDS_PADDING = 300;
