import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, X } from 'lucide-react';
import type { Program, Activity, GZCLPTier, GZCLPWorkoutDay, DEFAULT_GZCLP_EXERCISES } from '../types';
import { DEFAULT_GZCLP_EXERCISES as EXERCISES } from '../types';

interface GZCLPSetupProps {
  onComplete: (program: Program, activities: Activity[], workoutDays: GZCLPWorkoutDay[]) => void;
  onCancel: () => void;
}

const DEFAULT_WORKOUT_DAYS: Omit<GZCLPWorkoutDay, 't1ExerciseId' | 't2ExerciseId' | 't3ExerciseIds'>[] = [
  { dayNumber: 1, name: 'Day 1 - Squat Focus' },
  { dayNumber: 2, name: 'Day 2 - Bench Focus' },
  { dayNumber: 3, name: 'Day 3 - Deadlift Focus' },
  { dayNumber: 4, name: 'Day 4 - OHP Focus' },
];

export function GZCLPSetup({ onComplete, onCancel }: GZCLPSetupProps) {
  const [step, setStep] = useState(1);
  const [programName, setProgramName] = useState('GZCLP Program');
  const [currentDay, setCurrentDay] = useState(1);
  const [workoutDays, setWorkoutDays] = useState<Record<number, Partial<GZCLPWorkoutDay>>>({
    1: { dayNumber: 1, name: 'Day 1 - Squat Focus', t1ExerciseId: 'squat', t2ExerciseId: 'bench', t3ExerciseIds: ['lat_pulldown'] },
    2: { dayNumber: 2, name: 'Day 2 - Bench Focus', t1ExerciseId: 'bench', t2ExerciseId: 'rdl', t3ExerciseIds: ['db_curl'] },
    3: { dayNumber: 3, name: 'Day 3 - Deadlift Focus', t1ExerciseId: 'deadlift', t2ExerciseId: 'ohp', t3ExerciseIds: ['leg_curl'] },
    4: { dayNumber: 4, name: 'Day 4 - OHP Focus', t1ExerciseId: 'ohp', t2ExerciseId: 'front_squat', t3ExerciseIds: ['tricep_pushdown'] },
  });
  const [startingWeights, setStartingWeights] = useState<Record<string, number>>({});
  const [customExercises, setCustomExercises] = useState<Omit<Activity, 'programId'>[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', tier: 'T1' as GZCLPTier });

  const allExercises = [...EXERCISES, ...customExercises];
  const t1Exercises = allExercises.filter(e => e.tier === 'T1');
  const t2Exercises = allExercises.filter(e => e.tier === 'T2');
  const t3Exercises = allExercises.filter(e => e.tier === 'T3');

  // Get all unique exercise IDs used across all days
  const usedExerciseIds = new Set<string>();
  Object.values(workoutDays).forEach(day => {
    if (day.t1ExerciseId) usedExerciseIds.add(day.t1ExerciseId);
    if (day.t2ExerciseId) usedExerciseIds.add(day.t2ExerciseId);
    day.t3ExerciseIds?.forEach(id => usedExerciseIds.add(id));
  });

  function selectExercise(dayNum: number, tier: GZCLPTier, exerciseId: string) {
    setWorkoutDays(prev => {
      const day = { ...prev[dayNum] };
      if (tier === 'T1') day.t1ExerciseId = exerciseId;
      else if (tier === 'T2') day.t2ExerciseId = exerciseId;
      return { ...prev, [dayNum]: day };
    });
  }

  function toggleT3Exercise(dayNum: number, exerciseId: string) {
    setWorkoutDays(prev => {
      const day = { ...prev[dayNum] };
      const t3s = day.t3ExerciseIds || [];
      if (t3s.includes(exerciseId)) {
        day.t3ExerciseIds = t3s.filter(id => id !== exerciseId);
      } else if (t3s.length < 3) {
        day.t3ExerciseIds = [...t3s, exerciseId];
      }
      return { ...prev, [dayNum]: day };
    });
  }

  function addCustomExercise() {
    if (!newExercise.name.trim()) return;
    const id = `custom_${newExercise.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    setCustomExercises([...customExercises, {
      id,
      name: newExercise.name.trim(),
      trackingType: 'sets-reps-weight',
      tier: newExercise.tier,
      muscleGroups: [],
      equipment: 'Other',
    }]);
    setNewExercise({ name: '', tier: 'T1' });
    setShowAddExercise(false);
  }

  function handleComplete() {
    const programId = `program_${Date.now()}`;
    
    const program: Program = {
      id: programId,
      name: programName,
      type: 'gzclp',
      schedule: { mode: 'rotation' },
      isActive: true,
      createdAt: new Date().toISOString(),
      currentWeek: 1,
      lastWorkoutDay: 0,
    };

    // Create activities from used exercises
    const activities: Activity[] = [];
    usedExerciseIds.forEach(exId => {
      const exercise = allExercises.find(e => e.id === exId);
      if (exercise) {
        activities.push({
          ...exercise,
          id: `${programId}_${exercise.id}`,
          programId,
          startingWeight: startingWeights[exId] || 0,
        });
      }
    });

    const finalWorkoutDays: GZCLPWorkoutDay[] = Object.values(workoutDays).map(day => ({
      dayNumber: day.dayNumber!,
      name: day.name!,
      t1ExerciseId: `${programId}_${day.t1ExerciseId}`,
      t2ExerciseId: `${programId}_${day.t2ExerciseId}`,
      t3ExerciseIds: (day.t3ExerciseIds || []).map(id => `${programId}_${id}`),
    }));

    onComplete(program, activities, finalWorkoutDays);
  }

  const currentDayData = workoutDays[currentDay];
  const dayComplete = currentDayData?.t1ExerciseId && currentDayData?.t2ExerciseId && (currentDayData?.t3ExerciseIds?.length || 0) > 0;
  const allDaysComplete = [1, 2, 3, 4].every(d => {
    const day = workoutDays[d];
    return day?.t1ExerciseId && day?.t2ExerciseId && (day?.t3ExerciseIds?.length || 0) > 0;
  });
  const allWeightsSet = Array.from(usedExerciseIds).every(id => startingWeights[id] > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">GZCLP Setup</h1>
              <p className="text-sm text-gray-500">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Step 1: Program Name */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Name your program</h2>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., GZCLP Program"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">About GZCLP</h3>
              <p className="text-sm text-blue-800">
                GZCLP is a 4-day linear progression program with three tiers:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li><strong>T1</strong>: Main compound lift (5×3+)</li>
                <li><strong>T2</strong>: Secondary compound (3×10+)</li>
                <li><strong>T3</strong>: Accessories (3×15+)</li>
              </ul>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!programName.trim()}
              className="w-full py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Configure Days */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Configure Workout Days</h2>
              <button
                onClick={() => setShowAddExercise(true)}
                className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>

            {/* Day Tabs */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(day => {
                const d = workoutDays[day];
                const complete = d?.t1ExerciseId && d?.t2ExerciseId && (d?.t3ExerciseIds?.length || 0) > 0;
                return (
                  <button
                    key={day}
                    onClick={() => setCurrentDay(day)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentDay === day
                        ? 'bg-blue-500 text-white'
                        : complete
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Day {day}
                    {complete && currentDay !== day && ' ✓'}
                  </button>
                );
              })}
            </div>

            {/* Current Day Config */}
            <div className="space-y-4">
              {/* T1 Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">T1 - Main Lift</h3>
                <div className="grid grid-cols-2 gap-2">
                  {t1Exercises.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => selectExercise(currentDay, 'T1', ex.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        currentDayData?.t1ExerciseId === ex.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-xs text-gray-500">{ex.muscleGroups?.join(', ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* T2 Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">T2 - Secondary Lift</h3>
                <div className="grid grid-cols-2 gap-2">
                  {t2Exercises.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => selectExercise(currentDay, 'T2', ex.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        currentDayData?.t2ExerciseId === ex.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-xs text-gray-500">{ex.muscleGroups?.join(', ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* T3 Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  T3 - Accessories (select 1-3)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {t3Exercises.map(ex => {
                    const selected = currentDayData?.t3ExerciseIds?.includes(ex.id);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => toggleT3Exercise(currentDay, ex.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{ex.name}</div>
                          {selected && <Check className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="text-xs text-gray-500">{ex.muscleGroups?.join(', ')}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!allDaysComplete}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Starting Weights */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Set Starting Weights</h2>
            <p className="text-sm text-gray-500">
              Enter the weight you can lift for the target reps. This will be your starting point.
            </p>

            <div className="space-y-3">
              {Array.from(usedExerciseIds).map(exId => {
                const exercise = allExercises.find(e => e.id === exId);
                if (!exercise) return null;
                const config = exercise.tier === 'T1' ? '5×3' : exercise.tier === 'T2' ? '3×10' : '3×15';
                return (
                  <div key={exId} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-xs text-gray-500">{exercise.tier} ({config})</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={startingWeights[exId] || ''}
                        onChange={(e) => setStartingWeights({
                          ...startingWeights,
                          [exId]: parseInt(e.target.value) || 0
                        })}
                        placeholder="0"
                        className="w-20 p-2 border border-gray-300 rounded text-center"
                      />
                      <span className="text-sm text-gray-500">lbs</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!allWeightsSet}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600"
              >
                Create Program
              </button>
            </div>
          </div>
        )}

        {/* Add Exercise Modal */}
        {showAddExercise && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Custom Exercise</h3>
                <button onClick={() => setShowAddExercise(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exercise Name</label>
                  <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Hip Thrust"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select
                    value={newExercise.tier}
                    onChange={(e) => setNewExercise({ ...newExercise, tier: e.target.value as GZCLPTier })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="T1">T1 - Main Compound</option>
                    <option value="T2">T2 - Secondary Compound</option>
                    <option value="T3">T3 - Accessory</option>
                  </select>
                </div>
                <button
                  onClick={addCustomExercise}
                  disabled={!newExercise.name.trim()}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600"
                >
                  Add Exercise
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
