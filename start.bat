@echo off
title LabNet Setup and Run
echo ===================================================
echo LabNet Backend ^& Scanner Startup Script
echo ===================================================

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [+] Administrator privileges confirmed.
) else (
    echo ===============================================================================
    echo [!] WARNING: You are not running as Administrator.
    echo [!] The Python scanner requires Administrator privileges to capture packets.
    echo [!] Please right-click "start.bat" and select "Run as administrator".
    echo ===============================================================================
    pause
    exit /b
)

echo.
echo [1/4] Installing Node.js dependencies...
call npm install

echo.
echo [2/4] Setting up Python virtual environment...
cd scanner
if not exist "myenv\Scripts\activate.bat" (
    echo Creating virtual environment "myenv"...
    python -m venv myenv
)

echo.
echo [3/4] Installing Python requirements...
call myenv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo [4/4] Starting Services...

:: Start the Node.js backend in a new window
echo Starting Node.js backend...
start "LabNet Node.js Backend" cmd /k "cd .. && npm run dev"

:: Wait a couple of seconds for the backend to initialize
timeout /t 3 /nobreak > nul

:: Start the Python scanner in the current window
echo Starting Python Network Scanner...
python scan_network.py

:: Keep window open if the script exits
pause
