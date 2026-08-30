#!/bin/sh
# Start MediaMTX (RTSP server) and Python simulator

# Start MediaMTX in background
mediamtx /etc/mediamtx/mediamtx.yml &
MEDIAMTX_PID=$!

# Wait for MediaMTX to be ready
sleep 3

# Start Python simulator (streams frames + serves HTTP API)
python /app/simulator.py &
SIMULATOR_PID=$!

# Handle shutdown
trap "kill $MEDIAMTX_PID $SIMULATOR_PID 2>/dev/null; exit 0" INT TERM

wait
