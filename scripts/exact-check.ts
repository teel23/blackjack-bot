// Dev tool: exact (full card removal) stand/hit/double EVs for one two-card hand.
// Run: npx tsx scripts/exact-check.ts decks h17 a b up
import { dealerOutcomes, shoeComp, type Comp } from '../lib/strategy/ev';

const [decks, h17, a, b, up0] = process.argv.slice(2).map(Number);
const up = up0 === 11 ? 1 : up0;
const ex = up === 1 ? 10 : up === 10 ? 1 : null;
const dealerMemo = new Map<string, number[]>();
const dealer = (R: Comp) => {
  const k = R.join(',');
  let d = dealerMemo.get(k);
  if (!d) { d = dealerOutcomes(R, up, h17 === 1).dist; dealerMemo.set(k, d); }
  return d;
};
const val = (s: number, ace: boolean) => (ace && s + 10 <= 21 ? s + 10 : s);
const standEV = (t: number, d: number[]) => {
  if (t > 21) return -1;
  let ev = d[5];
  for (let i = 0; i < 5; i++) { const dt = 17 + i; if (t > dt) ev += d[i]; else if (t < dt) ev -= d[i]; }
  return ev;
};
const drawProbs = (R: Comp) => {
  const n = R.slice(1).reduce((x, y) => x + y, 0);
  const p = new Array(11).fill(0);
  if (ex === null) { for (let v = 1; v <= 10; v++) p[v] = R[v] / n; return p; }
  const holeN = n - R[ex];
  for (let h = 1; h <= 10; h++) {
    if (h === ex || !R[h]) continue;
    const q = R[h] / holeN;
    for (let v = 1; v <= 10; v++) p[v] += (q * (R[v] - (v === h ? 1 : 0))) / (n - 1);
  }
  return p;
};
const hitMemo = new Map<string, number>();
const stand = (s: number, ace: boolean, R: Comp) => standEV(val(s, ace), dealer(R));
const hit = (s: number, ace: boolean, R: Comp): number => {
  const k = `${s},${ace},${R.join(',')}`;
  const c = hitMemo.get(k); if (c !== undefined) return c;
  const p = drawProbs(R);
  let ev = 0;
  for (let v = 1; v <= 10; v++) {
    if (!p[v]) continue;
    const s2 = s + v, a2 = ace || v === 1;
    if (val(s2, a2) > 21) { ev -= p[v]; continue; }
    R[v]--;
    ev += p[v] * Math.max(stand(s2, a2, R), hit(s2, a2, R));
    R[v]++;
  }
  hitMemo.set(k, ev);
  return ev;
};
const dbl = (s: number, ace: boolean, R: Comp) => {
  const p = drawProbs(R);
  let ev = 0;
  for (let v = 1; v <= 10; v++) { if (!p[v]) continue; R[v]--; ev += p[v] * 2 * stand(s + v, ace || v === 1, R); R[v]++; }
  return ev;
};
const R = shoeComp(decks); R[a]--; R[b]--; R[up]--;
const ace = a === 1 || b === 1;
console.log(`${decks}D ${h17 ? 'H17' : 'S17'} ${a},${b} v ${up0}: stand ${stand(a + b, ace, R).toFixed(4)} hit ${hit(a + b, ace, R).toFixed(4)} double ${dbl(a + b, ace, R).toFixed(4)}`);
