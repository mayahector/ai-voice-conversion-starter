'use client';

import { ConnectionState } from 'livekit-client';

interface StatusIndicatorProps {
  connectionState: ConnectionState;
  isMicActive: boolean;
}

export default function StatusIndicator({ connectionState, isMicActive }: StatusIndicatorProps) {
  const getConnectionStatus = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return { text: 'Connected', color: 'bg-green-500', pulse: true };
      case ConnectionState.Connecting:
        return { text: 'Connecting...', color: 'bg-yellow-500', pulse: true };
      case ConnectionState.Reconnecting:
        return { text: 'Reconnecting...', color: 'bg-orange-500', pulse: true };
      case ConnectionState.Disconnected:
        return { text: 'Disconnected', color: 'bg-gray-500', pulse: false };
      default:
        return { text: 'Unknown', color: 'bg-gray-500', pulse: false };
    }
  };

  const status = getConnectionStatus();

  return (
    <div className="flex items-center gap-6">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${status.color}`} />
          {status.pulse && (
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${status.color} animate-ping opacity-75`} />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {status.text}
        </span>
      </div>

      {/* Microphone Status */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isMicActive ? 'bg-red-500' : 'bg-gray-400'}`}>
          {isMicActive && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-pulse opacity-75" />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isMicActive ? 'Mic Active' : 'Mic Inactive'}
        </span>
      </div>
    </div>
  );
}
