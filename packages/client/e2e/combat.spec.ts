import { expect, test } from '@playwright/test';
import { openGame, rightClickWorld, unit } from './helpers';

test('right click on the dummy attacks it, and it strikes back', async ({ page }) => {
  await openGame(page);
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
