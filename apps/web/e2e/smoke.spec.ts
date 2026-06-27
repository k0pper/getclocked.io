import { test, expect } from '@playwright/test';

// End-to-end smoke: the title loads, a round becomes playable, a tap pair is
// recorded, and the result reveal appears. Forced clicks because the buzzer /
// CTA breathe continuously (Playwright would otherwise wait for stability).
test('title to round to result', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: /getclocked/i })).toBeVisible();

  await page.getByRole('button', { name: 'Start game' }).click({ force: true });

  const start = page.getByRole('button', { name: 'Tap to start' });
  await expect(start).toBeVisible({ timeout: 20_000 });
  await start.click({ force: true });

  const stop = page.getByRole('button', { name: 'Tap to stop' });
  await expect(stop).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
  await stop.click({ force: true });

  await expect(page.getByRole('button', { name: /next round|see results/i })).toBeVisible({
    timeout: 10_000,
  });
});
