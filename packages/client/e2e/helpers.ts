import type { Page } from '@playwright/test';

export interface UnitProbe {
  id: number;
  defId: string;
  x: number;
  y: number;
  health: number;
  alive: boolean;
}

export interface ChampionProbe {
  x: number;
  y: number;
  moving: boolean;
  nen: number;
  exhausted: boolean;
  cooldowns: number[];
}

/** Dev-only probes installed by packages/client/src/debug.ts. */
export interface DebugWindow {
  __NEN_DEBUG__?: {
    tick: () => number;
    champion: () => ChampionProbe | null;
    cameraLocked: () => boolean;
    units: () => UnitProbe[];
    screenOf: (x: number, y: number) => { x: number; y: number } | null;
  };
}

export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => ((window as DebugWindow).__NEN_DEBUG__?.tick() ?? 0) > 5);
}

export async function champion(page: Page): Promise<ChampionProbe> {
  const value = await page.evaluate(
    () => (window as DebugWindow).__NEN_DEBUG__?.champion() ?? null,
  );
  if (!value) throw new Error('champion not found');
  return value;
}

export async function unit(page: Page, defId: string): Promise<UnitProbe> {
  const units = await page.evaluate(() => (window as DebugWindow).__NEN_DEBUG__?.units() ?? []);
  const found = units.find((candidate) => candidate.defId === defId);
  if (!found) throw new Error(`no unit "${defId}"`);
  return found;
}

/** Moves the mouse onto the screen point where a world point is currently drawn. */
export async function pointAtWorld(page: Page, x: number, y: number): Promise<void> {
  const canvas = await page.locator('canvas').boundingBox();
  const screen = await page.evaluate(
    ([wx, wy]) => (window as DebugWindow).__NEN_DEBUG__?.screenOf(wx ?? 0, wy ?? 0) ?? null,
    [x, y],
  );
  if (!canvas || !screen) throw new Error('cannot map world to screen');
  await page.mouse.move(canvas.x + screen.x, canvas.y + screen.y);
}

export async function rightClickWorld(page: Page, x: number, y: number): Promise<void> {
  await pointAtWorld(page, x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
}
