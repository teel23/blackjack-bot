// Render scripts/icon.svg to the PNG icon set with Playwright (WebKit).
import { webkit } from '@playwright/test';
import fs from 'node:fs';

const svg = fs.readFileSync('scripts/icon.svg', 'utf8');
const sizes = [
  ['public/icons/apple-touch-icon.png', 180, 0],
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  // Maskable: keep the art inside the 80% safe zone.
  ['public/icons/icon-maskable-512.png', 512, 0.1],
  ['public/favicon-32.png', 32, 0],
];
const browser = await webkit.launch();
const page = await browser.newPage();
for (const [out, size, pad] of sizes) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<html><body style="margin:0;background:#062a1c;display:grid;place-items:center;width:${size}px;height:${size}px">
     <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', out);
}
await browser.close();
