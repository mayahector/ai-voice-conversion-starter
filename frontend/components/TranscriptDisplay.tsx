'use client';

import { TranscriptEntry } from '../hooks/useLiveKit';
import { useEffect, useRef } from 'react';

interface TranscriptDisplayProps {
  transcripts: TranscriptEntry[];
}

export default function TranscriptDisplay({ transcripts }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Conversation Transcript
        </h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {transcripts.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-sm">No conversation yet. Start speaking to begin!</p>
          </div>
        ) : (
          transcripts.map((entry, index) => (
            <div
              key={index}
              className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  entry.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold opacity-75">
                    {entry.type === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="text-xs opacity-60">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{entry.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
