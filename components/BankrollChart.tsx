'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { money } from '@/lib/progress/dates';

export interface ChartPoint {
  t: number;
  balance: number;
  kind: 'start' | 'session' | 'reset' | 'now';
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = Math.max(1, max - min);
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const ticks: number[] = [];
  // Always include one tick at or above the max so the line stays inside the plot.
  for (let v = lo; ticks.length < 2 || ticks[ticks.length - 1] < max; v += step) ticks.push(Math.round(v));
  return ticks;
}

const KIND_LABEL: Record<ChartPoint['kind'], string> = {
  start: 'Start',
  session: 'Cashed out',
  reset: 'Bankroll reset',
  now: 'Now (incl. open session)',
};

function shortDate(t: number) {
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Bankroll after each session — one series, gold line, tap/drag to inspect. */
export default function BankrollChart({ points }: { points: ChartPoint[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 180;
  const pad = { l: 52, r: 14, t: 14, b: 26 };
  const values = points.map((p) => p.balance);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(1000, ...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => pad.t + plotH - ((v - yMin) / Math.max(1, yMax - yMin)) * plotH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${y(yMin)} L${x(0)},${y(yMin)} Z` : '';
  const last = points.length - 1;

  const pick = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || !points.length) return;
    const px = clientX - rect.left;
    const i = points.length <= 1 ? 0 : Math.round(((px - pad.l) / plotW) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  const shown = active ?? last;
  const sp = points[shown];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted" aria-live="polite">
          {sp ? (
            <>
              <span className="font-semibold text-ink tabular-nums">{money(sp.balance)}</span> · {KIND_LABEL[sp.kind]} ·{' '}
              {shortDate(sp.t)}
            </>
          ) : (
            'No history yet'
          )}
        </p>
        <button onClick={() => setAsTable((v) => !v)} className="min-h-11 rounded-xl px-2 text-sm font-semibold text-info">
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {asTable ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Bankroll history</caption>
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Event</th>
              <th className="py-1 text-right font-medium">Bankroll</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-2">{shortDate(p.t)}</td>
                <td className="py-2">{KIND_LABEL[p.kind]}</td>
                <td className="py-2 text-right tabular-nums">{money(p.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          ref={box}
          className="relative touch-none select-none"
          onPointerDown={(e) => pick(e.clientX)}
          onPointerMove={(e) => e.buttons && pick(e.clientX)}
          onPointerLeave={() => setActive(null)}
          role="img"
          aria-label={`Bankroll over time: ${points.length} points, from ${money(points[0]?.balance ?? 0)} to ${money(points[last]?.balance ?? 0)}. Use the Table button for every value.`}
        >
          <svg width={width} height={height} className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--faint)">
                  {t >= 1000 ? `$${(t / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k` : `$${t}`}
                </text>
              </g>
            ))}
            {area && <path d={area} fill="var(--gold)" opacity={0.1} />}
            {points.length > 1 && (
              <path d={path} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {points.map((p, i) =>
              p.kind === 'reset' ? (
                <g key={i}>
                  <circle cx={x(i)} cy={y(p.balance)} r={6} fill="var(--surface)" stroke="var(--info)" strokeWidth={2.5} />
                  <text x={x(i)} y={y(p.balance) - 11} textAnchor="middle" fontSize={10} fill="var(--muted)">
                    reset
                  </text>
                </g>
              ) : null,
            )}
            {sp && (
              <>
                {active !== null && (
                  <line x1={x(shown)} x2={x(shown)} y1={pad.t} y2={pad.t + plotH} stroke="var(--muted)" strokeWidth={1} />
                )}
                <circle cx={x(shown)} cy={y(sp.balance)} r={5} fill="var(--gold)" stroke="var(--surface)" strokeWidth={2} />
              </>
            )}
            {points.length > 0 && (
              <>
                <text x={pad.l} y={height - 6} fontSize={11} fill="var(--faint)">
                  {shortDate(points[0].t)}
                </text>
                <text x={width - pad.r} y={height - 6} textAnchor="end" fontSize={11} fill="var(--faint)">
                  {shortDate(points[last].t)}
                </text>
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
