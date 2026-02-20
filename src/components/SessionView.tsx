import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Check, Plus, Minus, BookOpen, Pencil, Video, X } from 'lucide-react';
import type { Program, Activity, Session, ActivityLog, SetLog, RoutineEntry, BalletSection } from '../types';
import { BalletGlossary } from './BalletGlossary';
import { RoutineBuilder } from './RoutineBuilder';
import { ExerciseReferencePopover } from './ExerciseReferencePopover';
import { getBaseExerciseId } from '../utils/exerciseId';
import { logger } from '../utils/logger';

interface SessionViewProps {
  program: Program;
  activities: Activity[];
  session: Session;
  lastPracticeNotes?: string;
  onUpdateSession: (session: Session) => void;
  onComplete: (session: Session) => void;
  onUpdateActivities?: (activities: Activity[]) => void;
  onCancel: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Convert Activity[] to RoutineEntry[] for the builder
function activitiesToRoutines(acts: Activity[]): RoutineEntry[] {
  return acts.map(a => ({
    id: a.id,
    name: a.name,
    section: a.section ?? (() => {
      logger.warn('Activity missing section, defaulting to barre', { activityId: a.id, name: a.name });
      return 'barre' as BalletSection;
    })(),
    notes: a.description || '',
    movements: a.movements || [],
    collapsed: false,
  }));
}

// Convert RoutineEntry[] back to Activity[], preserving existing fields
function routinesToActivities(routines: RoutineEntry[], existingActivities: Activity[], programId: string): Activity[] {
  return routines.map(r => {
    const existing = existingActivities.find(a => a.id === r.id);
    if (existing) {
      return {
        ...existing,
        name: r.name,
        description: r.notes || undefined,
        movements: r.movements,
        section: r.section,
      };
    }
    // New routine added during session editing
    return {
      id: r.id,
      name: r.name,
      programId,
      trackingType: 'completion' as const,
      description: r.notes || undefined,
      movements: r.movements,
      section: r.section,
    };
  });
}

export function SessionView({
  program,
  activities,
  session,
  lastPracticeNotes,
  onUpdateSession,
  onComplete,
  onUpdateActivities,
  onCancel,
}: SessionViewProps) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState(session.notes || '');
  const [practiceNext, setPracticeNext] = useState(session.practiceNext || '');
  const [showGlossary, setShowGlossary] = useState(false);
  const [dismissedCarryForward, setDismissedCarryForward] = useState(false);

  const isBallet = program.type === 'ballet';
  const [activityNotes, setActivityNotes] = useState<Record<string, string>>({});

  // For weightlifting
  const [currentWeight, setCurrentWeight] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);

  // In-session editing
  const [isEditing, setIsEditing] = useState(false);
  const [editRoutines, setEditRoutines] = useState<RoutineEntry[]>([]);

  useEffect(() => {
    if (!isEditing) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsEditing(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  // Exercise reference popover
  const [referenceTarget, setReferenceTarget] = useState<{ id: string; name: string } | null>(null);

  const currentActivity = activities[currentActivityIndex];
  const currentLog = session.activities.find(a => a.activityId === currentActivity?.id);

  useEffect(() => {
    let interval: number | undefined;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  function toggleTimer() {
    setIsTimerRunning(!isTimerRunning);
  }

  function markActivityComplete() {
    const updatedActivities = [...session.activities];
    const existingIndex = updatedActivities.findIndex(a => a.activityId === currentActivity.id);

    const activityNote = activityNotes[currentActivity.id] ?? currentLog?.notes;
    const log: ActivityLog = {
      activityId: currentActivity.id,
      trackingType: currentActivity.trackingType,
      ...(currentActivity.trackingType === 'completion' && isBallet
        ? {}
        : { duration: Math.floor(timerSeconds / 60) }),
      completed: true,
      ...(activityNote ? { notes: activityNote } : {}),
    };

    if (existingIndex >= 0) {
      updatedActivities[existingIndex] = log;
    } else {
      updatedActivities.push(log);
    }

    const updatedSession: Session = {
      ...session,
      activities: updatedActivities,
    };

    onUpdateSession(updatedSession);

    // Move to next activity or complete
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1);
      setTimerSeconds(0);
      setIsTimerRunning(false);
    }
  }

  function logSet() {
    if (currentWeight <= 0 || currentReps <= 0) return;

    const updatedActivities = [...session.activities];
    const existingIndex = updatedActivities.findIndex(a => a.activityId === currentActivity.id);

    const newSet: SetLog = {
      id: `set_${Date.now()}`,
      setNumber: (currentLog?.sets?.length || 0) + 1,
      weight: currentWeight,
      reps: currentReps,
      isWarmup: false,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      const existing = updatedActivities[existingIndex];
      updatedActivities[existingIndex] = {
        ...existing,
        sets: [...(existing.sets || []), newSet],
      };
    } else {
      updatedActivities.push({
        activityId: currentActivity.id,
        trackingType: 'sets-reps-weight',
        sets: [newSet],
      });
    }

    onUpdateSession({
      ...session,
      activities: updatedActivities,
    });
  }

  function handleFinish() {
    const completedSession: Session = {
      ...session,
      status: 'completed',
      endTime: new Date().toISOString(),
      duration: Math.floor((Date.now() - new Date(session.startTime!).getTime()) / 60000),
      notes: notes || undefined,
      practiceNext: practiceNext || undefined,
    };
    onComplete(completedSession);
  }

  function openEditMode() {
    setEditRoutines(activitiesToRoutines(activities));
    setIsEditing(true);
  }

  function handleSaveEdits() {
    if (onUpdateActivities) {
      const updated = routinesToActivities(editRoutines, activities, program.id);
      onUpdateActivities(updated);

      // If current activity was removed, reset to first
      const currentId = currentActivity?.id;
      if (currentId && !editRoutines.find(r => r.id === currentId)) {
        setCurrentActivityIndex(0);
      }
    }
    setIsEditing(false);
  }

  const allActivitiesComplete = activities.every(activity => {
    const log = session.activities.find(a => a.activityId === activity.id);
    if (activity.trackingType === 'sets-reps-weight') {
      return (log?.sets?.length || 0) > 0;
    }
    return log?.completed;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{program.name}</h1>
                <p className="text-sm text-gray-500">
                  {isBallet ? 'Routine' : 'Activity'} {currentActivityIndex + 1} of {activities.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isBallet && (
                <button
                  onClick={() => setShowGlossary(true)}
                  className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Movement glossary"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleFinish}
                disabled={!allActivitiesComplete}
                className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Carry-forward notes from last session */}
        {isBallet && lastPracticeNotes && !dismissedCarryForward && (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide mb-1">
                  From last class
                </h3>
                <p className="text-sm text-purple-700 whitespace-pre-wrap">{lastPracticeNotes}</p>
              </div>
              <button
                onClick={() => setDismissedCarryForward(true)}
                className="text-purple-400 hover:text-purple-600 text-lg leading-none p-1"
                aria-label="Dismiss last class note"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Activity Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {activities.map((activity, index) => {
            const log = session.activities.find(a => a.activityId === activity.id);
            const isComplete = activity.trackingType === 'sets-reps-weight'
              ? (log?.sets?.length || 0) > 0
              : log?.completed;

            return (
              <button
                key={activity.id}
                onClick={() => {
                  setCurrentActivityIndex(index);
                  setTimerSeconds(0);
                  setIsTimerRunning(false);
                }}
                className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  index === currentActivityIndex
                    ? isBallet ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
                    : isComplete
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {activity.name}
                {isComplete && ' ✓'}
              </button>
            );
          })}
        </div>

        {currentActivity && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Routine header with edit button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {currentActivity.name}
              </h2>
              {isBallet && onUpdateActivities && (
                <button
                  onClick={openEditMode}
                  className="p-2 text-gray-400 hover:text-purple-500 rounded-lg hover:bg-purple-50 transition-colors"
                  title="Edit routines"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Ballet routine tracking */}
            {currentActivity.trackingType === 'completion' && isBallet && (
              <div className="space-y-4">
                {/* Movements list with reference buttons */}
                {currentActivity.movements && currentActivity.movements.length > 0 && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide px-4 py-2 bg-purple-50 border-b border-purple-100">
                      Movements
                    </h3>
                    <div className="divide-y divide-gray-100">
                      {currentActivity.movements.map((mv, idx) => (
                        <div key={`${mv.id}-${idx}`} className="flex items-center gap-3 px-4 py-2">
                          <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{idx + 1}</span>
                          <span className="flex-1 text-sm text-gray-800">{mv.name}</span>
                          <button
                            onClick={() => setReferenceTarget({ id: getBaseExerciseId(mv.id), name: mv.name })}
                            className="p-1 text-gray-300 hover:text-purple-500 flex-shrink-0"
                            title="Reference"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Routine notes (from setup) */}
                {currentActivity.description && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                      Notes
                    </h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {currentActivity.description}
                    </p>
                  </div>
                )}

                {/* Per-session notes for this routine */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Session notes
                  </label>
                  <textarea
                    value={activityNotes[currentActivity.id] ?? currentLog?.notes ?? ''}
                    onChange={(e) => setActivityNotes(prev => ({ ...prev, [currentActivity.id]: e.target.value }))}
                    placeholder="How did it feel? Any corrections from the teacher?"
                    className="w-full p-3 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={2}
                  />
                </div>

                {currentLog?.completed ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-green-600">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Completed</span>
                  </div>
                ) : (
                  <button
                    onClick={markActivityComplete}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Mark as Done
                  </button>
                )}
              </div>
            )}

            {/* Duration-based tracking (timer) */}
            {(currentActivity.trackingType === 'duration' || (currentActivity.trackingType === 'completion' && !isBallet)) && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold text-gray-900 mb-4">
                    {formatDuration(timerSeconds)}
                  </div>
                  {currentActivity.targetDuration && (
                    <p className="text-sm text-gray-500">
                      Target: {currentActivity.targetDuration} min
                    </p>
                  )}
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={toggleTimer}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors ${
                      isTimerRunning
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-5 h-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        {timerSeconds > 0 ? 'Resume' : 'Start'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={markActivityComplete}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Sets/Reps/Weight tracking */}
            {currentActivity.trackingType === 'sets-reps-weight' && (
              <div className="space-y-6">
                {/* Logged sets */}
                {currentLog?.sets && currentLog.sets.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">Logged Sets</h3>
                    {currentLog.sets.map((set) => (
                      <div
                        key={set.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-500">Set {set.setNumber}</span>
                        <span className="font-medium">
                          {set.weight} lbs × {set.reps} reps
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input new set */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase">
                    Log Set {(currentLog?.sets?.length || 0) + 1}
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Weight (lbs)</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentWeight(Math.max(0, currentWeight - 5))}
                          className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={currentWeight}
                          onChange={(e) => setCurrentWeight(parseInt(e.target.value) || 0)}
                          className="flex-1 p-2 border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() => setCurrentWeight(currentWeight + 5)}
                          className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reps</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentReps(Math.max(0, currentReps - 1))}
                          className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={currentReps}
                          onChange={(e) => setCurrentReps(parseInt(e.target.value) || 0)}
                          className="flex-1 p-2 border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() => setCurrentReps(currentReps + 1)}
                          className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={logSet}
                    disabled={currentWeight <= 0 || currentReps <= 0}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    Log Set ({currentWeight} lbs × {currentReps} reps)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-500 uppercase mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go?"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none"
            rows={2}
          />
        </div>

        {/* Practice next week (ballet only) */}
        {isBallet && (
          <div className="mt-4 bg-white rounded-lg border border-purple-200 p-4">
            <label className="block text-sm font-semibold text-purple-600 uppercase mb-2">
              Practice next week
            </label>
            <textarea
              value={practiceNext}
              onChange={(e) => setPracticeNext(e.target.value)}
              placeholder="What do you want to work on next time? e.g. pas de bourrée transitions, spotting for turns..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
            />
          </div>
        )}
      </div>

      {showGlossary && <BalletGlossary onClose={() => setShowGlossary(false)} />}

      {/* Edit Routine Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setIsEditing(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="edit-routines-title" className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 id="edit-routines-title" className="text-lg font-semibold">Edit Routines</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdits}
                  className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <RoutineBuilder
                routines={editRoutines}
                onRoutinesChange={setEditRoutines}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Exercise Reference Popover */}
      {referenceTarget && (
        <ExerciseReferencePopover
          exerciseId={referenceTarget.id}
          exerciseName={referenceTarget.name}
          onClose={() => setReferenceTarget(null)}
        />
      )}
    </div>
  );
}
