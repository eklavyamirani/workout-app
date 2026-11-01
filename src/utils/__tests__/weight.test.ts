import { describe, it, expect } from 'vitest';
import { sanitizeWeightInput, parseWeight, formatWeight, formatSetWeight } from '../weight';

describe('formatSetWeight', () => {
  it('labels a zero weight as bodyweight', () => {
    expect(formatSetWeight(0)).toBe('Bodyweight');
    expect(formatSetWeight(22.5)).toBe('22.5 lbs');
  });
});

describe('sanitizeWeightInput', () => {
  it('accepts whole numbers, decimals and partial decimals', () => {
    expect(sanitizeWeightInput('135')).toBe('135');
    expect(sanitizeWeightInput('22.5')).toBe('22.5');
    expect(sanitizeWeightInput('22.')).toBe('22.');
    expect(sanitizeWeightInput('.5')).toBe('.5');
    expect(sanitizeWeightInput('')).toBe('');
  });

  it('accepts a comma as the decimal point', () => {
    expect(sanitizeWeightInput('22,5')).toBe('22.5');
  });

  it('rejects letters, signs and a second decimal point', () => {
    expect(sanitizeWeightInput('22.5.')).toBeNull();
    expect(sanitizeWeightInput('-5')).toBeNull();
    expect(sanitizeWeightInput('2e3')).toBeNull();
  });
});

describe('parseWeight / formatWeight', () => {
  it('parses partial input', () => {
    expect(parseWeight('22.')).toBe(22);
    expect(parseWeight('')).toBe(0);
    expect(parseWeight('.5')).toBe(0.5);
  });

  it('formats without float noise', () => {
    expect(formatWeight(0.1 + 0.2)).toBe('0.3');
    expect(formatWeight(17.5)).toBe('17.5');
    expect(formatWeight(135)).toBe('135');
  });
});
