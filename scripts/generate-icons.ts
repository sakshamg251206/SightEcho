/**
 * Renders the PNG app icons in public/ from public/icon.svg.
 * Run with: node scripts/generate-icons.ts (needs a Playwright Chromium).
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/icon.svg', 'utf8');
const targets = [
  { file: 'public/icon-192.png', size: 192, padding: 0 },
  { file: 'public/icon-512.png', size: 512, padding: 0 },
  // Maskable icons need a safe zone; the launcher may crop up to 20% per side.
  { file: 'public/icon-maskable-512.png', size: 512, padding: 0.12 },
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const page = await browser.newPage();
for (const { file, size, padding } of targets) {
  const inner = Math.round(size * (1 - padding * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${padding ? '#ffd24a' : 'transparent'}">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body>`,
  );
  await page.screenshot({ path: file, omitBackground: padding === 0 });
  console.warn(`wrote ${file}`);
}
await browser.close();
