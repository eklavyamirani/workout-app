import React, { useRef, useState } from 'react';
import { Plus, ChevronRight, Trash2, Download, Upload, Loader } from 'lucide-react';
import type { Program, Activity } from '../types';
import { downloadProgramAsJson, parseImportFile, prepareImportedProgram } from '../utils/importExport';

interface ProgramListProps {
  programs: Program[];
  activities: Record<string, Activity[]>;
  onCreateProgram: () => void;
  onSelectProgram: (program: Program) => void;
  onDeleteProgram: (programId: string) => void;
  onImportProgram: (program: Program, activities: Activity[]) => void;
}

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  weightlifting: 'Weightlifting',
  skill: 'Skill Practice',
  cardio: 'Cardio',
  custom: 'Custom',
};

const SCHEDULE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  interval: 'Interval',
  flexible: 'Flexible',
};

export function ProgramList({ 
  programs, 
  activities,
  onCreateProgram, 
  onSelectProgram,
  onDeleteProgram,
  onImportProgram,
}: ProgramListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const activePrograms = programs.filter(p => p.isActive);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    setIsImporting(true);
    setImportStatus('Reading file...');
    console.log('Importing file:', file.name);
    
    const result = await parseImportFile(file);
    console.log('Parse result:', result);
    
    if (!result.success || !result.program || !result.activities) {
      setIsImporting(false);
      setImportStatus(null);
      alert(`Import failed: ${result.error}`);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setImportStatus('Importing program...');
    
    const existingNames = programs.map(p => p.name);
    const prepared = prepareImportedProgram(result.program, result.activities, existingNames);
    
    console.log('Prepared program:', prepared.program.name);
    
    onImportProgram(prepared.program, prepared.activities);
    
    setIsImporting(false);
    setImportStatus(`Imported "${prepared.program.name}"`);
    
    // Clear status after 3 seconds
    setTimeout(() => setImportStatus(null), 3000);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleExport(program: Program) {
    const programActivities = activities[program.id] || [];
    downloadProgramAsJson(program, programActivities);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Programs</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            aria-label="Import program"
          >
            {isImporting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isImporting ? 'Importing...' : 'Import'}</span>
          </button>
          <button
            onClick={onCreateProgram}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Program</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {importStatus}
        </div>
      )}

      {activePrograms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No programs yet</p>
          <button
            onClick={onCreateProgram}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create your first program
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activePrograms.map((program) => {
            const programActivities = activities[program.id] || [];
            return (
              <div
                key={program.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onSelectProgram(program)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{program.name}</h3>
                        <p className="text-sm text-gray-500">
                          {PROGRAM_TYPE_LABELS[program.type]} · {SCHEDULE_LABELS[program.schedule.mode]}
                          {program.schedule.mode === 'weekly' && program.schedule.daysOfWeek && (
                            <span> · {program.schedule.daysOfWeek.length} days/week</span>
                          )}
                        </p>
                        {programActivities.length > 0 && (
                          <p className="text-sm text-gray-400 mt-1">
                            {programActivities.length} {programActivities.length === 1 ? 'activity' : 'activities'}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(program);
                    }}
                    aria-label="Export program"
                    className="ml-2 p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${program.name}"?`)) {
                        onDeleteProgram(program.id);
                      }
                    }}
                    aria-label="Delete program"
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
