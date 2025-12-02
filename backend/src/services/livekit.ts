import { AccessToken } from 'livekit-server-sdk';
import { TokenResponse } from '../types';

export class LiveKitService {
  private apiKey: string;
  private apiSecret: string;
  private serverUrl: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || '';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || '';
    this.serverUrl = process.env.LIVEKIT_URL || '';

    if (!this.apiKey || !this.apiSecret || !this.serverUrl) {
      throw new Error('LiveKit credentials not configured. Check your .env file.');
    }
  }

  /**
   * Generate a LiveKit access token for a participant
   */
  async generateToken(roomName: string, participantName: string): Promise<TokenResponse> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      ttl: '10h', // Token valid for 10 hours
    });

    // Grant permissions for the participant
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return {
      token,
      roomName,
      serverUrl: this.serverUrl,
    };
  }

  /**
   * Generate a unique room name
   */
  generateRoomName(): string {
    return `voice-room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate a unique participant name
   */
  generateParticipantName(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
