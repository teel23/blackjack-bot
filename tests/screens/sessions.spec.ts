import { test } from '@playwright/test';
import { stackedSave, withSave } from '../e2e/helpers';

test('sessions page with history', async ({ page }, info) => {
  const day = 86_400_000;
  const t0 = Date.now() - 10 * day;
  await withSave(
    page,
    stackedSave([10, 9], 6, 10, [], (d) => {
      d.table.mode = null;
      let bal = 1000;
      d.bankroll.history = [{ t: t0, balance: 1000, kind: 'start' }];
      const nets = [120, -80, 45, -300, -410, 0, 220, 95];
      nets.forEach((n, i) => {
        bal += n;
        const t = t0 + (i + 1) * day;
        d.sessions.past.push({
          id: `s${i}`, startedAt: t - 3_600_000, endedAt: t, activeMs: 1_500_000 + i * 60_000, lastActiveAt: t,
          buyIn: 500, stack: 500 + n, hands: 40 + i * 3, decisions: 60, correct: 50 + i, hints: i % 3, net: n,
          biggestWin: 75, biggestLoss: -100,
        });
        d.bankroll.history.push({ t, balance: bal, kind: 'session' });
        if (i === 4) {
          bal = 1000;
          d.bankroll.resets = 1;
          d.bankroll.history.push({ t: t + 1000, balance: 1000, kind: 'reset' });
        }
      });
      d.bankroll.balance = bal;
    }),
  );
  await page.goto('/sessions/');
  await page.screenshot({ path: `.screens/${info.project.name.replace(/\s+/g, '-')}/10-sessions.png`, fullPage: true });
});
