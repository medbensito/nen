import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const { tickRate } = JSON.parse(
  readFileSync(new URL('../../../data/rules/simulation.json', import.meta.url), 'utf8'),
) as { tickRate: number };

interface DebugWindow {
  __NEN_DEBUG__?: { tick: () => number };
}

async function readTick(page: Page): Promise<{ tick: number; at: number }> {
  return page.evaluate(() => ({
    tick: (window as DebugWindow).__NEN_DEBUG__?.tick() ?? -1,
    at: performance.now(),
  }));
}

test('the arena loads and the simulation runs without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#boot-error')).toHaveCount(0);
  await page.waitForFunction(() => ((window as DebugWindow).__NEN_DEBUG__?.tick() ?? 0) > 10);

  expect(errors).toEqual([]);
});

test('the simulation runs at its tick rate, whatever the frame rate', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window as DebugWindow).__NEN_DEBUG__?.tick() ?? 0) > 10);

  const start = await readTick(page);
  await page.waitForTimeout(2000);
  const end = await readTick(page);

  const ticksPerSecond = (end.tick - start.tick) / ((end.at - start.at) / 1000);
  expect(ticksPerSecond).toBeGreaterThan(tickRate * 0.85);
  expect(ticksPerSecond).toBeLessThan(tickRate * 1.15);
});
