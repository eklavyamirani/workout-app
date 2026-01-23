import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Settings, TrendingUp, Calendar, ChevronRight, Timer, Check, X, Edit2, ArrowLeft, Trash2 } from 'lucide-react';
import { storage } from './storage/adapter';

// ============================================================================
// DEFAULT EXERCISE LIBRARY
// ============================================================================

const DEFAULT_EXERCISES = {
  // T1 Exercises
  'squat': { id: 'squat', name: 'Squat', muscleGroups: ['Quads', 'Glutes'], equipment: 'Barbell', tier: 'T1', isCustom: false },
  'bench': { id: 'bench', name: 'Bench Press', muscleGroups: ['Chest', 'Triceps'], equipment: 'Barbell', tier: 'T1', isCustom: false },
  'deadlift': { id: 'deadlift', name: 'Deadlift', muscleGroups: ['Back', 'Hamstrings'], equipment: 'Barbell', tier: 'T1', isCustom: false },
  'ohp': { id: 'ohp', name: 'Overhead Press', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Barbell', tier: 'T1', isCustom: false },

  // T2 Exercises
  'rdl': { id: 'rdl', name: 'Romanian Deadlift', muscleGroups: ['Hamstrings', 'Back'], equipment: 'Barbell', tier: 'T2', isCustom: false },
  'incline_bench': { id: 'incline_bench', name: 'Incline Bench Press', muscleGroups: ['Chest', 'Shoulders'], equipment: 'Barbell', tier: 'T2', isCustom: false },
  'bb_row': { id: 'bb_row', name: 'Barbell Row', muscleGroups: ['Back', 'Biceps'], equipment: 'Barbell', tier: 'T2', isCustom: false },
  'hip_thrust': { id: 'hip_thrust', name: 'Hip Thrust', muscleGroups: ['Glutes', 'Hamstrings'], equipment: 'Barbell', tier: 'T2', isCustom: false },
  'front_squat': { id: 'front_squat', name: 'Front Squat', muscleGroups: ['Quads', 'Core'], equipment: 'Barbell', tier: 'T2', isCustom: false },

  // T3 Exercises
  'lat_pulldown': { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable', tier: 'T3', isCustom: false },
  'cable_fly': { id: 'cable_fly', name: 'Cable Fly', muscleGroups: ['Chest'], equipment: 'Cable', tier: 'T3', isCustom: false },
  'leg_curl': { id: 'leg_curl', name: 'Leg Curl', muscleGroups: ['Hamstrings'], equipment: 'Machine', tier: 'T3', isCustom: false },
  'leg_extension': { id: 'leg_extension', name: 'Leg Extension', muscleGroups: ['Quads'], equipment: 'Machine', tier: 'T3', isCustom: false },
  'face_pull': { id: 'face_pull', name: 'Face Pull', muscleGroups: ['Shoulders', 'Back'], equipment: 'Cable', tier: 'T3', isCustom: false },
  'db_curl': { id: 'db_curl', name: 'Dumbbell Curl', muscleGroups: ['Biceps'], equipment: 'Dumbbell', tier: 'T3', isCustom: false },
  'tricep_pushdown': { id: 'tricep_pushdown', name: 'Tricep Pushdown', muscleGroups: ['Triceps'], equipment: 'Cable', tier: 'T3', isCustom: false },
};

// ============================================================================
// GZCLP PROGRESSION LOGIC
// ============================================================================

const GZCLP = {
  T1: {
    sets: 5,
    reps: 3,
    amrapSet: 5,
    weightIncrement: 5,
    progressionThreshold: 5,
  },
  T2: {
    sets: 3,
    reps: 10,
    amrapSet: 3,
    weightIncrement: 5,
    progressionThreshold: 10,
  },
  T3: {
    sets: 3,
    reps: 15,
    amrapSet: 3,
    weightIncrement: 5,
    progressionThreshold: 25, // total reps across all sets
  }
};

function calculateNextWeight(tier, lastWeekSets) {
  if (!lastWeekSets || lastWeekSets.length === 0) return null;

  const config = GZCLP[tier];
  const amrapSet = lastWeekSets.find(s => s.isAmrap);

  if (!amrapSet) return lastWeekSets[0].weight;

  if (tier === 'T3') {
    const totalReps = lastWeekSets.reduce((sum, s) => sum + s.reps, 0);
    if (totalReps >= config.progressionThreshold) {
      return amrapSet.weight + config.weightIncrement;
    }
  } else {
    // @eklavya: this seems odd. For T1 and T2, hitting 25 reps is against the idea of T1 an T2 tiers.
    // come back to this later and see if the model will catch this.
    if (amrapSet.reps >= config.progressionThreshold) {
      return amrapSet.weight + config.weightIncrement;
    }
  }

  return amrapSet.weight;
}

function estimate1RM(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [view, setView] = useState('loading');
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const prog = await storage.get('program:current');
    const exs = await storage.get('exercises:all');

    if (exs) setExercises(exs);

    if (prog) {
      setProgram(prog);
      setView('home');
    } else {
      setView('setup');
    }
  }

  async function saveProgram(newProgram) {
    await storage.set('program:current', newProgram);
    setProgram(newProgram);
  }

  async function saveExercises(newExercises) {
    await storage.set('exercises:all', newExercises);
    setExercises(newExercises);
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your workouts...</p>
        </div>
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <ProgramSetup
        exercises={exercises}
        onComplete={saveProgram}
        onViewChange={setView}
        onSaveExercises={saveExercises}
      />
    );
  }

  if (view === 'workout' && currentWorkout) {
    return (
      <WorkoutSession
        workout={currentWorkout}
        program={program}
        exercises={exercises}
        onComplete={async (completedWorkout) => {
          const dateKey = `workout:${completedWorkout.date}`;
          await storage.set(dateKey, completedWorkout);

          // Update program's next workout day
          const updatedProgram = {
            ...program,
            lastWorkoutDay: currentWorkout.day,
            lastWorkoutDate: completedWorkout.date
          };
          await saveProgram(updatedProgram);

          setCurrentWorkout(null);
          setView('home');
        }}
        onCancel={() => {
          setCurrentWorkout(null);
          setView('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header view={view} onViewChange={setView} />

      {view === 'home' && (
        <HomePage
          program={program}
          exercises={exercises}
          onStartWorkout={(workout) => {
            setCurrentWorkout(workout);
            setView('workout');
          }}
          onViewChange={setView}
        />
      )}

      {view === 'exercises' && (
        <ExerciseLibrary
          exercises={exercises}
          onSave={saveExercises}
          onBack={() => setView('home')}
        />
      )}
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function Header({ view, onViewChange }) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">Workout Tracker</h1>
          </div>

          <nav className="flex gap-4">
            <button
              onClick={() => onViewChange('home')}
              className={`px-3 py-1 rounded ${view === 'home' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              Home
            </button>
            <button
              onClick={() => onViewChange('exercises')}
              className={`px-3 py-1 rounded ${view === 'exercises' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              Exercises
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROGRAM SETUP
// ============================================================================

function ProgramSetup({ exercises, onComplete, onViewChange, onSaveExercises }) {
  const [step, setStep] = useState(1);
  const [workoutDays, setWorkoutDays] = useState({
    day1: { T1: null, T2: null, T3: [] },
    day2: { T1: null, T2: null, T3: [] },
    day3: { T1: null, T2: null, T3: [] },
    day4: { T1: null, T2: null, T3: [] }
  });
  const [startingWeights, setStartingWeights] = useState({});
  const [currentDay, setCurrentDay] = useState('day1');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    tier: 'T1',
    muscleGroups: '',
    equipment: ''
  });

  const exercisesByTier = {
    T1: Object.values(exercises).filter(e => e.tier === 'T1'),
    T2: Object.values(exercises).filter(e => e.tier === 'T2'),
    T3: Object.values(exercises).filter(e => e.tier === 'T3'),
  };

  function addCustomExercise() {
    if (!newExercise.name) return;

    const id = newExercise.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const updated = {
      ...exercises,
      [id]: {
        id,
        name: newExercise.name,
        tier: newExercise.tier,
        muscleGroups: newExercise.muscleGroups.split(',').map(s => s.trim()).filter(Boolean),
        equipment: newExercise.equipment,
        isCustom: true,
        isArchived: false
      }
    };

    onSaveExercises(updated);
    setNewExercise({ name: '', tier: 'T1', muscleGroups: '', equipment: '' });
    setShowAddExercise(false);
  }

  function selectExercise(day, tier, exerciseId) {
    setWorkoutDays(prev => {
      const updated = { ...prev };
      if (tier === 'T3') {
        const current = updated[day].T3;
        if (current.includes(exerciseId)) {
          updated[day].T3 = current.filter(id => id !== exerciseId);
        } else {
          updated[day].T3 = [...current, exerciseId];
        }
      } else {
        updated[day][tier] = updated[day][tier] === exerciseId ? null : exerciseId;
      }
      return updated;
    });
  }

  function handleComplete() {
    const program = {
      id: 'program_' + Date.now(),
      startDate: new Date().toISOString(),
      currentWeek: 1,
      status: 'active',
      workoutDays: workoutDays,
      startingWeights: startingWeights,
      lastWorkoutDay: null,
      lastWorkoutDate: null
    };
    onComplete(program);
    onViewChange('home');
  }

  const dayNames = {
    day1: 'Day 1',
    day2: 'Day 2',
    day3: 'Day 3',
    day4: 'Day 4'
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to GZCLP!</h2>
            <p className="text-gray-600 mb-4">
              GZCLP is a 4-day program. Let's set up each workout day with one T1, one T2, and 1-3 T3 exercises.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-semibold text-blue-900 mb-2">GZCLP Structure:</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li><strong>T1:</strong> Main compound lift - 5 sets x 3 reps (heavy)</li>
                <li><strong>T2:</strong> Secondary compound - 3 sets x 10 reps (moderate)</li>
                <li><strong>T3:</strong> Accessories - 3 sets x 15 reps (light, volume)</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex gap-2 mb-4">
              {['day1', 'day2', 'day3', 'day4'].map(day => (
                <button
                  key={day}
                  onClick={() => setCurrentDay(day)}
                  className={`flex-1 py-2 px-3 rounded ${
                    currentDay === day
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {dayNames[day]}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Setup {dayNames[currentDay]}
              </h3>
              <button
                onClick={() => setShowAddExercise(true)}
                className="flex items-center gap-1 text-sm text-blue-600"
              >
                <Plus className="w-4 h-4" />
                Add Custom
              </button>
            </div>

            {showAddExercise && (
              <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">Add Custom Exercise</h4>
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Exercise name"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={newExercise.tier}
                    onChange={(e) => setNewExercise(prev => ({ ...prev, tier: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="T1">T1 (Main Compound)</option>
                    <option value="T2">T2 (Secondary)</option>
                    <option value="T3">T3 (Accessory)</option>
                  </select>
                  <input
                    type="text"
                    value={newExercise.muscleGroups}
                    onChange={(e) => setNewExercise(prev => ({ ...prev, muscleGroups: e.target.value }))}
                    placeholder="Muscle groups (comma separated)"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newExercise.equipment}
                    onChange={(e) => setNewExercise(prev => ({ ...prev, equipment: e.target.value }))}
                    placeholder="Equipment"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddExercise(false);
                      setNewExercise({ name: '', tier: 'T1', muscleGroups: '', equipment: '' });
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomExercise}
                    disabled={!newExercise.name}
                    className="flex-1 bg-blue-500 text-white py-2 rounded text-sm disabled:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* T1 Selection */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">T1 Exercise (select 1)</h4>
              <div className="grid grid-cols-2 gap-2">
                {exercisesByTier.T1.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => selectExercise(currentDay, 'T1', ex.id)}
                    className={`p-3 rounded border-2 text-left text-sm transition ${
                      workoutDays[currentDay].T1 === ex.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{ex.name}</div>
                    <div className="text-xs text-gray-500">{ex.muscleGroups.join(', ')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* T2 Selection */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">T2 Exercise (select 1)</h4>
              <div className="grid grid-cols-2 gap-2">
                {exercisesByTier.T2.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => selectExercise(currentDay, 'T2', ex.id)}
                    className={`p-3 rounded border-2 text-left text-sm transition ${
                      workoutDays[currentDay].T2 === ex.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{ex.name}</div>
                    <div className="text-xs text-gray-500">{ex.muscleGroups.join(', ')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* T3 Selection */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">T3 Exercises (select 1-3)</h4>
              <div className="grid grid-cols-2 gap-2">
                {exercisesByTier.T3.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => selectExercise(currentDay, 'T3', ex.id)}
                    className={`p-3 rounded border-2 text-left text-sm transition ${
                      workoutDays[currentDay].T3.includes(ex.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{ex.name}</div>
                    <div className="text-xs text-gray-500">{ex.muscleGroups.join(', ')}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={Object.values(workoutDays).some(day => !day.T1 || !day.T2 || day.T3.length === 0)}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue to Starting Weights
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const allExerciseIds = new Set();
    Object.values(workoutDays).forEach(day => {
      if (day.T1) allExerciseIds.add(day.T1);
      if (day.T2) allExerciseIds.add(day.T2);
      day.T3.forEach(id => allExerciseIds.add(id));
    });

    const allSelected = Array.from(allExerciseIds);

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Starting Weights</h2>
            <p className="text-gray-600">
              Enter your current working weights for each exercise. If you're unsure, start conservative.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="space-y-4">
              {allSelected.map(exId => {
                const ex = exercises[exId];
                return (
                  <div key={exId} className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{ex.name}</div>
                      <div className="text-sm text-gray-500">{ex.tier}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={startingWeights[exId] || ''}
                        onChange={(e) => setStartingWeights(prev => ({
                          ...prev,
                          [exId]: parseFloat(e.target.value) || 0
                        }))}
                        placeholder="0"
                        className="w-20 px-3 py-2 border border-gray-300 rounded text-right"
                      />
                      <span className="text-gray-600">lbs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleComplete}
              disabled={allSelected.some(id => !startingWeights[id])}
              className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300"
            >
              Start Program
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ============================================================================
// HOME PAGE
// ============================================================================

function HomePage({ program, exercises, onStartWorkout, onViewChange }) {
  const [lastWorkout, setLastWorkout] = useState(null);

  useEffect(() => {
    loadLastWorkout();
  }, []);

  async function loadLastWorkout() {
    const keys = await storage.list('workout:');
    if (keys.length > 0) {
      const sorted = keys.sort().reverse();
      const latest = await storage.get(sorted[0]);
      setLastWorkout(latest);
    }
  }

  if (!program) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">Loading program...</p>
        </div>
      </div>
    );
  }

  // Check if program has the new structure
  if (!program.workoutDays) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-900 font-semibold mb-2">Program Update Required</p>
          <p className="text-gray-600 mb-4">Your program needs to be updated to the new 4-day format.</p>
          <button
            onClick={() => onViewChange('setup')}
            className="bg-blue-500 text-white px-6 py-2 rounded"
          >
            Setup New Program
          </button>
        </div>
      </div>
    );
  }

  function getNextWorkoutDay() {
    const dayOrder = ['day1', 'day2', 'day3', 'day4'];
    if (!program.lastWorkoutDay) return 'day1';

    const currentIndex = dayOrder.indexOf(program.lastWorkoutDay);
    return dayOrder[(currentIndex + 1) % 4];
  }

  function startNewWorkout(selectedDay) {
    const dayData = program.workoutDays[selectedDay];
    if (!dayData) {
      console.error('No data for day:', selectedDay);
      return;
    }

    const exerciseIds = [
      dayData.T1,
      dayData.T2,
      ...dayData.T3
    ].filter(Boolean);

    const workout = {
      id: 'workout_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      endTime: null,
      programWeek: program.currentWeek,
      day: selectedDay,
      exerciseIds: exerciseIds,
      exercises: []
    };
    onStartWorkout(workout);
  }

  const nextDay = getNextWorkoutDay();
  const dayNames = {
    day1: 'Day 1',
    day2: 'Day 2',
    day3: 'Day 3',
    day4: 'Day 4'
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Week {program.currentWeek} of 12</h2>
            <p className="text-gray-600">Current Training Cycle</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-500">{Math.round((program.currentWeek / 12) * 100)}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(program.currentWeek / 12) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Start Workout</h3>
        <p className="text-sm text-gray-600 mb-4">Next up: {dayNames[nextDay]}</p>

        <div className="grid grid-cols-2 gap-3">
          {['day1', 'day2', 'day3', 'day4'].map(day => {
            const dayData = program.workoutDays[day];
            const isNext = day === nextDay;

            return (
              <button
                key={day}
                onClick={() => startNewWorkout(day)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  isNext
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-2">
                  {dayNames[day]}
                  {isNext && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">Next</span>}
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>T1: {exercises[dayData.T1]?.name}</div>
                  <div>T2: {exercises[dayData.T2]?.name}</div>
                  <div>T3: {dayData.T3.length} exercises</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {lastWorkout && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Last Workout</h3>
          <p className="text-gray-600 text-sm mb-4">
            {dayNames[lastWorkout.day]} - {new Date(lastWorkout.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <div className="text-sm text-gray-600">
            {lastWorkout.exercises.length} exercises completed
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WORKOUT SESSION
// ============================================================================

function WorkoutSession({ workout, program, exercises, onComplete, onCancel }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutData, setWorkoutData] = useState(workout);
  const [restTimer, setRestTimer] = useState(null);
  const [restStartTime, setRestStartTime] = useState(null);

  useEffect(() => {
    let interval;
    if (restStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
        setRestTimer(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restStartTime]);

  async function getLastWeekData(exerciseId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const keys = await storage.list('workout:');

    for (const key of keys.sort().reverse()) {
      const w = await storage.get(key);
      if (new Date(w.date) < weekAgo) break;

      const exData = w.exercises.find(e => e.exerciseId === exerciseId);
      if (exData) return exData;
    }
    return null;
  }

  if (currentExerciseIndex >= workout.exerciseIds.length) {
    const duration = Math.floor((new Date() - new Date(workoutData.startTime)) / 60000);
    const totalVolume = workoutData.exercises.reduce((sum, ex) => {
      return sum + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0);
    }, 0);

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Workout Complete!</h2>
            <p className="text-gray-600 mb-6">Great work today</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-2xl font-bold text-gray-900">{duration} min</div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-2xl font-bold text-gray-900">{totalVolume.toLocaleString()} lbs</div>
                <div className="text-sm text-gray-600">Total Volume</div>
              </div>
            </div>

            <button
              onClick={() => {
                const completed = {
                  ...workoutData,
                  endTime: new Date().toISOString()
                };
                onComplete(completed);
              }}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentExerciseId = workout.exerciseIds[currentExerciseIndex];
  const currentExercise = exercises[currentExerciseId];
  const tier = currentExercise.tier;
  const config = GZCLP[tier];

  return (
    <ExerciseView
      exercise={currentExercise}
      tier={tier}
      config={config}
      program={program}
      restTimer={restTimer}
      onLogSet={(setData) => {
        if (restStartTime) {
          const restDuration = Math.floor((Date.now() - restStartTime) / 1000);
          setData.restDuration = restDuration;
        }

        setWorkoutData(prev => {
          const exercises = [...prev.exercises];
          let exData = exercises.find(e => e.exerciseId === currentExerciseId);

          if (!exData) {
            exData = {
              exerciseId: currentExerciseId,
              tier: tier,
              sets: []
            };
            exercises.push(exData);
          }

          exData.sets.push({
            ...setData,
            id: 'set_' + Date.now(),
            timestamp: new Date().toISOString()
          });

          return { ...prev, exercises };
        });

        setRestStartTime(Date.now());
        setRestTimer(0);
      }}
      onNext={() => {
        setCurrentExerciseIndex(prev => prev + 1);
        setRestTimer(null);
        setRestStartTime(null);
      }}
      onCancel={onCancel}
      currentSets={workoutData.exercises.find(e => e.exerciseId === currentExerciseId)?.sets || []}
      getLastWeekData={getLastWeekData}
    />
  );
}

// ============================================================================
// EXERCISE VIEW
// ============================================================================

function ExerciseView({ exercise, tier, config, program, restTimer, onLogSet, onNext, onCancel, currentSets, getLastWeekData }) {
  const [warmupSets, setWarmupSets] = useState([]);
  const [currentSet, setCurrentSet] = useState(1);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [isAmrap, setIsAmrap] = useState(false);
  const [lastWeekData, setLastWeekData] = useState(null);
  const [showWarmup, setShowWarmup] = useState(true);

  const workingSets = currentSets.filter(s => !s.isWarmup);
  const suggestedWeight = program.startingWeights[exercise.id] || 135;

  useEffect(() => {
    loadLastWeekData();
  }, [exercise.id]);

  async function loadLastWeekData() {
    const data = await getLastWeekData(exercise.id);
    setLastWeekData(data);
  }

  // Auto-fill suggested values for working sets
  useEffect(() => {
    if (!showWarmup && workingSets.length < config.sets) {
      // Use last set's weight if available, otherwise use suggested weight
      const lastWeight = workingSets.length > 0
        ? workingSets[workingSets.length - 1].weight
        : suggestedWeight;

      setWeight(lastWeight.toString());
      setReps(config.reps.toString());

      // Auto-check AMRAP if this is the AMRAP set
      if (workingSets.length + 1 === config.amrapSet) {
        setIsAmrap(true);
      }
    }
  }, [workingSets.length, showWarmup, suggestedWeight, config.reps, config.amrapSet, config.sets]);

  function logSet(isWarmupSet = false) {
    if (!weight || !reps) return;

    const setData = {
      setNumber: isWarmupSet ? warmupSets.length + 1 : workingSets.length + 1,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      isWarmup: isWarmupSet,
      isAmrap: isAmrap
    };

    if (isWarmupSet) {
      setWarmupSets(prev => [...prev, setData]);
      // Clear for next warm-up set
      setWeight('');
      setReps('');
    } else {
      onLogSet(setData);
      setCurrentSet(prev => prev + 1);
      // Don't clear - will auto-fill with same weight in useEffect
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={onCancel} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold text-gray-900">{exercise.name}</h2>
              <p className="text-sm text-gray-600">{tier} - {config.sets} x {config.reps}+</p>
            </div>
            <button onClick={onNext} className="bg-blue-500 text-white px-4 py-2 rounded">
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {restTimer !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Rest Timer</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatTime(restTimer)}</div>
          </div>
        )}

        {lastWeekData && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Last Week</h3>
            <div className="flex gap-2 flex-wrap">
              {lastWeekData.sets.filter(s => !s.isWarmup).map((s, i) => (
                <div key={i} className="bg-gray-100 px-3 py-1 rounded text-sm">
                  {s.weight} × {s.reps}
                  {s.isAmrap && <span className="text-blue-600 ml-1">+</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {showWarmup && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Warm-up Sets</h3>
              <button
                onClick={() => setShowWarmup(false)}
                className="text-sm text-blue-600"
              >
                Skip
              </button>
            </div>

            {warmupSets.map((s, i) => (
              <div key={i} className="bg-gray-50 p-3 rounded mb-2 flex items-center justify-between">
                <span className="text-gray-600">Set {i + 1}</span>
                <span className="font-semibold">{s.weight} lbs × {s.reps}</span>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reps</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              onClick={() => logSet(true)}
              disabled={!weight || !reps}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded font-semibold disabled:opacity-50"
            >
              Log Warm-up Set
            </button>

            {warmupSets.length > 0 && (
              <button
                onClick={() => setShowWarmup(false)}
                className="w-full mt-2 text-blue-600 text-sm"
              >
                Continue to Working Sets
              </button>
            )}
          </div>
        )}

        {!showWarmup && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Working Sets</h3>

            {workingSets.map((s, i) => (
              <div key={i} className="bg-green-50 border border-green-200 p-3 rounded mb-2 flex items-center justify-between">
                <span className="text-gray-600">Set {i + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.weight} lbs × {s.reps}</span>
                  {s.isAmrap && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">AMRAP</span>}
                </div>
              </div>
            ))}

            {workingSets.length < config.sets && (
              <>
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Set {workingSets.length + 1} of {config.sets}
                    {workingSets.length + 1 === config.amrapSet && (
                      <span className="ml-2 text-blue-600 font-semibold">AMRAP</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Weight (lbs)</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded font-semibold"
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => setWeight((parseFloat(weight) || 0) - 5)}
                          className="flex-1 px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => setWeight((parseFloat(weight) || 0) + 5)}
                          className="flex-1 px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => setWeight((parseFloat(weight) || 0) + 10)}
                          className="flex-1 px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reps</label>
                      <input
                        type="number"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded font-semibold"
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => setReps(Math.max(1, (parseInt(reps) || 0) - 1))}
                          className="flex-1 px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => setReps((parseInt(reps) || 0) + 1)}
                          className="flex-1 px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>

                  {workingSets.length + 1 === config.amrapSet && (
                    <label className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={isAmrap}
                        onChange={(e) => setIsAmrap(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Mark as AMRAP</span>
                    </label>
                  )}

                  <button
                    onClick={() => logSet(false)}
                    className="w-full bg-blue-500 text-white py-3 rounded font-semibold"
                  >
                    Log Set ({weight} lbs × {reps} reps)
                  </button>
                </div>
              </>
            )}

            {workingSets.length >= config.sets && (
              <button
                onClick={onNext}
                className="w-full bg-green-500 text-white py-3 rounded font-semibold"
              >
                Complete Exercise
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXERCISE LIBRARY
// ============================================================================

function ExerciseLibrary({ exercises, onSave, onBack }) {
  const [editing, setEditing] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    tier: 'T1',
    muscleGroups: '',
    equipment: ''
  });

  function addExercise() {
    if (!newExercise.name) return;

    const id = newExercise.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const updated = {
      ...exercises,
      [id]: {
        id,
        name: newExercise.name,
        tier: newExercise.tier,
        muscleGroups: newExercise.muscleGroups.split(',').map(s => s.trim()).filter(Boolean),
        equipment: newExercise.equipment,
        isCustom: true,
        isArchived: false
      }
    };

    onSave(updated);
    setNewExercise({ name: '', tier: 'T1', muscleGroups: '', equipment: '' });
    setEditing(false);
  }

  const exerciseList = Object.values(exercises).filter(e => !e.isArchived);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          <Plus className="w-5 h-5" />
          Add Exercise
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">New Exercise</h3>
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={newExercise.name}
              onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Exercise name"
              className="w-full px-4 py-2 border border-gray-300 rounded"
            />
            <select
              value={newExercise.tier}
              onChange={(e) => setNewExercise(prev => ({ ...prev, tier: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded"
            >
              <option value="T1">T1 (Main Compound)</option>
              <option value="T2">T2 (Secondary)</option>
              <option value="T3">T3 (Accessory)</option>
            </select>
            <input
              type="text"
              value={newExercise.muscleGroups}
              onChange={(e) => setNewExercise(prev => ({ ...prev, muscleGroups: e.target.value }))}
              placeholder="Muscle groups (comma separated)"
              className="w-full px-4 py-2 border border-gray-300 rounded"
            />
            <input
              type="text"
              value={newExercise.equipment}
              onChange={(e) => setNewExercise(prev => ({ ...prev, equipment: e.target.value }))}
              placeholder="Equipment"
              className="w-full px-4 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={addExercise}
              disabled={!newExercise.name}
              className="flex-1 bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {['T1', 'T2', 'T3'].map(tier => {
        const tierExercises = exerciseList.filter(e => e.tier === tier);

        return (
          <div key={tier} className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h3 className="font-bold text-gray-900 mb-4">{tier} Exercises</h3>
            <div className="space-y-2">
              {tierExercises.map(ex => (
                <div key={ex.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-semibold text-gray-900">{ex.name}</div>
                    <div className="text-sm text-gray-500">
                      {ex.muscleGroups.join(', ')} • {ex.equipment}
                    </div>
                  </div>
                  {ex.isCustom && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Custom</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
