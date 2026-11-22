import { describe, it, expect } from 'vitest';
import { plateBreakdown, formatPlates, isBarbell } from '../plates';

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

describe('isBarbell', () => {
  it('matches the equipment name', () => {
    expect(isBarbell('Barbell')).toBe(true);
    expect(isBarbell('Cable')).toBe(false);
    expect(isBarbell(undefined)).toBe(false);
  });
});
