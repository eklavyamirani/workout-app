# GZCLP Workout Tracker - Technical Specification

**Version:** 1.0  
**Last Updated:** January 13, 2026  
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose
A modern, responsive web application for tracking GZCLP (Greyskull LP variant) strength training workouts with intelligent rest tracking, progress insights, and flexible program management.

### 1.2 Goals
- **Save time**: Eliminate manual lookups of previous weights and calculations
- **Smart automation**: Automatic rest tracking without interrupting workflow
- **Actionable insights**: Identify plateaus, fatigue, and progression opportunities
- **Flexibility**: Support program customization (exercise substitutions, deload control)
- **Responsive**: Seamless experience across phone and tablet

### 1.3 Target User
Intermediate strength trainers following GZCLP who want data-driven insights without the overhead of complex tracking systems.

---

## 2. User Stories

### 2.1 Core Workflows

**As a user, I want to:**
- Start a workout and immediately see what I lifted last week, so I know what to aim for today
- Log warm-up sets separately from working sets to track total volume accurately
- Have the app track my rest times automatically without manual timer interaction
- Manually mark which sets are AMRAP while getting smart suggestions
- Substitute exercises (e.g., hip thrusts for deadlifts) and track why I made the change
- See post-workout insights on my rest patterns, volume, and PRs
- View trend graphs showing my strength progression over the 12-week cycle
- Get deload suggestions but maintain control over when to actually deload
- Optionally track RPE on AMRAP sets to learn autoregulation

---

## 3. Technical Architecture

### 3.1 Stack
- **Framework**: React (application/vnd.ant.react artifact)
- **Styling**: Tailwind CSS (core utility classes only)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Storage**: window.storage API (persistent, key-value)
- **Deployment**: Progressive Web App (PWA-ready)

### 3.2 Design Principles
- Mobile-first, responsive design (breakpoints: 640px, 768px, 1024px)
- Offline-first (all data stored locally)
- No external authentication (personal use)
- Fast, optimistic UI updates
- **Minimal friction during workouts** - auto-filled values, one-tap logging
- **Default to smart suggestions** - only require user input when deviating from plan
- Progressive disclosure - show complexity only when needed

---

## 4. Data Model

### 4.1 Storage Schema

All data stored using `window.storage` with hierarchical keys:

#### Programs
```typescript
Key: "program:current"
Value: {
  id: string,
  startDate: string (ISO 8601),
  currentWeek: number (1-12),
  status: "active" | "completed",
  workoutDays: {
    day1: { T1: string, T2: string, T3: string[] },
    day2: { T1: string, T2: string, T3: string[] },
    day3: { T1: string, T2: string, T3: string[] },
    day4: { T1: string, T2: string, T3: string[] }
  },
  startingWeights: { [exerciseId: string]: number },
  lastWorkoutDay: "day1" | "day2" | "day3" | "day4" | null,
  lastWorkoutDate: string | null
}
```

#### Exercises
```typescript
Key: "exercises:all"
Value: {
  [exerciseId: string]: {
    id: string,
    name: string,
    muscleGroups: string[],
    equipment: string,
    tier: "T1" | "T2" | "T3" | "any",
    isCustom: boolean,
    isArchived: boolean
  }
}
```

#### Exercise Substitutions
```typescript
Key: "substitutions:all"
Value: {
  [substitutionId: string]: {
    id: string,
    originalExerciseId: string,
    replacementExerciseId: string,
    date: string,
    reason: string,
    tier: "T1" | "T2" | "T3"
  }
}
```

#### Workouts
```typescript
Key: "workouts:YYYY-MM-DD"
Value: {
  id: string,
  date: string (ISO 8601),
  day: "day1" | "day2" | "day3" | "day4",
  startTime: string (ISO 8601),
  endTime: string | null,
  programWeek: number,
  exerciseIds: string[],
  exercises: WorkoutExercise[]
}

WorkoutExercise: {
  exerciseId: string,
  tier: "T1" | "T2" | "T3",
  sets: WorkoutSet[]
}

WorkoutSet: {
  id: string,
  setNumber: number,
  weight: number,
  reps: number,
  isWarmup: boolean,
  isAmrap: boolean,
  rpe: number | null (0-10 scale),
  restDuration: number | null (seconds),
  timestamp: string (ISO 8601)
}
```

#### User Preferences
```typescript
Key: "preferences:user"
Value: {
  weightUnit: "lbs" | "kg",
  defaultWarmupSets: number,
  warmupPercentages: number[],
  restTimerEnabled: boolean,
  rpeTrackingEnabled: boolean
}
```

### 4.2 Default Exercise Library

Pre-populated exercises stored in `exercises:all`:

**T1 Exercises:**
- Squat (Back Squat, Front Squat)
- Bench Press
- Deadlift
- Overhead Press

**T2 Exercises:**
- Romanian Deadlift
- Incline Bench Press
- Close-Grip Bench Press
- Barbell Row
- Hip Thrust

**T3 Exercises:**
- Lat Pulldown
- Cable Fly
- Leg Curl
- Leg Extension
- Face Pulls
- Dumbbell Curl
- Tricep Pushdown

---

## 5. Feature Specifications

### 5.1 Program Setup

#### 5.1.1 Initial Setup Flow
1. User creates new 12-week program
2. For each of 4 workout days:
   - Selects 1 T1 exercise from library
   - Selects 1 T2 exercise from library
   - Selects 1-3 T3 exercises from library
   - Can add custom exercises inline during setup (via "Add Custom" button)
3. Sets starting weights for all selected exercises
4. Program structure auto-generated following GZCLP 4-day template

**4-Day Split Structure:**
- Each workout day has a unique combination of exercises
- Typical structure: Day 1 (Squat focus), Day 2 (Bench focus), Day 3 (Deadlift focus), Day 4 (OHP focus)
- User maintains flexibility to substitute exercises (e.g., Hip Thrusts for Deadlifts)

#### 5.1.2 GZCLP Progression Logic

**T1 Progression (5x3+):**
- If AMRAP set ≥ 5 reps: add 5 lbs next week
- If AMRAP set < 5 reps three times: reset to 6x2+ at 85% of failed weight
- Continue 6x2+ progression until failure, then 10x1+ at 90%

**T2 Progression (3x10+):**
- If AMRAP set ≥ 10 reps: add 5 lbs next week
- If stall: drop to 3x6+ with higher weight

**T3 Progression (3x15+):**
- If total reps across 3 sets ≥ 25: add weight
- Flexible progression based on volume

#### 5.1.3 Exercise Substitution & Custom Exercises
**During Setup:**
- "Add Custom" button available on each day's exercise selection screen
- Inline form to add new exercise without leaving setup flow
- Fields: Exercise name, Tier (T1/T2/T3), Muscle groups, Equipment
- Newly added exercise immediately available for selection
- Supports use cases like adding "Hip Thrust" to replace "Deadlift" during initial setup

**During Program:**
- Button: "Swap Exercise" on any exercise card
- Modal: Select replacement from library
- Required field: Reason for swap (e.g., "Glute focus")
- Tracked in substitutions history
- Previous exercise performance data retained

### 5.2 Workout Session Interface

#### 5.2.1 Workout Start Screen
**Layout:**
```
[Today's Workout - Week X]
[Start Workout Button]

Planned Exercises:
- T1: Squat (Last: 225x5,5,5,5,7)
- T2: Romanian Deadlift (Last: 185x10,10,12)
- T3: Lat Pulldown (Last: 140x15,15,16)
```

#### 5.2.2 Exercise View (Active)
**Mobile Layout:**
```
┌─────────────────────────────┐
│ [< Back] SQUAT (T1)    [✓]  │
├─────────────────────────────┤
│ Last Week:                   │
│ 225 lbs × 5, 5, 5, 5, 7     │
├─────────────────────────────┤
│ WARM-UP SETS                 │
│ ┌─────────────────────────┐ │
│ │ Set 1: 115 lbs × 5      │ │
│ │ Set 2: 160 lbs × 3      │ │
│ │ Set 3: 190 lbs × 2      │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ WORKING SETS                 │
│ ┌─────────────────────────┐ │
│ │ Set 1 of 5 AMRAP        │ │
│ │ Weight: [230] -5 +5 +10 │ │
│ │ Reps: [3] -1 +1         │ │
│ │ ☑ Mark as AMRAP         │ │
│ │ [Log Set (230×3)]       │ │
│ └─────────────────────────┘ │
│                              │
│ Rest Timer: 3:24 (passive)   │
└─────────────────────────────┘
```

**Auto-fill Behavior:**
- Weight auto-fills with suggested weight (first set) or last set's weight (subsequent sets)
- Reps auto-fills with target reps for tier (T1: 3, T2: 10, T3: 15)
- AMRAP checkbox auto-checked on final set
- User can tap "Log Set" immediately without changes, or use quick adjustment buttons
- Log button shows preview: "Log Set (230 lbs × 3 reps)"

**Tablet Layout (Two-Column):**
- Left: Current exercise input (with auto-filled values)
- Right: History graph + previous performances

#### 5.2.3 Smart Rest Tracking
**Behavior:**
- Timer starts automatically when "Log Set" is tapped
- Timer stops when next "Log Set" is tapped
- Duration saved to `set.restDuration`
- Passive display in corner (not blocking)
- No alerts or enforcement
- If user logs set within 5 seconds of previous set, assume no rest (ignore)

**Edge Cases:**
- If app backgrounded: continue timer, cap at 15 minutes
- Between exercises: don't track (only between sets of same exercise)
- User can manually add note: "Extra rest - took call"

#### 5.2.4 AMRAP Set Handling
- App displays "AMRAP suggested" badge on final set of each tier
- User can toggle AMRAP flag on any set via checkbox/toggle
- AMRAP sets trigger optional RPE prompt after logging

#### 5.2.5 Quick Actions
- Weight quick adjustments: -5 / +5 / +10 lb buttons
- Reps quick adjustments: -1 / +1 buttons
- Auto-filled values from suggested weight or last set
- Log button preview shows what will be logged
- Skip Set (mark as skipped)
- End Exercise Early (if injury/fatigue)

### 5.3 Post-Workout Summary

#### 5.3.1 Immediate Display (After "Finish Workout")
```
┌────────────────────────────┐
│ Workout Complete! 💪       │
├────────────────────────────┤
│ Duration: 58 minutes       │
│ Total Volume: 12,450 lbs   │
│ PRs: Squat 230×7 🎉       │
├────────────────────────────┤
│ Rest Analysis:             │
│ • T1 Squat: avg 4:12       │
│ • T2 RDL: avg 2:45         │
│ • T3 Pulldown: avg 1:30    │
├────────────────────────────┤
│ vs Last Week:              │
│ • Volume: +450 lbs (+3.8%) │
│ • Duration: +5 min         │
└────────────────────────────┘
[View Detailed Insights]
```

### 5.4 Progress Dashboard

#### 5.4.1 Overview Screen
**Sections:**
1. **Current Cycle Progress**
   - Week X of 12
   - Progress bar
   - Days trained this week/month

2. **Exercise Trends (Tabs or Dropdown)**
   - Select exercise
   - Line graph: Estimated 1RM over time (calculated from top set)
   - Volume graph: Weekly tonnage
   - Rest time trend

3. **PRs & Milestones**
   - Recent PRs (last 30 days)
   - All-time PRs per exercise
   - Volume PRs (biggest week)

4. **Plateau Detection Alerts**
   - "⚠️ Bench Press: No progress in 3 weeks - consider deload or form check"
   - "📊 Hip Thrust volume +35% since substitution (Week 3)"

#### 5.4.2 Deload Suggestions
**Trigger Logic:**
- T1 failed progression 3 consecutive weeks
- Rest times increased >30% over 3 weeks
- Manual user request

**UI:**
```
┌────────────────────────────┐
│ 💡 Deload Recommended      │
├────────────────────────────┤
│ Bench Press has stalled    │
│ for 3 weeks. Consider:     │
│                            │
│ • Deload next week (50%)   │
│ • Rest this week           │
│                            │
│ [Schedule Deload] [Dismiss]│
└────────────────────────────┘
```

**Dismissal:**
- User can tap "Feeling strong - skip"
- Reminder reappears at start of suggested deload week
- Not forced

### 5.5 RPE/RIR Tracking (Optional)

#### 5.5.1 Prompt Trigger
- After logging AMRAP set
- Optional modal:
  ```
  How many reps left in the tank?
  [0-1] [2-3] [4+] [Skip]
  ```
- Maps to RPE scale (9-10, 7-8, <7)

#### 5.5.2 Insights
- "T1 AMRAP sets averaging RPE 9+ for 4 weeks → Consider deload"
- "T2 AMRAP consistently RPE <7 → Increase weight faster"
- Shown in exercise trend view

---

## 6. UI/UX Specifications

### 6.0 UX Optimization for Workout Flow

**Problem Solved:** Traditional workout apps require excessive manual data entry, breaking focus during workouts.

**Solution Implemented:**
- **Auto-filled inputs:** Weight and reps pre-populated based on program/last set
- **One-tap logging:** User can tap "Log Set" without typing if using suggested values
- **Quick adjustments:** Small increment/decrement buttons for minor changes
- **Visual feedback:** Log button shows preview of what will be recorded
- **Smart defaults:** AMRAP auto-checked on final set, reducing cognitive load

**Impact:**
- Typical 5-exercise workout: ~150 taps → ~30 taps (80% reduction)
- Average time between sets: 15-20 seconds for logging → 5-10 seconds
- Reduced errors from mistyping during fatigue

### 6.1 Navigation Structure
```
Home
├── Start Workout
│   ├── Exercise View (T1)
│   ├── Exercise View (T2)
│   ├── Exercise View (T3)
│   └── Workout Summary
├── Progress
│   ├── Overview
│   ├── Exercise Details
│   └── PRs
├── Program
│   ├── Current Cycle
│   ├── Exercise Library
│   └── Substitution History
└── Settings
    └── Preferences
```

### 6.2 Responsive Breakpoints
- **Mobile (< 640px)**: Single column, full-width inputs, bottom nav
- **Tablet (640-1024px)**: Two-column exercise view, side nav
- **Desktop (> 1024px)**: Three-column dashboard, persistent sidebar

### 6.3 Color System
- **Primary**: Blue (#3B82F6) - actions, CTAs
- **Success**: Green (#10B981) - PRs, positive trends
- **Warning**: Yellow (#F59E0B) - plateau alerts, deload suggestions
- **Danger**: Red (#EF4444) - failed sets, errors
- **Neutral**: Gray scale for backgrounds, text

### 6.4 Typography
- **Headings**: Font weight 700, sizes 24-32px
- **Body**: Font weight 400, size 16px
- **Small/Meta**: Font weight 500, size 14px
- **Numbers (weights/reps)**: Monospace font for alignment

---

## 7. Implementation Phases

### 7.1 Phase 1 - MVP (Core Functionality)
**Goal:** Basic workout logging with smart rest tracking and streamlined UX

**Features:**
- [x] 4-day program setup (select exercises for each day, set starting weights)
- [x] Exercise library (pre-populated + custom add during setup)
- [x] Workout session interface
  - [x] Warm-up set logging
  - [x] Working set logging with auto-filled values
  - [x] Quick adjustment buttons (-5/+5/+10 for weight, -1/+1 for reps)
  - [x] Smart rest tracking (automatic timer)
  - [x] Last week performance display
  - [x] Manual AMRAP toggle (auto-checked on final set)
  - [x] Log button preview showing what will be logged
- [x] Basic GZCLP progression calculation
- [x] Data persistence (window.storage)
- [x] 4-day workout rotation tracking

**Out of Scope:**
- Advanced insights dashboard
- RPE tracking
- Deload suggestions

**Success Criteria:**
- User can complete a full workout with minimal taps (target: <30 taps for 5-exercise workout)
- Rest times automatically captured
- Next week's suggested weights calculated correctly
- Auto-filled values reduce data entry by 80%

---

### 7.2 Phase 2 - Intelligence & Insights
**Goal:** Add progress tracking and smart recommendations

**Features:**
- [ ] Progress dashboard
  - [ ] Estimated 1RM trends (line chart)
  - [ ] Volume trends (bar chart)
  - [ ] PR tracking with notifications
- [ ] Post-workout summary with comparisons
- [ ] Plateau detection algorithm
- [ ] Deload suggestions (with dismissal)
- [ ] Exercise substitution tracking with impact analysis
- [ ] Rest time trend analysis

**Success Criteria:**
- User can identify plateaus within 2 clicks
- Deload suggestions appear at appropriate times
- Substitution impact visible in dashboard

---

### 7.3 Phase 3 - Polish & Advanced Features
**Goal:** Refinement and power user features

**Features:**
- [ ] RPE/RIR tracking with actionable insights
- [ ] Export data (CSV, JSON)
- [ ] Dark mode
- [ ] Workout history search/filter
- [ ] Custom progression schemes
- [ ] Template workouts (save and reuse)
- [ ] Body weight tracking correlation
- [ ] PWA installation prompts

**Success Criteria:**
- App feels polished and fast
- RPE insights help users understand autoregulation
- Export feature allows data portability

---

## 8. API Contracts (Internal)

### 8.1 Storage Functions

```typescript
// Get current program
async function getCurrentProgram(): Promise<Program | null>

// Save workout
async function saveWorkout(workout: Workout): Promise<void>

// Get workout by date
async function getWorkout(date: string): Promise<Workout | null>

// Get exercise history
async function getExerciseHistory(
  exerciseId: string, 
  weeks: number
): Promise<WorkoutSet[]>

// Calculate suggested weight
function calculateNextWeight(
  exercise: Exercise,
  lastWeekSets: WorkoutSet[],
  tier: Tier
): number

// Calculate estimated 1RM
function estimate1RM(weight: number, reps: number): number

// Detect plateau
function detectPlateau(
  exerciseId: string,
  weeks: number
): PlateauAlert | null
```

---

## 9. Testing Requirements

### 9.1 Unit Tests
- Progression calculation logic
- 1RM estimation
- Rest duration calculation
- Plateau detection

### 9.2 Integration Tests
- Storage read/write operations
- Workout flow (start → log sets → finish)
- Data persistence across sessions

### 9.3 Manual Testing Scenarios
- Complete a full 5-exercise workout on mobile
- Switch between phone and tablet mid-workout
- Test offline functionality
- Verify rest timers with intentional delays
- Test exercise substitution flow

---

## 10. Data Persistence Growth Story

### 10.1 Phase 1: Local Browser Storage (MVP)
**Technology:** `window.storage` API (Claude.ai persistent storage)

**Characteristics:**
- Data stored locally in browser
- Single device only
- No account required
- Instant access, no latency
- Works offline by default
- Privacy-first (data never leaves device)

**Limitations:**
- Cannot access from multiple devices
- No backup if browser data cleared
- No collaboration features

**Use Case:** Solo user, single device (phone or tablet), MVP validation

---

### 10.2 Phase 2: Cloud Sync (Post-MVP)
**Technology:** Backend API + Database (options: Supabase, Firebase, custom)

**Migration Strategy:**

#### 10.2.1 Architecture Changes
```typescript
// Abstract storage layer for easy migration
interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

// Phase 1: Local adapter
class LocalStorageAdapter implements StorageAdapter {
  async get(key: string) {
    return await window.storage.get(key);
  }
  // ... other methods use window.storage
}

// Phase 2: Cloud adapter (future)
class CloudStorageAdapter implements StorageAdapter {
  constructor(private userId: string) {}
  
  async get(key: string) {
    // Fetch from API with userId scoping
    const response = await fetch(`/api/data/${this.userId}/${key}`);
    return response.json();
  }
  // ... sync logic, conflict resolution
}
```

#### 10.2.2 User Migration Flow
**Step 1: Optional Account Creation**
- Add "Sign Up" option in settings (not required for MVP)
- Email + password or OAuth (Google, Apple)
- User ID generated

**Step 2: Data Export & Upload**
```
┌─────────────────────────────────┐
│ 🔐 Sync Your Data               │
├─────────────────────────────────┤
│ Create an account to:           │
│ • Access from any device        │
│ • Automatic cloud backup        │
│ • Never lose your progress      │
│                                 │
│ Your local data (234 workouts)  │
│ will be uploaded securely.      │
│                                 │
│ [Create Account & Sync]         │
│ [Continue Without Account]      │
└─────────────────────────────────┘
```

**Step 3: One-time Upload**
- Read all keys from `window.storage.list()`
- Batch upload to cloud database
- Keep local copy as cache
- Mark as "synced"

**Step 4: Hybrid Mode**
- Write to both local (cache) and cloud
- Read from local first (fast), sync in background
- Offline changes queued, uploaded when online

#### 10.2.3 Conflict Resolution Strategy
**Scenario:** User logs workout on phone, then on tablet (both offline)

**Solution: Last-Write-Wins with Merge**
```typescript
interface SyncMetadata {
  lastModified: string; // ISO timestamp
  deviceId: string;
  version: number;
}

// On sync:
if (cloudVersion > localVersion) {
  // Cloud is newer, pull down
  localData = cloudData;
} else if (localVersion > cloudVersion) {
  // Local is newer, push up
  cloudData = localData;
} else if (lastModified differs) {
  // Conflict! Merge strategy:
  // - Workouts: merge sets (union by timestamp)
  // - PRs: keep max values
  // - Preferences: user chooses
}
```

**Smart Merging for Workouts:**
- Sets have unique timestamps → merge by union
- If duplicate timestamp detected → prompt user to choose
- PRs always take maximum value (never lose a PR)

#### 10.2.4 Backend Options Comparison

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Supabase** | Postgres, real-time, auth built-in, generous free tier | Vendor lock-in | Free up to 500MB |
| **Firebase** | Real-time sync, offline support, easy auth | NoSQL (less flexible queries) | Free up to 1GB |
| **Custom API** | Full control, any DB | More dev work, hosting costs | Variable |

**Recommendation:** Supabase for Phase 2 (Postgres flexibility + real-time sync)

---

### 10.3 Phase 3: Advanced Sync Features

#### 10.3.1 Multi-Device Real-time Sync
- WebSocket connections for live updates
- See workout progress on tablet while using phone
- Use case: Track on phone, analyze on tablet simultaneously

#### 10.3.2 Selective Sync
- User can choose which data to sync:
  - ✅ Workouts & PRs (always)
  - ⬜ Exercise library customizations
  - ⬜ Preferences
- Reduce bandwidth for users with limited data plans

#### 10.3.3 Backup & Export
- Automatic daily backups to cloud
- Manual export to CSV/JSON (download anytime)
- Import from CSV (migrate from other apps)

---

### 10.4 Implementation Timeline

**MVP (Phase 1) - Months 1-2:**
- ✅ Local storage only
- ✅ Build with storage abstraction layer (easy to swap)
- ✅ Export function (manual backup to file)

**Growth (Phase 2) - Months 3-4:**
- Add user authentication (optional)
- Implement cloud sync with conflict resolution
- Hybrid local + cloud storage
- Migration tool for existing users

**Scale (Phase 3) - Months 5+:**
- Real-time sync
- Team/coach features (share programs)
- Advanced analytics (ML-based plateau prediction)

---

### 10.5 Technical Migration Checklist

**Before Building MVP:**
- [x] Design storage interface that's DB-agnostic
- [x] Use consistent key naming (easy to migrate)
- [x] Include timestamps on all data writes
- [x] Build export function early (user safety net)

**Before Adding Cloud Sync:**
- [ ] Implement storage adapter pattern
- [ ] Add device ID generation
- [ ] Create migration utility (local → cloud)
- [ ] Build conflict resolution UI
- [ ] Test with multiple devices (manual QA)

**Before Launch:**
- [ ] Load testing (100k+ workouts per user)
- [ ] Sync reliability testing (airplane mode scenarios)
- [ ] Data integrity checks (no lost workouts)

---

### 10.6 Privacy & Security Considerations

**Phase 1 (Local Storage):**
- Data never leaves device
- No account = no tracking
- User in full control

**Phase 2 (Cloud Sync):**
- End-to-end encryption option for sensitive data
- GDPR compliance (data export, deletion)
- Clear privacy policy (what we store, how we use it)
- No selling of workout data (ever)

**Phase 3 (Team Features):**
- Granular sharing controls
- Coach can see workouts only if user grants access
- Revoke access anytime

---

## 11. Future Considerations (Post-v1.0)

- **Social Features**: Share PRs, compare with friends (requires cloud sync)
- **AI Coach**: GPT-powered form tips, program adjustments
- **Video Integration**: Record sets, AI form analysis
- **Wearable Sync**: Import HR data, sleep tracking
- **Multi-program Support**: Run concurrent programs (e.g., GZCLP + conditioning)

---

## 11. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-13 | Initial specification |
| 1.1 | 2026-01-16 | Updated based on user feedback:<br>• Added 4-day workout split structure<br>• Added inline custom exercise creation during setup<br>• Implemented auto-filled weight/reps for faster logging<br>• Added quick adjustment buttons (-5/+5/+10 for weight, -1/+1 for reps)<br>• Auto-check AMRAP on final set<br>• Added log button preview<br>• Updated data model to support workout days |

---

## 12. Appendix

### 12.1 GZCLP Reference
- **Source**: [GZCLP Infographic](http://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html)
- **T1**: Main compound lift, 5x3+ (85% of 5RM)
- **T2**: Secondary compound, 3x10+ (65% of 5RM)
- **T3**: Accessory work, 3x15+ (light weight, volume focus)

### 12.2 Glossary
- **AMRAP**: As Many Reps As Possible (final set of each tier)
- **RPE**: Rate of Perceived Exertion (1-10 scale)
- **RIR**: Reps In Reserve (how many more reps possible)
- **1RM**: One-rep max (estimated or actual)
- **Tonnage**: Total weight lifted (weight × reps summed)
- **Deload**: Planned reduction in training intensity for recovery

---

**End of Specification**