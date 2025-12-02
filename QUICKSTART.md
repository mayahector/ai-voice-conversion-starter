# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### Step 2: Configure Environment

**Backend (.env):**
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials:
# - LIVEKIT_API_KEY
# - LIVEKIT_API_SECRET
# - LIVEKIT_URL
# - OPENAI_API_KEY
```

**Frontend (.env.local):**
```bash
cd frontend
cp env.example .env.local
# Default: NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Step 3: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Open Browser

Navigate to: **http://localhost:3000**

### Step 5: Start Talking!

1. Click "Start Conversation"
2. Allow microphone access
3. Speak naturally
4. Listen to AI respond

---

## 📚 Full Documentation

- **Complete Setup**: See [README.md](README.md)
- **AI Development**: See [AI_PROMPTS.md](AI_PROMPTS.md)
- **Demo Video**: See [DEMO_INSTRUCTIONS.txt](DEMO_INSTRUCTIONS.txt)

---

## 🆘 Troubleshooting

**Backend won't start?**
- Check environment variables are set
- Verify LiveKit and OpenAI credentials

**Frontend won't connect?**
- Ensure backend is running on port 3001
- Check NEXT_PUBLIC_BACKEND_URL in .env.local

**No audio?**
- Grant microphone permissions in browser
- Check browser console for errors

---

**Need help?** Check the comprehensive [README.md](README.md) for detailed instructions.
