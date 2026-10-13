'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AppScreen from '@/components/AppScreen';
import BottomSheet from '@/components/BottomSheet';
import Toggle from '@/components/Toggle';
import { type Upcard, UPCARDS, upcardLabel } from '@/lib/engine/cards';
import { rulesSummary } from '@/lib/engine/rules';
import { money } from '@/lib/progress/dates';
import { update, useApp } from '@/lib/state/store';
import { type ActionEVs, cellEVs } from '@/lib/strategy/ev';
import {
  CODE_LABEL,
  type Code,
  type HandKind,
  buildChart,
  primaryAction,
  situationKey,
  upIndex,
} from '@/lib/strategy/chart';
import { reasonFor } from '@/lib/strategy/reasons';

type Tab = 'hard' | 'soft' | 'pair';

interface Row {
  label: string;
  /** Row used for lookups/stat keys. */
  row: number;
  /** Extra rows that share this display row (e.g. hard 5–7) — stats are summed. */
  also?: number[];
  sub?: string;
}

const ROWS: Record<Tab, Row[]> = {
  hard: [
    { label: '5–7', row: 7, also: [5, 6] },
    ...[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((r) => ({ label: String(r), row: r })),
    { label: '18+', row: 18, also: [19, 20, 21] },
  ],
  soft: [2, 3, 4, 5, 6, 7, 8, 9].map((x) => ({ label: `A,${x}`, row: 11 + x, sub: `soft ${11 + x}` })),
  pair: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((x) => {
    const p = x === 11 ? 'A' : x === 10 ? 'T' : String(x);
    return { label: `${p},${p}`, row: x };
  }),
};

const CODE_BG: Record<Code, string> = {
  H: 'var(--act-hit)',
  S: 'var(--act-stand)',
  D: 'var(--act-double)',
  Ds: 'var(--act-double)',
  P: 'var(--act-split)',
  Rh: 'var(--act-surrender)',
  Rs: 'var(--act-surrender)',
  Rp: 'var(--act-surrender)',
};

const TAB_LABEL: Record<Tab, string> = { hard: 'Hard', soft: 'Soft', pair: 'Pairs' };

function titleFor(tab: Tab, r: Row, up: Upcard) {
  const vs = `vs ${upcardLabel(up)}`;
  if (tab === 'hard') return `Hard ${r.label} ${vs}`;
  if (tab === 'soft') return `Soft ${r.row} (${r.label}) ${vs}`;
  return `${r.label} ${vs}`;
}

export default function ChartPage() {
  const data = useApp((s) => s.data);
  const { rules, chartHeatmap } = data.settings;
  const chart = useMemo(() => buildChart(rules), [rules]);
  const [tab, setTab] = useState<Tab>('hard');
  const [open, setOpen] = useState<{ row: Row; up: Upcard } | null>(null);

  const table = tab === 'hard' ? chart.hard : tab === 'soft' ? chart.soft : chart.pairs;
  const kind: HandKind = tab;
  const cellStat = (r: Row, up: Upcard) => {
    let n = 0;
    let correct = 0;
    for (const row of [r.row, ...(r.also ?? [])]) {
      const st = data.stats.cells[situationKey(kind, row, up)];
      if (st) {
        n += st.n;
        correct += st.correct;
      }
    }
    return { n, correct };
  };

  return (
    <AppScreen title="Strategy chart">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">{rulesSummary(rules)}</span>
        <Link href="/settings/" className="min-h-11 content-center font-semibold text-info">
          Change rules
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1" role="tablist" aria-label="Hand type">
        {(['hard', 'soft', 'pair'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-xl font-semibold ${tab === t ? 'bg-gold text-black' : 'text-muted'}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <Toggle
          label="My accuracy heat map"
          hint="Shade cells by how often you miss them"
          checked={chartHeatmap}
          onChange={(v) => update((d) => void (d.settings.chartHeatmap = v))}
        />
      </div>

      <table className="mt-3 w-full table-fixed border-separate border-spacing-[2px] text-center" role="grid" aria-label={`${TAB_LABEL[tab]} hands strategy`}>
        <thead className="sticky z-10 bg-bg" style={{ top: 'calc(56px + var(--safe-top))' }}>
          <tr>
            <th scope="col" className="w-11 py-1.5 text-[11px] font-medium text-faint">
              You
            </th>
            {UPCARDS.map((up) => (
              <th key={up} scope="col" className="py-1.5 text-[13px] font-bold">
                <span className="sr-only">Dealer </span>
                {upcardLabel(up)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS[tab].map((r) => (
            <tr key={r.label}>
              <th scope="row" className="text-left text-[13px] font-bold leading-tight">
                {r.label}
              </th>
              {UPCARDS.map((up) => {
                const code = table[r.row][upIndex(up)];
                const st = cellStat(r, up);
                const missRate = st.n ? (st.n - st.correct) / st.n : null;
                const acc = st.n ? Math.round((st.correct / st.n) * 100) : null;
                const changed = !!chart.changed[`${tab === 'pair' ? 'pairs' : tab}:${r.row}:${up}`];
                return (
                  <td key={up} className="p-0">
                    <button
                      onClick={() => setOpen({ row: r, up })}
                      aria-label={`${titleFor(tab, r, up)}: ${CODE_LABEL[code]}${acc !== null ? `. Your accuracy ${acc}%` : ''}`}
                      className="relative grid h-9 w-full place-items-center rounded-[6px] text-[12.5px] font-extrabold"
                      style={
                        chartHeatmap
                          ? {
                              background: missRate === null ? 'var(--surface-2)' : `rgba(255, 122, 122, ${0.12 + missRate * 0.88})`,
                              color: missRate !== null && missRate > 0.45 ? '#000' : 'var(--text)',
                            }
                          : { background: CODE_BG[code], color: '#000' }
                      }
                    >
                      {chartHeatmap ? (acc === null ? '·' : acc) : code}
                      {changed && !chartHeatmap && (
                        <span aria-hidden="true" className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-black/60" />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {chartHeatmap ? (
        <div className="mt-4 rounded-2xl bg-surface p-3 text-sm">
          <p className="font-semibold">Heat map</p>
          <div className="mt-2 h-3 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(255,122,122,0.12), rgba(255,122,122,1))' }} aria-hidden="true" />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Never missed</span>
            <span>Always missed</span>
          </div>
          <p className="mt-2 text-xs text-muted">Numbers are your accuracy %. A dot means you haven&apos;t played that spot yet.</p>
        </div>
      ) : (
        <Legend />
      )}

      <BottomSheet open={!!open} onClose={() => setOpen(null)} title={open ? titleFor(tab, open.row, open.up) : ''}>
        {open && <CellDetail tab={tab} row={open.row} up={open.up} code={table[open.row.row][upIndex(open.up)]} stat={cellStat(open.row, open.up)} />}
      </BottomSheet>
    </AppScreen>
  );
}

function Legend() {
  const items: [Code, string][] = [
    ['H', 'Hit'],
    ['S', 'Stand'],
    ['D', 'Double'],
    ['P', 'Split'],
    ['Rh', 'Surrender'],
  ];
  return (
    <div className="mt-4 rounded-2xl bg-surface p-3 text-sm">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
        {items.map(([c, label]) => (
          <li key={c} className="flex items-center gap-2">
            <span className="grid h-6 w-8 place-items-center rounded-md text-xs font-extrabold text-black" style={{ background: CODE_BG[c] }}>
              {c === 'Rh' ? 'R' : c}
            </span>
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted">
        <strong className="text-ink">Ds</strong> double if allowed, otherwise stand. <strong className="text-ink">D</strong> double if allowed,
        otherwise hit. <strong className="text-ink">Rh / Rs / Rp</strong> surrender if allowed, otherwise hit / stand / split. A small dot marks a
        cell changed by your table rules. Tap any cell for the why.
      </p>
    </div>
  );
}

function evLine(ev: number) {
  return money(Math.round(ev * 10000) / 100, true);
}

function CellDetail({ tab, row, up, code, stat }: { tab: Tab; row: Row; up: Upcard; code: Code; stat: { n: number; correct: number } }) {
  const rules = useApp((s) => s.data.settings.rules);
  const chart = buildChart(rules);
  const evs: ActionEVs | null = useMemo(() => cellEVs(rules, tab, row.row, up), [rules, tab, row.row, up]);
  const action = primaryAction(code);
  const dev = chart.changed[`${tab === 'pair' ? 'pairs' : tab}:${row.row}:${up}`];
  const options = evs
    ? ([
        ['Hit', evs.hit],
        ['Stand', evs.stand],
        ['Double', evs.double],
        ['Split', evs.split],
        ['Surrender', evs.surrender],
      ].filter(([, v]) => v !== null) as [string, number][]).sort((a, b) => b[1] - a[1])
    : [];
  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex items-center gap-3">
        <span className="grid h-12 min-w-14 place-items-center rounded-xl px-2 text-lg font-extrabold text-black" style={{ background: CODE_BG[code] }}>
          {code}
        </span>
        <p className="text-lg font-bold">{CODE_LABEL[code]}</p>
      </div>
      <p className="text-[15px] text-muted">{reasonFor({ kind: tab, row: row.row, up }, action, code)}</p>
      {dev && (
        <p className="rounded-xl bg-info/10 p-3 text-sm">
          <strong>Rule note:</strong> {dev.why}
        </p>
      )}
      {options.length > 0 && (
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-sm font-semibold">Average result per $100 bet</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm tabular-nums">
            {options.map(([label, v], i) => (
              <li key={label} className={`flex justify-between rounded-lg px-2 py-1 ${i === 0 ? 'bg-good/15 font-semibold' : ''}`}>
                <span>
                  {label}
                  {i === 0 ? ' (best)' : ''}
                </span>
                <span>{evLine(v)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-faint">
            Estimated from a combinatorial analysis of these rules{row.also ? ` (row ${row.row})` : ''}. Even the best play can lose money — it
            just loses the least.
          </p>
        </div>
      )}
      <p className="text-sm text-muted">
        {stat.n ? `Your record here: ${stat.correct} of ${stat.n} right (${Math.round((stat.correct / stat.n) * 100)}%).` : 'You haven\'t played this spot yet.'}
      </p>
    </div>
  );
}
