"use client";

import { useState } from "react";
import { useLiveKit } from "../hooks/useLiveKit";
import StatusIndicator from "./StatusIndicator";
import TranscriptDisplay from "./TranscriptDisplay";

export default function ConversationRoom() {
  const {
    isConnected,
    isMicActive,
    connectionState,
    transcripts,
    connect,
    disconnect,
    toggleMicrophone,
  } = useLiveKit();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartConversation = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      console.error("Connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndConversation = () => {
    disconnect();
    setError(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          AI Voice Conversation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time voice conversation powered by LiveKit and OpenAI
        </p>
      </div>

      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
        <StatusIndicator
          connectionState={connectionState}
          isMicActive={isMicActive}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200 text-sm">
            <strong>Error:</strong> {error}
          </p>
          {error.includes("microphone") && (
            <p className="text-red-700 dark:text-red-300 text-xs mt-2">
              💡 Tip: Check your browser's microphone permissions in settings.
            </p>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-4 mb-6">
        {!isConnected ? (
          <button
            onClick={handleStartConversation}
            disabled={isConnecting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </span>
            ) : (
              "Start Conversation"
            )}
          </button>
        ) : (
          <>
            <button
              onClick={toggleMicrophone}
              className={`flex-1 font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 ${
                isMicActive
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              }`}
            >
              {isMicActive ? "🎤 Mute Microphone" : "🔇 Unmute Microphone"}
            </button>

            <button
              onClick={handleEndConversation}
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              End Conversation
            </button>
          </>
        )}
      </div>

      {/* Transcript Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-[500px]">
        <TranscriptDisplay transcripts={transcripts} />
      </div>

      {/* Instructions */}
      {!isConnected && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            How to use:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li>Click "Start Conversation" to connect</li>
            <li>Allow microphone access when prompted</li>
            <li>Speak naturally - your voice will be transcribed</li>
            <li>The AI will respond with both text and voice</li>
            <li>View the conversation transcript in real-time</li>
          </ol>
        </div>
      )}
    </div>
  );
}
