import { useEffect, useState } from 'react';
import { DEFAULT_PLATE_SETTINGS, type PlateSettings } from '../utils/plates';
import { getPlateSettings, PLATE_SETTINGS_EVENT } from '../storage/plateSettings';

// The current bar and plate setting; follows edits here and changes pulled from another device.
export function usePlateSettings(): PlateSettings {
  const [settings, setSettings] = useState<PlateSettings>(DEFAULT_PLATE_SETTINGS);
  useEffect(() => {
    let live = true;
    const load = () => { getPlateSettings().then((s) => { if (live) setSettings(s); }); };
    load();
    window.addEventListener(PLATE_SETTINGS_EVENT, load);
    window.addEventListener('sync:updated', load);
    return () => {
      live = false;
      window.removeEventListener(PLATE_SETTINGS_EVENT, load);
      window.removeEventListener('sync:updated', load);
    };
  }, []);
  return settings;
}
