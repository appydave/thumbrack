#!/bin/zsh
# Project: ThumbRack
# Description: Desktop image sequencer — view, reorder, renumber images in a folder
cd "$(dirname "$0")/.."

echo "================================================"
echo "ThumbRack - Development Server"
echo "================================================"
echo ""

# Check if already running
if lsof -i :5021 | grep -q LISTEN; then
  echo "ThumbRack is already running on ports 5020/5021"
  echo "Opening browser..."
  open http://localhost:5020
  exit 0
fi

echo "Building shared types..."
npm run build -w shared

echo ""
echo "Starting ThumbRack (client: 5020, server: 5021) via Overmind..."
echo "  overmind connect client  — attach to client logs"
echo "  overmind connect server  — attach to server logs"
echo "  overmind stop            — stop all processes"
echo ""

# Open browser after delay (background — gives server time to start)
(sleep 4 && open http://localhost:5020) &

overmind start
