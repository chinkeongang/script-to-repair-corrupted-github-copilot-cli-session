@echo off
setlocal

REM --- Session Repair Tool Launcher (Windows) ---

REM Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install it with: winget install OpenJS.NodeJS.LTS
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%a
for /f "tokens=2 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%a

REM Install deps if needed
if not exist "%~dp0node_modules" (
    echo Installing dependencies...
    cd /d "%~dp0"
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed
        exit /b 1
    )
)

REM Launch
cd /d "%~dp0"
npx tsx src/index.tsx %*
