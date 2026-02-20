import { describe, it, expect } from 'vitest';
import { getBaseExerciseId } from '../exerciseId';

describe('getBaseExerciseId', () => {
  it('strips timestamp+random suffix from simple ID', () => {
    expect(getBaseExerciseId('plies_1740012345678_a1b2c3')).toBe('plies');
  });

  it('strips suffix from multi-underscore ID', () => {
    expect(getBaseExerciseId('rond_de_jambe_1740012345678_a1b2c3')).toBe('rond_de_jambe');
  });

  it('returns ID unchanged if no suffix present', () => {
    expect(getBaseExerciseId('rond_de_jambe')).toBe('rond_de_jambe');
  });

  it('handles IDs with en_lair suffix', () => {
    expect(getBaseExerciseId('rond_de_jambe_en_lair_1740012345678_abc123')).toBe('rond_de_jambe_en_lair');
  });

  it('handles simple single-word IDs', () => {
    expect(getBaseExerciseId('plies_1740012345678_x9y8z7')).toBe('plies');
  });
});
