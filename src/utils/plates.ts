// Plate breakdown for barbell lifts (proposal #55, prototype).
// Starting defaults, not settings yet: a 45 lb bar and a common US plate set.
export const DEFAULT_BAR = 45;
export const DEFAULT_PLATES = [45, 35, 25, 10, 5, 2.5];

export type PlateBreakdown =
  | { kind: 'bar-only'; bar: number }
  | { kind: 'plates'; bar: number; perSide: number[] }
  | { kind: 'below-bar'; bar: number }
  | { kind: 'not-loadable'; bar: number; below: number; above: number };

// Greedy, heaviest first: enough for the usual plate sets, where each plate is a multiple of the smallest.
function perSideFor(side: number, plates: number[]): number[] | null {
  const out: number[] = [];
  let left = Math.round(side * 100) / 100;
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (left >= p - 1e-9) {
      out.push(p);
      left = Math.round((left - p) * 100) / 100;
    }
  }
  return left < 1e-9 ? out : null;
}

export function plateBreakdown(total: number, bar = DEFAULT_BAR, plates = DEFAULT_PLATES): PlateBreakdown {
  if (total < bar) return { kind: 'below-bar', bar };
  if (Math.abs(total - bar) < 1e-9) return { kind: 'bar-only', bar };
  const perSide = perSideFor((total - bar) / 2, plates);
  if (perSide) return { kind: 'plates', bar, perSide };
  // The nearest loadable totals either side, in steps of twice the smallest plate
  const step = 2 * Math.min(...plates);
  const below = bar + Math.floor((total - bar) / step) * step;
  return { kind: 'not-loadable', bar, below, above: below + step };
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
