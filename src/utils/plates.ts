// Plate breakdown for barbell lifts (proposal #55, prototype round 2).
// The bar and the plate sizes come from one app-wide setting (settings:plates, synced like any other key);
// these are its defaults: a 45 lb bar and a common US plate set, in lbs (the app's only unit).
export const DEFAULT_BAR = 45;
export const DEFAULT_PLATES = [45, 35, 25, 10, 5, 2.5];

// Sizes offered in the settings dialog; any other size can be typed in.
export const COMMON_PLATES = [55, 45, 35, 25, 15, 10, 5, 2.5, 1.25];

export interface PlateSettings {
  bar: number;      // lbs
  plates: number[]; // sizes in lbs; as many pairs of each as needed (counts are not modelled in this round)
}

export const DEFAULT_PLATE_SETTINGS: PlateSettings = { bar: DEFAULT_BAR, plates: DEFAULT_PLATES };

const round2 = (x: number) => Math.round(x * 100) / 100;

// Whatever is stored (or synced from another device) becomes a usable setting, or the defaults.
export function normalizePlateSettings(raw: unknown): PlateSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { bar?: unknown; plates?: unknown };
  const bar = typeof r.bar === 'number' && Number.isFinite(r.bar) && r.bar >= 0 && r.bar <= 200 ? round2(r.bar) : DEFAULT_BAR;
  const plates = Array.isArray(r.plates)
    ? [...new Set(r.plates.filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0 && p <= 200).map(round2))].sort((a, b) => b - a)
    : [];
  return { bar, plates: plates.length ? plates : DEFAULT_PLATES };
}

export function describePlateSettings(s: PlateSettings): string {
  return `${round2(s.bar)} lb bar · plates ${s.plates.map(round2).join(', ')}`;
}

export type PlateBreakdown =
  | { kind: 'bar-only'; bar: number }
  | { kind: 'plates'; bar: number; perSide: number[] }
  | { kind: 'below-bar'; bar: number }
  | { kind: 'not-loadable'; bar: number; below: number; above: number };

// Fewest plates per side that make exactly `side` (as many of each size as needed), heaviest first on ties.
// Exact, not greedy: with a chosen set like 25s and 10s, 30 a side is 10+10+10, which greedy misses.
function perSideFor(side: number, plates: number[]): number[] | null {
  const target = Math.round(side * 100); // hundredths of a pound, so 1.25 and 2.5 are whole numbers
  if (target < 0 || target > 100000) return null;
  const sizes = [...new Set(plates.map((p) => Math.round(p * 100)).filter((p) => p > 0))].sort((a, b) => b - a);
  const count = new Array<number>(target + 1).fill(Infinity);
  const last = new Array<number>(target + 1).fill(0);
  count[0] = 0;
  for (let v = 1; v <= target; v++) {
    for (const p of sizes) {
      if (p <= v && count[v - p] + 1 < count[v]) { count[v] = count[v - p] + 1; last[v] = p; }
    }
  }
  if (!Number.isFinite(count[target])) return null;
  const out: number[] = [];
  for (let v = target; v > 0; v -= last[v]) out.push(last[v] / 100);
  return out.sort((a, b) => b - a);
}

export function plateBreakdown(total: number, bar = DEFAULT_BAR, plates: number[] = DEFAULT_PLATES): PlateBreakdown {
  if (total < bar) return { kind: 'below-bar', bar };
  if (Math.abs(total - bar) < 1e-9) return { kind: 'bar-only', bar };
  const perSide = perSideFor((total - bar) / 2, plates);
  if (perSide) return { kind: 'plates', bar, perSide };
  // The nearest loadable totals either side, in steps of twice the smallest plate
  // The nearest loadable totals either side, in steps of twice the smallest plate (always loadable: a
  // multiple of the smallest plate per side can be made from that plate alone)
  const step = 2 * Math.min(...plates);
  const below = round2(bar + Math.floor(round2((total - bar) / step)) * step);
  return { kind: 'not-loadable', bar, below, above: round2(below + step) };
}

// "bar 45 + 45, 25 per side"; the caller shows it next to the total
export function formatPlates(b: PlateBreakdown): string {
  const n = (x: number) => String(Math.round(x * 100) / 100);
  switch (b.kind) {
    case 'bar-only': return `Just the bar (${n(b.bar)})`;
    case 'below-bar': return `Less than the ${n(b.bar)} lb bar`;
    case 'plates': return `Bar ${n(b.bar)} + ${b.perSide.map(n).join(', ')} per side`;
    case 'not-loadable': return `Can't load with these plates: try ${n(b.below)} or ${n(b.above)}`;
  }
}

export function isBarbell(equipment?: string): boolean {
  return (equipment || '').toLowerCase() === 'barbell';
}
