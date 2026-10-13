// Render iOS launch screens (apple-touch-startup-image) for common iPhones.
import { webkit } from '@playwright/test';
import fs from 'node:fs';

export const DEVICES = [
  [375, 667, 2], [360, 780, 3], [390, 844, 3], [393, 852, 3], [402, 874, 3],
  [428, 926, 3], [430, 932, 3], [440, 956, 3], [414, 896, 2], [414, 896, 3],
];
const icon = fs.readFileSync('scripts/icon.svg', 'utf8');
fs.mkdirSync('public/splash', { recursive: true });
const browser = await webkit.launch();
const page = await browser.newPage();
for (const [w, h, dpr] of DEVICES) {
  const W = w * dpr, H = h * dpr;
  await page.setViewportSize({ width: W, height: H });
  const size = Math.round(W * 0.34);
  await page.setContent(`<html><body style="margin:0;width:${W}px;height:${H}px;background:#0a100e;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,Helvetica,sans-serif">
    <div style="width:${size}px;height:${size}px;border-radius:${size * 0.22}px;overflow:hidden;box-shadow:0 ${dpr * 8}px ${dpr * 24}px rgba(0,0,0,.4)">${icon.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    <div style="margin-top:${dpr * 24}px;color:#fff;font-size:${dpr * 26}px;font-weight:800;letter-spacing:-0.01em">Blackjack Bot</div>
    <div style="margin-top:${dpr * 6}px;color:rgba(255,255,255,.65);font-size:${dpr * 14}px">Play money · learn basic strategy</div></body></html>`);
  const out = `public/splash/splash-${W}x${H}.png`;
  await page.screenshot({ path: out });
  console.log('wrote', out);
}
await browser.close();
