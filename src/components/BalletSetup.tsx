import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, X } from 'lucide-react';
import type {
  Program,
  Activity,
  ScheduleConfig,
  BalletClassType,
  BalletLevel,
  BalletExercise,
  BalletSection,
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

interface ExerciseEntry {
  exercise: BalletExercise;
  description: string;
  enabled: boolean;
}

export function BalletSetup({ onComplete, onCancel }: BalletSetupProps) {
  const [step, setStep] = useState(1);
  const [classType, setClassType] = useState<BalletClassType | null>(null);
  const [level, setLevel] = useState<BalletLevel | null>(null);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [programName, setProgramName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleConfig['mode']>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(3);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addMode, setAddMode] = useState<'library' | 'custom'>('library');
  const [librarySearch, setLibrarySearch] = useState('');
  const [customExercises, setCustomExercises] = useState<BalletExercise[]>([]);
  const [newCustom, setNewCustom] = useState({
    name: '',
    section: 'center' as BalletSection,
    levels: ['beginner', 'intermediate', 'advanced'] as BalletLevel[],
  });

  function handleSelectLevel(selectedLevel: BalletLevel) {
    setLevel(selectedLevel);
    const selected = getBalletExercisesForClass(classType!, selectedLevel);
    setExercises(selected.map(e => ({ exercise: e, description: '', enabled: true })));

    const classLabel = CLASS_TYPES.find(c => c.type === classType)?.label || 'Ballet';
    const levelLabel = LEVELS.find(l => l.level === selectedLevel)?.label || '';
    setProgramName(`${levelLabel} ${classLabel}`);
  }

  function toggleExercise(index: number) {
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, enabled: !e.enabled } : e));
  }

  function updateDescription(index: number, description: string) {
    setExercises(prev => prev.map((e, i) =>
      i === index ? { ...e, description } : e
    ));
  }

  function removeExercise(index: number) {
    setExercises(prev => prev.filter((_, i) => i !== index));
  }

  function addExercise(exercise: BalletExercise) {
    setExercises(prev => [...prev, { exercise, description: '', enabled: true }]);
    setShowAddExercise(false);
    setLibrarySearch('');
    setAddMode('library');
  }

  function addCustomExercise() {
    if (!newCustom.name.trim()) return;
    const id = `custom_${newCustom.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const exercise: BalletExercise = {
      id,
      name: newCustom.name.trim(),
      section: newCustom.section,
      defaultDuration: 0,
      levels: newCustom.levels,
    };
    setCustomExercises(prev => [...prev, exercise]);
    setExercises(prev => [...prev, { exercise, description: '', enabled: true }]);
    setNewCustom({ name: '', section: 'center', levels: ['beginner', 'intermediate', 'advanced'] });
    setShowAddExercise(false);
    setAddMode('library');
  }

  function toggleCustomLevel(lvl: BalletLevel) {
    setNewCustom(prev => ({
      ...prev,
      levels: prev.levels.includes(lvl)
        ? prev.levels.filter(l => l !== lvl)
        : [...prev.levels, lvl],
    }));
  }

  function toggleDay(day: number) {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  }

  function handleComplete() {
    const programId = `program_${Date.now()}`;
    const enabledExercises = exercises.filter(e => e.enabled);

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

    const programActivities: Activity[] = enabledExercises.map(e => ({
      id: `${programId}_${e.exercise.id}`,
      name: e.exercise.name,
      programId,
      trackingType: 'completion' as const,
      description: e.description || undefined,
    }));

    onComplete(program, programActivities);
  }

  const enabledCount = exercises.filter(e => e.enabled).length;
  const canProceedStep3 = enabledCount > 0;
  const canProceedStep4 = scheduleMode === 'flexible' ||
    (scheduleMode === 'weekly' && daysOfWeek.length > 0) ||
    (scheduleMode === 'interval' && intervalDays > 0);

  // Available exercises not already in the list (presets + previously created customs)
  const allKnownExercises = [...DEFAULT_BALLET_EXERCISES, ...customExercises];
  const availableToAdd = allKnownExercises.filter(
    e => !exercises.some(ex => ex.exercise.id === e.id)
  );
  const filteredLibrary = librarySearch.trim()
    ? availableToAdd.filter(e =>
        e.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
        e.section.toLowerCase().includes(librarySearch.toLowerCase())
      )
    : availableToAdd;

  // Group exercises by section for display
  const sections = exercises.reduce<Record<string, ExerciseEntry[]>>((acc, entry) => {
    const section = entry.exercise.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(entry);
    return acc;
  }, {});

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

        {/* Step 3: Review & Customize Exercises */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review your class</h2>
                <p className="text-sm text-gray-500">
                  {enabledCount} exercises
                </p>
              </div>
              <button
                onClick={() => setShowAddExercise(true)}
                className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-600"
              >
                <Plus className="w-4 h-4" />
                Add
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

            {Object.entries(sections).map(([section, entries]) => (
              <div key={section} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {SECTION_LABELS[section as BalletSection]}
                </h3>
                {entries.map((entry) => {
                  const globalIndex = exercises.indexOf(entry);
                  return (
                    <div
                      key={entry.exercise.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        entry.enabled
                          ? 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExercise(globalIndex)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            entry.enabled
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {entry.enabled && <Check className="w-3 h-3 text-white" />}
                        </button>

                        <span className="flex-1 font-medium text-gray-900 text-sm">
                          {entry.exercise.name}
                        </span>

                        <button
                          onClick={() => removeExercise(globalIndex)}
                          className="p-1 text-gray-300 hover:text-red-400 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {entry.enabled && (
                        <div className="mt-2 ml-8">
                          <textarea
                            value={entry.description}
                            onChange={(e) => updateDescription(globalIndex, e.target.value)}
                            placeholder="Describe the routine/combination, e.g., tombé pas de bourrée, step into 4th, retiré, 2 balancés..."
                            className="w-full p-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

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

        {/* Add Exercise Modal */}
        {showAddExercise && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Add Exercise</h3>
                <button onClick={() => { setShowAddExercise(false); setAddMode('library'); setLibrarySearch(''); }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setAddMode('library')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    addMode === 'library'
                      ? 'text-purple-600 border-b-2 border-purple-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Library
                </button>
                <button
                  onClick={() => setAddMode('custom')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    addMode === 'custom'
                      ? 'text-purple-600 border-b-2 border-purple-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Create Custom
                </button>
              </div>

              {addMode === 'library' && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="Search movements..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {filteredLibrary.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => addExercise(exercise)}
                        className="w-full p-3 rounded-lg border border-gray-200 text-left hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{exercise.name}</div>
                        <div className="text-xs text-gray-500">
                          {SECTION_LABELS[exercise.section]}
                        </div>
                      </button>
                    ))}
                    {filteredLibrary.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-gray-500 text-sm">
                          {librarySearch ? `No matches for "${librarySearch}"` : 'All exercises already added'}
                        </p>
                        <button
                          onClick={() => setAddMode('custom')}
                          className="mt-2 text-sm text-purple-500 hover:text-purple-600"
                        >
                          Create a custom exercise instead
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {addMode === 'custom' && (
                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exercise name</label>
                    <input
                      type="text"
                      value={newCustom.name}
                      onChange={(e) => setNewCustom({ ...newCustom, name: e.target.value })}
                      placeholder="e.g., Pas de bourrée en tournant"
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
                          onClick={() => setNewCustom({ ...newCustom, section: sec })}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                            newCustom.section === sec
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {SECTION_LABELS[sec]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Levels</label>
                    <div className="flex gap-2">
                      {(['beginner', 'intermediate', 'advanced'] as BalletLevel[]).map(lvl => (
                        <button
                          key={lvl}
                          onClick={() => toggleCustomLevel(lvl)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                            newCustom.levels.includes(lvl)
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={addCustomExercise}
                    disabled={!newCustom.name.trim() || newCustom.levels.length === 0}
                    className="w-full py-3 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
                  >
                    Add Exercise
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
