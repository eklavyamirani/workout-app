import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'warning';
}

let nextId = 0;

export function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'info' | 'warning' = 'info') => {
    const id = nextId++;
    setMessages(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  useEffect(() => {
    const onConflict = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const key = detail?.key || 'unknown';
      addToast(`Updated from another device: ${key}`, 'info');
    };

    window.addEventListener('sync:conflict', onConflict);
    return () => window.removeEventListener('sync:conflict', onConflict);
  }, [addToast]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in ${
            msg.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-white text-gray-700 border border-gray-200'
          }`}
        >
          <span className="flex-1">{msg.text}</span>
          <button
            onClick={() => removeToast(msg.id)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
