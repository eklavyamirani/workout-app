import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Plus, Trash2, Search } from 'lucide-react';
import type { ExerciseReference, GlossaryEntry } from '../types';
import { BALLET_GLOSSARY } from '../types';
import { referenceStorage } from '../storage/adapter';
import { getGlossaryMatch } from '../utils/exerciseReferences';

const YOUTUBE_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com',
]);

// Validates that a URL points to a YouTube domain. Guards against XSS
// (javascript: URIs, data: URIs) — not URL quality. Bare YouTube domain
// URLs without a video ID are allowed as they are safe navigation links.
function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      YOUTUBE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

interface ExerciseReferencePopoverProps {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}

export function ExerciseReferencePopover({
  exerciseId,
  exerciseName,
  onClose,
}: ExerciseReferencePopoverProps) {
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [newLink, setNewLink] = useState('');
  const [glossaryEntry, setGlossaryEntry] = useState<GlossaryEntry | null>(null);
  const [glossaryOverride, setGlossaryOverride] = useState<string | undefined>();
  const [showGlossarySearch, setShowGlossarySearch] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadReference();
  }, [exerciseId, exerciseName]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function loadReference() {
    // Reset all state to prevent cross-exercise data contamination
    setYoutubeLinks([]);
    setNote('');
    setGlossaryOverride(undefined);
    setDirty(false);

    const ref = await referenceStorage.get(exerciseId);
    if (ref) {
      setYoutubeLinks(ref.youtubeLinks || []);
      setNote(ref.note || '');
      setGlossaryOverride(ref.glossaryTerm);
    }

    // Resolve glossary match
    if (ref?.glossaryTerm) {
      const match = BALLET_GLOSSARY.find(g => g.term === ref.glossaryTerm);
      setGlossaryEntry(match || getGlossaryMatch(exerciseId, exerciseName));
    } else {
      setGlossaryEntry(getGlossaryMatch(exerciseId, exerciseName));
    }
  }

  async function handleSave() {
    const ref: ExerciseReference = {
      exerciseId,
      youtubeLinks,
      note: note || undefined,
      glossaryTerm: glossaryOverride,
      updatedAt: new Date().toISOString(),
    };
    await referenceStorage.save(ref);
    setDirty(false);
    onClose();
  }

  function addYoutubeLink() {
    const url = newLink.trim();
    if (!url || !isValidYouTubeUrl(url)) return;
    setYoutubeLinks(prev => [...prev, url]);
    setNewLink('');
    setDirty(true);
  }

  function removeYoutubeLink(index: number) {
    setYoutubeLinks(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function selectGlossaryEntry(entry: GlossaryEntry) {
    setGlossaryEntry(entry);
    setGlossaryOverride(entry.term);
    setShowGlossarySearch(false);
    setGlossarySearch('');
    setDirty(true);
  }

  const filteredGlossary = glossarySearch.trim()
    ? BALLET_GLOSSARY.filter(g =>
        g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
        g.description.toLowerCase().includes(glossarySearch.toLowerCase())
      )
    : BALLET_GLOSSARY;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{exerciseName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Glossary section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Glossary</h4>
              <button
                onClick={() => setShowGlossarySearch(!showGlossarySearch)}
                className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600"
              >
                <Search className="w-3 h-3" />
                {showGlossarySearch ? 'Close' : 'Search'}
              </button>
            </div>

            {showGlossarySearch && (
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  placeholder="Search glossary..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredGlossary.map(entry => (
                    <button
                      key={entry.term}
                      onClick={() => selectGlossaryEntry(entry)}
                      className={`w-full py-1.5 px-2 rounded text-left text-sm hover:bg-purple-50 transition-colors ${
                        glossaryEntry?.term === entry.term ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="font-medium">{entry.term}</span>
                      <span className="text-xs text-gray-400 ml-1 italic">{entry.pronunciation}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {glossaryEntry ? (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{glossaryEntry.term}</span>
                  <span className="text-xs text-gray-400 italic">{glossaryEntry.pronunciation}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{glossaryEntry.description}</p>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(glossaryEntry.searchQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  YouTube search
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No glossary match found. Use search to link one.</p>
            )}
          </div>

          {/* YouTube links section */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">My YouTube Links</h4>

            {youtubeLinks.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {youtubeLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <a
                      href={isValidYouTubeUrl(link) ? link : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs text-purple-600 hover:text-purple-700 truncate"
                    >
                      {link}
                    </a>
                    <button
                      onClick={() => removeYoutubeLink(idx)}
                      className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addYoutubeLink()}
                placeholder="Paste YouTube URL..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={addYoutubeLink}
                disabled={!newLink.trim()}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs disabled:opacity-50 hover:bg-purple-600 transition-colors flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Note section */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note</h4>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setDirty(true); }}
              placeholder="Your notes about this exercise..."
              className="w-full p-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={!dirty && youtubeLinks.length === 0 && !note}
            className="w-full py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
