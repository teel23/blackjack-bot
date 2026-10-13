'use client';

import { localDate } from '../progress/dates';
import { reconcileStreak } from '../progress/streak';
import { onHydrate } from './store';

// Catch up the streak for days the app wasn't opened (freezes or reset).
onHydrate((d) => {
  d.progress.streak = reconcileStreak(d.progress.streak, localDate());
});
