// Dev tool: compare strategy tables with the EV calculator for a rule set.
// Run: npx tsx scripts/compare-chart.ts [decks] [h17] [das] [peek]
import { DEFAULT_RULES, type Rules } from '../lib/engine/rules';
import { buildChart, upIndex } from '../lib/strategy/chart';
import { cellEVs, type ActionEVs } from '../lib/strategy/ev';
import { UPCARDS } from '../lib/engine/cards';

const [decks = '6', h17 = '0', das = '1', peek = '1', ls = '1'] = process.argv.slice(2);
const rules: Rules = { ...DEFAULT_RULES, decks: Number(decks) as Rules['decks'], dealerHitsSoft17: h17 === '1', doubleAfterSplit: das === '1', dealerPeek: peek === '1', lateSurrender: ls === '1' };
const chart = buildChart(rules);

function evOfCode(code: string, ev: ActionEVs): number {
  const f = (a: number | null, b: number) => (a === null ? b : a);
  switch (code) {
    case 'H': return ev.hit;
    case 'S': return ev.stand;
    case 'D': return f(ev.double, ev.hit);
    case 'Ds': return f(ev.double, ev.stand);
    case 'P': return f(ev.split, NaN);
    case 'Rh': return f(ev.surrender, ev.hit);
    case 'Rs': return f(ev.surrender, ev.stand);
    case 'Rp': return f(ev.surrender, f(ev.split, NaN));
  }
  return NaN;
}
function best(ev: ActionEVs) {
  const opts: [string, number | null][] = [['H', ev.hit], ['S', ev.stand], ['D', ev.double], ['P', ev.split], ['R', ev.surrender]];
  return opts.filter(([, v]) => v !== null).sort((a, b) => (b[1] as number) - (a[1] as number))[0] as [string, number];
}
let issues = 0;
const t0 = Date.now();
for (const [kind, table, rows] of [['hard', chart.hard, [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]], ['soft', chart.soft, [13,14,15,16,17,18,19,20]], ['pair', chart.pairs, [2,3,4,5,6,7,8,9,10,11]]] as const) {
  for (const row of rows) {
    for (const up of UPCARDS) {
      const ev = cellEVs(rules, kind, row, up);
      if (!ev) continue;
      const code = (table as Record<number, string[]>)[row][upIndex(up)];
      const mine = evOfCode(code, ev);
      const [bcode, bev] = best(ev);
      const gap = bev - mine;
      if (gap > 0.0005 || Number.isNaN(mine)) {
        issues++;
        console.log(`${kind} ${row} v ${up === 11 ? 'A' : up}: table ${code} (${mine.toFixed(4)}) vs best ${bcode} (${bev.toFixed(4)}) gap ${gap.toFixed(4)}`);
      }
    }
  }
}
console.log(`rules ${JSON.stringify({decks, h17, das, peek, ls})}: ${issues} differences, ${Date.now() - t0}ms`);
