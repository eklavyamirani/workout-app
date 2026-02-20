import { describe, it, expect } from 'vitest';
import { getGlossaryMatch } from '../exerciseReferences';

describe('getGlossaryMatch', () => {
  it('returns exact match for known exercise', () => {
    const match = getGlossaryMatch('plies', 'Pliés');
    expect(match).toBeTruthy();
    expect(match!.term).toBe('Plié');
  });

  it('returns longest substring match, not first', () => {
    const match = getGlossaryMatch('pas_de_bourree', 'Pas de bourrée');
    expect(match).toBeTruthy();
    expect(match!.term).toBe('Pas de bourrée');
  });

  it('returns null for unknown exercise', () => {
    const match = getGlossaryMatch('unknown_exercise_xyz', 'Unknown Exercise XYZ');
    expect(match).toBeNull();
  });

  it('matches by exercise ID when name not provided', () => {
    const match = getGlossaryMatch('plies');
    expect(match).toBeTruthy();
    expect(match!.term).toBe('Plié');
  });

  it('handles accented characters in exercise names', () => {
    const match = getGlossaryMatch('developpe_center', 'Développés');
    expect(match).toBeTruthy();
  });
});
