# Real-Time AI Voice Conversation Starter

A production-ready real-time voice conversation application built with LiveKit and OpenAI, featuring seamless WebRTC communication and AI-powered voice interactions.

## 🎯 Project Overview

This application enables real-time voice conversations between users and an AI assistant. Users can speak naturally, and the AI responds with both text transcription and synthesized voice, creating a fluid conversational experience.

**Key Features:**
- 🎤 Real-time voice capture and streaming
- 🤖 AI-powered responses using OpenAI
- 📝 Live transcription display
- 🔊 Text-to-speech AI responses
- 🌐 WebRTC-based communication via LiveKit
- 🎨 Modern, responsive UI with dark mode support

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **UI Library:** React 18+
- **Styling:** Tailwind CSS
- **WebRTC:** LiveKit Client SDK
- **State Management:** React Hooks

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **WebRTC:** LiveKit Server SDK
- **AI Provider:** OpenAI (Whisper, GPT-4, TTS)
- **Real-time:** WebSocket support

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (Port 3000)                │  │
│  │  - ConversationRoom Component                            │  │
│  │  - LiveKit Client Integration                            │  │
│  │  - Microphone Capture                                    │  │
│  │  - Transcript Display                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ HTTP (Token Request)               │ WebRTC (Audio Stream)
         ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────┐
│   Express Backend    │            │   LiveKit Server     │
│    (Port 3001)       │            │   (Cloud/Self-host)  │
│                      │            │                      │
│ - Token Generation   │            │ - Room Management    │
│ - AI Processing      │◄───────────│ - Audio Routing      │
│ - Audio Pipeline     │  Subscribe │ - Participant Mgmt   │
└──────────────────────┘            └──────────────────────┘
         │
         │ API Calls
         ▼
┌──────────────────────┐
│    OpenAI API        │
│                      │
│ - Whisper (STT)      │
│ - GPT-4 (LLM)        │
│ - TTS (Voice)        │
└──────────────────────┘

FLOW:
1. Frontend requests token from backend
2. Frontend connects to LiveKit room
3. User speaks → audio published to LiveKit
4. Backend processes audio chunks
5. Backend sends to OpenAI for transcription
6. OpenAI generates text response
7. OpenAI converts response to speech
8. Backend returns audio + text to frontend
9. Frontend displays transcript and plays audio
```

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm
- **LiveKit Account** (free tier available at [livekit.io](https://livekit.io))
- **OpenAI API Key** with access to:
  - Whisper API (speech-to-text)
  - GPT-4 or GPT-3.5 (chat)
  - TTS API (text-to-speech)

### 1. Clone or Download the Project

```bash
cd /Users/dev/Desktop/TestProject
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables (backend/.env):**

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Getting LiveKit Credentials:**
1. Sign up at [livekit.io](https://livekit.io)
2. Create a new project
3. Copy API Key, API Secret, and WebSocket URL

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp env.example .env.local

# Edit .env.local
nano .env.local
```

**Required Environment Variables (frontend/.env.local):**

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 4. Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Backend server started successfully!
📡 Server running on http://localhost:3001
✅ LiveKit URL: wss://your-project.livekit.cloud
✅ OpenAI API configured
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 🎮 Usage

1. **Start Conversation:** Click the "Start Conversation" button
2. **Grant Permissions:** Allow microphone access when prompted
3. **Speak:** Talk naturally into your microphone
4. **Listen:** The AI will respond with voice and text
5. **View Transcript:** See the conversation history in real-time
6. **End Conversation:** Click "End Conversation" when done

## 🔧 Configuration

### Audio Processing Settings

The application processes audio in 3-second chunks by default. To adjust this, edit:

**File:** `frontend/hooks/useLiveKit.ts`

```typescript
// Line ~150
if (Date.now() - lastProcessTime > 3000 && audioChunks.length > 0) {
  // Change 3000 to your desired milliseconds
}
```

### AI Response Settings

Customize the AI's behavior in:

**File:** `backend/src/services/openai.ts`

```typescript
// Line ~50
messages: [
  {
    role: 'system',
    content: 'You are a helpful AI assistant...', // Customize prompt
  },
],
max_tokens: 150, // Adjust response length
```

### Voice Selection

Change the AI voice in:

**File:** `backend/src/services/openai.ts`

```typescript
// Line ~85
voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run build  # Verify TypeScript compilation
npm run lint   # Check code quality
```

### Frontend Tests

```bash
cd frontend
npm run build  # Verify production build
npm run lint   # Check code quality
```

### Manual Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads successfully
- [ ] Token generation works (`/api/token`)
- [ ] LiveKit connection establishes
- [ ] Microphone captures audio
- [ ] Audio is transcribed correctly
- [ ] AI generates appropriate responses
- [ ] AI voice plays in browser
- [ ] Transcript displays correctly
- [ ] Disconnect/reconnect works

## 🎯 Design Decisions

### 1. **OpenAI Standard APIs vs Realtime API**
- **Decision:** Used standard Whisper + GPT + TTS pipeline
- **Rationale:** More stable, better documented, easier to debug
- **Trade-off:** Slightly higher latency vs Realtime API WebSocket

### 2. **Audio Processing on Frontend**
- **Decision:** Capture and chunk audio in browser
- **Rationale:** Reduces backend complexity, leverages Web Audio API
- **Trade-off:** More frontend code, but better separation of concerns

### 3. **LiveKit for WebRTC**
- **Decision:** Use LiveKit instead of raw WebRTC
- **Rationale:** Handles complex WebRTC edge cases, provides room management
- **Trade-off:** Additional dependency, but massive time savings

### 4. **TypeScript Everywhere**
- **Decision:** Full TypeScript for frontend and backend
- **Rationale:** Type safety, better IDE support, fewer runtime errors
- **Trade-off:** Slightly more verbose, but worth it for production code

### 5. **Tailwind CSS**
- **Decision:** Use Tailwind for styling
- **Rationale:** Rapid development, consistent design system
- **Trade-off:** Larger HTML, but optimized in production build

## ⚠️ Known Limitations

1. **Single User Per Room:** Current implementation supports one user at a time
   - **Future:** Can be extended for multi-user conversations

2. **No Transcript Persistence:** Transcripts are lost on page refresh
   - **Future:** Add database integration for history

3. **Browser Compatibility:** Requires modern browser with WebRTC support
   - **Supported:** Chrome, Edge, Firefox, Safari (latest versions)
   - **Not Supported:** IE11, older mobile browsers

4. **Audio Format:** Uses PCM16 for processing
   - **Limitation:** Larger data size than compressed formats
   - **Future:** Implement Opus codec for efficiency

5. **No Authentication:** Open access to the application
   - **Production:** Should add user authentication and rate limiting

6. **Cost Considerations:** OpenAI API usage incurs costs
   - **Recommendation:** Monitor usage and set billing alerts

## 📊 API Endpoints

### Backend Endpoints

#### `POST /api/token`
Generate LiveKit access token

**Request:**
```json
{
  "roomName": "optional-room-name",
  "participantName": "optional-participant-name"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "roomName": "voice-room-1234",
  "serverUrl": "wss://your-project.livekit.cloud"
}
```

#### `POST /api/ai/process`
Process audio and get AI response

**Request:**
```json
{
  "audioData": "base64-encoded-audio"
}
```

**Response:**
```json
{
  "transcription": "Hello, how are you?",
  "responseText": "I'm doing great! How can I help you?",
  "audioResponse": "base64-encoded-mp3"
}
```

#### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T12:00:00.000Z",
  "environment": "development"
}
```

## 🔐 Security Considerations

### Production Deployment

Before deploying to production:

1. **Environment Variables:** Never commit `.env` files
2. **CORS:** Restrict to specific domains
3. **Rate Limiting:** Add rate limiting to API endpoints
4. **Authentication:** Implement user authentication
5. **HTTPS:** Use HTTPS for all connections
6. **API Keys:** Rotate keys regularly
7. **Input Validation:** Validate all user inputs
8. **Error Handling:** Don't expose internal errors to users

## 🤝 Assumptions

1. **User has modern browser** with microphone access
2. **Stable internet connection** for real-time communication
3. **LiveKit account** is set up and configured
4. **OpenAI API access** with sufficient credits
5. **Local development** on macOS/Linux (Windows may need adjustments)
6. **Node.js 18+** is installed
7. **npm** is the package manager (not yarn/pnpm)

## 📝 License

MIT License - Feel free to use this project for learning or production.

## 🙏 Acknowledgments

- **LiveKit** for excellent WebRTC infrastructure
- **OpenAI** for powerful AI APIs
- **Next.js** team for the amazing framework
- **Vercel** for hosting and deployment tools

## 📞 Support

For issues or questions:
1. Check the console logs (browser and backend)
2. Verify environment variables are set correctly
3. Ensure LiveKit and OpenAI credentials are valid
4. Check network connectivity
5. Review the [LiveKit docs](https://docs.livekit.io)
6. Review the [OpenAI docs](https://platform.openai.com/docs)

---

**Built with ❤️ for the Skillflo Assignment**
