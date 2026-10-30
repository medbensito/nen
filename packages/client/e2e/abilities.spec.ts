import { expect, test } from '@playwright/test';
import { champion, openGame, pointAtWorld, rightClickWorld, unit } from './helpers';

test.beforeEach(async ({ page }) => {
  await openGame(page);
  // Get within the first ability's range of the dummy.
  const dummy = await unit(page, 'training-dummy');
  await rightClickWorld(page, dummy.x - 450, dummy.y);
  await expect.poll(async () => (await champion(page)).moving, { timeout: 10_000 }).toBe(false);
});

test('the first ability key casts toward the cursor: nen spent, cooldown started, dummy hit', async ({
  page,
}) => {
  const dummy = await unit(page, 'training-dummy');
  const before = await champion(page);

  await pointAtWorld(page, dummy.x, dummy.y);
  await page.keyboard.press('KeyQ');

  await expect.poll(async () => (await champion(page)).cooldowns[0] ?? 0).toBeGreaterThan(0);
  expect((await champion(page)).nen).toBeLessThan(before.nen);
  await expect
    .poll(async () => (await unit(page, 'training-dummy')).health)
    .toBeLessThan(dummy.health);
});

test('the fourth ability spends all nen and exhausts the champion', async ({ page }) => {
  const dummy = await unit(page, 'training-dummy');
  await pointAtWorld(page, dummy.x, dummy.y);
  await page.keyboard.press('KeyR');

  await expect.poll(async () => (await champion(page)).exhausted, { timeout: 5_000 }).toBe(true);
  expect((await unit(page, 'training-dummy')).health).toBeLessThan(dummy.health);
});

test('a move order during the channel cancels it at no cost', async ({ page }) => {
  const dummy = await unit(page, 'training-dummy');
  await pointAtWorld(page, dummy.x, dummy.y);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(200);
  const position = await champion(page);
  await rightClickWorld(page, position.x - 200, position.y);

  await page.waitForTimeout(1500);
  const after = await champion(page);
  expect(after.exhausted).toBe(false);
  expect(after.cooldowns[3]).toBe(0);
});
