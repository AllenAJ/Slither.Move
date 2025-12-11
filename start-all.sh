#!/bin/bash

echo "🚀 Starting SlitherMoney..."
echo ""

# Check for --new-ui flag
USE_NEW_UI=false
if [ "$1" == "--new-ui" ]; then
    USE_NEW_UI=true
fi

# Start WebSocket server in background
echo "📡 Starting WebSocket server..."
cd server
npm install > /dev/null 2>&1
npm start &
WS_PID=$!
cd ..

# Wait for WebSocket server to start
sleep 2

if [ "$USE_NEW_UI" = true ]; then
    # Start new Vite frontend
    echo "🎮 Starting new Vite frontend (slithermoney)..."
    cd slithermoney
    npm install > /dev/null 2>&1
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    FRONTEND_URL="http://localhost:5173"
else
    # Start Next.js frontend
    echo "🎮 Starting Next.js frontend..."
    npm run dev &
    FRONTEND_PID=$!
    FRONTEND_URL="http://localhost:3000"
fi

echo ""
echo "✅ All services started!"
echo "📡 WebSocket: ws://localhost:3001"
echo "🌐 Frontend: $FRONTEND_URL"
echo ""
echo "💡 To use the new UI, run: ./start-all.sh --new-ui"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $WS_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
