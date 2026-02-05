# Multi-Program Workout Tracker - Product Requirements Document

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Draft

---

## Problem Statement

The current app is focused exclusively on GZCLP (a weightlifting program). The goal is to extend it to support multiple types of workout programs including:
- **Strength training** (GZCLP, etc.)
- **Skill practice** (ballet, violin, etc.)
- **Cardio/endurance**
- **Any user-defined activity type**

## Key Requirements

1. **All activity types supported** - weightlifting, skill practice, cardio, custom
2. **Duration + completion tracking** - time-based and session completion
3. **Flexible scheduling** - any workout anytime
4. **Multiple simultaneous programs** - run GZCLP + daily violin concurrently
5. **Rolling calendar view** - dynamically adjusting, explicit skip functionality
6. **Backward compatibility relaxed** - can simplify GZCLP if needed

---

## Proposed Architecture

### Program Types
```typescript
type ProgramType = 'weightlifting' | 'skill' | 'cardio' | 'custom';

interface Program {
  id: string;
  name: string;
  type: ProgramType;
  schedule: ScheduleConfig;
  activities: Activity[];  // exercises for weightlifting, skills for practice
  isActive: boolean;
  createdAt: string;
}

interface ScheduleConfig {
  mode: 'weekly' | 'interval' | 'flexible';
  daysOfWeek?: number[];  // 0-6 for weekly mode
  intervalDays?: number;  // e.g., every 2 days
}
```

### Activity Types
```typescript
interface Activity {
  id: string;
  name: string;
  programId: string;
  trackingType: 'sets-reps-weight' | 'duration' | 'completion' | 'custom';
  customFields?: CustomField[];
}

interface CustomField {
  name: string;
  type: 'number' | 'text' | 'duration' | 'checkbox';
}
```

### Session Tracking
```typescript
interface Session {
  id: string;
  programId: string;
  date: string;
  status: 'completed' | 'skipped' | 'partial';
  duration?: number;  // minutes
  activities: ActivityLog[];
  notes?: string;
}
```

---

## Implementation Phases

### Phase 1: Core Data Model Refactoring ✅
- [x] Create new TypeScript types for Program, Activity, Session
- [x] Create `src/types/` directory with type definitions
- [x] Update storage adapter with new key patterns (`programs:*`, `sessions:*`)
- [x] Clear existing GZCLP data on first load (breaking change - no migration)

### Phase 2: Program Management ✅
- [x] Build ProgramList component (shows all active programs)
- [x] Build CreateProgram flow with type selection
- [x] Build program templates for common types
- [x] Add edit/archive/delete program functionality

### Phase 3: Rolling Calendar View ✅
- [x] Create WeeklyCalendar component
- [x] Show upcoming sessions across all programs
- [x] Implement "skip" functionality with reason tracking
- [ ] Implement "split day" - move activity to different day (deferred)
- [x] Handle missed days - roll forward automatically

### Phase 4: Session Tracking ✅
- [x] Create generic SessionView component
- [x] Implement duration tracking (start/stop timer)
- [x] Implement completion tracking (mark done)
- [x] Preserve existing sets/reps/weight tracking for weightlifting
- [x] Add notes field for all session types

### Phase 5: Polish & Integration ✅
- [x] Update Home page to show rolling calendar
- [x] Clear old storage keys on app load (fresh start)
- [x] Update Header navigation
- [x] Create new e2e tests (10 passing)

### Phase 6: Program Import/Export ✅
- [x] Define export format (JSON with program + activities)
- [x] Add "Export" button to ProgramList
- [x] Create export function that downloads JSON file
- [x] Add "Import" button to ProgramList
- [x] Create import function with validation
- [x] Handle duplicate program names on import
- [x] Add e2e tests for import/export (4 tests passing)

**Future**: Dedicated program designer sub-app

---

## UI Specifications

### Home Screen (Rolling Calendar)
```
┌────────────────────────────────────┐
│ Today - Feb 5                      │
├────────────────────────────────────┤
│ ● GZCLP Day 2 (Bench Focus)        │
│   [Start] [Skip] [Split]           │
│                                    │
│ ● Violin Practice (30 min)         │
│   [Start] [Skip]                   │
├────────────────────────────────────┤
│ Tomorrow - Feb 6                   │
├────────────────────────────────────┤
│ ● Ballet (45 min)                  │
│ ● GZCLP Day 3 (Deadlift Focus)     │
├────────────────────────────────────┤
│ Feb 7 (Sat)                        │
├────────────────────────────────────┤
│ ● Violin Practice (30 min)         │
└────────────────────────────────────┘
```

### Program Creation Flow
```
Step 1: Choose Type
┌────────────────────────────────────┐
│ What kind of program?              │
├────────────────────────────────────┤
│ [Weightlifting]                    │
│ [Skill Practice]                   │
│ [Cardio]                           │
│ [Custom]                           │
└────────────────────────────────────┘

Step 2: Configure Schedule
┌────────────────────────────────────┐
│ When do you practice?              │
├────────────────────────────────────┤
│ ○ Specific days (Mon, Wed, Fri)    │
│ ○ Every X days                     │
│ ○ Flexible (whenever I want)       │
└────────────────────────────────────┘
```

---

## Export Format

Programs are exported as JSON files with the following structure:

```typescript
interface ProgramExport {
  version: 1;
  exportedAt: string;  // ISO 8601
  program: Program;
  activities: Activity[];
}
```

Example:
```json
{
  "version": 1,
  "exportedAt": "2026-02-05T20:00:00.000Z",
  "program": {
    "id": "program_123",
    "name": "Violin Practice",
    "type": "skill",
    "schedule": { "mode": "weekly", "daysOfWeek": [1, 3, 5] },
    "isActive": true,
    "createdAt": "2026-02-01T10:00:00.000Z"
  },
  "activities": [
    { "id": "activity_1", "name": "Scales", "trackingType": "duration", "targetDuration": 15 },
    { "id": "activity_2", "name": "Etudes", "trackingType": "duration", "targetDuration": 30 }
  ]
}
```

---

## Design Decisions

1. **Breaking Change**: Existing GZCLP data will be cleared. No migration needed.

2. **Simplified GZCLP**: The T1/T2/T3 tier system and complex progression logic can be made optional or simplified.

3. **Rolling Calendar Logic**: 
   - Shows 7 days ahead by default
   - Missed sessions roll forward (tomorrow's session becomes today's)
   - Explicit "Skip" removes from queue with tracking
   - "Split" allows moving one activity to another day

4. **Session Types**:
   - Weightlifting: Keep sets/reps/weight/rest tracking
   - Skill Practice: Duration timer + completion checkbox
   - Custom: User-defined fields

5. **Storage Keys**:
   - `programs:{id}` - Individual programs
   - `programs:list` - Array of program IDs
   - `sessions:{date}:{programId}` - Session data
   - `activities:{programId}` - Activities for a program

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02 | Initial PRD for multi-program support |
| 1.1 | 2026-02 | Added Phase 6: Program Import/Export |
