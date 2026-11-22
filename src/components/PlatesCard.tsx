import { useState } from 'react';
import { describePlateSettings } from '../utils/plates';
import { usePlateSettings } from './usePlateSettings';
import { PlateSettingsDialog } from './PlateSettingsDialog';

// The app-wide bar and plates setting on the Programs page (prototype round 2 for #55).
export function PlatesCard() {
  const settings = usePlateSettings();
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-4 mt-4 p-3 flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">Bar and plates</div>
        <div data-testid="plate-settings-summary" className="text-sm text-gray-500 truncate">{describePlateSettings(settings)}</div>
      </div>
      <button onClick={() => setOpen(true)} className="flex-shrink-0 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">Edit</button>
      {open && <PlateSettingsDialog settings={settings} onClose={() => setOpen(false)} />}
    </div>
  );
}
