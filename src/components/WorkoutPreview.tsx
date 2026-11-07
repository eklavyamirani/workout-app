import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Activity, ActivityLog, ScheduledSession, SessionStatus } from '../types';
import { GZCLP_CONFIGS } from '../types';
import { formatSetWeight } from '../utils/weight';

interface WorkoutPreviewProps {
  scheduled: ScheduledSession;
  dateLabel: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  partial: 'Partial',
  skipped: 'Skipped',
};

function activityDetail(activity: Activity): string | null {
  const parts: string[] = [];
  if (activity.tier) {
    const config = GZCLP_CONFIGS[activity.tier];
    parts.push(`${activity.tier} · ${config.sets}×${config.reps}+`);
  }
  if (activity.startingWeight) parts.push(`start ${activity.startingWeight} lbs`);
  else if (activity.tier && activity.startingWeight === 0) parts.push('bodyweight');
  if (activity.targetDuration) parts.push(`${activity.targetDuration} min`);
  if (activity.section) parts.push(activity.section);
  if (!activity.tier && activity.muscleGroups?.length) parts.push(activity.muscleGroups.join(', '));
  return parts.length > 0 ? parts.join(' · ') : null;
}

// What was logged for one activity, shown once a session has started
function LoggedResult({ log }: { log: ActivityLog }) {
  return (
    <div className="mt-1 space-y-1">
      {log.sets && log.sets.length > 0 && (
        <ul className="text-sm text-gray-800">
          {log.sets.map(set => (
            <li key={set.id}>
              <span className="text-gray-400">Set {set.setNumber}</span>{' '}
              {formatSetWeight(set.weight)} × {set.reps} reps
            </li>
          ))}
        </ul>
      )}
      {(!log.sets || log.sets.length === 0) && log.completed && (
        <div className="flex items-center gap-1 text-sm text-green-700">
          <Check className="w-4 h-4" />
          Done{log.duration ? ` · ${log.duration} min` : ''}
        </div>
      )}
      {log.skipped && <div className="text-sm text-gray-500">Skipped</div>}
      {log.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{log.notes}</p>}
    </div>
  );
}

// Read-only view of a workout from the calendar: the plan before it starts (#18),
// and what was logged once it has started or finished
export function WorkoutPreview({ scheduled, dateLabel, onClose }: WorkoutPreviewProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const session = scheduled.session;

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
            {session && (
              <p className="text-sm text-gray-500">
                {STATUS_LABELS[session.status]}
                {session.duration ? ` · ${session.duration} min` : ''}
                {session.skipReason ? ` · ${session.skipReason}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Close preview" autoFocus>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <ol className="divide-y divide-gray-100">
            {scheduled.activities.map((activity, index) => {
              const detail = activityDetail(activity);
              const log = session?.activities.find(a => a.activityId === activity.id);
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
                    {log && <LoggedResult log={log} />}
                  </div>
                </li>
              );
            })}
            {scheduled.activities.length === 0 && (
              <li className="px-4 py-6 text-sm text-center text-gray-500">No activities in this workout.</li>
            )}
          </ol>

          {session?.notes && (
            <div className="px-4 py-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Session notes</h4>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}
          {session?.practiceNext && (
            <div className="px-4 py-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Practice next</h4>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{session.practiceNext}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
