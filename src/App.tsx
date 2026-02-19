import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Calendar } from 'lucide-react';
import { storage, programStorage, activityStorage, sessionStorage } from './storage/adapter';
import { ProgramList } from './components/ProgramList';
import { CreateProgram } from './components/CreateProgram';
import { GZCLPSetup } from './components/GZCLPSetup';
import { BalletSetup } from './components/BalletSetup';
import { RollingCalendar } from './components/RollingCalendar';
import { SessionView } from './components/SessionView';
import type { Program, Activity, Session, GZCLPWorkoutDay } from './types';

type ViewType = 'loading' | 'home' | 'programs' | 'create-program' | 'gzclp-setup' | 'ballet-setup' | 'session';

export default function App() {
  const [view, setView] = useState<ViewType>('loading');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity[]>>({});
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [currentSession, setCurrentSession] = useState<{
    program: Program;
    activities: Activity[];
    session: Session;
    lastPracticeNotes?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Check if we need to clear old data (breaking change migration)
    const hasNewFormat = await storage.get<string[]>('programs:list');
    const hasOldFormat = await storage.get('program:current');
    
    if (hasOldFormat && !hasNewFormat) {
      // Clear old GZCLP data
      await storage.clear();
    }

    // Load programs
    const loadedPrograms = await programStorage.getAll();
    setPrograms(loadedPrograms);

    // Load activities for each program
    const loadedActivities: Record<string, Activity[]> = {};
    for (const program of loadedPrograms) {
      loadedActivities[program.id] = await activityStorage.getByProgram(program.id);
    }
    setActivities(loadedActivities);

    // Load sessions for the next 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const loadedSessions = await sessionStorage.getByDateRange(
      today.toISOString().split('T')[0],
      nextWeek.toISOString().split('T')[0]
    );
    
    const sessionMap: Record<string, Session> = {};
    for (const session of loadedSessions) {
      sessionMap[`${session.date}:${session.programId}`] = session;
    }
    setSessions(sessionMap);

    setView('home');
  }

  async function handleCreateProgram(program: Program, programActivities: Activity[]) {
    await programStorage.save(program);
    await activityStorage.saveAll(program.id, programActivities);
    
    setPrograms([...programs, program]);
    setActivities({ ...activities, [program.id]: programActivities });
    setView('home');
  }

  async function handleDeleteProgram(programId: string) {
    await programStorage.delete(programId);
    setPrograms(programs.filter(p => p.id !== programId));
    const newActivities = { ...activities };
    delete newActivities[programId];
    setActivities(newActivities);
  }

  async function handleImportProgram(program: Program, programActivities: Activity[]) {
    await programStorage.save(program);
    await activityStorage.saveAll(program.id, programActivities);
    
    setPrograms([...programs, program]);
    setActivities({ ...activities, [program.id]: programActivities });
  }

  async function handleGZCLPComplete(program: Program, programActivities: Activity[], workoutDays: GZCLPWorkoutDay[]) {
    await programStorage.save(program);
    await activityStorage.saveAll(program.id, programActivities);
    await storage.set(`gzclp:${program.id}:days`, workoutDays);
    
    setPrograms([...programs, program]);
    setActivities({ ...activities, [program.id]: programActivities });
    setView('home');
  }

  async function handleStartSession(programId: string, date: string) {
    const program = programs.find(p => p.id === programId);
    if (!program) return;

    const programActivities = activities[programId] || [];
    const sessionKey = `${date}:${programId}`;

    let session = sessions[sessionKey];
    if (!session) {
      session = {
        id: `session_${Date.now()}`,
        programId,
        date,
        status: 'in-progress',
        startTime: new Date().toISOString(),
        activities: [],
      };
      await sessionStorage.save(session);
      setSessions({ ...sessions, [sessionKey]: session });
    }

    // For ballet programs, find the last completed session's practiceNext notes
    let lastPracticeNotes: string | undefined;
    if (program.type === 'ballet') {
      const allKeys = await storage.list(`sessions:`);
      let latestDate = '';
      for (const key of allKeys) {
        const s = await storage.get<Session>(key);
        if (s && s.programId === programId && s.status === 'completed' && s.practiceNext && s.date < date) {
          if (s.date > latestDate) {
            latestDate = s.date;
            lastPracticeNotes = s.practiceNext;
          }
        }
      }
    }

    setCurrentSession({
      program,
      activities: programActivities,
      session,
      lastPracticeNotes,
    });
    setView('session');
  }

  async function handleSkipSession(programId: string, date: string, reason?: string) {
    const sessionKey = `${date}:${programId}`;
    const session: Session = {
      id: `session_${Date.now()}`,
      programId,
      date,
      status: 'skipped',
      activities: [],
      skipReason: reason,
    };
    
    await sessionStorage.save(session);
    setSessions({ ...sessions, [sessionKey]: session });
  }

  async function handleUpdateSession(session: Session) {
    await sessionStorage.save(session);
    const sessionKey = `${session.date}:${session.programId}`;
    setSessions({ ...sessions, [sessionKey]: session });
    
    if (currentSession) {
      setCurrentSession({ ...currentSession, session });
    }
  }

  async function handleUpdateActivities(programId: string, updatedActivities: Activity[]) {
    await activityStorage.saveAll(programId, updatedActivities);
    setActivities({ ...activities, [programId]: updatedActivities });

    // Also update currentSession if it's for the same program
    if (currentSession && currentSession.program.id === programId) {
      setCurrentSession({ ...currentSession, activities: updatedActivities });
    }
  }

  async function handleCompleteSession(session: Session) {
    await sessionStorage.save(session);
    const sessionKey = `${session.date}:${session.programId}`;
    setSessions({ ...sessions, [sessionKey]: session });
    setCurrentSession(null);
    setView('home');
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (view === 'create-program') {
    return (
      <CreateProgram
        onComplete={handleCreateProgram}
        onCancel={() => setView('home')}
        onSelectGZCLP={() => setView('gzclp-setup')}
        onSelectBallet={() => setView('ballet-setup')}
      />
    );
  }

  if (view === 'gzclp-setup') {
    return (
      <GZCLPSetup
        onComplete={handleGZCLPComplete}
        onCancel={() => setView('home')}
      />
    );
  }

  if (view === 'ballet-setup') {
    return (
      <BalletSetup
        onComplete={handleCreateProgram}
        onCancel={() => setView('home')}
      />
    );
  }

  if (view === 'session' && currentSession) {
    return (
      <SessionView
        program={currentSession.program}
        activities={currentSession.activities}
        session={currentSession.session}
        lastPracticeNotes={currentSession.lastPracticeNotes}
        onUpdateSession={handleUpdateSession}
        onComplete={handleCompleteSession}
        onUpdateActivities={(updatedActivities) =>
          handleUpdateActivities(currentSession.program.id, updatedActivities)
        }
        onCancel={() => {
          setCurrentSession(null);
          setView('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">Workout Tracker</h1>
            </div>

            <nav className="flex gap-2">
              <button
                onClick={() => setView('home')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  view === 'home' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setView('programs')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  view === 'programs' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Programs</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {view === 'home' && (
          <>
            {programs.length === 0 ? (
              <div className="p-8 text-center">
                <Dumbbell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No programs yet</h2>
                <p className="text-gray-500 mb-6">Create your first workout program to get started</p>
                <button
                  onClick={() => setView('create-program')}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Program
                </button>
              </div>
            ) : (
              <RollingCalendar
                programs={programs}
                activities={activities}
                sessions={sessions}
                onStartSession={handleStartSession}
                onSkipSession={handleSkipSession}
                onSplitSession={() => {}}
              />
            )}
          </>
        )}

        {view === 'programs' && (
          <ProgramList
            programs={programs}
            activities={activities}
            onCreateProgram={() => setView('create-program')}
            onSelectProgram={() => {}}
            onDeleteProgram={handleDeleteProgram}
            onImportProgram={handleImportProgram}
          />
        )}
      </div>
    </div>
  );
}
