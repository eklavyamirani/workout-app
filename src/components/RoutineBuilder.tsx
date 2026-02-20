import React, { useState } from 'react';
import { Plus, X, Copy, Search, ChevronRight, Video } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type {
  BalletExercise,
  BalletSection,
  BalletMovement,
  RoutineEntry,
} from '../types';
import { DEFAULT_BALLET_EXERCISES } from '../types';
import { SortableList } from './SortableList';
import { SortableItem } from './SortableItem';
import { ExerciseReferencePopover } from './ExerciseReferencePopover';

const SECTION_LABELS: Record<BalletSection, string> = {
  barre: 'Barre',
  center: 'Center',
  pointe: 'Pointe',
  cooldown: 'Cool-down',
};

interface RoutineBuilderProps {
  routines: RoutineEntry[];
  onRoutinesChange: (routines: RoutineEntry[]) => void;
  compact?: boolean;
}

export function RoutineBuilder({ routines, onRoutinesChange, compact }: RoutineBuilderProps) {
  // Modal state
  const [addMovementTarget, setAddMovementTarget] = useState<string | null>(null);
  const [movementSearch, setMovementSearch] = useState('');
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineSection, setNewRoutineSection] = useState<BalletSection>('barre');
  const [referenceTarget, setReferenceTarget] = useState<{ id: string; name: string } | null>(null);

  // --- Routine operations ---
  function addRoutine() {
    if (!newRoutineName.trim()) return;
    const routine: RoutineEntry = {
      id: `routine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: newRoutineName.trim(),
      section: newRoutineSection,
      notes: '',
      movements: [],
      collapsed: false,
    };
    onRoutinesChange([...routines, routine]);
    setNewRoutineName('');
    setShowAddRoutine(false);
  }

  function removeRoutine(routineId: string) {
    onRoutinesChange(routines.filter(r => r.id !== routineId));
  }

  function updateRoutineName(routineId: string, name: string) {
    onRoutinesChange(routines.map(r => r.id === routineId ? { ...r, name } : r));
  }

  function updateRoutineNotes(routineId: string, notes: string) {
    onRoutinesChange(routines.map(r => r.id === routineId ? { ...r, notes } : r));
  }

  function toggleRoutineCollapse(routineId: string) {
    onRoutinesChange(routines.map(r => r.id === routineId ? { ...r, collapsed: !r.collapsed } : r));
  }

  function handleReorderRoutines(oldIndex: number, newIndex: number) {
    onRoutinesChange(arrayMove(routines, oldIndex, newIndex));
  }

  // --- Movement operations ---
  function addMovement(routineId: string, exercise: BalletExercise) {
    onRoutinesChange(routines.map(r => {
      if (r.id !== routineId) return r;
      return { ...r, movements: [...r.movements, { id: `${exercise.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: exercise.name }] };
    }));
    setAddMovementTarget(null);
    setMovementSearch('');
  }

  function removeMovement(routineId: string, movementIndex: number) {
    onRoutinesChange(routines.map(r => {
      if (r.id !== routineId) return r;
      return { ...r, movements: r.movements.filter((_, i) => i !== movementIndex) };
    }));
  }

  function duplicateMovement(routineId: string, movementIndex: number) {
    onRoutinesChange(routines.map(r => {
      if (r.id !== routineId) return r;
      const movements = [...r.movements];
      const original = movements[movementIndex];
      movements.splice(movementIndex + 1, 0, { ...original, id: `${original.id.split('_')[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });
      return { ...r, movements };
    }));
  }

  function handleReorderMovements(routineId: string, oldIndex: number, newIndex: number) {
    onRoutinesChange(routines.map(r => {
      if (r.id !== routineId) return r;
      return { ...r, movements: arrayMove(r.movements, oldIndex, newIndex) };
    }));
  }

  // Filtered library for add-movement modal
  const filteredLibrary = movementSearch.trim()
    ? DEFAULT_BALLET_EXERCISES.filter(e =>
        e.name.toLowerCase().includes(movementSearch.toLowerCase()) ||
        e.section.toLowerCase().includes(movementSearch.toLowerCase())
      )
    : DEFAULT_BALLET_EXERCISES;

  const routineIds = routines.map(r => r.id);

  return (
    <>
      {/* Add Routine button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowAddRoutine(true)}
          className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-600 font-medium"
        >
          <Plus className="w-4 h-4" />
          Routine
        </button>
      </div>

      {/* Routines list with DnD */}
      <SortableList items={routineIds} onReorder={handleReorderRoutines}>
        <div className="space-y-3">
          {routines.map((routine) => {
            const movementIds = routine.movements.map((movement) => movement.id);

            return (
              <SortableItem key={routine.id} id={routine.id}>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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

                    <button
                      onClick={() => removeRoutine(routine.id)}
                      className="p-1 text-gray-300 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Routine content (collapsible) */}
                  {!routine.collapsed && (
                    <div className={compact ? 'p-2 space-y-2' : 'p-3 space-y-3'}>
                      {/* Routine notes */}
                      <textarea
                        value={routine.notes}
                        onChange={(e) => updateRoutineNotes(routine.id, e.target.value)}
                        placeholder="Notes for this routine..."
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        rows={2}
                      />

                      {/* Movements with DnD */}
                      {routine.movements.length > 0 && (
                        <SortableList
                          items={movementIds}
                          onReorder={(oldIdx, newIdx) => handleReorderMovements(routine.id, oldIdx, newIdx)}
                        >
                          <div className="space-y-1">
                            {routine.movements.map((movement, mvIdx) => (
                              <SortableItem
                                key={movement.id}
                                id={movement.id}
                                handleSize="sm"
                              >
                                <div className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-gray-50">
                                  <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">
                                    {mvIdx + 1}
                                  </span>
                                  <span className="flex-1 text-sm text-gray-800 truncate">
                                    {movement.name}
                                  </span>

                                  {/* Movement actions - always visible for touch */}
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => setReferenceTarget({ id: movement.id.replace(/_\d+_[a-z0-9]+$/, ''), name: movement.name })}
                                      className="p-1 text-gray-300 hover:text-purple-500"
                                      title="Reference"
                                    >
                                      <Video className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => duplicateMovement(routine.id, mvIdx)}
                                      className="p-1 text-gray-300 hover:text-purple-500"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-3 h-3" />
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
                              </SortableItem>
                            ))}
                          </div>
                        </SortableList>
                      )}

                      {routine.movements.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No movements yet</p>
                      )}

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
              </SortableItem>
            );
          })}
        </div>
      </SortableList>

      {routines.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No routines yet. Add one to get started.</p>
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

      {/* Exercise Reference Popover */}
      {referenceTarget && (
        <ExerciseReferencePopover
          exerciseId={referenceTarget.id}
          exerciseName={referenceTarget.name}
          onClose={() => setReferenceTarget(null)}
        />
      )}
    </>
  );
}
