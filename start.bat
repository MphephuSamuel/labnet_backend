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

:: --- Detect LAN IP via ipconfig (skip Autoconfiguration/VPN IPs like 169.254.x.x) ---
set "LOCALIP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /V "Autoconfiguration" ^| findstr "IPv4 Address"') do (
    for /f "tokens=* delims= " %%B in ("%%A") do set "LOCALIP=%%B"
    goto :got_local_ip
)
:got_local_ip

if not defined LOCALIP (
    echo Could not detect local IP; skipping env update.
) else (
    echo Detected local IP: %LOCALIP%
    set "FLUTTER_ENV_PATH=..\labnet_guardian\.env"
    if exist "%FLUTTER_ENV_PATH%" (
        powershell -NoProfile -Command "(Get-Content '%FLUTTER_ENV_PATH%') -replace '^BACKEND_URL=.*', 'BACKEND_URL=http://%LOCALIP%:3000' | Set-Content '%FLUTTER_ENV_PATH%'"
    ) else (
        echo BACKEND_URL=http://%LOCALIP%:3000>"%FLUTTER_ENV_PATH%"
    )
    echo Updated %FLUTTER_ENV_PATH% with http://%LOCALIP%:3000
)

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
