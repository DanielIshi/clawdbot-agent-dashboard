@echo off
echo Starting ClawdBot Dashboard Development Environment...
echo.
echo 1. Starting API Server (localhost:3456)...
start "Dashboard API" cmd /k "cd ..\clawdbot-agent-dashboard-api && npm start"
timeout /t 3 /nobreak >nul
echo.
echo 2. Starting Frontend Dev Server (localhost:5173)...
echo.
echo Dashboard will be available at: http://localhost:5173/agent-dashboard/
echo API Proxy: /api/* -> http://localhost:3456
echo.
npm run dev
