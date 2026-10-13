import { upcardLabel } from '../engine/cards';
import type { Action } from '../engine/round';
import type { Code, Situation } from './chart';
import { primaryAction } from './chart';

function upName(up: number): string {
  return up === 11 ? 'an ace' : up === 8 ? 'an 8' : `a ${up}`;
}

const weak = (up: number) => up >= 2 && up <= 6;

/** One-line, plain-English reason for the basic-strategy play. Written for the coach banner. */
export function reasonFor(s: Pick<Situation, 'kind' | 'row' | 'up'>, action: Action, code: Code): string {
  const up = s.up;
  const U = upcardLabel(up);
  const fellBack = primaryAction(code) !== action;

  if (fellBack && primaryAction(code) === 'double') {
    return `The chart says double here, but you can't now — so ${action === 'hit' ? 'hit' : 'stand'} instead.`;
  }
  if (fellBack && primaryAction(code) === 'surrender') {
    return `Surrender is the best play when it's offered; since it isn't, ${action === 'hit' ? 'hit' : action === 'split' ? 'split' : 'stand'}.`;
  }

  if (action === 'surrender') {
    if (s.kind === 'pair' && s.row === 8) return `8,8 against ${upName(up)} loses more than half the time even split — take half back.`;
    return `${s.kind === 'pair' ? s.row * 2 : s.row} vs ${upName(up)} loses well over half the time — surrender and keep half your bet.`;
  }

  if (s.kind === 'pair') {
    const p = s.row === 11 ? 'A' : String(s.row);
    if (action === 'split') {
      if (s.row === 11) return 'Two aces: split them and start two hands with an ace each.';
      if (s.row === 8) return '16 is the worst hand in blackjack — split 8s into two fresh starts.';
      if (s.row === 9) return `Two hands of 9 beat one 18 against ${upName(up)} — split.`;
      if (weak(up)) return `Dealer ${U} is likely to bust — split ${p}s to get more money on the table.`;
      return `Splitting ${p}s here makes two hands that do better than one ${s.row * 2}.`;
    }
    if (s.row === 10) return '20 wins most of the time — never break up two tens.';
    if (s.row === 5) return action === 'double' ? 'Treat 5,5 as a hard 10: double, don\'t split.' : 'Treat 5,5 as a hard 10, never as two 5s.';
    if (s.row === 9 && action === 'stand') {
      return up === 7 ? 'Your 18 already beats the 17 a dealer 7 usually makes — stand.' : `18 is the right place to stop against ${upName(up)} — stand.`;
    }
    if (s.row === 11) return 'With no peek, splitting aces into an ace risks two bets against a blackjack — just hit.';
    if (s.row === 8) return 'With no peek, splitting 8s into a 10 or ace risks two bets — hit instead.';
    return `Splitting ${p}s into a strong ${U} just makes two weak hands — play it as ${s.row * 2} and ${action}.`;
  }

  if (s.kind === 'soft') {
    const t = s.row;
    if (action === 'double') return `Soft ${t} can't bust on one card, and dealer ${U} is weak — double.`;
    if (action === 'stand') {
      if (t >= 19) return `Soft ${t} is a strong hand — stand.`;
      return `Soft 18 already matches what ${upName(up)} usually makes — stand.`;
    }
    if (t === 18) return `Soft 18 is an underdog to ${upName(up)} — hit; one card can't bust you.`;
    return `Soft ${t} can't bust on one card — hit and improve it.`;
  }

  const t = s.row;
  if (action === 'double') return `${t} against ${upName(up)}: you're the favorite — double the bet.`;
  if (action === 'hit') {
    if (t <= 8) return `Nothing can bust ${t} — always take a card.`;
    if (t <= 11) return `${t} can't bust — hit and hope for a 10.`;
    if (t === 12 && (up === 2 || up === 3)) return `Only a 10 busts 12, and ${upName(up)} isn't weak enough to stand on — hit.`;
    return `Dealer ${U} usually finishes 17 or better — ${t} needs help, so hit.`;
  }
  // stand
  if (t >= 17) return `${t} is strong enough — hitting busts too often.`;
  return `Dealer ${U} is weak — stand and let them take the bust risk.`;
}

export const INSURANCE_REASON =
  'Insurance is a side bet that loses money over time unless you\'re counting cards — skip it.';
export function evenMoneyReason(payout: '3:2' | '6:5'): string {
  return `Even money is just insurance on your blackjack — keeping the full ${payout} payout is worth more on average.`;
}
