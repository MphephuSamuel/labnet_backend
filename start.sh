#!/bin/bash
echo "==================================================="
echo "LabNet Backend & Scanner Startup Script (Linux/macOS)"
echo "==================================================="

# Check for root/sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo "==============================================================================="
  echo "[!] WARNING: You are not running as root."
  echo "[!] The Python scanner requires root privileges to capture packets."
  echo "[!] Please run this script with sudo: sudo ./start.sh"
  echo "==============================================================================="
  exit 1
fi

echo ""
echo "[1/4] Installing Node.js dependencies..."
npm install

echo ""
echo "[2/4] Setting up Python virtual environment..."
cd scanner || exit
if [ ! -f "myenv/bin/activate" ]; then
    echo "Creating virtual environment 'myenv'..."
    python3 -m venv myenv
fi

echo ""
echo "[3/4] Installing Python requirements..."
source myenv/bin/activate
pip install -r requirements.txt

echo ""
echo "[4/4] Starting Services..."

# Start the Node.js backend in the background
echo "Starting Node.js backend..."
cd ..
npm run dev &
NODE_PID=$!

# Wait a couple of seconds for the backend to initialize
sleep 3

# Start the Python scanner in the foreground
echo "Starting Python Network Scanner..."
cd scanner || exit
python3 scan_network.py

# Cleanup: When the python scanner is stopped (Ctrl+C), stop the Node.js backend too
echo "Stopping Node.js backend..."
kill $NODE_PID
