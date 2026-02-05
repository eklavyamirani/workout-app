import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Check, Plus, Minus } from 'lucide-react';
import type { Program, Activity, Session, ActivityLog, SetLog } from '../types';

interface SessionViewProps {
  program: Program;
  activities: Activity[];
  session: Session;
  onUpdateSession: (session: Session) => void;
  onComplete: (session: Session) => void;
  onCancel: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SessionView({
  program,
  activities,
  session,
  onUpdateSession,
  onComplete,
  onCancel,
}: SessionViewProps) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState(session.notes || '');

  // For weightlifting
  const [currentWeight, setCurrentWeight] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);

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
    
    const log: ActivityLog = {
      activityId: currentActivity.id,
      trackingType: currentActivity.trackingType,
      duration: Math.floor(timerSeconds / 60),
      completed: true,
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
    };
    onComplete(completedSession);
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
                  Activity {currentActivityIndex + 1} of {activities.length}
                </p>
              </div>
            </div>
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

      <div className="max-w-2xl mx-auto p-4">
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
                    ? 'bg-blue-500 text-white'
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentActivity.name}
            </h2>

            {/* Duration-based tracking */}
            {(currentActivity.trackingType === 'duration' || currentActivity.trackingType === 'completion') && (
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
      </div>
    </div>
  );
}
