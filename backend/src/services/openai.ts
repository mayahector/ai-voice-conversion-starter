import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key not configured. Check your .env file.");
    }

    // Validate API key format (should start with sk-)
    if (!apiKey.startsWith("sk-")) {
      console.warn(
        "Warning: OpenAI API key format may be incorrect. API keys should start with 'sk-'"
      );
    }

    this.client = new OpenAI({
      apiKey: apiKey.trim(), // Remove any whitespace
      timeout: 30000, // 30 seconds timeout
      maxRetries: 0, // We handle retries manually for better control
    });
  }

  /**
   * Create a WebSocket connection to OpenAI Realtime API
   * This returns the WebSocket URL with authentication
   */
  getRealtimeWebSocketUrl(): string {
    // OpenAI Realtime API WebSocket endpoint
    return `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
  }

  /**
   * Get API key for WebSocket authentication
   */
  getApiKey(): string {
    return process.env.OPENAI_API_KEY || "";
  }

  /**
   * Convert PCM16 audio buffer to WAV format
   */
  private pcmToWav(
    pcmBuffer: Buffer,
    sampleRate: number = 44100,
    channels: number = 1
  ): Buffer {
    const length = pcmBuffer.length;
    const wavBuffer = Buffer.alloc(44 + length);

    // WAV header
    wavBuffer.write("RIFF", 0);
    wavBuffer.writeUInt32LE(36 + length, 4);
    wavBuffer.write("WAVE", 8);
    wavBuffer.write("fmt ", 12);
    wavBuffer.writeUInt32LE(16, 16); // fmt chunk size
    wavBuffer.writeUInt16LE(1, 20); // audio format (PCM)
    wavBuffer.writeUInt16LE(channels, 22); // number of channels
    wavBuffer.writeUInt32LE(sampleRate, 24); // sample rate
    wavBuffer.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate
    wavBuffer.writeUInt16LE(channels * 2, 32); // block align
    wavBuffer.writeUInt16LE(16, 34); // bits per sample
    wavBuffer.write("data", 36);
    wavBuffer.writeUInt32LE(length, 40);

    // Copy PCM data
    pcmBuffer.copy(wavBuffer, 44);

    return wavBuffer;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on connection errors
    if (error.code === "ECONNRESET" || error.cause?.code === "ECONNRESET") {
      return true;
    }
    if (error.code === "ETIMEDOUT" || error.cause?.code === "ETIMEDOUT") {
      return true;
    }
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return true;
    }
    // Retry on 5xx server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    // Retry on rate limit (429) - but with longer delays
    if (error.status === 429) {
      return true;
    }
    return false;
  }

  /**
   * Get retry delay based on error type
   */
  private getRetryDelay(attempt: number, error: any): number {
    const INITIAL_DELAY = 1000; // 1 second

    // For rate limit errors, use longer delays
    if (error.status === 429) {
      // Exponential backoff: 5s, 10s, 20s
      return 5000 * Math.pow(2, attempt);
    }

    // For other errors, use standard exponential backoff
    return INITIAL_DELAY * Math.pow(2, attempt);
  }

  /**
   * Transcribe audio using Whisper API with retry logic
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const MAX_RETRIES = 3;
    let tempFilePath: string | null = null;

    // Validate audio buffer size
    if (audioBuffer.length < 100) {
      console.log("Audio buffer too small, skipping transcription");
      return "";
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create temp file only on first attempt or if it was cleaned up
        if (!tempFilePath || !fs.existsSync(tempFilePath)) {
          console.log(
            `Transcribing audio: ${audioBuffer.length} bytes (PCM) [Attempt ${
              attempt + 1
            }/${MAX_RETRIES + 1}]`
          );

          // Convert PCM to WAV format
          const wavBuffer = this.pcmToWav(audioBuffer);
          console.log(`Converted to WAV: ${wavBuffer.length} bytes`);

          // Create a temporary file for the audio
          tempFilePath = path.join(
            os.tmpdir(),
            `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`
          );
          fs.writeFileSync(tempFilePath, wavBuffer);
          console.log(`Created temp file: ${tempFilePath}`);
        }

        // Use fs.createReadStream which the OpenAI SDK supports natively
        const fileStream = fs.createReadStream(tempFilePath);

        if (attempt > 0) {
          console.log(
            `Retrying transcription... [Attempt ${attempt + 1}/${
              MAX_RETRIES + 1
            }]`
          );
        } else {
          console.log("Sending to OpenAI Whisper API...");
        }

        // Create transcription using the file stream
        const transcription = await this.client.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-1",
          language: "en",
          response_format: "text",
        });

        const text =
          typeof transcription === "string"
            ? transcription
            : transcription.text;

        // Clean up temp file on success
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.warn("Failed to cleanup temp file:", cleanupError);
          }
        }

        return text || "";
      } catch (error: any) {
        const isLastAttempt = attempt === MAX_RETRIES;
        const isRetryable = this.isRetryableError(error);

        // Clean up temp file on final failure
        if (isLastAttempt && tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.warn("Failed to cleanup temp file:", cleanupError);
          }
        }

        // If it's the last attempt or error is not retryable, throw
        if (isLastAttempt || !isRetryable) {
          console.error("Transcription error:", error);
          console.error("Error details:", {
            message: error.message,
            status: error.status,
            code: error.code,
            cause: error.cause?.code,
          });

          // Provide more helpful error messages
          if (
            error.code === "ECONNRESET" ||
            error.cause?.code === "ECONNRESET"
          ) {
            throw new Error(
              "Connection to OpenAI API was reset. Please check your internet connection and API key."
            );
          }

          if (error.status === 401) {
            throw new Error(
              "Invalid OpenAI API key. Please check your API key in the .env file."
            );
          }

          if (error.status === 429) {
            throw new Error(
              "OpenAI API rate limit exceeded. Please try again later."
            );
          }

          // Re-throw with original message for other errors
          throw new Error(error.message || "Failed to transcribe audio");
        }

        // Calculate retry delay based on error type
        const delay = this.getRetryDelay(attempt, error);
        const delaySeconds = Math.round(delay / 1000);
        console.warn(
          `Transcription failed (attempt ${attempt + 1}/${
            MAX_RETRIES + 1
          }), retrying in ${delaySeconds}s...`
        );
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error("Failed to transcribe audio after all retries");
  }

  /**
   * Generate text response using GPT
   */
  async generateResponse(userMessage: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant in a voice conversation. Keep responses concise and natural for speech.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 150,
      });

      return (
        completion.choices[0]?.message?.content ||
        "I apologize, I could not generate a response."
      );
    } catch (error) {
      console.error("Response generation error:", error);
      throw error;
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  async textToSpeech(text: string): Promise<Buffer> {
    try {
      const mp3 = await this.client.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        response_format: "mp3",
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error("Text-to-speech error:", error);
      throw error;
    }
  }
}
