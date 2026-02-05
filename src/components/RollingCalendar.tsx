import React from 'react';
import { Play, SkipForward, ArrowRight } from 'lucide-react';
import type { Program, Activity, Session, ScheduledSession } from '../types';

interface RollingCalendarProps {
  programs: Program[];
  activities: Record<string, Activity[]>;
  sessions: Record<string, Session>;
  onStartSession: (programId: string, date: string) => void;
  onSkipSession: (programId: string, date: string, reason?: string) => void;
  onSplitSession: (programId: string, fromDate: string, toDate: string) => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateLabel(date: Date, today: Date): string {
  const todayStr = formatDate(today);
  const dateStr = formatDate(date);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (dateStr === todayStr) return 'Today';
  if (dateStr === formatDate(tomorrow)) return 'Tomorrow';
  
  const dayName = DAYS_OF_WEEK[date.getDay()];
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${dayName}, ${month} ${day}`;
}

function getScheduledSessionsForDate(
  date: Date,
  programs: Program[],
  activities: Record<string, Activity[]>,
  sessions: Record<string, Session>
): ScheduledSession[] {
  const dateStr = formatDate(date);
  const dayOfWeek = date.getDay();
  const result: ScheduledSession[] = [];

  for (const program of programs) {
    if (!program.isActive) continue;

    let isScheduled = false;

    if (program.schedule.mode === 'weekly') {
      isScheduled = program.schedule.daysOfWeek?.includes(dayOfWeek) ?? false;
    } else if (program.schedule.mode === 'flexible') {
      // Flexible programs show every day
      isScheduled = true;
    } else if (program.schedule.mode === 'interval') {
      // For interval, calculate based on creation date
      const createdDate = new Date(program.createdAt);
      const daysDiff = Math.floor((date.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      isScheduled = daysDiff >= 0 && daysDiff % (program.schedule.intervalDays ?? 1) === 0;
    }

    if (isScheduled) {
      const sessionKey = `${dateStr}:${program.id}`;
      result.push({
        programId: program.id,
        programName: program.name,
        programType: program.type,
        date: dateStr,
        activities: activities[program.id] || [],
        session: sessions[sessionKey],
      });
    }
  }

  return result;
}

export function RollingCalendar({
  programs,
  activities,
  sessions,
  onStartSession,
  onSkipSession,
}: RollingCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate next 7 days
  const days: { date: Date; sessions: ScheduledSession[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const scheduledSessions = getScheduledSessionsForDate(date, programs, activities, sessions);
    if (scheduledSessions.length > 0) {
      days.push({ date, sessions: scheduledSessions });
    }
  }

  if (days.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No sessions scheduled for the next 7 days.</p>
        <p className="text-sm mt-2">Create a program to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {days.map(({ date, sessions: daySessions }) => (
        <div key={formatDate(date)} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {getDateLabel(date, today)}
          </h3>
          
          <div className="space-y-2">
            {daySessions.map((scheduled) => {
              const isCompleted = scheduled.session?.status === 'completed';
              const isSkipped = scheduled.session?.status === 'skipped';
              const isInProgress = scheduled.session?.status === 'in-progress';

              return (
                <div
                  key={`${scheduled.date}-${scheduled.programId}`}
                  className={`bg-white rounded-lg border p-4 ${
                    isCompleted 
                      ? 'border-green-200 bg-green-50' 
                      : isSkipped 
                        ? 'border-gray-200 bg-gray-50 opacity-60' 
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {scheduled.programName}
                        </h4>
                        {isCompleted && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Done
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
                      <p className="text-sm text-gray-500">
                        {scheduled.activities.length} {scheduled.activities.length === 1 ? 'activity' : 'activities'}
                        {scheduled.activities[0]?.targetDuration && (
                          <span> · {scheduled.activities[0].targetDuration} min</span>
                        )}
                      </p>
                    </div>

                    {!isCompleted && !isSkipped && (
                      <div className="flex items-center gap-2">
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
