// The app-wide bar and plate setting (proposal #55, prototype round 2). One key, `settings:plates`, stored
// and synced through the same adapter as programs and sessions; the server stores any key, so no API change.
import { storage } from './adapter';
import { normalizePlateSettings, type PlateSettings } from '../utils/plates';

export const PLATE_SETTINGS_KEY = 'settings:plates';
export const PLATE_SETTINGS_EVENT = 'plates:changed';

export async function getPlateSettings(): Promise<PlateSettings> {
  return normalizePlateSettings(await storage.get(PLATE_SETTINGS_KEY));
}

export async function savePlateSettings(s: PlateSettings): Promise<PlateSettings> {
  const clean = normalizePlateSettings(s);
  await storage.set(PLATE_SETTINGS_KEY, { ...clean, updatedAt: new Date().toISOString() });
  window.dispatchEvent(new CustomEvent(PLATE_SETTINGS_EVENT));
  return clean;
}
