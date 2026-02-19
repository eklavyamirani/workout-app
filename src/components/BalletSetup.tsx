import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type {
  Program,
  Activity,
  ScheduleConfig,
  BalletClassType,
  BalletLevel,
  BalletExercise,
  BalletSection,
  RoutineEntry,
} from '../types';
import { getBalletExercisesForClass } from '../types';
import { RoutineBuilder } from './RoutineBuilder';

interface BalletSetupProps {
  onComplete: (program: Program, activities: Activity[]) => void;
  onCancel: () => void;
}

const CLASS_TYPES: { type: BalletClassType; label: string; desc: string; duration: string }[] = [
  { type: 'full', label: 'Full Class', desc: 'Barre + Center + Cool-down', duration: '~75 min' },
  { type: 'barre-only', label: 'Barre Only', desc: 'Warm-up through grand battement', duration: '~40 min' },
  { type: 'center-only', label: 'Center Only', desc: 'Adagio through révérence', duration: '~35 min' },
  { type: 'pointe', label: 'Pointe', desc: 'Pointe-specific exercises', duration: '~30 min' },
];

const LEVELS: { level: BalletLevel; label: string; desc: string }[] = [
  { level: 'beginner', label: 'Beginner', desc: 'Core exercises with longer holds' },
  { level: 'intermediate', label: 'Intermediate', desc: 'Full vocabulary with moderate pace' },
  { level: 'advanced', label: 'Advanced', desc: 'Complete class with complex combinations' },
];

const SECTION_LABELS: Record<BalletSection, string> = {
  barre: 'Barre',
  center: 'Center',
  pointe: 'Pointe',
  cooldown: 'Cool-down',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BalletSetup({ onComplete, onCancel }: BalletSetupProps) {
  const [step, setStep] = useState(1);
  const [classType, setClassType] = useState<BalletClassType | null>(null);
  const [level, setLevel] = useState<BalletLevel | null>(null);
  const [routines, setRoutines] = useState<RoutineEntry[]>([]);
  const [programName, setProgramName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleConfig['mode']>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(3);

  function handleSelectLevel(selectedLevel: BalletLevel) {
    setLevel(selectedLevel);
    const selected = getBalletExercisesForClass(classType!, selectedLevel);

    const sections = new Map<BalletSection, BalletExercise[]>();
    for (const ex of selected) {
      const list = sections.get(ex.section) || [];
      list.push(ex);
      sections.set(ex.section, list);
    }

    const defaultRoutines: RoutineEntry[] = [];
    for (const [section, exercises] of sections) {
      defaultRoutines.push({
        id: `routine_${section}_${Date.now()}`,
        name: SECTION_LABELS[section],
        section,
        notes: '',
        movements: exercises.map(e => ({ id: e.id, name: e.name })),
        collapsed: false,
      });
    }

    setRoutines(defaultRoutines);
    const classLabel = CLASS_TYPES.find(c => c.type === classType)?.label || 'Ballet';
    const levelLabel = LEVELS.find(l => l.level === selectedLevel)?.label || '';
    setProgramName(`${levelLabel} ${classLabel}`);
  }

  function toggleDay(day: number) {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }

  function handleComplete() {
    const programId = `program_${Date.now()}`;

    const program: Program = {
      id: programId,
      name: programName.trim(),
      type: 'ballet',
      schedule: {
        mode: scheduleMode,
        ...(scheduleMode === 'weekly' && { daysOfWeek }),
        ...(scheduleMode === 'interval' && { intervalDays }),
      },
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const programActivities: Activity[] = routines.map(r => ({
      id: `${programId}_${r.id}`,
      name: r.name,
      programId,
      trackingType: 'completion' as const,
      description: r.notes || undefined,
      movements: r.movements,
    }));

    onComplete(program, programActivities);
  }

  const totalMovements = routines.reduce((sum, r) => sum + r.movements.length, 0);
  const canProceedStep3 = routines.length > 0 && totalMovements > 0;
  const canProceedStep4 = scheduleMode === 'flexible' ||
    (scheduleMode === 'weekly' && daysOfWeek.length > 0) ||
    (scheduleMode === 'interval' && intervalDays > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ballet Setup</h1>
              <p className="text-sm text-gray-500">Step {step} of 4</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Step 1: Class Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">What type of class?</h2>
            <div className="space-y-2">
              {CLASS_TYPES.map(({ type, label, desc, duration }) => (
                <button
                  key={type}
                  onClick={() => setClassType(type)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    classType === type
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{desc}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{duration}</span>
                      {classType === type && <Check className="w-5 h-5 text-purple-500" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!classType}
              className="w-full py-3 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Level */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">What level?</h2>
            <div className="space-y-2">
              {LEVELS.map(({ level: lvl, label, desc }) => (
                <button
                  key={lvl}
                  onClick={() => handleSelectLevel(lvl)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    level === lvl
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{desc}</div>
                    </div>
                    {level === lvl && <Check className="w-5 h-5 text-purple-500" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!level}
                className="flex-1 py-3 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Build Routines */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Build your routines</h2>
              <p className="text-sm text-gray-500">
                {routines.length} routine{routines.length !== 1 ? 's' : ''} &middot; {totalMovements} movement{totalMovements !== 1 ? 's' : ''}
              </p>
            </div>

            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Program name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />

            <RoutineBuilder
              routines={routines}
              onRoutinesChange={setRoutines}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3 || !programName.trim()}
                className="flex-1 py-3 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">When do you take class?</h2>

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
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{desc}</div>
                    </div>
                    {scheduleMode === mode && <Check className="w-5 h-5 text-purple-500" />}
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
                          ? 'bg-purple-500 text-white'
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
                onClick={() => setStep(3)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!canProceedStep4}
                className="flex-1 py-3 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
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
