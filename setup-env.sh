#!/bin/bash

echo "🔧 Setting up environment variables..."

# Backend .env
cat > backend/.env << 'EOF'
# LiveKit Configuration
# IMPORTANT: You need to get these from https://livekit.io
# Sign up for free, create a project, and get:
# - API Key (looks like: APIxxxxxxxxxxxxx)
# - API Secret (looks like: secretxxxxxxxxx)
# - WebSocket URL (looks like: wss://your-project.livekit.cloud)
LIVEKIT_API_KEY=REPLACE_WITH_YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=REPLACE_WITH_YOUR_LIVEKIT_API_SECRET
LIVEKIT_URL=wss://REPLACE_WITH_YOUR_LIVEKIT_URL

# OpenAI Configuration
# IMPORTANT: Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY

# Server Configuration
PORT=3001
NODE_ENV=development
EOF

# Frontend .env.local
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
EOF

echo "✅ Environment files created!"
echo ""
echo "⚠️  IMPORTANT: You still need to add your LiveKit credentials!"
echo ""
echo "To get LiveKit credentials:"
echo "1. Go to https://livekit.io"
echo "2. Sign up (free)"
echo "3. Create a new project"
echo "4. Copy your API Key, API Secret, and WebSocket URL"
echo ""
echo "Then edit: backend/.env"
echo "Replace the LIVEKIT_* values with your actual credentials"
echo ""
echo "Run: nano backend/.env"
echo "or:  code backend/.env"

