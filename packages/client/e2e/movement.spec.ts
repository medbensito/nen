import { expect, test, type Page } from '@playwright/test';

interface DebugWindow {
  __NEN_DEBUG__?: {
    tick: () => number;
    champion: () => { x: number; y: number; moving: boolean } | null;
    cameraLocked: () => boolean;
  };
}

async function champion(page: Page): Promise<{ x: number; y: number; moving: boolean }> {
  const value = await page.evaluate(
    () => (window as DebugWindow).__NEN_DEBUG__?.champion() ?? null,
  );
  if (!value) throw new Error('champion not found');
  return value;
}

async function cameraLocked(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as DebugWindow).__NEN_DEBUG__?.cameraLocked() ?? false);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window as DebugWindow).__NEN_DEBUG__?.tick() ?? 0) > 5);
});

test('right click moves the champion, S stops it', async ({ page }) => {
  const start = await champion(page);
  const canvas = await page.locator('canvas').boundingBox();
  if (!canvas) throw new Error('no canvas');

  // The camera starts locked on the champion, so it sits near the screen center.
  await page.mouse.click(canvas.x + canvas.width / 2 + 250, canvas.y + canvas.height / 2, {
    button: 'right',
  });
  await expect.poll(async () => (await champion(page)).x).toBeGreaterThan(start.x + 100);

  await page.keyboard.press('KeyS');
  await page.waitForTimeout(200);
  const stopped = await champion(page);
  await page.waitForTimeout(400);
  expect(await champion(page)).toEqual(stopped);
  expect(stopped.moving).toBe(false);
});

test('Y toggles the camera lock once per press, even for quick presses', async ({ page }) => {
  expect(await cameraLocked(page)).toBe(true);
  await page.keyboard.press('KeyY');
  await expect.poll(() => cameraLocked(page)).toBe(false);
  // Several presses inside one frame used to be counted more than once.
  await page.keyboard.press('KeyY');
  await page.keyboard.press('KeyY');
  await page.keyboard.press('KeyY');
  await page.waitForTimeout(300);
  expect(await cameraLocked(page)).toBe(true);
});

test('the main thread stays well under the 60 fps frame budget', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const taskSeconds = async () =>
    (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration')
      ?.value ?? 0;

  await page.evaluate(() => {
    const counter = window as unknown as { __frames: number };
    counter.__frames = 0;
    const count = () => {
      counter.__frames += 1;
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
  });
  const before = await taskSeconds();
  await page.waitForTimeout(3000);
  const after = await taskSeconds();
  const frames = await page.evaluate(() => (window as unknown as { __frames: number }).__frames);

  // Headless rendering is software-only, so frame rate itself is meaningless
  // here; main-thread time per frame is what limits a real machine. A 60 fps
  // frame lasts 16.7 ms: keep the main thread under half of it.
  const msPerFrame = ((after - before) * 1000) / frames;
  expect(msPerFrame).toBeLessThan(8);
});
