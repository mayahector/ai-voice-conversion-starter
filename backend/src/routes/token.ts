import { Router, Request, Response } from "express";
import { LiveKitService } from "../services/livekit";

const router = Router();
const liveKitService = new LiveKitService();

/**
 * POST /api/token
 * Generate a LiveKit access token for joining a room
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { roomName, participantName } = req.body;

    // Use provided names or generate new ones
    const finalRoomName = roomName || liveKitService.generateRoomName();
    const finalParticipantName =
      participantName || liveKitService.generateParticipantName();

    const tokenResponse = await liveKitService.generateToken(
      finalRoomName,
      finalParticipantName
    );

    res.json(tokenResponse);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({
      error: "Failed to generate token",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
