import { createSimulation } from '@nen/sim';
import * as Phaser from 'phaser';
import { installDebugHook } from './debug';
import { loadBundledGameData } from './game-data';
import { createTranslator, pickLanguage } from './i18n';
import type { CameraStatus } from './render/camera-rig';
import { ArenaScene } from './scenes/arena-scene';
import { HudScene } from './scenes/hud-scene';
import { THEME } from './theme';
import { TEXT } from './ui/text-keys';

const FALLBACK_LANGUAGE = 'fr';

function boot(): void {
  const data = loadBundledGameData();

  const language = pickLanguage(Object.keys(data.locales), navigator.languages, FALLBACK_LANGUAGE);
  const t = createTranslator(data.locales[language] ?? {});
  document.documentElement.lang = language;
  document.title = t(TEXT.appTitle);

  const map = data.maps[data.match.map];
  if (!map) throw new Error(`Map "${data.match.map}" is missing from the game data.`);

  // The client may use real randomness: the seed is the only thing it injects.
  const sim = createSimulation({ data, seed: Math.floor(Math.random() * 2 ** 32) });
  const cameraStatus: CameraStatus = { locked: data.input.camera.startLocked };

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: THEME.void,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [new ArenaScene({ sim, map, cameraStatus }), new HudScene({ sim, t, cameraStatus })],
  });
  if (import.meta.env.DEV) installDebugHook(sim, cameraStatus, game);
}

/** Developer-facing: shows why the game could not start, typically invalid data. */
function showBootError(error: unknown): void {
  const pre = document.createElement('pre');
  pre.id = 'boot-error';
  pre.textContent = error instanceof Error ? error.message : String(error);
  document.body.replaceChildren(pre);
  console.error(error);
}

try {
  boot();
} catch (error) {
  showBootError(error);
}
