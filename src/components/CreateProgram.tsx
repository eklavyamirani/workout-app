import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type { Program, ProgramType, ScheduleConfig, Activity, TrackingType } from '../types';

interface CreateProgramProps {
  onComplete: (program: Program, activities: Activity[]) => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CreateProgram({ onComplete, onCancel }: CreateProgramProps) {
  const [step, setStep] = useState(1);
  const [programType, setProgramType] = useState<ProgramType | null>(null);
  const [name, setName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleConfig['mode']>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [activities, setActivities] = useState<Partial<Activity>[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [targetDuration, setTargetDuration] = useState(30);

  const defaultTrackingType = (): TrackingType => {
    switch (programType) {
      case 'weightlifting': return 'sets-reps-weight';
      case 'skill': return 'duration';
      case 'cardio': return 'duration';
      default: return 'completion';
    }
  };

  function toggleDay(day: number) {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  }

  function addActivity() {
    if (!newActivityName.trim()) return;
    
    const activity: Partial<Activity> = {
      id: `activity_${Date.now()}`,
      name: newActivityName.trim(),
      trackingType: defaultTrackingType(),
    };

    if (programType === 'skill' || programType === 'cardio') {
      activity.targetDuration = targetDuration;
    }

    setActivities([...activities, activity]);
    setNewActivityName('');
  }

  function removeActivity(id: string) {
    setActivities(activities.filter(a => a.id !== id));
  }

  function handleComplete() {
    const programId = `program_${Date.now()}`;
    
    const program: Program = {
      id: programId,
      name: name.trim(),
      type: programType!,
      schedule: {
        mode: scheduleMode,
        ...(scheduleMode === 'weekly' && { daysOfWeek }),
        ...(scheduleMode === 'interval' && { intervalDays }),
      },
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const fullActivities: Activity[] = activities.map(a => ({
      ...a,
      programId,
    } as Activity));

    onComplete(program, fullActivities);
  }

  const canProceedStep1 = programType !== null;
  const canProceedStep2 = name.trim().length > 0;
  const canProceedStep3 = scheduleMode === 'flexible' || 
    (scheduleMode === 'weekly' && daysOfWeek.length > 0) ||
    (scheduleMode === 'interval' && intervalDays > 0);
  const canComplete = activities.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create Program</h1>
              <p className="text-sm text-gray-500">Step {step} of 4</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Step 1: Program Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">What kind of program?</h2>
            <div className="space-y-2">
              {[
                { type: 'weightlifting' as ProgramType, label: 'Weightlifting', desc: 'Track sets, reps, and weight' },
                { type: 'skill' as ProgramType, label: 'Skill Practice', desc: 'Duration-based practice sessions' },
                { type: 'cardio' as ProgramType, label: 'Cardio', desc: 'Track duration and distance' },
                { type: 'custom' as ProgramType, label: 'Custom', desc: 'Define your own tracking' },
              ].map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setProgramType(type)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    programType === type 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{desc}</div>
                    </div>
                    {programType === type && <Check className="w-5 h-5 text-blue-500" />}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="w-full py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Program Name */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Name your program</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={programType === 'skill' ? 'e.g., Violin Practice' : 'e.g., Strength Training'}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">When do you practice?</h2>
            
            <div className="space-y-2">
              {[
                { mode: 'weekly' as const, label: 'Specific days', desc: 'Same days each week' },
                { mode: 'interval' as const, label: 'Every X days', desc: 'Regular interval' },
                { mode: 'flexible' as const, label: 'Flexible', desc: 'Whenever I want' },
              ].map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => setScheduleMode(mode)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    scheduleMode === mode 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{desc}</div>
                    </div>
                    {scheduleMode === mode && <Check className="w-5 h-5 text-blue-500" />}
                  </div>
                </button>
              ))}
            </div>

            {scheduleMode === 'weekly' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">Select days:</p>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(index)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        daysOfWeek.includes(index)
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scheduleMode === 'interval' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-sm text-gray-600">
                  Practice every
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)}
                    className="w-16 mx-2 p-2 border border-gray-300 rounded text-center"
                  />
                  days
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Activities */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {programType === 'weightlifting' ? 'Add exercises' : 'Add activities'}
            </h2>

            {activities.length > 0 && (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div>
                      <span className="font-medium">{activity.name}</span>
                      {activity.targetDuration && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({activity.targetDuration} min)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeActivity(activity.id!)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <input
                type="text"
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder={programType === 'weightlifting' ? 'Exercise name' : 'Activity name'}
                className="w-full p-3 border border-gray-300 rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && addActivity()}
              />
              
              {(programType === 'skill' || programType === 'cardio') && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Target duration:</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value) || 30)}
                    className="w-20 p-2 border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-600">min</span>
                </div>
              )}

              <button
                onClick={addActivity}
                disabled={!newActivityName.trim()}
                className="w-full py-2 border border-blue-500 text-blue-500 rounded-lg disabled:opacity-50 hover:bg-blue-50 transition-colors"
              >
                Add {programType === 'weightlifting' ? 'Exercise' : 'Activity'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!canComplete}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Create Program
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
