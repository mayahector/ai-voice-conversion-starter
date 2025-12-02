import { Router, Request, Response } from "express";
import { OpenAIService } from "../services/openai";

const router = Router();
// Lazy-load the service to avoid instantiation errors at module load time
let openAIService: OpenAIService | null = null;

function getOpenAIService(): OpenAIService {
  if (!openAIService) {
    openAIService = new OpenAIService();
  }
  return openAIService;
}

/**
 * POST /api/ai/process
 * Process audio and return AI response
 * This endpoint receives audio, transcribes it, generates a response, and converts to speech
 */
router.post("/process", async (req: Request, res: Response) => {
  try {
    const { audioData } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: "No audio data provided" });
    }

    // Convert base64 audio to buffer
    let audioBuffer: Buffer;
    try {
      audioBuffer = Buffer.from(audioData, "base64");
    } catch (error) {
      return res.status(400).json({ error: "Invalid audio data format" });
    }

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: "Audio buffer is empty" });
    }

    // Validate minimum audio size (roughly 1 second of PCM16 at 44.1kHz = ~88KB)
    const MIN_AUDIO_SIZE = 8000; // ~0.1 seconds minimum
    if (audioBuffer.length < MIN_AUDIO_SIZE) {
      console.log(
        `Audio buffer too small: ${audioBuffer.length} bytes, skipping`
      );
      return res.json({
        transcription: "",
        responseText: "",
        audioResponse: "",
      });
    }

    console.log(`Processing audio chunk: ${audioBuffer.length} bytes`);

    const service = getOpenAIService();

    // Transcribe audio
    const transcription = await service.transcribeAudio(audioBuffer);
    console.log("Transcription:", transcription);

    if (!transcription || transcription.trim().length === 0) {
      return res.json({
        transcription: "",
        responseText: "",
        audioResponse: "",
      });
    }

    // Generate AI response
    const responseText = await service.generateResponse(transcription);
    console.log("AI Response:", responseText);

    // Convert response to speech
    const audioResponse = await service.textToSpeech(responseText);

    // Return both text and audio
    res.json({
      transcription,
      responseText,
      audioResponse: audioResponse.toString("base64"),
    });
  } catch (error) {
    console.error("AI processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Don't send error response for connection issues that will be retried
    // The frontend will handle retries silently
    if (errorMessage.includes("Connection to OpenAI API was reset")) {
      // Return empty response instead of error to prevent UI spam
      return res.json({
        transcription: "",
        responseText: "",
        audioResponse: "",
      });
    }

    // Handle rate limit errors specifically
    if (errorMessage.includes("rate limit")) {
      // Return 429 status so frontend can handle it properly
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: errorMessage,
      });
    }

    res.status(500).json({
      error: "Failed to process audio",
      message: errorMessage,
    });
  }
});

/**
 * GET /api/ai/realtime-config
 * Get configuration for OpenAI Realtime API WebSocket connection
 */
router.get("/realtime-config", (req: Request, res: Response) => {
  try {
    const service = getOpenAIService();
    const wsUrl = service.getRealtimeWebSocketUrl();
    const apiKey = service.getApiKey();

    res.json({
      wsUrl,
      apiKey,
      model: "gpt-4o-realtime-preview-2024-10-01",
    });
  } catch (error) {
    console.error("Realtime config error:", error);
    res.status(500).json({
      error: "Failed to get realtime configuration",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
