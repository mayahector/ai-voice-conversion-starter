// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors from "cors";
import tokenRouter from "./routes/token";
import aiRouter from "./routes/ai";

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" })); // Increased limit for audio data
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/token", tokenRouter);
app.use("/api/ai", aiRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: unknown) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Validate required environment variables
const requiredEnvVars = [
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("\nPlease create a .env file based on .env.example");
  process.exit(1);
}

// Warn about optional OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY not configured. AI features will not work.");
}

// Start server
app.listen(PORT, () => {
  console.log("🚀 Backend server started successfully!");
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ LiveKit URL: ${process.env.LIVEKIT_URL}`);
  console.log(
    process.env.OPENAI_API_KEY
      ? `✅ OpenAI API configured`
      : `⚠️  OpenAI API not configured`
  );
  console.log("\nAvailable endpoints:");
  console.log(`   GET  /health`);
  console.log(`   POST /api/token`);
  console.log(`   POST /api/ai/process`);
  console.log(`   GET  /api/ai/realtime-config`);
});

export default app;
