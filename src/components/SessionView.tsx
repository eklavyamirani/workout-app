import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Check, Plus, Minus, BookOpen, Pencil, Video, X, Trash2 } from 'lucide-react';
import type { Program, Activity, Session, ActivityLog, SetLog, RoutineEntry, BalletSection } from '../types';
import { GZCLP_CONFIGS } from '../types';
import { BalletGlossary } from './BalletGlossary';
import { RoutineBuilder } from './RoutineBuilder';
import { ExerciseReferencePopover } from './ExerciseReferencePopover';
import { getBaseExerciseId } from '../utils/exerciseId';
import { sanitizeWeightInput, parseWeight, formatWeight, formatSetWeight } from '../utils/weight';
import {
  RIR_CHOICES, restSeconds, rirToRpe, rpeToRir, withSetRoles, nextIsAmrap, asksEffort, missedTarget,
  formatRest, setDetails, setLabels,
} from '../utils/sets';
import { logger } from '../utils/logger';

interface SessionViewProps {
  program: Program;
  activities: Activity[];
  session: Session;
  lastPracticeNotes?: string;
  // Sets from each activity's most recent earlier session, keyed by activity id
  previousSets?: Record<string, SetLog[]>;
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
  previousSets,
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
  // Per-activity note drafts, keyed by activity id; saved into ActivityLog.notes (#34)
  const [activityNotes, setActivityNotes] = useState<Record<string, string>>({});

  // Notes are saved while typing (#33). sessionRef holds the latest saved session so a
  // delayed notes save never overwrites a set logged in the meantime.
  const sessionRef = useRef(session);
  const notesPending = useRef(false);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // For weightlifting
  const [weightText, setWeightText] = useState('0');
  // Last deleted set, for the undo bar; cleared on the next set or exercise switch
  const [deletedSet, setDeletedSet] = useState<{ activityId: string; set: SetLog; index: number } | null>(null);
  const currentWeight = parseWeight(weightText);
  const [currentReps, setCurrentReps] = useState(0);
  // Stays on for the exercise's run of warm-ups; off again on another exercise
  const [isWarmup, setIsWarmup] = useState(false);
  // Ticks the rest clock shown since the exercise's last set
  const [now, setNow] = useState(() => Date.now());
  // Finish asks for the session's effort before completing it
  const [askingEffort, setAskingEffort] = useState(false);

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

  useEffect(() => {
    if (!askingEffort) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAskingEffort(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [askingEffort]);

  // Exercise reference popover
  const [referenceTarget, setReferenceTarget] = useState<{ id: string; name: string } | null>(null);

  const currentActivity = activities[currentActivityIndex];
  const currentLog = session.activities.find(a => a.activityId === currentActivity?.id);

  // Opening an exercise fills weight and reps from its own last set: this session's,
  // else its previous session's, else the starting weight and tier reps. Never from
  // the exercise shown before.
  useEffect(() => {
    if (!currentActivity || currentActivity.trackingType !== 'sets-reps-weight') return;
    const loggedNow = sessionRef.current.activities.find(a => a.activityId === currentActivity.id)?.sets;
    const source = loggedNow?.length ? loggedNow : previousSets?.[currentActivity.id];
    const last = source?.[source.length - 1];
    setWeightText(formatWeight(last?.weight ?? currentActivity.startingWeight ?? 0));
    setCurrentReps(last?.reps ?? (currentActivity.tier ? GZCLP_CONFIGS[currentActivity.tier].reps : 0));
    setIsWarmup(false);
  }, [currentActivity?.id]);

  const lastSet = currentLog?.sets?.[currentLog.sets.length - 1];
  const restNow = restSeconds(lastSet, new Date(now));
  const loggedLabels = setLabels(currentLog?.sets || []);

  useEffect(() => {
    if (!lastSet) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lastSet?.id]);

  // Fold the note drafts into a session, so every save carries them
  function withNotes(base: Session): Session {
    const logs = [...base.activities];
    for (const [activityId, text] of Object.entries(activityNotes)) {
      const index = logs.findIndex(a => a.activityId === activityId);
      if (index >= 0) {
        logs[index] = { ...logs[index], notes: text || undefined };
      } else if (text) {
        const activity = activities.find(a => a.id === activityId);
        if (activity) logs.push({ activityId, trackingType: activity.trackingType, notes: text });
      }
    }
    return { ...base, activities: logs, notes: notes || undefined };
  }

  function saveSession(updated: Session) {
    const merged = withNotes(updated);
    sessionRef.current = merged;
    notesPending.current = false;
    onUpdateSession(merged);
  }

  function flushNotes() {
    if (notesPending.current) saveSession(sessionRef.current);
  }

  useEffect(() => {
    if (!notesPending.current) return;
    const timer = window.setTimeout(flushNotes, 600);
    return () => clearTimeout(timer);
  }, [notes, activityNotes]);

  function editSessionNotes(text: string) {
    notesPending.current = true;
    setNotes(text);
  }

  function editActivityNotes(activityId: string, text: string) {
    notesPending.current = true;
    setActivityNotes(prev => ({ ...prev, [activityId]: text }));
  }

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

    saveSession({
      ...session,
      activities: updatedActivities,
    });

    // Move to next activity or complete
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1);
      setTimerSeconds(0);
      setIsTimerRunning(false);
    }
  }

  // Replace the current activity's sets, numbering them 1..n and marking the AMRAP set
  function saveSets(sets: SetLog[]) {
    const numbered = withSetRoles(sets, currentActivity.tier);
    saveSession({
      ...session,
      activities: session.activities.map(a =>
        a.activityId === currentActivity.id ? { ...a, sets: numbered } : a
      ),
    });
  }

  // Reps in reserve for a logged set, stored as RPE; tapping the chosen value clears it
  function rateSet(setId: string, rir: number) {
    const sets = currentLog?.sets || [];
    saveSets(sets.map(s => {
      if (s.id !== setId) return s;
      const rpe = rirToRpe(rir);
      return { ...s, rpe: s.rpe === rpe ? undefined : rpe };
    }));
  }

  // Removes a wrongly logged set; the undo bar can put it back (#36)
  function deleteSet(setId: string) {
    const sets = currentLog?.sets || [];
    const index = sets.findIndex(s => s.id === setId);
    if (index < 0) return;
    saveSets(sets.filter(s => s.id !== setId));
    setDeletedSet({ activityId: currentActivity.id, set: sets[index], index });
  }

  function undoDeleteSet() {
    if (!deletedSet || deletedSet.activityId !== currentActivity.id) return;
    const sets = [...(currentLog?.sets || [])];
    sets.splice(deletedSet.index, 0, deletedSet.set);
    saveSets(sets);
    setDeletedSet(null);
  }

  function logSet() {
    // Weight 0 is a bodyweight set; only reps are required
    if (currentReps <= 0) return;
    setDeletedSet(null);

    const updatedActivities = [...session.activities];
    const existingIndex = updatedActivities.findIndex(a => a.activityId === currentActivity.id);

    const loggedAt = new Date();
    const rest = restSeconds(lastSet, loggedAt);
    const tier = currentActivity.tier;
    const newSet: SetLog = {
      id: `set_${loggedAt.getTime()}`,
      setNumber: (currentLog?.sets?.length || 0) + 1,
      weight: currentWeight,
      reps: currentReps,
      isWarmup,
      ...(tier && !isWarmup ? { targetReps: GZCLP_CONFIGS[tier].reps } : {}),
      ...(rest !== undefined ? { restDuration: rest } : {}),
      timestamp: loggedAt.toISOString(),
    };

    if (existingIndex >= 0) {
      const existing = updatedActivities[existingIndex];
      updatedActivities[existingIndex] = {
        ...existing,
        sets: withSetRoles([...(existing.sets || []), newSet], tier),
      };
    } else {
      updatedActivities.push({
        activityId: currentActivity.id,
        trackingType: 'sets-reps-weight',
        sets: withSetRoles([newSet], tier),
      });
    }

    saveSession({
      ...session,
      activities: updatedActivities,
    });
  }

  // effort is the 1-10 rating from the Finish dialog; undefined when skipped
  function handleFinish(effort?: number) {
    notesPending.current = false;
    setAskingEffort(false);
    const completedSession: Session = {
      ...withNotes(session),
      status: 'completed',
      endTime: new Date().toISOString(),
      duration: Math.floor((Date.now() - new Date(session.startTime!).getTime()) / 60000),
      effort,
      practiceNext: practiceNext || undefined,
    };
    onComplete(completedSession);
  }

  function handleBack() {
    flushNotes();
    onCancel();
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
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Back">
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
                onClick={() => setAskingEffort(true)}
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
                  setDeletedSet(null);
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
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
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
                    {currentLog.sets.map((set, index) => {
                      const label = loggedLabels[index];
                      // Reps left is asked on the newest set only, as buttons
                      const rating = set.id === lastSet?.id && asksEffort(set, currentActivity.tier);
                      const details = setDetails(set, !rating);
                      return (
                        <div key={set.id} className="pl-3 pr-1 py-1 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${set.isWarmup ? 'text-gray-400 italic' : 'text-gray-500'}`}>{label}</span>
                            <span className={`flex-1 text-right font-medium ${missedTarget(set) ? 'text-amber-700' : ''}`}>
                              {formatSetWeight(set.weight)} × {set.reps} reps
                            </span>
                            <button
                              onClick={() => deleteSet(set.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`Delete ${label.toLowerCase()}`}
                              title="Delete set"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {details.length > 0 && (
                            <p className="pb-1 text-xs text-gray-500">{details.join(' · ')}</p>
                          )}
                          {rating && (
                            <div role="group" aria-label="Reps left in the tank" className="flex flex-wrap items-center gap-1 pb-1">
                              <span className="basis-full text-xs text-gray-500">Reps left in the tank?</span>
                              {RIR_CHOICES.map(rir => {
                                const selected = set.rpe !== undefined && rpeToRir(set.rpe) === rir;
                                return (
                                  <button
                                    key={rir}
                                    onClick={() => rateSet(set.id, rir)}
                                    aria-pressed={selected}
                                    aria-label={rir === 4 ? '4 or more reps left' : `${rir} ${rir === 1 ? 'rep' : 'reps'} left`}
                                    className={`min-w-[2.5rem] px-2 py-1.5 text-sm rounded border transition-colors ${
                                      selected
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    {rir === 4 ? '4+' : rir}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {deletedSet?.activityId === currentActivity.id && (
                  <div role="status" className="flex items-center justify-between gap-2 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg">
                    <span>
                      Deleted {formatSetWeight(deletedSet.set.weight)} × {deletedSet.set.reps} reps
                    </span>
                    <button
                      onClick={undoDeleteSet}
                      className="px-2 py-1 font-semibold text-blue-300 hover:text-blue-200"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {/* Input new set */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">
                      {isWarmup
                        ? `Log Warm-up ${(currentLog?.sets || []).filter(s => s.isWarmup).length + 1}`
                        : `Log Set ${(currentLog?.sets || []).filter(s => !s.isWarmup).length + 1}`}
                    </h3>
                    {restNow !== undefined && (
                      <span className="text-sm font-mono text-gray-500 whitespace-nowrap" title="Time since your last set">
                        Rest {formatRest(restNow)}
                      </span>
                    )}
                  </div>
                  {!isWarmup && nextIsAmrap(currentLog?.sets || [], currentActivity.tier) && (
                    <p className="-mt-2 text-sm text-blue-600">AMRAP: as many reps as you can</p>
                  )}

                  {/* Stacked on phones so weight and reps each get the full width (#21) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label htmlFor="set-weight" className="block text-sm text-gray-600 mb-1">Weight (lbs)</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setWeightText(formatWeight(Math.max(0, currentWeight - 5)))}
                          className="p-3 sm:p-2 flex-shrink-0 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          aria-label="Decrease weight"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          id="set-weight"
                          type="text"
                          inputMode="decimal"
                          value={weightText}
                          onChange={(e) => {
                            const text = sanitizeWeightInput(e.target.value);
                            if (text !== null) setWeightText(text);
                          }}
                          onFocus={(e) => e.target.select()}
                          aria-describedby="set-weight-hint"
                          className="min-w-0 w-full flex-1 p-2 border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() => setWeightText(formatWeight(currentWeight + 5))}
                          className="p-3 sm:p-2 flex-shrink-0 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          aria-label="Increase weight"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p id="set-weight-hint" className="mt-1 text-xs text-gray-500">0 for bodyweight</p>
                    </div>

                    <div className="min-w-0">
                      <label htmlFor="set-reps" className="block text-sm text-gray-600 mb-1">Reps</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentReps(Math.max(0, currentReps - 1))}
                          className="p-3 sm:p-2 flex-shrink-0 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          aria-label="Decrease reps"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          id="set-reps"
                          type="number"
                          inputMode="numeric"
                          value={currentReps}
                          onChange={(e) => setCurrentReps(parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="min-w-0 w-full flex-1 p-2 border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() => setCurrentReps(currentReps + 1)}
                          className="p-3 sm:p-2 flex-shrink-0 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          aria-label="Increase reps"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isWarmup}
                      onChange={(e) => setIsWarmup(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Warm-up set
                  </label>

                  <button
                    onClick={logSet}
                    disabled={currentReps <= 0}
                    className={`w-full py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isWarmup ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    Log {isWarmup ? 'Warm-up' : 'Set'} ({formatSetWeight(currentWeight)} × {currentReps} reps)
                  </button>
                </div>
              </div>
            )}

            {/* Notes for this activity in this session (#34) */}
            <div className="mt-6">
              <label
                htmlFor="activity-notes"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"
              >
                {isBallet ? 'Routine notes' : 'Exercise notes'}
              </label>
              <textarea
                id="activity-notes"
                value={activityNotes[currentActivity.id] ?? currentLog?.notes ?? ''}
                onChange={(e) => editActivityNotes(currentActivity.id, e.target.value)}
                placeholder={isBallet
                  ? 'How did it feel? Any corrections from the teacher?'
                  : 'Form cues, how it felt, machine settings...'}
                className={`w-full p-3 text-sm border border-gray-200 rounded-lg resize-y min-h-[5rem] focus:ring-2 ${
                  isBallet ? 'focus:ring-purple-500 focus:border-purple-500' : 'focus:ring-blue-500 focus:border-blue-500'
                }`}
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Session notes */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <label htmlFor="session-notes" className="block text-sm font-semibold text-gray-500 uppercase mb-2">
            Session notes (optional)
          </label>
          <textarea
            id="session-notes"
            value={notes}
            onChange={(e) => editSessionNotes(e.target.value)}
            placeholder="How did it go?"
            className="w-full h-[50vh] min-h-[8rem] p-3 border border-gray-300 rounded-lg resize-y"
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

      {/* Session effort, asked on Finish */}
      {askingEffort && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setAskingEffort(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="effort-title" className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-4">
            <div>
              <h3 id="effort-title" className="text-lg font-semibold text-gray-900">How hard was this workout?</h3>
              <p className="text-sm text-gray-500">1 is very easy, 10 is all you had.</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(effort => (
                <button
                  key={effort}
                  onClick={() => handleFinish(effort)}
                  aria-label={`Effort ${effort}`}
                  className={`py-3 rounded-lg border text-lg font-medium transition-colors ${
                    session.effort === effort
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {effort}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setAskingEffort(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Back to workout
              </button>
              <button
                onClick={() => handleFinish(session.effort)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Finish without rating
              </button>
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
