import type * as Phaser from 'phaser';
import { DEPTH, GRID, THEME } from '../theme';

/** Draws the ground of the world, a reference grid and its border. */
export function drawWorldGrid(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
): void {
  graphics.clear().setDepth(DEPTH.world);
  graphics.fillStyle(THEME.ground, 1).fillRect(0, 0, width, height);

  graphics.lineStyle(1, THEME.gridMinor, 1);
  drawLines(graphics, width, height, GRID.minorSpacing);

  graphics.lineStyle(2, THEME.gridMajor, 1);
  drawLines(graphics, width, height, GRID.majorSpacing);

  graphics.lineStyle(4, THEME.border, 1).strokeRect(0, 0, width, height);
}

function drawLines(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  spacing: number,
): void {
  for (let x = spacing; x < width; x += spacing) graphics.lineBetween(x, 0, x, height);
  for (let y = spacing; y < height; y += spacing) graphics.lineBetween(0, y, width, y);
}
