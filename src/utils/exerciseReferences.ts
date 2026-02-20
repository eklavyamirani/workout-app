import { BALLET_GLOSSARY, DEFAULT_BALLET_EXERCISES, type GlossaryEntry } from '../types';

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrailingS(s: string): string {
  return s.endsWith('s') ? s.slice(0, -1) : s;
}

// Build a static lookup map: normalized exercise name -> GlossaryEntry
const glossaryMap = new Map<string, GlossaryEntry>();
for (const entry of BALLET_GLOSSARY) {
  const norm = normalize(entry.term);
  glossaryMap.set(norm, entry);
  const stripped = stripTrailingS(norm);
  if (!glossaryMap.has(stripped)) {
    glossaryMap.set(stripped, entry);
  }
}

// Also build by exercise ID -> exercise name for matching
const exerciseNameById = new Map<string, string>();
for (const ex of DEFAULT_BALLET_EXERCISES) {
  exerciseNameById.set(ex.id, ex.name);
}

export function getGlossaryMatch(exerciseId: string, exerciseName?: string): GlossaryEntry | null {
  const name = exerciseName || exerciseNameById.get(exerciseId) || '';
  if (!name) return null;

  const norm = normalize(name);

  // Direct match
  if (glossaryMap.has(norm)) return glossaryMap.get(norm)!;

  // Try without trailing 's'
  const singular = stripTrailingS(norm);
  if (glossaryMap.has(singular)) return glossaryMap.get(singular)!;

  // Try matching by ID (underscores to spaces)
  const fromId = normalize(exerciseId.replace(/_/g, ' '));
  if (glossaryMap.has(fromId)) return glossaryMap.get(fromId)!;
  const fromIdSingular = stripTrailingS(fromId);
  if (glossaryMap.has(fromIdSingular)) return glossaryMap.get(fromIdSingular)!;

  // Try first word match (e.g., "Pirouettes en dehors" -> "Pirouette")
  const firstWord = stripTrailingS(norm.split(' ')[0]);
  if (firstWord.length > 3 && glossaryMap.has(firstWord)) {
    return glossaryMap.get(firstWord)!;
  }

  // Substring match: find the longest (most specific) glossary entry contained in the exercise name
  let bestMatch: GlossaryEntry | null = null;
  let bestLength = 0;
  for (const [key, entry] of glossaryMap) {
    if (key.length > 3 && norm.includes(key) && key.length > bestLength) {
      bestMatch = entry;
      bestLength = key.length;
    }
  }
  if (bestMatch) return bestMatch;

  return null;
}
