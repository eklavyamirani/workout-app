import React, { useState } from 'react';
import { Play, SkipForward, Eye, ChevronRight, Plus, ChevronDown, Square } from 'lucide-react';
import type { Program, Activity, Session, ScheduledSession, GZCLPWorkoutDay } from '../types';
import { workoutDayFor, activitiesForDay } from '../utils/gzclp';
import { localDateString, addDays } from '../utils/date';
import { pastSessions } from '../utils/history';
import { withLoggedActivities } from '../utils/session';
import { isScheduledOn } from '../utils/schedule';
import { WorkoutPreview } from './WorkoutPreview';

interface RollingCalendarProps {
  programs: Program[];
  activities: Record<string, Activity[]>;
  sessions: Record<string, Session>;
  gzclpDays?: Record<string, GZCLPWorkoutDay[]>;
  onStartSession: (programId: string, date: string) => void;
  onSkipSession: (programId: string, date: string, reason?: string) => void;
  // Ends an unfinished workout without finishing it (#66)
  onEndSession: (programId: string, date: string) => void;
  onSplitSession: (programId: string, fromDate: string, toDate: string) => void;
}

// Days back that finished workouts stay listed under "Past workouts"
const HISTORY_DAYS = 30;

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Local calendar date; session keys use it (toISOString() would give the UTC date)
const formatDate = localDateString;

// A past session as shown in the past workouts list: its GZCLP day if it recorded
// one, else only what it logged
function scheduledForPastSession(
  session: Session,
  program: Program,
  activities: Activity[],
  days: GZCLPWorkoutDay[],
): ScheduledSession {
  const workoutDay = session.workoutDay !== undefined
    ? days.find(d => d.dayNumber === session.workoutDay)
    : undefined;
  const planned = workoutDay ? activitiesForDay(activities, workoutDay) : [];
  return {
    programId: program.id,
    programName: program.name,
    programType: program.type,
    date: session.date,
    activities: withLoggedActivities(planned, session, activities),
    workoutDayName: workoutDay?.name,
    session,
  };
}

function sessionSummary(session: Session): string {
  const exercises = session.activities.filter(a => (a.sets?.length ?? 0) > 0 || a.completed).length;
  const sets = session.activities.reduce((n, a) => n + (a.sets?.length ?? 0), 0);
  const parts = [`${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}`];
  if (sets > 0) parts.push(`${sets} ${sets === 1 ? 'set' : 'sets'}`);
  if (session.duration) parts.push(`${session.duration} min`);
  return parts.join(' · ');
}

function getDateLabel(date: Date, today: Date): string {
  const todayStr = formatDate(today);
  const dateStr = formatDate(date);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === formatDate(tomorrow)) return 'Tomorrow';
  if (dateStr === formatDate(yesterday)) return 'Yesterday';
  
  const dayName = DAYS_OF_WEEK[date.getDay()];
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${dayName}, ${month} ${day}`;
}

function getScheduledSessionsForDate(
  date: Date,
  programs: Program[],
  activities: Record<string, Activity[]>,
  sessions: Record<string, Session>,
  gzclpDays: Record<string, GZCLPWorkoutDay[]>
): ScheduledSession[] {
  const dateStr = formatDate(date);
  const result: ScheduledSession[] = [];

  for (const program of programs) {
    if (!program.isActive) continue;

    const sessionKey = `${dateStr}:${program.id}`;
    const session = sessions[sessionKey];
    // A day shows a program when its schedule puts one there, or a session was
    // started or skipped there (e.g. a flexible program started from New workout)
    const isScheduled = isScheduledOn(program, date) || session !== undefined;

    if (isScheduled) {
      // GZCLP: the day a session was started on, else the next day in the rotation (#19)
      const workoutDay = program.type === 'gzclp'
        ? workoutDayFor(program, gzclpDays[program.id] || [], session)
        : undefined;
      result.push({
        programId: program.id,
        programName: program.name,
        programType: program.type,
        date: dateStr,
        activities: withLoggedActivities(
          activitiesForDay(activities[program.id] || [], workoutDay),
          session,
          activities[program.id] || [],
        ),
        workoutDayName: workoutDay?.name,
        session,
      });
    }
  }

  return result;
}

export function RollingCalendar({
  programs,
  activities,
  sessions,
  gzclpDays = {},
  onStartSession,
  onSkipSession,
  onEndSession,
}: RollingCalendarProps) {
  const [preview, setPreview] = useState<{ scheduled: ScheduledSession; dateLabel: string } | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const startablePrograms = programs.filter(p => p.isActive);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate next 7 days
  const days: { date: Date; sessions: ScheduledSession[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const scheduledSessions = getScheduledSessionsForDate(date, programs, activities, sessions, gzclpDays);
    if (scheduledSessions.length > 0) {
      days.push({ date, sessions: scheduledSessions });
    }
  }

  const todayStr = formatDate(today);
  const past = pastSessions(Object.values(sessions), todayStr, formatDate(addDays(today, -HISTORY_DAYS)))
    .flatMap(session => {
      const program = programs.find(p => p.id === session.programId);
      if (!program) return [];
      const date = new Date(`${session.date}T00:00:00`);
      return [{
        scheduled: scheduledForPastSession(session, program, activities[program.id] || [], gzclpDays[program.id] || []),
        dateLabel: getDateLabel(date, today),
      }];
    });

  return (
    <div className="p-4 space-y-4">
      {/* Ad hoc: start any program today, scheduled or not (#43) */}
      {startablePrograms.length > 0 && (
        <section aria-label="New workout" className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setShowStartPicker(v => !v)}
            aria-expanded={showStartPicker}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-medium text-blue-700 hover:bg-blue-50 rounded-lg"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New workout
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showStartPicker ? 'rotate-180' : ''}`} />
          </button>
          {showStartPicker && (
            <ul className="border-t border-gray-100 divide-y divide-gray-100">
              {startablePrograms.map(program => {
                const todaySession = sessions[`${todayStr}:${program.id}`];
                const doneToday = todaySession?.status === 'completed' || todaySession?.status === 'partial';
                const label = todaySession?.status === 'in-progress'
                  ? 'Continue'
                  : doneToday ? 'Done today' : 'Start';
                return (
                  <li key={program.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span className="min-w-0 truncate text-gray-900">{program.name}</span>
                    <button
                      onClick={() => {
                        setShowStartPicker(false);
                        onStartSession(program.id, todayStr);
                      }}
                      disabled={doneToday}
                      aria-label={`${label} ${program.name} now`}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {days.length === 0 && (
        <div className="text-center text-gray-500">
          <p>No sessions scheduled for the next 7 days.</p>
          <p className="text-sm mt-2">Use New workout to start one now.</p>
        </div>
      )}
      {days.map(({ date, sessions: daySessions }) => (
        <div key={formatDate(date)} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {getDateLabel(date, today)}
          </h3>
          
          <div className="space-y-2">
            {daySessions.map((scheduled) => {
              const isCompleted = scheduled.session?.status === 'completed';
              const isEnded = scheduled.session?.status === 'partial';
              const isSkipped = scheduled.session?.status === 'skipped';
              const isInProgress = scheduled.session?.status === 'in-progress';

              return (
                <div
                  key={`${scheduled.date}-${scheduled.programId}`}
                  className={`bg-white rounded-lg border p-4 ${
                    isCompleted || isEnded
                      ? 'border-green-200 bg-green-50' 
                      : isSkipped 
                        ? 'border-gray-200 bg-gray-50 opacity-60' 
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {scheduled.programName}
                        </h4>
                        {isCompleted && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Done
                          </span>
                        )}
                        {isEnded && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            Ended early
                          </span>
                        )}
                        {isSkipped && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            Skipped
                          </span>
                        )}
                        {isInProgress && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            In Progress
                          </span>
                        )}
                      </div>
                      {scheduled.workoutDayName && (
                        <p className="text-sm font-medium text-blue-700">{scheduled.workoutDayName}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {scheduled.activities.length} {scheduled.activities.length === 1 ? 'activity' : 'activities'}
                        {scheduled.activities[0]?.targetDuration && (
                          <span> · {scheduled.activities[0].targetDuration} min</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setPreview({ scheduled, dateLabel: getDateLabel(date, today) })}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={scheduled.session ? 'Details' : 'Preview'}
                        aria-label={`${scheduled.session ? 'View' : 'Preview'} ${scheduled.programName}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!isCompleted && !isEnded && !isSkipped && (
                        <>
                          <button
                            onClick={() => onStartSession(scheduled.programId, scheduled.date)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            <span>{isInProgress ? 'Continue' : 'Start'}</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for skipping (optional):');
                              onSkipSession(scheduled.programId, scheduled.date, reason || undefined);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Skip"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <section aria-labelledby="past-workouts-heading" className="space-y-2 pt-2">
          <h3 id="past-workouts-heading" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Past workouts
          </h3>
          <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {past.map(({ scheduled, dateLabel }) => (
              <li key={`${scheduled.date}-${scheduled.programId}`} className="flex items-center">
                <button
                  onClick={() => setPreview({ scheduled, dateLabel })}
                  className="min-w-0 flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  aria-label={`View ${scheduled.programName}, ${dateLabel}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-500">{dateLabel}</div>
                    <div className="font-medium text-gray-900">
                      {scheduled.programName}
                      {scheduled.workoutDayName && (
                        <span className="font-normal text-gray-500"> · {scheduled.workoutDayName}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {scheduled.session!.status === 'in-progress' ? 'Not finished · ' : ''}
                      {scheduled.session!.status === 'partial' ? 'Ended early · ' : ''}
                      {sessionSummary(scheduled.session!)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {/* An unfinished workout, e.g. one that ran past midnight, can still be continued */}
                {scheduled.session!.status === 'in-progress' && (
                  <div className="flex items-center gap-2 mr-3 flex-shrink-0">
                    {/* Abandoned workouts can be ended: time counts to the last logged set (#66) */}
                    <button
                      onClick={() => {
                        if (confirm(`End ${scheduled.programName} (${dateLabel}) without finishing? What you logged is kept; its time ends at the last thing you logged.`)) {
                          onEndSession(scheduled.programId, scheduled.date);
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-2 sm:px-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      title="End without finishing"
                      aria-label={`End ${scheduled.programName}, ${dateLabel}`}
                    >
                      <Square className="hidden sm:block w-4 h-4" />
                      <span>End</span>
                    </button>
                    <button
                      onClick={() => onStartSession(scheduled.programId, scheduled.date)}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      aria-label={`Continue ${scheduled.programName}, ${dateLabel}`}
                    >
                      <Play className="w-4 h-4" />
                      <span>Continue</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {preview && (
        <WorkoutPreview
          scheduled={preview.scheduled}
          dateLabel={preview.dateLabel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
