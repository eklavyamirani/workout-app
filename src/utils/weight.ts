// Weights are typed as text so partial decimals like "22." survive editing (#17).
// Returns the normalized text (comma accepted as decimal point), or null to reject the keystroke.
export function sanitizeWeightInput(text: string): string | null {
  const normalized = text.replace(',', '.');
  return /^\d*\.?\d*$/.test(normalized) ? normalized : null;
}

export function parseWeight(text: string): number {
  return parseFloat(text) || 0;
}

// Drops float noise from +/- steps, e.g. 22.5 - 5 → "17.5"
export function formatWeight(weight: number): string {
  return String(Math.round(weight * 100) / 100);
}

// A logged set's load: 0 means a bodyweight set, e.g. calf raises
export function formatSetWeight(weight: number): string {
  return weight > 0 ? `${formatWeight(weight)} lbs` : 'Bodyweight';
}
