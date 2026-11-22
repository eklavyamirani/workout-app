import { useState } from 'react';
import { X } from 'lucide-react';
import { COMMON_PLATES, normalizePlateSettings, type PlateSettings } from '../utils/plates';
import { savePlateSettings } from '../storage/plateSettings';

// Prototype round 2 for #55: one app-wide setting for the bar and the plate sizes the lifter has.
// Opened from the plate line in a workout and from the Programs page.
export function PlateSettingsDialog({ settings, onClose }: { settings: PlateSettings; onClose: () => void }) {
  const [barText, setBarText] = useState(String(settings.bar));
  const [plates, setPlates] = useState<number[]>(settings.plates);
  const [customText, setCustomText] = useState('');
  const sizes = [...new Set([...COMMON_PLATES, ...plates])].sort((a, b) => b - a);
  const toggle = (p: number) => setPlates((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const bar = Number(barText);
  const valid = barText.trim() !== '' && Number.isFinite(bar) && bar >= 0 && bar <= 200 && plates.length > 0;

  const addCustom = () => {
    const p = Number(customText);
    if (Number.isFinite(p) && p > 0 && p <= 200 && !plates.includes(p)) setPlates([...plates, p]);
    setCustomText('');
  };
  const save = async () => {
    if (!valid) return;
    await savePlateSettings(normalizePlateSettings({ bar, plates }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div role="dialog" aria-modal="true" aria-labelledby="plate-settings-title" className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="plate-settings-title" className="text-lg font-semibold text-gray-900">Your bar and plates</h2>
          <button onClick={onClose} aria-label="Close bar and plates" className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500">Used for the plates line on every barbell lift, on all your devices. Weights in lbs.</p>

        <div>
          <label htmlFor="bar-weight" className="block text-sm text-gray-600 mb-1">Bar (lbs)</label>
          <input id="bar-weight" type="text" inputMode="decimal" value={barText}
            onChange={(e) => setBarText(e.target.value.replace(/[^0-9.]/g, ''))}
            onFocus={(e) => e.target.select()}
            className="w-28 p-2 border border-gray-300 rounded text-center" />
        </div>

        <fieldset>
          <legend className="block text-sm text-gray-600 mb-2">Plates you have (lbs)</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((p) => (
              <button key={p} type="button" onClick={() => toggle(p)} aria-pressed={plates.includes(p)}
                aria-label={`${p} lb plates`}
                className={`px-3 py-2 rounded-full border text-sm ${plates.includes(p) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-500 line-through'}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="text" inputMode="decimal" value={customText} placeholder="Other size"
              aria-label="Other plate size"
              onChange={(e) => setCustomText(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-28 p-2 border border-gray-300 rounded text-center text-sm" />
            <button type="button" onClick={addCustom} className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800">Add</button>
          </div>
        </fieldset>

        {!plates.length && <p className="text-sm text-red-600">Pick at least one plate size.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={!valid} className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}
