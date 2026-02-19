import type { Program, Activity, Session, ExerciseReference } from '../types';

// Storage key patterns:
// - programs:list -> string[] (array of program IDs)
// - programs:{id} -> Program
// - activities:{programId} -> Activity[]
// - sessions:{date}:{programId} -> Session

export const storage = {
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  async set(key: string, value: unknown): Promise<boolean> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  async delete(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  },

  async list(prefix: string = ''): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('Storage list error:', error);
      return [];
    }
  },

  async clear(): Promise<boolean> {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
};

// Helper functions for typed access
export const programStorage = {
  async getAll(): Promise<Program[]> {
    const ids = await storage.get<string[]>('programs:list') || [];
    const programs: Program[] = [];
    for (const id of ids) {
      const program = await storage.get<Program>(`programs:${id}`);
      if (program) programs.push(program);
    }
    return programs;
  },

  async get(id: string): Promise<Program | null> {
    return storage.get<Program>(`programs:${id}`);
  },

  async save(program: Program): Promise<boolean> {
    const ids = await storage.get<string[]>('programs:list') || [];
    if (!ids.includes(program.id)) {
      ids.push(program.id);
      await storage.set('programs:list', ids);
    }
    return storage.set(`programs:${program.id}`, program);
  },

  async delete(id: string): Promise<boolean> {
    const ids = await storage.get<string[]>('programs:list') || [];
    const newIds = ids.filter(i => i !== id);
    await storage.set('programs:list', newIds);
    await storage.delete(`activities:${id}`);
    return storage.delete(`programs:${id}`);
  }
};

export const activityStorage = {
  async getByProgram(programId: string): Promise<Activity[]> {
    return await storage.get<Activity[]>(`activities:${programId}`) || [];
  },

  async saveAll(programId: string, activities: Activity[]): Promise<boolean> {
    return storage.set(`activities:${programId}`, activities);
  }
};

export const sessionStorage = {
  async get(date: string, programId: string): Promise<Session | null> {
    return storage.get<Session>(`sessions:${date}:${programId}`);
  },

  async save(session: Session): Promise<boolean> {
    return storage.set(`sessions:${session.date}:${session.programId}`, session);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Session[]> {
    const keys = await storage.list('sessions:');
    const sessions: Session[] = [];
    for (const key of keys) {
      const session = await storage.get<Session>(key);
      if (session && session.date >= startDate && session.date <= endDate) {
        sessions.push(session);
      }
    }
    return sessions;
  }
};

export const referenceStorage = {
  async get(exerciseId: string): Promise<ExerciseReference | null> {
    return storage.get<ExerciseReference>(`references:${exerciseId}`);
  },

  async save(ref: ExerciseReference): Promise<boolean> {
    return storage.set(`references:${ref.exerciseId}`, ref);
  },

  async getAll(): Promise<ExerciseReference[]> {
    const keys = await storage.list('references:');
    const refs: ExerciseReference[] = [];
    for (const key of keys) {
      const ref = await storage.get<ExerciseReference>(key);
      if (ref) refs.push(ref);
    }
    return refs;
  },
};
