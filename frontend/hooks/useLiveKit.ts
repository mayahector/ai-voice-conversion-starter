"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  LocalAudioTrack,
  RemoteAudioTrack,
  ConnectionState,
  createLocalAudioTrack,
} from "livekit-client";

export interface TranscriptEntry {
  type: "user" | "ai";
  text: string;
  timestamp: number;
}

export interface UseLiveKitReturn {
  room: Room | null;
  isConnected: boolean;
  isMicActive: boolean;
  connectionState: ConnectionState;
  transcripts: TranscriptEntry[];
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMicrophone: () => Promise<void>;
  processAudio: (audioData: string) => Promise<void>;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function useLiveKit(): UseLiveKitReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Add transcript entry
  const addTranscript = useCallback((type: "user" | "ai", text: string) => {
    setTranscripts((prev) => [
      ...prev,
      {
        type,
        text,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    try {
      console.log("Requesting token from backend...");

      // Get token from backend
      const response = await fetch(`${BACKEND_URL}/api/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error ||
          `Failed to get token (${response.status})`;
        console.error("Token request failed:", errorMessage);
        throw new Error(errorMessage);
      }

      const { token, serverUrl } = await response.json();
      console.log("Token received, connecting to room...");

      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("Connected to room");
        setIsConnected(true);
        setConnectionState(ConnectionState.Connected);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from room");
        setIsConnected(false);
        setConnectionState(ConnectionState.Disconnected);
      });

      newRoom.on(RoomEvent.Reconnecting, () => {
        console.log("Reconnecting...");
        setConnectionState(ConnectionState.Reconnecting);
      });

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (track, publication, participant) => {
          console.log("Track subscribed:", track.kind);

          if (
            track.kind === Track.Kind.Audio &&
            track instanceof RemoteAudioTrack
          ) {
            // Play remote audio (AI voice)
            const audioElement = track.attach();
            audioElement
              .play()
              .catch((err) => console.error("Error playing audio:", err));
          }
        }
      );

      // Connect to room
      await newRoom.connect(serverUrl, token);
      setRoom(newRoom);

      // Enable microphone by default
      await enableMicrophone(newRoom);
    } catch (error) {
      console.error("Connection error:", error);
      setConnectionState(ConnectionState.Disconnected);
      throw error;
    }
  }, []);

  // Enable microphone
  const enableMicrophone = async (roomInstance: Room) => {
    try {
      console.log("Enabling microphone...");

      // Check if microphone permissions are granted
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop()); // Stop the test stream
      } catch (permError) {
        throw new Error(
          "Microphone permission denied. Please allow microphone access and try again."
        );
      }

      // Create local audio track
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      // Verify track is actually working
      if (
        !audioTrack ||
        !audioTrack.mediaStreamTrack ||
        audioTrack.mediaStreamTrack.readyState !== "live"
      ) {
        throw new Error(
          "Microphone track is not active. Please check your microphone settings."
        );
      }

      localAudioTrackRef.current = audioTrack;

      // Publish to room
      await roomInstance.localParticipant.publishTrack(audioTrack);
      setIsMicActive(true);

      // Set up audio processing for sending to AI
      setupAudioProcessing(audioTrack);

      console.log("Microphone enabled and published");
    } catch (error) {
      console.error("Error enabling microphone:", error);
      setIsMicActive(false);
      throw error;
    }
  };

  // Calculate RMS (Root Mean Square) to detect audio level
  const calculateRMS = (audioData: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  };

  // Set up audio processing to capture chunks for AI
  const setupAudioProcessing = (audioTrack: LocalAudioTrack) => {
    const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(mediaStream);

    // Create processor to capture audio chunks
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let audioChunks: Float32Array[] = [];
    let lastProcessTime = Date.now();
    let isProcessing = false; // Prevent concurrent processing
    let lastSuccessfulProcessTime = 0; // Track last successful API call
    const SILENCE_THRESHOLD = 0.01; // Minimum RMS value to consider as audio
    const MIN_AUDIO_DURATION = 5000; // Minimum 5 seconds of audio before processing (reduced API calls)
    const MIN_TIME_BETWEEN_REQUESTS = 6000; // Minimum 6 seconds between API requests (rate limiting)

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const rms = calculateRMS(inputData);

      // Only collect audio chunks that have actual sound
      if (rms > SILENCE_THRESHOLD) {
        audioChunks.push(new Float32Array(inputData));
      }

      const timeSinceLastProcess = Date.now() - lastProcessTime;
      const timeSinceLastRequest = Date.now() - lastSuccessfulProcessTime;

      // Process if we have enough audio chunks and enough time has passed
      // Also check if we have actual audio (not just silence)
      // AND ensure we're not making requests too frequently (rate limiting)
      if (
        !isProcessing &&
        timeSinceLastProcess >= MIN_AUDIO_DURATION &&
        timeSinceLastRequest >= MIN_TIME_BETWEEN_REQUESTS &&
        audioChunks.length > 0
      ) {
        // Check if the combined audio has actual sound
        const totalLength = audioChunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0
        );
        const combinedArray = new Float32Array(totalLength);
        let offset = 0;

        audioChunks.forEach((chunk) => {
          combinedArray.set(chunk, offset);
          offset += chunk.length;
        });

        const combinedRMS = calculateRMS(combinedArray);

        // Only process if there's actual audio content
        if (combinedRMS > SILENCE_THRESHOLD) {
          isProcessing = true;

          // Convert to base64 and send to backend
          const audioData = floatArrayToBase64(combinedArray);
          processAudioChunk(audioData)
            .then(() => {
              // Only update last successful time if request succeeded
              lastSuccessfulProcessTime = Date.now();
            })
            .finally(() => {
              isProcessing = false;
              audioChunks = [];
              lastProcessTime = Date.now();
            });
        } else {
          // Silent chunk, just clear it
          audioChunks = [];
          lastProcessTime = Date.now();
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
  };

  // Convert Float32Array to base64
  const floatArrayToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = Math.max(
        -32768,
        Math.min(32767, float32Array[i] * 32768)
      );
    }
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = "";
    uint8Array.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
  };

  // Process audio chunk with AI (with rate limit handling)
  const processAudioChunk = async (audioData: string): Promise<void> => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 2000; // 2 seconds

    while (retryCount <= MAX_RETRIES) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audioData }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.message ||
            errorData.error ||
            `AI processing failed (${response.status})`;

          // Handle rate limit errors (429) with exponential backoff
          if (response.status === 429) {
            if (retryCount < MAX_RETRIES) {
              const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
              console.warn(
                `Rate limit hit. Retrying in ${retryDelay}ms... (Attempt ${
                  retryCount + 1
                }/${MAX_RETRIES + 1})`
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              retryCount++;
              continue; // Retry the request
            } else {
              // Max retries reached
              console.error("Rate limit exceeded after retries");
              addTranscript(
                "ai",
                "⚠️ Rate limit exceeded. Please wait a moment before speaking again."
              );
              // Wait longer before allowing next request
              lastSuccessfulProcessTime = Date.now() + 30000; // Add 30 second penalty
              return;
            }
          }

          console.error("AI processing failed:", errorMessage);

          // Only show error if it's not a connection reset (those are handled by retries)
          if (!errorMessage.includes("Connection to OpenAI API was reset")) {
            addTranscript("ai", `Error: ${errorMessage}`);
          }
          return;
        }

        const { transcription, responseText, audioResponse } =
          await response.json();

        // Add transcripts
        if (transcription && transcription.trim()) {
          addTranscript("user", transcription);
        }

        if (responseText && responseText.trim()) {
          addTranscript("ai", responseText);
        }

        // Play AI audio response
        if (audioResponse && room) {
          playAudioResponse(audioResponse);
        }

        // Success - exit retry loop
        return;
      } catch (error) {
        // Network errors - retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.warn(
            `Network error. Retrying in ${retryDelay}ms... (Attempt ${
              retryCount + 1
            }/${MAX_RETRIES + 1})`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryCount++;
          continue;
        } else {
          // Max retries reached
          console.error("Error processing audio after retries:", error);
          return;
        }
      }
    }
  };

  // Play AI audio response
  const playAudioResponse = (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio
        .play()
        .catch((err) => console.error("Error playing AI response:", err));
    } catch (error) {
      console.error("Error playing audio response:", error);
    }
  };

  // Process audio (exposed for manual calls)
  const processAudio = useCallback(
    async (audioData: string) => {
      await processAudioChunk(audioData);
    },
    [room]
  );

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    if (!room) return;

    if (isMicActive && localAudioTrackRef.current) {
      // Disable microphone
      await room.localParticipant.unpublishTrack(localAudioTrackRef.current);
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
      setIsMicActive(false);

      // Clean up audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } else {
      // Enable microphone
      await enableMicrophone(room);
    }
  }, [room, isMicActive]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setIsMicActive(false);

      // Clean up
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [room]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    room,
    isConnected,
    isMicActive,
    connectionState,
    transcripts,
    connect,
    disconnect,
    toggleMicrophone,
    processAudio,
  };
}
