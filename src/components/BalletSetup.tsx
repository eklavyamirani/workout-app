import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, X, ChevronUp, ChevronDown, Copy, Search, ChevronRight } from 'lucide-react';
import type {
  Program,
  Activity,
  ScheduleConfig,
  BalletClassType,
  BalletLevel,
  BalletExercise,
  BalletSection,
  BalletMovement,
} from '../types';
import { getBalletExercisesForClass, DEFAULT_BALLET_EXERCISES } from '../types';

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

interface RoutineEntry {
  id: string;
  name: string;
  section: BalletSection;
  notes: string;
  movements: BalletMovement[];
  collapsed: boolean;
}

export function BalletSetup({ onComplete, onCancel }: BalletSetupProps) {
  const [step, setStep] = useState(1);
  const [classType, setClassType] = useState<BalletClassType | null>(null);
  const [level, setLevel] = useState<BalletLevel | null>(null);
  const [routines, setRoutines] = useState<RoutineEntry[]>([]);
  const [programName, setProgramName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleConfig['mode']>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(3);

  // Modal state
  const [addMovementTarget, setAddMovementTarget] = useState<string | null>(null); // routine id
  const [movementSearch, setMovementSearch] = useState('');
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineSection, setNewRoutineSection] = useState<BalletSection>('barre');

  function handleSelectLevel(selectedLevel: BalletLevel) {
    setLevel(selectedLevel);
    const selected = getBalletExercisesForClass(classType!, selectedLevel);

    // Group exercises by section to create default routines
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

  // --- Routine operations ---
  function addRoutine() {
    if (!newRoutineName.trim()) return;
    const routine: RoutineEntry = {
      id: `routine_${Date.now()}`,
      name: newRoutineName.trim(),
      section: newRoutineSection,
      notes: '',
      movements: [],
      collapsed: false,
    };
    setRoutines(prev => [...prev, routine]);
    setNewRoutineName('');
    setShowAddRoutine(false);
  }

  function removeRoutine(routineId: string) {
    setRoutines(prev => prev.filter(r => r.id !== routineId));
  }

  function updateRoutineName(routineId: string, name: string) {
    setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, name } : r));
  }

  function updateRoutineNotes(routineId: string, notes: string) {
    setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, notes } : r));
  }

  function toggleRoutineCollapse(routineId: string) {
    setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, collapsed: !r.collapsed } : r));
  }

  function moveRoutine(routineId: string, direction: 'up' | 'down') {
    setRoutines(prev => {
      const idx = prev.findIndex(r => r.id === routineId);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }

  // --- Movement operations within a routine ---
  function addMovement(routineId: string, exercise: BalletExercise) {
    setRoutines(prev => prev.map(r => {
      if (r.id !== routineId) return r;
      return {
        ...r,
        movements: [...r.movements, { id: exercise.id, name: exercise.name }],
      };
    }));
    setAddMovementTarget(null);
    setMovementSearch('');
  }

  function removeMovement(routineId: string, movementIndex: number) {
    setRoutines(prev => prev.map(r => {
      if (r.id !== routineId) return r;
      return {
        ...r,
        movements: r.movements.filter((_, i) => i !== movementIndex),
      };
    }));
  }

  function duplicateMovement(routineId: string, movementIndex: number) {
    setRoutines(prev => prev.map(r => {
      if (r.id !== routineId) return r;
      const movements = [...r.movements];
      const dup = { ...movements[movementIndex] };
      movements.splice(movementIndex + 1, 0, dup);
      return { ...r, movements };
    }));
  }

  function moveMovement(routineId: string, movementIndex: number, direction: 'up' | 'down') {
    setRoutines(prev => prev.map(r => {
      if (r.id !== routineId) return r;
      const newIdx = direction === 'up' ? movementIndex - 1 : movementIndex + 1;
      if (newIdx < 0 || newIdx >= r.movements.length) return r;
      const movements = [...r.movements];
      [movements[movementIndex], movements[newIdx]] = [movements[newIdx], movements[movementIndex]];
      return { ...r, movements };
    }));
  }

  // --- Schedule ---
  function toggleDay(day: number) {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }

  // --- Complete ---
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

  // Filtered library for add-movement modal
  const filteredLibrary = movementSearch.trim()
    ? DEFAULT_BALLET_EXERCISES.filter(e =>
        e.name.toLowerCase().includes(movementSearch.toLowerCase()) ||
        e.section.toLowerCase().includes(movementSearch.toLowerCase())
      )
    : DEFAULT_BALLET_EXERCISES;

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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Build your routines</h2>
                <p className="text-sm text-gray-500">
                  {routines.length} routine{routines.length !== 1 ? 's' : ''} &middot; {totalMovements} movement{totalMovements !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowAddRoutine(true)}
                className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-600 font-medium"
              >
                <Plus className="w-4 h-4" />
                Routine
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Program name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Routines list */}
            <div className="space-y-3">
              {routines.map((routine, routineIdx) => (
                <div key={routine.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Routine header */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-100">
                    <button
                      onClick={() => toggleRoutineCollapse(routine.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${!routine.collapsed ? 'rotate-90' : ''}`} />
                    </button>

                    <input
                      type="text"
                      value={routine.name}
                      onChange={(e) => updateRoutineName(routine.id, e.target.value)}
                      className="flex-1 text-sm font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900"
                    />

                    <span className="text-xs text-gray-400 px-1">
                      {routine.movements.length}
                    </span>

                    {/* Routine reorder buttons */}
                    <button
                      onClick={() => moveRoutine(routine.id, 'up')}
                      disabled={routineIdx === 0}
                      className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveRoutine(routine.id, 'down')}
                      disabled={routineIdx === routines.length - 1}
                      className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => removeRoutine(routine.id)}
                      className="p-1 text-gray-300 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Routine content (collapsible) */}
                  {!routine.collapsed && (
                    <div className="p-3 space-y-3">
                      {/* Routine notes */}
                      <textarea
                        value={routine.notes}
                        onChange={(e) => updateRoutineNotes(routine.id, e.target.value)}
                        placeholder="Notes for this routine..."
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        rows={2}
                      />

                      {/* Movements */}
                      {routine.movements.length > 0 && (
                        <div className="space-y-1">
                          {routine.movements.map((movement, mvIdx) => (
                            <div
                              key={`${movement.id}-${mvIdx}`}
                              className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 group"
                            >
                              <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">
                                {mvIdx + 1}
                              </span>
                              <span className="flex-1 text-sm text-gray-800">
                                {movement.name}
                              </span>

                              {/* Movement actions */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => duplicateMovement(routine.id, mvIdx)}
                                  className="p-1 text-gray-300 hover:text-purple-500"
                                  title="Duplicate"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => moveMovement(routine.id, mvIdx, 'up')}
                                  disabled={mvIdx === 0}
                                  className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => moveMovement(routine.id, mvIdx, 'down')}
                                  disabled={mvIdx === routine.movements.length - 1}
                                  className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => removeMovement(routine.id, mvIdx)}
                                  className="p-1 text-gray-300 hover:text-red-400"
                                  title="Remove"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {routine.movements.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No movements yet</p>
                      )}

                      {/* Add movement button */}
                      <button
                        onClick={() => { setAddMovementTarget(routine.id); setMovementSearch(''); }}
                        className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Add movement
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {routines.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No routines yet. Add one to get started.</p>
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

        {/* Add Movement Modal */}
        {addMovementTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Add Movement</h3>
                <button
                  onClick={() => { setAddMovementTarget(null); setMovementSearch(''); }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 py-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={movementSearch}
                    onChange={(e) => setMovementSearch(e.target.value)}
                    placeholder="Search movements..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-1">
                {filteredLibrary.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => addMovement(addMovementTarget, exercise)}
                    className="w-full py-2 px-3 rounded-lg text-left hover:bg-purple-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">{exercise.name}</div>
                    <div className="text-xs text-gray-400">{SECTION_LABELS[exercise.section]}</div>
                  </button>
                ))}
                {filteredLibrary.length === 0 && (
                  <p className="text-center py-6 text-gray-500 text-sm">
                    No matches for &ldquo;{movementSearch}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Routine Modal */}
        {showAddRoutine && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">New Routine</h3>
                <button
                  onClick={() => { setShowAddRoutine(false); setNewRoutineName(''); }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  placeholder="e.g., Petit Allegro Combo"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['barre', 'center', 'pointe', 'cooldown'] as BalletSection[]).map(sec => (
                    <button
                      key={sec}
                      onClick={() => setNewRoutineSection(sec)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                        newRoutineSection === sec
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {SECTION_LABELS[sec]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={addRoutine}
                disabled={!newRoutineName.trim()}
                className="w-full py-3 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
              >
                Add Routine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
