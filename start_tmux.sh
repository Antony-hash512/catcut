#!/bin/bash

# Start a new tmux session named 'catcut' and run the backend
tmux new-session -d -s catcut 'cd catcut-backend && uv run python main.py'

# Split the window (left/right) and run the frontend after a 5 second delay
tmux split-window -h 'sleep 6 && cd catcut-frontend && npm run dev'

# Attach to the tmux session
tmux attach-session -t catcut
