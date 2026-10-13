import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { type Rank, SUITS, c } from '../../lib/engine/cards';
import { stackDeal } from '../../lib/engine/shoe';
import { STORAGE_KEY } from '../../lib/storage/persist';
import { type SaveData, defaultData } from '../../lib/storage/schema';

type R = Rank | number;

/** A save with quick play open and the next deal stacked: player p, dealer up/hole, then draws. */
export function stackedSave(p: [R, R], up: R, hole: R, draws: R[] = [], mutate?: (d: SaveData) => void): SaveData {
  const d = defaultData(Date.now());
  d.table.mode = 'quick';
  d.table.bet = 25;
  d.table.shoe = stackDeal(
    [c(p[0], 'H'), c(p[1], 'D')],
    c(up, 'S'),
    c(hole, 'C'),
    draws.map((x, i) => c(x, SUITS[(i + 1) % 4])),
    6,
    7,
  );
  d.settings.installTipDismissed = true;
  mutate?.(d);
  return d;
}

/** Load the app with a given save already in localStorage (only on the first load of the page). */
export async function withSave(page: Page, data: SaveData) {
  await page.addInitScript(
    ([key, json]) => {
      if (!sessionStorage.getItem('__seeded')) {
        localStorage.setItem(key, json);
        sessionStorage.setItem('__seeded', '1');
      }
    },
    [STORAGE_KEY, JSON.stringify(data)] as const,
  );
}

export async function readSave(page: Page): Promise<SaveData> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
}

/** No horizontal scrolling and nothing wider than the screen. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(width);
}

/** Every visible button is at least 44×44 CSS px. */
export async function expectTapTargets(page: Page, min = 44) {
  const small = await page.evaluate((m) => {
    return [...document.querySelectorAll('button, a[href]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && !el.closest('.sr-only');
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((x) => x.w < m - 0.5 || x.h < m - 0.5);
  }, min);
  expect(small, `small tap targets: ${JSON.stringify(small)}`).toEqual([]);
}
