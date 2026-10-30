import type { DeepReadonly, MapDef } from '@nen/sim';
import type * as Phaser from 'phaser';
import { DEPTH, GRID, THEME } from '../theme';

const GRID_TILE_TEXTURE = 'map-grid-tile';

/**
 * Builds the static map once. The reference grid is a small texture repeated
 * by a TileSprite, and walls and fountains are plain shapes: unlike one big
 * Graphics object, these are not rebuilt every frame and are culled off screen.
 */
export function createMapView(scene: Phaser.Scene, map: DeepReadonly<MapDef>): void {
  ensureGridTexture(scene);
  scene.add
    .tileSprite(0, 0, map.width, map.height, GRID_TILE_TEXTURE)
    .setOrigin(0, 0)
    .setDepth(DEPTH.ground);

  for (const base of map.bases) {
    const color = THEME.team[base.team];
    scene.add
      .circle(base.fountain.x, base.fountain.y, base.fountainRadius, color, THEME.fountainAlpha)
      .setStrokeStyle(2, color, 0.6)
      .setDepth(DEPTH.ground);
  }

  for (const obstacle of map.obstacles) {
    scene.add
      .rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height, THEME.obstacle)
      .setOrigin(0, 0)
      .setStrokeStyle(2, THEME.obstacleEdge)
      .setDepth(DEPTH.ground);
  }

  scene.add
    .rectangle(0, 0, map.width, map.height)
    .setOrigin(0, 0)
    .setStrokeStyle(4, THEME.border)
    .setDepth(DEPTH.ground);
}

/** One major cell of the grid: minor lines inside, a major line on its top and left edges. */
function ensureGridTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GRID_TILE_TEXTURE)) return;
  const size = GRID.majorSpacing;
  const graphics = scene.add.graphics();

  graphics.fillStyle(THEME.ground, 1).fillRect(0, 0, size, size);
  graphics.fillStyle(THEME.gridMinor, 1);
  for (let offset = GRID.minorSpacing; offset < size; offset += GRID.minorSpacing) {
    graphics.fillRect(offset, 0, 1, size);
    graphics.fillRect(0, offset, size, 1);
  }
  graphics.fillStyle(THEME.gridMajor, 1);
  graphics.fillRect(0, 0, 2, size);
  graphics.fillRect(0, 0, size, 2);

  graphics.generateTexture(GRID_TILE_TEXTURE, size, size);
  graphics.destroy();
}
