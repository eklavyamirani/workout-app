import React, { useState } from 'react';
import { X, ExternalLink, Search } from 'lucide-react';
import { BALLET_GLOSSARY } from '../types';

interface BalletGlossaryProps {
  onClose: () => void;
}

export function BalletGlossary({ onClose }: BalletGlossaryProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? BALLET_GLOSSARY.filter(entry =>
        entry.term.toLowerCase().includes(search.toLowerCase()) ||
        entry.description.toLowerCase().includes(search.toLowerCase())
      )
    : BALLET_GLOSSARY;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Movement Glossary</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movements..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {filtered.map(entry => (
            <div
              key={entry.term}
              className="p-3 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-gray-900">{entry.term}</span>
                    <span className="text-xs text-gray-400 italic">{entry.pronunciation}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                </div>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(entry.searchQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Watch video"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">
              No movements matching "{search}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
