import { expect, test } from '@playwright/test';

test('explains the app and guides setup on first visit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle(/SightEcho/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/hear what’s in front of you/i);
  await expect(page.getByText(/never uploaded/i)).toBeVisible();

  // Headless browsers may or may not expose WebGPU; either outcome must be explained.
  const setup = page.getByRole('heading', { level: 2 });
  await expect(setup).toHaveText(/one-time setup|can’t run sightecho/i);
  if (/one-time setup/i.test(await setup.innerText())) {
    await expect(page.getByText('Choose model file')).toBeVisible();
    await expect(page.getByLabel('Model address')).toBeVisible();
  } else {
    await expect(page.getByText(/WebGPU/).first()).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test('ships an installable, offline-capable web app', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('SightEcho');
  expect(manifest.icons.length).toBeGreaterThan(0);

  const runtime = await request.get('/mediapipe/genai_wasm_internal.wasm');
  expect(runtime.ok()).toBe(true);

  await page.goto('/');
  const registered = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null;
  });
  expect(registered).toBe(true);
});

test('has no horizontal overflow on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
