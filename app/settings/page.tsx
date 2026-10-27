'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import AppScreen from '@/components/AppScreen';
import BottomSheet from '@/components/BottomSheet';
import MacSyncCard from '@/components/MacSyncCard';
import Toggle from '@/components/Toggle';
import { DEFAULT_RULES, type Rules, rulesSummary } from '@/lib/engine/rules';
import { money } from '@/lib/progress/dates';
import { deliverBackup, parseBackup } from '@/lib/storage/backup';
import { clearAllData } from '@/lib/storage/persist';
import { type SaveData, defaultData } from '@/lib/storage/schema';
import { replaceData, update, useApp } from '@/lib/state/store';
import { roundInProgress } from '@/lib/state/table';

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <p className="font-semibold">{label}</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold ${value === o.value ? 'bg-gold text-black' : 'bg-surface-3'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
      {note && <p className="mt-2 text-xs leading-5 text-faint">{note}</p>}
    </section>
  );
}

export default function SettingsPage() {
  const data = useApp((s) => s.data);
  const persisted = useApp((s) => s.persisted);
  const { settings } = data;
  const rules = settings.rules;
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: SaveData; notice: string | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const busy = roundInProgress(data);

  const setRule = <K extends keyof Rules>(key: K, value: Rules[K]) =>
    update((d) => {
      d.settings.rules = { ...d.settings.rules, [key]: value };
    });

  return (
    <AppScreen title="Settings" settings={false} back="/">
      <Section
        title="Backup"
        note={
          persisted
            ? 'Your browser has agreed to keep this app\'s data. Backups are still a good habit.'
            : 'Progress lives only on this device. Safari can clear it if you don\'t visit for a while — add the app to your Home Screen and export a backup now and then.'
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              const how = await deliverBackup(data);
              setMessage(how === 'cancelled' ? null : 'Backup ready — save it to Files or iCloud Drive.');
            }}
            className="min-h-12 rounded-2xl bg-gold font-bold text-black"
          >
            Export backup
          </button>
          <button onClick={() => file.current?.click()} className="min-h-12 rounded-2xl border border-line bg-surface-2 font-semibold">
            Import backup
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Choose a backup file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                setPending(parseBackup(await f.text()));
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'Could not read that file.');
              }
            }}
          />
        </div>
        {message && (
          <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm">
            {message}
          </p>
        )}
      </Section>

      <MacSyncCard />

      <Section
        title="Table rules"
        note={
          <>
            Current: {rulesSummary(rules)}. The strategy chart and coach follow these rules; lessons always use standard rules (6 decks, S17).{' '}
            {busy ? 'Changes apply from your next hand.' : ''}
          </>
        }
      >
        <Segmented label="Decks" value={rules.decks} options={[1, 2, 6, 8].map((v) => ({ value: v as Rules['decks'], label: String(v) }))} onChange={(v) => setRule('decks', v)} />
        <Segmented
          label="Dealer on soft 17"
          value={rules.dealerHitsSoft17 ? 'hit' : 'stand'}
          options={[
            { value: 'stand', label: 'Stands (S17)' },
            { value: 'hit', label: 'Hits (H17)' },
          ]}
          onChange={(v) => setRule('dealerHitsSoft17', v === 'hit')}
        />
        <Segmented
          label="Blackjack pays"
          value={rules.blackjackPayout}
          options={[
            { value: '3:2', label: '3 to 2' },
            { value: '6:5', label: '6 to 5' },
          ]}
          onChange={(v) => setRule('blackjackPayout', v)}
        />
        <Segmented
          label="Double down on"
          value={rules.doubleOn}
          options={[
            { value: 'any2', label: 'Any two' },
            { value: '9-11', label: '9–11' },
            { value: '10-11', label: '10–11' },
          ]}
          onChange={(v) => setRule('doubleOn', v)}
        />
        <Segmented
          label="Split up to"
          value={rules.maxHands}
          options={[
            { value: 2, label: '2 hands' },
            { value: 3, label: '3 hands' },
            { value: 4, label: '4 hands' },
          ]}
          onChange={(v) => setRule('maxHands', v)}
        />
        <Toggle label="Double after split" checked={rules.doubleAfterSplit} onChange={(v) => setRule('doubleAfterSplit', v)} />
        <Toggle label="Late surrender" hint="Rare — most casinos don't offer it. Needs dealer peek." checked={rules.lateSurrender} onChange={(v) => setRule('lateSurrender', v)} />
        <Toggle label="Dealer peeks for blackjack" hint="Off = European no-hole-card" checked={rules.dealerPeek} onChange={(v) => setRule('dealerPeek', v)} />
        <Toggle label="Insurance offered" checked={rules.insurance} onChange={(v) => setRule('insurance', v)} />
        <Toggle label="Resplit aces" checked={rules.resplitAces} onChange={(v) => setRule('resplitAces', v)} />
        <Toggle label="Hit split aces" checked={rules.hitSplitAces} onChange={(v) => setRule('hitSplitAces', v)} />
        <button
          onClick={() => update((d) => void (d.settings.rules = { ...DEFAULT_RULES }))}
          className="min-h-12 rounded-2xl border border-line bg-surface font-semibold"
        >
          Reset to default rules
        </button>
      </Section>

      <Section title="Table limits">
        <Segmented
          label="Minimum bet"
          value={settings.tableMin}
          options={[5, 10, 25].map((v) => ({ value: v, label: money(v) }))}
          onChange={(v) => update((d) => void (d.settings.tableMin = v))}
        />
        <Segmented
          label="Maximum bet"
          value={settings.tableMax}
          options={[100, 500, 1000, 5000].map((v) => ({ value: v, label: money(v) }))}
          onChange={(v) => update((d) => void (d.settings.tableMax = v))}
        />
      </Section>

      <Section title="Play">
        <Toggle label="Coach mode" hint="✅/❌ and the right play after every decision" checked={settings.coach} onChange={(v) => update((d) => void (d.settings.coach = v))} />
        <Segmented
          label="Animations"
          value={settings.animation}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'fast', label: 'Fast' },
            { value: 'normal', label: 'Normal' },
          ]}
          onChange={(v) => update((d) => void (d.settings.animation = v))}
        />
        <Toggle label="Sound" hint="Off by default" checked={settings.sound} onChange={(v) => update((d) => void (d.settings.sound = v))} />
      </Section>

      <Section title="Learning">
        <Toggle
          label="Unlock all lessons"
          hint="Skip the one-new-lesson-a-day pacing"
          checked={settings.unlockAllLessons}
          onChange={(v) => update((d) => void (d.settings.unlockAllLessons = v))}
        />
        <Toggle
          label="Show the Home Screen tip"
          checked={!settings.installTipDismissed}
          onChange={(v) => update((d) => void (d.settings.installTipDismissed = !v))}
        />
      </Section>

      <Section title="Data">
        <button
          onClick={() => setConfirmReset(true)}
          className="min-h-12 rounded-2xl border border-bad/50 bg-bad/10 font-semibold text-bad"
        >
          Reset all data
        </button>
        <Link href="/about/" className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface font-semibold">
          About &amp; responsible play
        </Link>
      </Section>

      <BottomSheet open={!!pending} onClose={() => setPending(null)} title="Replace your data?">
        <p className="text-sm text-muted">
          This replaces everything on this device with the backup (bankroll {pending ? money(pending.data.bankroll.balance) : ''},{' '}
          {pending ? Object.values(pending.data.progress.lessons).filter((l) => l.passedOn).length : 0} lessons passed).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setPending(null)} className="min-h-12 rounded-2xl bg-surface-2 font-semibold">
            Cancel
          </button>
          <button
            onClick={() => {
              if (pending) replaceData(pending.data, pending.notice);
              setPending(null);
              setMessage('Backup restored.');
            }}
            className="min-h-12 rounded-2xl bg-gold font-bold text-black"
          >
            Replace
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className="text-sm text-muted">
          Bankroll, sessions, lessons, streaks and stats are erased from this device. Export a backup first if you might want them back.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setConfirmReset(false)} className="min-h-12 rounded-2xl bg-surface-2 font-semibold">
            Cancel
          </button>
          <button
            onClick={() => {
              clearAllData();
              const fresh = defaultData();
              fresh.settings.installTipDismissed = settings.installTipDismissed;
              replaceData(fresh);
              setConfirmReset(false);
              setMessage('All data reset.');
            }}
            className="min-h-12 rounded-2xl bg-bad font-bold text-black"
          >
            Erase everything
          </button>
        </div>
      </BottomSheet>
    </AppScreen>
  );
}
