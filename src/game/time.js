export const HOUR_MS = 3600000;
export const DAY_MS = 24 * HOUR_MS;

// Local calendar day, e.g. "2026-11-25". Tries reset when this changes.
export function dayKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "2d 5h", "5h 12m", "9m"
export function fmtDuration(ms) {
  if (ms <= 0) return '0m';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
