/** Local calendar date as YYYY-MM-DD (the player's day, not UTC). */
export function localDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toUTC(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from a to b (b − a). DST-safe. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

export function addDays(date: string, n: number): string {
  const t = new Date(toUTC(date) + n * 86_400_000);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export function money(n: number, signed = false): string {
  const abs = Math.abs(n);
  const s = abs % 1 === 0 ? abs.toLocaleString('en-US') : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (signed) return `${n > 0 ? '+' : n < 0 ? '−' : ''}$${s}`;
  return `${n < 0 ? '−' : ''}$${s}`;
}
