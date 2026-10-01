/**
 * Captures README screenshots of the running app (start `npm run preview` first).
 * Run with: node scripts/capture-screenshots.ts [baseUrl]
 */
import { chromium, devices } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:4173';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader'],
});

const shots = [
  { file: 'docs/screenshots/setup-mobile.png', context: devices['Pixel 7'], scheme: 'dark' },
  {
    file: 'docs/screenshots/setup-desktop.png',
    context: { viewport: { width: 1280, height: 860 } },
    scheme: 'dark',
  },
  { file: 'docs/screenshots/setup-mobile-light.png', context: devices['Pixel 7'], scheme: 'light' },
] as const;

for (const shot of shots) {
  const context = await browser.newContext({ ...shot.context, colorScheme: shot.scheme });
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page
    .getByText(/Choose model file|can’t run SightEcho/)
    .first()
    .waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot.file, fullPage: true });
  console.warn(`wrote ${shot.file}`);
  await context.close();
}

await browser.close();
