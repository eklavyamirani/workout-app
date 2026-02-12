import type { Program, Activity, ProgramExport } from '../types';

export function exportProgram(program: Program, activities: Activity[]): ProgramExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    program,
    activities,
  };
}

export function downloadProgramAsJson(program: Program, activities: Activity[]): void {
  const exportData = exportProgram(program, activities);
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${program.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  success: boolean;
  program?: Program;
  activities?: Activity[];
  error?: string;
}

export function validateProgramExport(data: unknown): ImportResult {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Invalid file format' };
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) {
    return { success: false, error: 'Unsupported export version' };
  }

  if (!obj.program || typeof obj.program !== 'object') {
    return { success: false, error: 'Missing program data' };
  }

  const program = obj.program as Record<string, unknown>;
  
  if (!program.name || typeof program.name !== 'string') {
    return { success: false, error: 'Invalid program name' };
  }

  if (!program.type || !['weightlifting', 'skill', 'cardio', 'custom'].includes(program.type as string)) {
    return { success: false, error: 'Invalid program type' };
  }

  if (!program.schedule || typeof program.schedule !== 'object') {
    return { success: false, error: 'Invalid schedule' };
  }

  if (!Array.isArray(obj.activities)) {
    return { success: false, error: 'Invalid activities data' };
  }

  for (const activity of obj.activities) {
    if (!activity || typeof activity !== 'object') {
      return { success: false, error: 'Invalid activity format' };
    }
    if (!activity.name || typeof activity.name !== 'string') {
      return { success: false, error: 'Activity missing name' };
    }
  }

  return {
    success: true,
    program: obj.program as Program,
    activities: obj.activities as Activity[],
  };
}

export function parseImportFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    // Check if FileReader is available (may be blocked in Safari Lockdown Mode)
    if (typeof window.FileReader === 'undefined') {
      resolve({ 
        success: false, 
        error: 'File import is not available. If you are using Safari with Lockdown Mode enabled, please disable it temporarily or use a different browser.' 
      });
      return;
    }
    
    const reader = new window.FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        console.log('File content length:', text?.length);
        const data = JSON.parse(text);
        console.log('Parsed data:', data);
        const result = validateProgramExport(data);
        console.log('Validation result:', result);
        resolve(result);
      } catch (err) {
        console.error('Parse error:', err);
        resolve({ success: false, error: 'Failed to parse JSON file' });
      }
    };
    
    reader.onerror = (err) => {
      console.error('Read error:', err);
      resolve({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsText(file);
  });
}

export function prepareImportedProgram(
  program: Program,
  activities: Activity[],
  existingNames: string[]
): { program: Program; activities: Activity[] } {
  // Generate new IDs to avoid conflicts
  const newProgramId = `program_${Date.now()}`;
  
  // Handle duplicate names
  let newName = program.name;
  let counter = 1;
  while (existingNames.includes(newName)) {
    newName = `${program.name} (${counter})`;
    counter++;
  }

  const newProgram: Program = {
    ...program,
    id: newProgramId,
    name: newName,
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  const newActivities: Activity[] = activities.map((activity, index) => ({
    ...activity,
    id: `activity_${Date.now()}_${index}`,
    programId: newProgramId,
  }));

  return { program: newProgram, activities: newActivities };
}
