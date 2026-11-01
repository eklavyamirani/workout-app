import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Activity, ScheduledSession } from '../types';
import { GZCLP_CONFIGS } from '../types';

interface WorkoutPreviewProps {
  scheduled: ScheduledSession;
  dateLabel: string;
  onClose: () => void;
}

function activityDetail(activity: Activity): string | null {
  const parts: string[] = [];
  if (activity.tier) {
    const config = GZCLP_CONFIGS[activity.tier];
    parts.push(`${activity.tier} · ${config.sets}×${config.reps}+`);
  }
  if (activity.startingWeight) parts.push(`start ${activity.startingWeight} lbs`);
  if (activity.targetDuration) parts.push(`${activity.targetDuration} min`);
  if (activity.section) parts.push(activity.section);
  if (!activity.tier && activity.muscleGroups?.length) parts.push(activity.muscleGroups.join(', '));
  return parts.length > 0 ? parts.join(' · ') : null;
}

// Read-only list of a scheduled workout's activities, opened from the calendar (#18)
export function WorkoutPreview({ scheduled, dateLabel, onClose }: WorkoutPreviewProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="workout-preview-title" className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-2 p-4 border-b border-gray-200">
          <div className="min-w-0">
            <h3 id="workout-preview-title" className="text-lg font-semibold text-gray-900">{scheduled.programName}</h3>
            <p className="text-sm text-gray-500">
              {dateLabel}
              {scheduled.workoutDayName && <span> · {scheduled.workoutDayName}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Close preview" autoFocus>
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {scheduled.activities.map((activity, index) => {
            const detail = activityDetail(activity);
            return (
              <li key={activity.id} className="flex gap-3 px-4 py-3">
                <span className="text-sm text-gray-400 w-5 text-right flex-shrink-0">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{activity.name}</div>
                  {detail && <div className="text-xs text-gray-500">{detail}</div>}
                  {activity.movements && activity.movements.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {activity.movements.map(m => m.name).join(' · ')}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {scheduled.activities.length === 0 && (
            <li className="px-4 py-6 text-sm text-center text-gray-500">No activities in this workout.</li>
          )}
        </ol>
      </div>
    </div>
  );
}
