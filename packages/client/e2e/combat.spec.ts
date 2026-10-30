import { expect, test, type Page } from '@playwright/test';

interface UnitProbe {
  id: number;
  defId: string;
  x: number;
  y: number;
  health: number;
  alive: boolean;
}

interface DebugWindow {
  __NEN_DEBUG__?: {
    tick: () => number;
    units: () => UnitProbe[];
    screenOf: (x: number, y: number) => { x: number; y: number } | null;
  };
}

async function unit(page: Page, defId: string): Promise<UnitProbe> {
  const units = await page.evaluate(() => (window as DebugWindow).__NEN_DEBUG__?.units() ?? []);
  const found = units.find((candidate) => candidate.defId === defId);
  if (!found) throw new Error(`no unit "${defId}"`);
  return found;
}

/** Right clicks the screen point where a world point is currently drawn. */
async function rightClickWorld(page: Page, x: number, y: number): Promise<void> {
  const canvas = await page.locator('canvas').boundingBox();
  const screen = await page.evaluate(
    ([wx, wy]) => (window as DebugWindow).__NEN_DEBUG__?.screenOf(wx ?? 0, wy ?? 0) ?? null,
    [x, y],
  );
  if (!canvas || !screen) throw new Error('cannot map world to screen');
  await page.mouse.click(canvas.x + screen.x, canvas.y + screen.y, { button: 'right' });
}

test('right click on the dummy attacks it, and it strikes back', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window as DebugWindow).__NEN_DEBUG__?.tick() ?? 0) > 5);

  const dummy = await unit(page, 'training-dummy');
  const champion = await unit(page, 'ressac');

  // Walk toward the dummy first, so it is on screen at zoom 1.
  await rightClickWorld(page, (champion.x + dummy.x) / 2, dummy.y);
  await page.waitForTimeout(1500);
  await rightClickWorld(page, dummy.x, dummy.y);

  await expect
    .poll(async () => (await unit(page, 'training-dummy')).health, { timeout: 15_000 })
    .toBeLessThan(dummy.health);
  await expect
    .poll(async () => (await unit(page, 'ressac')).health, { timeout: 15_000 })
    .toBeLessThan(champion.health);
});
