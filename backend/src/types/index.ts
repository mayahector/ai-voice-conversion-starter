export interface TokenResponse {
  token: string;
  roomName: string;
  serverUrl: string;
}

export interface TranscriptMessage {
  type: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
}
