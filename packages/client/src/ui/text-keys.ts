/**
 * Translation keys used directly by the client code. Every key must exist in
 * every file of data/locales/ (checked by tools/client-text.test.ts).
 */
export const TEXT = {
  appTitle: 'app.title',
  hudFps: 'hud.fps',
  cameraLocked: 'hud.camera.locked',
  cameraFree: 'hud.camera.free',
  respawnIn: 'hud.respawn-in',
  exhausted: 'hud.exhausted',
  castCooldown: 'hud.cast.cooldown',
  castNen: 'hud.cast.nen',
  castExhausted: 'hud.cast.exhausted',
  castLocked: 'hud.cast.locked',
  castBusy: 'hud.cast.busy',
} as const;
