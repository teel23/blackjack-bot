import AppScreen from '@/components/AppScreen';
import { RESPONSIBLE_LINE } from '@/components/Footer';

export const metadata = { title: 'About — Blackjack Bot' };

export default function AboutPage() {
  return (
    <AppScreen title="About" back="/">
      <section className="rounded-3xl felt p-5 text-white">
        <h2 className="text-xl font-bold">Blackjack Bot</h2>
        <p className="mt-2 text-white/85">{RESPONSIBLE_LINE}</p>
      </section>

      <section className="mt-6 flex flex-col gap-3 text-[15px] leading-relaxed text-muted">
        <h2 className="text-lg font-bold text-ink">What this is</h2>
        <p>
          A trainer for blackjack basic strategy: short daily lessons, drills, an interactive strategy chart and a practice table with a
          pretend bankroll. Everything is play money. There is nothing to buy, no real-money play, no casino links and no gambling ads.
        </p>
        <p>
          Basic strategy is the mathematically best way to play each hand against a given set of rules. It cuts the casino&apos;s edge to
          around half a percent at good tables — but it never removes it. Over time, real-money blackjack still loses money. This app is
          for understanding the game, not for beating it.
        </p>

        <h2 className="mt-2 text-lg font-bold text-ink">If gambling stops being fun</h2>
        <p>
          Free, confidential help is available 24/7 from the National Problem Gambling Helpline. You can call or text, and you don&apos;t
          need to be in crisis to reach out.
        </p>
        <a
          href="tel:18004262537"
          className="flex min-h-12 items-center justify-center rounded-2xl bg-gold px-4 text-lg font-bold text-black"
        >
          Call 1-800-GAMBLER
        </a>
        <a
          href="sms:18004262537"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface px-4 font-semibold text-ink"
        >
          Text 1-800-GAMBLER
        </a>
        <a
          href="https://www.ncpgambling.org/help-treatment/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface px-4 font-semibold text-ink"
        >
          National Council on Problem Gambling ↗
        </a>

        <h2 className="mt-2 text-lg font-bold text-ink">Your data</h2>
        <p>
          Everything — bankroll, lessons, streaks, stats — is saved only on this device. No account, no tracking, no analytics. Use{' '}
          <strong className="text-ink">Settings → Export backup</strong> to keep a copy, especially before clearing Safari data.
        </p>

        <h2 className="mt-2 text-lg font-bold text-ink">Credits</h2>
        <p>
          Built by C2T Builds. Card art, lessons and coaching text are original. Strategy charts are generated from your table rules and
          checked against published basic strategy and an independent expected-value calculation.
        </p>
      </section>
    </AppScreen>
  );
}
