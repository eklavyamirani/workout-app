import { describe, it, expect } from 'vitest';
import { plateBreakdown, formatPlates, isBarbell, normalizePlateSettings, describePlateSettings, DEFAULT_PLATE_SETTINGS } from '../plates';

describe('plateBreakdown', () => {
  it('splits the load over the bar per side, heaviest first', () => {
    expect(formatPlates(plateBreakdown(185))).toBe('Bar 45 + 45, 25 per side');
    expect(formatPlates(plateBreakdown(155))).toBe('Bar 45 + 45, 10 per side');
    expect(formatPlates(plateBreakdown(140))).toBe('Bar 45 + 45, 2.5 per side');
    expect(formatPlates(plateBreakdown(315))).toBe('Bar 45 + 45, 45, 45 per side');
  });

  it('handles the bar alone and loads below the bar', () => {
    expect(formatPlates(plateBreakdown(45))).toBe('Just the bar (45)');
    expect(formatPlates(plateBreakdown(30))).toBe('Less than the 45 lb bar');
  });

  it('names the nearest loadable weights when the plates cannot make it', () => {
    expect(plateBreakdown(137)).toEqual({ kind: 'not-loadable', bar: 45, below: 135, above: 140 });
    expect(formatPlates(plateBreakdown(137))).toBe("Can't load with these plates: try 135 or 140");
  });

  it('takes another bar and plate set', () => {
    expect(formatPlates(plateBreakdown(60, 20, [20, 10, 5, 2.5, 1.25]))).toBe('Bar 20 + 20 per side');
  });
});

describe('plateBreakdown with a custom bar and plate set (round 2: the app-wide setting)', () => {
  // A home gym: a 35 lb bar, no 35s and no 2.5s
  const home = { bar: 35, plates: [45, 25, 10, 5] };
  const fmt = (t: number) => formatPlates(plateBreakdown(t, home.bar, home.plates));

  it('loads from the custom bar with only the plates there are', () => {
    expect(fmt(155)).toBe('Bar 35 + 45, 10, 5 per side');
    expect(fmt(185)).toBe('Bar 35 + 45, 25, 5 per side');
    expect(fmt(35)).toBe('Just the bar (35)');
    expect(fmt(30)).toBe('Less than the 35 lb bar');
  });

  it('says a weight needing a missing plate cannot be loaded, with the nearest weights either side', () => {
    // 140 would need 2.5s on a 35 lb bar: 52.5 a side
    expect(plateBreakdown(140, home.bar, home.plates)).toEqual({ kind: 'not-loadable', bar: 35, below: 135, above: 145 });
  });

  it('finds a loading greedy would miss', () => {
    // 25s and 10s: 30 a side is 10+10+10 (a 25 first leaves 5)
    expect(formatPlates(plateBreakdown(105, 45, [25, 10]))).toBe('Bar 45 + 10, 10, 10 per side');
  });

  it('steps by two of the smallest plate when it names the nearest weights', () => {
    // 25s and 10s: 55 would need 5s; the nearest are the bar and 65
    expect(plateBreakdown(58, 45, [25, 10])).toEqual({ kind: 'not-loadable', bar: 45, below: 45, above: 65 });
  });

  it('works in fractional plates', () => {
    expect(formatPlates(plateBreakdown(47.5, 45, [45, 1.25]))).toBe('Bar 45 + 1.25 per side');
  });
});

describe('normalizePlateSettings', () => {
  it('falls back to the defaults for missing or broken settings', () => {
    expect(normalizePlateSettings(null)).toEqual(DEFAULT_PLATE_SETTINGS);
    expect(normalizePlateSettings({ bar: 'x', plates: 'y' })).toEqual(DEFAULT_PLATE_SETTINGS);
    expect(normalizePlateSettings({ bar: 35, plates: [] })).toEqual({ bar: 35, plates: DEFAULT_PLATE_SETTINGS.plates });
  });

  it('sorts heaviest first, drops duplicates and nonsense sizes', () => {
    expect(normalizePlateSettings({ bar: 20, plates: [5, 25, 5, -1, 0, 'x', 10, 999] })).toEqual({ bar: 20, plates: [25, 10, 5] });
  });

  it('describes the setting in one line', () => {
    expect(describePlateSettings({ bar: 35, plates: [45, 25, 10, 5] })).toBe('35 lb bar · plates 45, 25, 10, 5');
  });
});

describe('isBarbell', () => {
  it('matches the equipment name', () => {
    expect(isBarbell('Barbell')).toBe(true);
    expect(isBarbell('Cable')).toBe(false);
    expect(isBarbell(undefined)).toBe(false);
  });
});
