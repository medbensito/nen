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
  attackMarker: 0xff6b5e,
  healthBarBackground: 0x0b0d12,
  projectileGlow: 0xffffff,
  damageDealt: '#ffe28a',
  damageTaken: '#ff8a7a',
  nenGain: '#8af5ff',
  nen: 0x5fd3e6,
  nenExhausted: 0x6b7280,
  health: 0x6ee07a,
  barTrack: 0x1a1f2b,
  slotBackground: 0x151a24,
  slotBorder: 0x3c4356,
  slotReady: 0xd7e3f4,
  slotNoNen: 0xff6b5e,
  cooldownShade: 0x000000,
  channelPreview: 0xbdf3ff,
  beam: 0xdff9ff,
  hudTextStrong: '#e6edf7',
  hudTextNen: '#8af5ff',
  hudWarning: '#ff8a7a',
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
  bars: 25,
  projectiles: 30,
  floatingText: 40,
  debug: 50,
  hud: 1000,
} as const;

export const HEALTH_BAR = {
  height: 6,
  minWidth: 44,
  /** Added to the body diameter. */
  extraWidth: 10,
  /** World units between the top of the body and the bar. */
  gap: 12,
} as const;

/** Screen pixels around a unit's body that still count as clicking it. */
export const PICK_TOLERANCE_PX = 8;

/** World units the camera may show beyond the map edges. */
export const CAMERA_BOUNDS_PADDING = 300;
