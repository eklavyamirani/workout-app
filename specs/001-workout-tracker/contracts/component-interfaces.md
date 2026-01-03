# Component API Contracts

**Date**: 2026-01-03  
**Phase**: 1 - React Component Interface Design  

## Component Architecture

The application follows a component-driven architecture with clear prop interfaces, event handlers, and state management patterns. Each component is designed for reusability and testability.

## Workout Logging Components

### WorkoutSession Component
```typescript
interface WorkoutSessionProps {
  workoutId?: string;          // Optional existing workout ID
  templateId?: string;         // Optional template to start from
  onWorkoutComplete: (workout: Workout) => void;
  onWorkoutSave: (workout: Workout) => void;
  onCancel: () => void;
}

interface WorkoutSessionState {
  workout: Workout;
  currentExerciseIndex: number;
  isTimerRunning: boolean;
  elapsedTime: number;
}
```

### ExerciseLogger Component
```typescript
interface ExerciseLoggerProps {
  exercise: WorkoutExercise;
  exerciseDefinition: Exercise;
  previousSets?: Set[];        // Last workout's sets for reference
  isActive: boolean;           // Whether this exercise is currently active
  onSetComplete: (set: Set) => void;
  onSetUpdate: (setId: string, updates: Partial<Set>) => void;
  onSetDelete: (setId: string) => void;
  onAddSet: () => void;
  onNotesChange: (notes: string) => void;
}
```

### SetLogger Component
```typescript
interface SetLoggerProps {
  set: Set;
  setNumber: number;
  previousSet?: Set;           // Previous set for auto-suggestion
  isEditing: boolean;
  onUpdate: (updates: Partial<Set>) => void;
  onComplete: () => void;
  onDelete: () => void;
  onStartTimer: (duration: number) => void;
}
```

### RestTimer Component
```typescript
interface RestTimerProps {
  duration: number;            // Timer duration in seconds
  autoStart?: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
  className?: string;
}

interface RestTimerState {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
}
```

## Exercise Library Components

### ExerciseLibrary Component
```typescript
interface ExerciseLibraryProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  onExerciseEdit?: (exercise: Exercise) => void;
  onExerciseCreate?: () => void;
  selectionMode?: boolean;     // For exercise selection in workouts
  selectedExercises?: string[]; // Currently selected exercise IDs
}

interface ExerciseLibraryState {
  exercises: Exercise[];
  filteredExercises: Exercise[];
  searchQuery: string;
  categoryFilter: ExerciseCategory | null;
  muscleGroupFilter: MuscleGroup | null;
  equipmentFilter: Equipment | null;
  showArchived: boolean;
}
```

### ExerciseCard Component
```typescript
interface ExerciseCardProps {
  exercise: Exercise;
  variant: 'list' | 'grid' | 'minimal';
  isSelected?: boolean;
  showActions?: boolean;
  onSelect?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
  onArchive?: (exercise: Exercise) => void;
  onView?: (exercise: Exercise) => void;
}
```

### ExerciseForm Component
```typescript
interface ExerciseFormProps {
  exercise?: Exercise;         // For editing existing exercise
  onSubmit: (exercise: CreateExerciseRequest | UpdateExerciseRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface ExerciseFormState {
  formData: ExerciseFormData;
  errors: FormErrors;
  isDirty: boolean;
}

interface ExerciseFormData {
  name: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  instructions: string;
}
```

## Template Components

### TemplateList Component
```typescript
interface TemplateListProps {
  templates: Template[];
  onTemplateSelect?: (template: Template) => void;
  onTemplateEdit?: (template: Template) => void;
  onTemplateDelete?: (template: Template) => void;
  onTemplateClone?: (template: Template) => void;
  onCreateNew?: () => void;
  selectionMode?: boolean;
}
```

### TemplateEditor Component
```typescript
interface TemplateEditorProps {
  template?: Template;         // For editing existing template
  onSave: (template: CreateTemplateRequest | UpdateTemplateRequest) => Promise<void>;
  onCancel: () => void;
  workoutId?: string;         // For creating template from workout
}

interface TemplateEditorState {
  templateData: TemplateFormData;
  exercises: TemplateExercise[];
  isDirty: boolean;
  errors: FormErrors;
}
```

### TemplateExerciseBuilder Component
```typescript
interface TemplateExerciseBuilderProps {
  exercise: TemplateExercise;
  availableExercises: Exercise[];
  onExerciseChange: (exerciseId: string) => void;
  onSetsChange: (sets: TemplateSet[]) => void;
  onNotesChange: (notes: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}
```

## Progress and Analytics Components

### ProgressChart Component
```typescript
interface ProgressChartProps {
  exerciseId: string;
  timeframe: TimeFrame;
  chartType: 'weight' | 'volume' | 'estimated-max';
  height?: number;
  showTrendline?: boolean;
  onDataPointClick?: (dataPoint: ProgressDataPoint) => void;
}

interface ProgressDataPoint {
  date: Date;
  value: number;
  workoutId: string;
  context?: string;
}
```

### PersonalRecordsList Component
```typescript
interface PersonalRecordsListProps {
  exerciseId?: string;         // Show PRs for specific exercise or all
  recordType?: PRType;         // Filter by record type
  limit?: number;             // Limit number of records shown
  onRecordClick?: (record: PersonalRecord) => void;
  showExerciseNames?: boolean; // Show exercise names for all PRs view
}
```

### WeeklyRecap Component
```typescript
interface WeeklyRecapProps {
  week: Date;
  comparison?: Date;          // Week to compare against
  onWeekChange: (week: Date) => void;
  onExerciseClick?: (exerciseId: string) => void;
  onWorkoutClick?: (workoutId: string) => void;
}

interface WeeklyRecapData {
  recap: WeeklyRecap;
  comparison?: WeekComparison;
  isLoading: boolean;
  error?: string;
}
```

## Program Components

### ProgramList Component
```typescript
interface ProgramListProps {
  programs: Program[];
  activeProgram?: Program;
  onProgramSelect: (program: Program) => void;
  onProgramStart: (program: Program) => void;
  onProgramEdit: (program: Program) => void;
  onProgramDelete: (program: Program) => void;
  onCreateNew: () => void;
}
```

### ProgramBuilder Component
```typescript
interface ProgramBuilderProps {
  program?: Program;          // For editing existing program
  availableTemplates: Template[];
  onSave: (program: CreateProgramRequest | UpdateProgramRequest) => Promise<void>;
  onCancel: () => void;
}

interface ProgramBuilderState {
  programData: ProgramFormData;
  weeks: ProgramWeek[];
  currentWeek: number;
  errors: FormErrors;
}
```

### ProgramTracker Component
```typescript
interface ProgramTrackerProps {
  program: Program;
  onWorkoutStart: (template: Template) => void;
  onProgramPause: () => void;
  onProgramRestart: () => void;
  onWeightAdjust: (exerciseId: string, newWeight: number) => void;
}

interface ProgramTrackerState {
  currentWeek: ProgramWeek;
  currentDay: ProgramDay;
  nextWorkout?: Template;
  progress: ProgramProgress;
}
```

## Common UI Components

### LoadingSpinner Component
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  overlay?: boolean;         // Show as overlay
  className?: string;
}
```

### ConfirmDialog Component
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}
```

### Toast Component
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### SearchInput Component
```typescript
interface SearchInputProps {
  value: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  suggestions?: string[];
  debounceMs?: number;
}
```

### FilterChips Component
```typescript
interface FilterChipsProps {
  filters: FilterOption[];
  selectedFilters: string[];
  onFilterToggle: (filterId: string) => void;
  onClearAll: () => void;
  variant?: 'default' | 'outlined';
}

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}
```

## Data Display Components

### DataTable Component
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}
```

### StatsCard Component
```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'accent';
}
```

## Form Components

### NumberInput Component
```typescript
interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  quickValues?: number[];     // Quick selection buttons
}
```

### AutoSuggestInput Component
```typescript
interface AutoSuggestInputProps {
  value: string;
  suggestions: string[];
  onValueChange: (value: string) => void;
  onSuggestionSelect: (suggestion: string) => void;
  placeholder?: string;
  error?: string;
  maxSuggestions?: number;
}
```

## Hook Interfaces

### Custom Hook Contracts
```typescript
// Workout management hook
interface UseWorkoutReturn {
  currentWorkout: Workout | null;
  isLoading: boolean;
  error: string | null;
  startWorkout: (templateId?: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  addSet: (exerciseId: string, set: CreateSetRequest) => Promise<void>;
  updateSet: (setId: string, updates: Partial<Set>) => Promise<void>;
  completeWorkout: () => Promise<void>;
  saveWorkout: () => Promise<void>;
}

// Personal records hook
interface UsePersonalRecordsReturn {
  personalRecords: PersonalRecord[];
  isLoading: boolean;
  error: string | null;
  checkForNewPRs: (workoutId: string) => Promise<PersonalRecord[]>;
  getExercisePRs: (exerciseId: string) => PersonalRecord[];
  refreshPRs: () => Promise<void>;
}

// Storage hook
interface UseStorageReturn {
  isAvailable: boolean;
  storageInfo: StorageInfo;
  save: <T>(key: string, data: T) => Promise<void>;
  load: <T>(key: string) => Promise<T | null>;
  remove: (key: string) => Promise<void>;
}
```

This component contract specification ensures consistent interfaces across all React components and provides clear guidelines for component development and testing.