// Program Types
export type ProgramType = 'weightlifting' | 'gzclp' | 'ballet' | 'skill' | 'cardio' | 'custom';

export interface ScheduleConfig {
  mode: 'weekly' | 'interval' | 'flexible' | 'rotation';
  daysOfWeek?: number[];  // 0-6 for weekly mode (0 = Sunday)
  intervalDays?: number;  // e.g., every 2 days
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  schedule: ScheduleConfig;
  isActive: boolean;
  createdAt: string;
  // GZCLP specific
  currentWeek?: number;
  lastWorkoutDay?: number;  // 1-4 for GZCLP rotation
}

// GZCLP Types
export type GZCLPTier = 'T1' | 'T2' | 'T3';

export interface GZCLPConfig {
  tier: GZCLPTier;
  sets: number;
  reps: number;
  amrapSet: number;  // which set is AMRAP (usually last)
  weightIncrement: number;
  progressionThreshold: number;
}

export const GZCLP_CONFIGS: Record<GZCLPTier, GZCLPConfig> = {
  T1: { tier: 'T1', sets: 5, reps: 3, amrapSet: 5, weightIncrement: 5, progressionThreshold: 5 },
  T2: { tier: 'T2', sets: 3, reps: 10, amrapSet: 3, weightIncrement: 5, progressionThreshold: 10 },
  T3: { tier: 'T3', sets: 3, reps: 15, amrapSet: 3, weightIncrement: 5, progressionThreshold: 25 },
};

export interface GZCLPWorkoutDay {
  dayNumber: number;  // 1-4
  name: string;  // e.g., "Day 1 - Squat Focus"
  t1ExerciseId: string;
  t2ExerciseId: string;
  t3ExerciseIds: string[];
}

// Activity Types
export type TrackingType = 'sets-reps-weight' | 'duration' | 'completion' | 'custom';

export interface CustomField {
  name: string;
  type: 'number' | 'text' | 'duration' | 'checkbox';
}

export interface BalletMovement {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  name: string;
  programId: string;
  trackingType: TrackingType;
  customFields?: CustomField[];
  // For weightlifting/GZCLP
  muscleGroups?: string[];
  equipment?: string;
  tier?: GZCLPTier;
  startingWeight?: number;
  // For duration-based
  targetDuration?: number;  // minutes
  // For ballet routines - notes describing the routine
  description?: string;
  // For ballet routines - ordered list of movements
  movements?: BalletMovement[];
}

// Default GZCLP Exercise Library
export const DEFAULT_GZCLP_EXERCISES: Omit<Activity, 'programId'>[] = [
  // T1 Exercises
  { id: 'squat', name: 'Squat', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Quads', 'Glutes'], equipment: 'Barbell' },
  { id: 'bench', name: 'Bench Press', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Chest', 'Triceps'], equipment: 'Barbell' },
  { id: 'deadlift', name: 'Deadlift', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Back', 'Hamstrings'], equipment: 'Barbell' },
  { id: 'ohp', name: 'Overhead Press', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Barbell' },
  // T2 Exercises
  { id: 'rdl', name: 'Romanian Deadlift', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Hamstrings', 'Back'], equipment: 'Barbell' },
  { id: 'incline_bench', name: 'Incline Bench Press', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Chest', 'Shoulders'], equipment: 'Barbell' },
  { id: 'bb_row', name: 'Barbell Row', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Back', 'Biceps'], equipment: 'Barbell' },
  { id: 'front_squat', name: 'Front Squat', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Quads', 'Core'], equipment: 'Barbell' },
  { id: 'close_grip_bench', name: 'Close-Grip Bench Press', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Triceps', 'Chest'], equipment: 'Barbell' },
  // T3 Exercises
  { id: 'lat_pulldown', name: 'Lat Pulldown', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable' },
  { id: 'cable_fly', name: 'Cable Fly', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Chest'], equipment: 'Cable' },
  { id: 'leg_curl', name: 'Leg Curl', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Hamstrings'], equipment: 'Machine' },
  { id: 'leg_extension', name: 'Leg Extension', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Quads'], equipment: 'Machine' },
  { id: 'face_pull', name: 'Face Pull', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Shoulders', 'Back'], equipment: 'Cable' },
  { id: 'db_curl', name: 'Dumbbell Curl', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Biceps'], equipment: 'Dumbbell' },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Triceps'], equipment: 'Cable' },
];

// Ballet Types
export type BalletClassType = 'full' | 'barre-only' | 'center-only' | 'pointe';
export type BalletLevel = 'beginner' | 'intermediate' | 'advanced';
export type BalletSection = 'barre' | 'center' | 'pointe' | 'cooldown';

export interface BalletExercise {
  id: string;
  name: string;
  section: BalletSection;
  defaultDuration: number; // minutes
  levels: BalletLevel[];
}

export const DEFAULT_BALLET_EXERCISES: BalletExercise[] = [
  // ── Barre ──
  { id: 'plies', name: 'Pliés', section: 'barre', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'tendus', name: 'Tendus', section: 'barre', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'degages', name: 'Dégagés', section: 'barre', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'rond_de_jambe', name: 'Rond de jambe à terre', section: 'barre', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'rond_de_jambe_en_lair', name: 'Rond de jambe en l\'air', section: 'barre', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'fondus', name: 'Fondus', section: 'barre', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'frappes', name: 'Frappés', section: 'barre', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'petits_battements', name: 'Petits battements', section: 'barre', defaultDuration: 3, levels: ['intermediate', 'advanced'] },
  { id: 'adagio_barre', name: 'Adagio (Développés)', section: 'barre', defaultDuration: 6, levels: ['intermediate', 'advanced'] },
  { id: 'grand_battement', name: 'Grand battement', section: 'barre', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'releve_barre', name: 'Relevés', section: 'barre', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'port_de_bras_barre', name: 'Port de bras', section: 'barre', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'sous_sus', name: 'Sous-sus', section: 'barre', defaultDuration: 2, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'stretches_barre', name: 'Stretches at barre', section: 'barre', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'battement_cloche', name: 'Battement en cloche', section: 'barre', defaultDuration: 3, levels: ['intermediate', 'advanced'] },
  { id: 'passe_retire', name: 'Passé / Retiré', section: 'barre', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'attitude_barre', name: 'Attitudes', section: 'barre', defaultDuration: 3, levels: ['intermediate', 'advanced'] },
  { id: 'cambré', name: 'Cambré', section: 'barre', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },

  // ── Center: Adagio & Port de bras ──
  { id: 'adagio_center', name: 'Adagio', section: 'center', defaultDuration: 6, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'port_de_bras_center', name: 'Port de bras', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'arabesque_practice', name: 'Arabesque practice', section: 'center', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'developpe_center', name: 'Développés', section: 'center', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'promenade', name: 'Promenade', section: 'center', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'penche', name: 'Penché', section: 'center', defaultDuration: 3, levels: ['advanced'] },

  // ── Center: Turns ──
  { id: 'pirouettes', name: 'Pirouettes en dehors', section: 'center', defaultDuration: 8, levels: ['intermediate', 'advanced'] },
  { id: 'pirouettes_en_dedans', name: 'Pirouettes en dedans', section: 'center', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'chaines', name: 'Chaînés', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'pique_turns', name: 'Piqué turns', section: 'center', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'soutenus', name: 'Soutenu turns', section: 'center', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'fouettes', name: 'Fouetté turns', section: 'center', defaultDuration: 5, levels: ['advanced'] },

  // ── Center: Traveling & linking steps ──
  { id: 'pas_de_bourree', name: 'Pas de bourrée', section: 'center', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'balance', name: 'Balancé', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'glissade', name: 'Glissade', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'chasse', name: 'Chassé', section: 'center', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'waltz', name: 'Waltz steps', section: 'center', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'tombe_pas_de_bourree', name: 'Tombé-pas de bourrée', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'temps_lie', name: 'Temps lié', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'balance_en_tournant', name: 'Balancé en tournant', section: 'center', defaultDuration: 3, levels: ['intermediate', 'advanced'] },
  { id: 'pas_de_basque', name: 'Pas de basque', section: 'center', defaultDuration: 3, levels: ['intermediate', 'advanced'] },

  // ── Center: Petit allegro (small jumps) ──
  { id: 'petit_allegro', name: 'Petit allegro (combo)', section: 'center', defaultDuration: 8, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'saute', name: 'Sautés', section: 'center', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'changement', name: 'Changements', section: 'center', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'echappe_saute', name: 'Échappé sauté', section: 'center', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'assemble', name: 'Assemblé', section: 'center', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'jete', name: 'Jeté', section: 'center', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'pas_de_chat', name: 'Pas de chat', section: 'center', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'sissonne', name: 'Sissonne', section: 'center', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'soubresaut', name: 'Soubresaut', section: 'center', defaultDuration: 3, levels: ['intermediate', 'advanced'] },
  { id: 'entrechat', name: 'Entrechat', section: 'center', defaultDuration: 3, levels: ['advanced'] },
  { id: 'brise', name: 'Brisé', section: 'center', defaultDuration: 3, levels: ['advanced'] },
  { id: 'ballotte', name: 'Ballotté', section: 'center', defaultDuration: 3, levels: ['advanced'] },

  // ── Center: Grand allegro (big jumps) ──
  { id: 'grand_allegro', name: 'Grand allegro (combo)', section: 'center', defaultDuration: 8, levels: ['intermediate', 'advanced'] },
  { id: 'grand_jete', name: 'Grand jeté', section: 'center', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'jete_entrelace', name: 'Jeté entrelacé', section: 'center', defaultDuration: 4, levels: ['advanced'] },
  { id: 'tour_en_lair', name: 'Tour en l\'air', section: 'center', defaultDuration: 4, levels: ['advanced'] },
  { id: 'cabriole', name: 'Cabriole', section: 'center', defaultDuration: 4, levels: ['advanced'] },
  { id: 'grand_pas_de_chat', name: 'Grand pas de chat', section: 'center', defaultDuration: 3, levels: ['advanced'] },
  { id: 'saut_de_basque', name: 'Saut de basque', section: 'center', defaultDuration: 3, levels: ['advanced'] },

  // ── Center: Révérence ──
  { id: 'reverence', name: 'Révérence', section: 'center', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },

  // ── Pointe ──
  { id: 'releves_barre', name: 'Relevés at barre', section: 'pointe', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'echappes', name: 'Échappés relevé', section: 'pointe', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'bourrees', name: 'Bourrées', section: 'pointe', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'sus_sous_pointe', name: 'Sous-sus on pointe', section: 'pointe', defaultDuration: 3, levels: ['intermediate', 'advanced'] },
  { id: 'pique_pointe', name: 'Piqué on pointe', section: 'pointe', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'pointe_center', name: 'Pointe center work', section: 'pointe', defaultDuration: 10, levels: ['advanced'] },

  // ── Cool-down ──
  { id: 'floor_stretches', name: 'Floor stretches', section: 'cooldown', defaultDuration: 10, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'cooldown', name: 'Cool-down', section: 'cooldown', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
];

export function getBalletExercisesForClass(classType: BalletClassType, level: BalletLevel): BalletExercise[] {
  const exercises = DEFAULT_BALLET_EXERCISES.filter(e => e.levels.includes(level));

  switch (classType) {
    case 'full':
      return exercises.filter(e => e.section === 'barre' || e.section === 'center' || e.section === 'cooldown');
    case 'barre-only':
      return exercises.filter(e => e.section === 'barre' || e.section === 'cooldown');
    case 'center-only':
      return exercises.filter(e => e.section === 'center' || e.section === 'cooldown');
    case 'pointe':
      return exercises.filter(e => e.section === 'pointe' || e.section === 'cooldown');
  }
}

// Session Tracking
export type SessionStatus = 'completed' | 'skipped' | 'partial' | 'in-progress';

export interface SetLog {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
  isAmrap?: boolean;
  rpe?: number;  // 1-10 scale
  restDuration?: number;  // seconds
  timestamp: string;
}

export interface ActivityLog {
  activityId: string;
  trackingType: TrackingType;
  // For sets-reps-weight
  sets?: SetLog[];
  // For duration
  duration?: number;  // minutes
  // For completion
  completed?: boolean;
  // For custom fields
  customValues?: Record<string, string | number | boolean>;
  // Per-activity notes (e.g., combination details for ballet)
  notes?: string;
}

export interface Session {
  id: string;
  programId: string;
  date: string;  // ISO 8601 date
  status: SessionStatus;
  startTime?: string;  // ISO 8601 datetime
  endTime?: string;
  duration?: number;  // total minutes
  activities: ActivityLog[];
  notes?: string;
  practiceNext?: string;  // what to practice next session
  skipReason?: string;
}

// Scheduled Session (for calendar view)
export interface ScheduledSession {
  programId: string;
  programName: string;
  programType: ProgramType;
  date: string;
  activities: Activity[];
  session?: Session;  // filled if started/completed
}

// Ballet Glossary
export interface GlossaryEntry {
  term: string;
  pronunciation: string;
  description: string;
  searchQuery: string;  // for YouTube search
}

export const BALLET_GLOSSARY: GlossaryEntry[] = [
  // Barre fundamentals
  { term: 'Plié', pronunciation: 'plee-AY', description: 'Bending of the knees over the toes. Demi-plié is a half bend, grand plié is a full bend.', searchQuery: 'ballet plié tutorial beginner' },
  { term: 'Tendu', pronunciation: 'tahn-DOO', description: 'Stretching the leg along the floor until only the tip of the toe remains touching.', searchQuery: 'ballet tendu tutorial beginner' },
  { term: 'Dégagé', pronunciation: 'day-gah-ZHAY', description: 'Like tendu but the foot lifts slightly off the floor. A "disengaged" movement.', searchQuery: 'ballet dégagé tutorial beginner' },
  { term: 'Rond de jambe', pronunciation: 'rohn duh ZHAHMB', description: 'Circular movement of the leg on the floor (à terre) or in the air (en l\'air).', searchQuery: 'ballet rond de jambe tutorial' },
  { term: 'Fondu', pronunciation: 'fohn-DOO', description: 'A melting movement — slowly bending the supporting leg while extending the working leg.', searchQuery: 'ballet fondu tutorial' },
  { term: 'Frappé', pronunciation: 'frah-PAY', description: 'A striking action where the ball of the foot brushes the floor with a sharp, quick movement.', searchQuery: 'ballet frappé tutorial' },
  { term: 'Développé', pronunciation: 'dayv-law-PAY', description: 'Slowly unfolding the working leg to an extended position in the air.', searchQuery: 'ballet développé tutorial' },
  { term: 'Grand battement', pronunciation: 'grahn bat-MAHN', description: 'A large, swift leg kick maintaining a controlled upper body.', searchQuery: 'ballet grand battement tutorial' },
  { term: 'Relevé', pronunciation: 'ruh-leh-VAY', description: 'Rising up onto the balls of the feet (demi-pointe) or onto pointe.', searchQuery: 'ballet relevé tutorial beginner' },
  { term: 'Petits battements', pronunciation: 'puh-TEE bat-MAHN', description: 'Small, rapid beats of the working foot at the ankle of the supporting leg.', searchQuery: 'ballet petits battements tutorial' },
  { term: 'Battement en cloche', pronunciation: 'bat-MAHN ahn KLOSH', description: 'A bell-like swing of the leg, alternating grand battement front and back through first position.', searchQuery: 'ballet battement en cloche tutorial' },
  { term: 'Passé / Retiré', pronunciation: 'pah-SAY / ruh-tee-RAY', description: 'Drawing the foot up to the knee of the supporting leg. Passé is passing through; retiré is holding.', searchQuery: 'ballet passé retiré tutorial beginner' },
  { term: 'Attitude', pronunciation: 'ah-tee-TEWD', description: 'A position on one leg with the other lifted behind or in front, knee bent at about 90°.', searchQuery: 'ballet attitude position tutorial' },
  { term: 'Cambré', pronunciation: 'kahm-BRAY', description: 'A bending of the body from the waist — forward, backward, or to the side.', searchQuery: 'ballet cambré tutorial beginner' },
  { term: 'Cou-de-pied', pronunciation: 'koo-duh-PYAY', description: 'The working foot wrapped around the ankle of the supporting leg. "Neck of the foot."', searchQuery: 'ballet cou-de-pied position tutorial' },

  // Traveling & linking steps
  { term: 'Pas de bourrée', pronunciation: 'pah duh boo-RAY', description: 'A quick three-step linking movement that shifts weight from one foot to the other.', searchQuery: 'ballet pas de bourrée tutorial beginner' },
  { term: 'Balancé', pronunciation: 'bah-lahn-SAY', description: 'A rocking waltz step — step side, shift weight behind, shift weight front. Done in 3/4 time.', searchQuery: 'ballet balancé tutorial beginner' },
  { term: 'Glissade', pronunciation: 'glee-SAHD', description: 'A gliding step that travels sideways. Used as a connecting movement before jumps.', searchQuery: 'ballet glissade tutorial beginner' },
  { term: 'Chassé', pronunciation: 'shah-SAY', description: 'A sliding step where one foot "chases" the other. Travels in any direction.', searchQuery: 'ballet chassé tutorial beginner' },
  { term: 'Tombé', pronunciation: 'tohm-BAY', description: 'A "falling" step — transferring weight by stepping onto a bent leg.', searchQuery: 'ballet tombé tutorial beginner' },
  { term: 'Temps lié', pronunciation: 'tahn lee-AY', description: 'A connected, flowing transfer of weight through positions. Teaches smooth weight shifts.', searchQuery: 'ballet temps lié tutorial beginner' },
  { term: 'Pas de basque', pronunciation: 'pah duh BAHSK', description: 'A sweeping circular step — brush forward, arc to the side, close. Has a lilting, waltz-like quality.', searchQuery: 'ballet pas de basque tutorial' },
  { term: 'Waltz step', pronunciation: 'waltz', description: 'A three-count step (step-step-close) done in 3/4 time, traveling across the floor.', searchQuery: 'ballet waltz step tutorial beginner' },

  // Turns
  { term: 'Pirouette', pronunciation: 'peer-oh-WET', description: 'A complete turn of the body on one leg, usually on demi-pointe or pointe.', searchQuery: 'ballet pirouette tutorial beginner' },
  { term: 'En dehors', pronunciation: 'ahn duh-OR', description: '"Outward" — turning away from the supporting leg, or moving the leg front to back.', searchQuery: 'ballet en dehors pirouette tutorial' },
  { term: 'En dedans', pronunciation: 'ahn duh-DAHN', description: '"Inward" — turning toward the supporting leg, or moving the leg back to front.', searchQuery: 'ballet en dedans pirouette tutorial' },
  { term: 'Chaînés', pronunciation: 'sheh-NAY', description: 'A series of rapid half-turns on alternating feet, creating a spinning chain across the floor.', searchQuery: 'ballet chaînés turns tutorial beginner' },
  { term: 'Piqué turn', pronunciation: 'pee-KAY', description: 'A turn initiated by stepping directly onto a straight leg on demi-pointe or pointe.', searchQuery: 'ballet piqué turns tutorial' },
  { term: 'Soutenu', pronunciation: 'soot-NEW', description: 'A sustained turning step — the back foot draws in to meet the front and completes a full turn in fifth.', searchQuery: 'ballet soutenu turn tutorial' },
  { term: 'Fouetté', pronunciation: 'fweh-TAY', description: 'A "whipping" turn — the working leg whips from front to side to propel consecutive pirouettes.', searchQuery: 'ballet fouetté turns tutorial' },
  { term: 'Promenade', pronunciation: 'prom-NAHD', description: 'A slow pivot on one foot while holding a position like arabesque or attitude.', searchQuery: 'ballet promenade tutorial' },

  // Center positions & lines
  { term: 'Arabesque', pronunciation: 'ah-rah-BESK', description: 'A position on one leg with the other leg extended behind at 90° or more.', searchQuery: 'ballet arabesque tutorial beginner' },
  { term: 'Penché', pronunciation: 'pahn-SHAY', description: 'A tilted arabesque — the torso lowers as the back leg lifts higher than 90°.', searchQuery: 'ballet arabesque penché tutorial' },
  { term: 'Adagio', pronunciation: 'ah-DAH-zhee-oh', description: 'Slow, sustained movements emphasizing balance, extension, and control.', searchQuery: 'ballet adagio tutorial' },
  { term: 'Allegro', pronunciation: 'ah-LEH-groh', description: 'Fast, energetic movements — petit (small jumps) or grand (big jumps/leaps).', searchQuery: 'ballet allegro tutorial' },
  { term: 'Port de bras', pronunciation: 'por duh BRAH', description: 'Carriage of the arms — the positions and movements of the arms.', searchQuery: 'ballet port de bras tutorial beginner' },
  { term: 'Épaulement', pronunciation: 'ay-pohl-MAHN', description: 'Slight rotation of the shoulders and head relative to the hips. Adds artistry to positions.', searchQuery: 'ballet épaulement tutorial' },
  { term: 'Croisé', pronunciation: 'kwah-ZAY', description: '"Crossed" — a body direction where the legs appear crossed from the audience\'s view.', searchQuery: 'ballet croisé effacé positions tutorial' },
  { term: 'Effacé', pronunciation: 'eh-fah-SAY', description: '"Shaded" — a body direction where the legs appear open from the audience\'s view.', searchQuery: 'ballet effacé position tutorial' },

  // Small jumps (petit allegro)
  { term: 'Sauté', pronunciation: 'soh-TAY', description: 'A jump from two feet landing on two feet, starting and ending in a plié.', searchQuery: 'ballet sauté tutorial beginner' },
  { term: 'Changement', pronunciation: 'shahnzh-MAHN', description: 'A jump from fifth position switching the front foot in the air.', searchQuery: 'ballet changement tutorial beginner' },
  { term: 'Échappé', pronunciation: 'ay-shah-PAY', description: 'An "escaping" movement — jumping from a closed to an open position (and back).', searchQuery: 'ballet échappé tutorial' },
  { term: 'Assemblé', pronunciation: 'ah-sahm-BLAY', description: 'A jump where the working leg slides out before both legs join ("assemble") in the air.', searchQuery: 'ballet assemblé tutorial beginner' },
  { term: 'Jeté', pronunciation: 'zhuh-TAY', description: 'A jump from one foot to the other with a "throwing" action of the working leg.', searchQuery: 'ballet jeté tutorial beginner' },
  { term: 'Pas de chat', pronunciation: 'pah duh SHAH', description: '"Step of the cat" — a sideways jump lifting one knee then the other, landing softly.', searchQuery: 'ballet pas de chat tutorial' },
  { term: 'Sissonne', pronunciation: 'see-SOHN', description: 'A jump from two feet landing on one, traveling in any direction. Named after its inventor.', searchQuery: 'ballet sissonne tutorial' },
  { term: 'Soubresaut', pronunciation: 'soo-bruh-SOH', description: 'A sudden jump from fifth position, body stays straight in the air, lands in fifth.', searchQuery: 'ballet soubresaut tutorial' },
  { term: 'Entrechat', pronunciation: 'ahn-truh-SHAH', description: 'A jump with rapid crossing/beating of the legs in the air. Entrechat quatre = two beats.', searchQuery: 'ballet entrechat tutorial' },
  { term: 'Brisé', pronunciation: 'bree-ZAY', description: 'A "broken" step — a traveling beaten jump where the legs beat together in the air.', searchQuery: 'ballet brisé tutorial' },
  { term: 'Ballotté', pronunciation: 'bah-loh-TAY', description: 'A rocking jump alternating between front and back, like a boat tossed by waves.', searchQuery: 'ballet ballotté tutorial' },

  // Big jumps (grand allegro)
  { term: 'Grand jeté', pronunciation: 'grahn zhuh-TAY', description: 'A large leap splitting the legs in the air, travelling forward with a brush-through.', searchQuery: 'ballet grand jeté tutorial' },
  { term: 'Jeté entrelacé', pronunciation: 'zhuh-TAY ahn-truh-lah-SAY', description: 'An interlaced jeté — a turning leap that changes direction mid-air, landing in arabesque.', searchQuery: 'ballet jeté entrelacé tour jeté tutorial' },
  { term: 'Tour en l\'air', pronunciation: 'toor ahn LAIR', description: 'A jump straight up with one or more full turns in the air, landing in fifth.', searchQuery: 'ballet tour en l\'air tutorial' },
  { term: 'Cabriole', pronunciation: 'kah-bree-OHL', description: 'A jump where the legs beat together in the air — one leg beats up to meet the other.', searchQuery: 'ballet cabriole tutorial' },
  { term: 'Saut de basque', pronunciation: 'soh duh BAHSK', description: 'A turning jump — leap while doing a half turn in the air with one leg in passé.', searchQuery: 'ballet saut de basque tutorial' },

  // Pointe & other
  { term: 'Bourrée', pronunciation: 'boo-RAY', description: 'Tiny, quick steps on pointe or demi-pointe that create a gliding effect.', searchQuery: 'ballet bourrée tutorial' },
  { term: 'Sous-sus', pronunciation: 'soo-SOO', description: 'Rising to pointe or demi-pointe in a tight fifth position, feet pressed together.', searchQuery: 'ballet sous-sus tutorial beginner' },
  { term: 'Piqué', pronunciation: 'pee-KAY', description: '"Pricked" — stepping directly onto a straight leg on pointe or demi-pointe.', searchQuery: 'ballet piqué tutorial' },
  { term: 'Révérence', pronunciation: 'ray-vay-RAHNSS', description: 'The curtsy or bow at the end of class to thank the teacher and pianist.', searchQuery: 'ballet révérence tutorial' },
];

// Routine Builder (shared between BalletSetup and SessionView editing)
export interface RoutineEntry {
  id: string;
  name: string;
  section: BalletSection;
  notes: string;
  movements: BalletMovement[];
  collapsed: boolean;
}

// Exercise References (global per exercise)
export interface ExerciseReference {
  exerciseId: string;
  youtubeLinks: string[];
  note?: string;
  glossaryTerm?: string; // override auto-matched glossary term
  updatedAt: string;
}

// Program Export/Import
export interface ProgramExport {
  version: 1;
  exportedAt: string;
  program: Program;
  activities: Activity[];
}
